import { jest } from '@jest/globals';

// Same ESM mocking convention as authService.test.js. Redis is faked with a
// tiny in-memory implementation of exactly the commands the service uses
// (set NX EX, multi/hset/expire/exec, hgetall, hincrby, del), so the rules
// under test — hashing, attempt cap, single use, cooldown — run against
// real service logic rather than against mock call expectations.
function createFakeRedis() {
  const store = new Map();
  const ttls = new Map();
  const fake = {
    store,
    ttls,
    async set(key, value, ...opts) {
      if (opts.includes('NX') && store.has(key)) return null;
      store.set(key, value);
      const exIdx = opts.indexOf('EX');
      if (exIdx !== -1) ttls.set(key, opts[exIdx + 1]);
      return 'OK';
    },
    multi() {
      const ops = [];
      const chain = {
        hset: (key, obj) => (ops.push(() => fake.hset(key, obj)), chain),
        expire: (key, s) => (ops.push(() => fake.expire(key, s)), chain),
        exec: async () => Promise.all(ops.map((op) => op())),
      };
      return chain;
    },
    async hset(key, obj) {
      store.set(key, { ...(store.get(key) ?? {}), ...obj });
      return Object.keys(obj).length;
    },
    async expire(key, seconds) {
      ttls.set(key, seconds);
      return 1;
    },
    async hgetall(key) {
      const v = store.get(key);
      return v && typeof v === 'object' ? { ...v } : {};
    },
    async hincrby(key, field, by) {
      const v = store.get(key);
      v[field] = String(Number(v[field]) + by);
      return Number(v[field]);
    },
    async del(key) {
      const existed = store.delete(key);
      ttls.delete(key);
      return existed ? 1 : 0;
    },
  };
  return fake;
}

const fakeRedis = createFakeRedis();
jest.unstable_mockModule('../../config/redis.js', () => ({ default: fakeRedis }));

const { default: service, MAX_RESET_ATTEMPTS, RESET_CODE_TTL_SECONDS } = await import(
  '../passwordResetOtpService.js'
);

const USER_ID = 7;

beforeEach(() => {
  fakeRedis.store.clear();
  fakeRedis.ttls.clear();
});

describe('issue', () => {
  test('returns a 6-digit numeric code and a 10-minute TTL', async () => {
    const issued = await service.issue(USER_ID);

    expect(issued.code).toMatch(/^\d{6}$/);
    expect(issued.expiresIn).toBe(RESET_CODE_TTL_SECONDS);
    expect(fakeRedis.ttls.get(`pwreset:otp:${USER_ID}`)).toBe(RESET_CODE_TTL_SECONDS);
  });

  test('never stores the code itself — only a hash', async () => {
    const { code } = await service.issue(USER_ID);

    const stored = fakeRedis.store.get(`pwreset:otp:${USER_ID}`);
    expect(JSON.stringify(stored)).not.toContain(code);
    expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('a second request inside the resend cooldown returns null and leaves the first code valid', async () => {
    const first = await service.issue(USER_ID);
    const second = await service.issue(USER_ID);

    expect(second).toBeNull();
    await expect(service.verifyAndConsume(USER_ID, first.code)).resolves.toBe(true);
  });

  test('codes are per user — one user cannot be reset with another user\'s code', async () => {
    const { code } = await service.issue(USER_ID);
    await service.issue(USER_ID + 1);

    await expect(service.verifyAndConsume(USER_ID + 1, code)).resolves.toBe(
      // Astronomically unlikely to collide; if it ever does, the codes are
      // legitimately identical for that user, not a cross-user leak.
      false,
    );
  });
});

describe('verifyAndConsume', () => {
  test('correct code -> true, and it is single-use', async () => {
    const { code } = await service.issue(USER_ID);

    await expect(service.verifyAndConsume(USER_ID, code)).resolves.toBe(true);
    await expect(service.verifyAndConsume(USER_ID, code)).resolves.toBe(false);
  });

  test('no code was ever issued -> false', async () => {
    await expect(service.verifyAndConsume(USER_ID, '123456')).resolves.toBe(false);
  });

  test('wrong code -> false, and the real code still works afterwards (within the cap)', async () => {
    const { code } = await service.issue(USER_ID);
    const wrong = code === '000000' ? '111111' : '000000';

    await expect(service.verifyAndConsume(USER_ID, wrong)).resolves.toBe(false);
    await expect(service.verifyAndConsume(USER_ID, code)).resolves.toBe(true);
  });

  test('after MAX wrong attempts the code is destroyed — even the CORRECT code then fails', async () => {
    const { code } = await service.issue(USER_ID);
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < MAX_RESET_ATTEMPTS; i += 1) {
      await expect(service.verifyAndConsume(USER_ID, wrong)).resolves.toBe(false);
    }

    await expect(service.verifyAndConsume(USER_ID, code)).resolves.toBe(false);
    expect(fakeRedis.store.has(`pwreset:otp:${USER_ID}`)).toBe(false);
  });

  test('the MAX-th attempt can still succeed (the cap is "MAX guesses", not "MAX-1")', async () => {
    const { code } = await service.issue(USER_ID);
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < MAX_RESET_ATTEMPTS - 1; i += 1) {
      await service.verifyAndConsume(USER_ID, wrong);
    }

    await expect(service.verifyAndConsume(USER_ID, code)).resolves.toBe(true);
  });

  test.each([['12345'], ['1234567'], ['abcdef'], [''], [undefined], [null], ['12 456']])(
    'malformed input %p -> false (and still counts as an attempt)',
    async (bad) => {
      await service.issue(USER_ID);

      await expect(service.verifyAndConsume(USER_ID, bad)).resolves.toBe(false);
      const stored = fakeRedis.store.get(`pwreset:otp:${USER_ID}`);
      expect(stored.attemptCount).toBe('1');
    },
  );

  test('two concurrent correct submissions -> exactly one wins', async () => {
    const { code } = await service.issue(USER_ID);

    const results = await Promise.all([
      service.verifyAndConsume(USER_ID, code),
      service.verifyAndConsume(USER_ID, code),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
