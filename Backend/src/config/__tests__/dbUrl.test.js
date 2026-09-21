import { withoutSslMode } from '../dbUrl.js';

const BASE = 'postgresql://user:p%40ss@host.pooler.supabase.com:6543/postgres';

describe('withoutSslMode', () => {
  test('sslmode as the only parameter is removed, along with the dangling "?"', () => {
    expect(withoutSslMode(`${BASE}?sslmode=require`)).toBe(BASE);
  });

  test('sslmode first, other parameters kept', () => {
    expect(withoutSslMode(`${BASE}?sslmode=require&connection_limit=5`)).toBe(
      `${BASE}?connection_limit=5`,
    );
  });

  test('sslmode last, other parameters kept', () => {
    expect(withoutSslMode(`${BASE}?connection_limit=5&sslmode=require`)).toBe(
      `${BASE}?connection_limit=5`,
    );
  });

  test('sslmode in the middle, other parameters kept', () => {
    expect(withoutSslMode(`${BASE}?a=1&sslmode=require&b=2`)).toBe(`${BASE}?a=1&b=2`);
  });

  test('works for every sslmode value', () => {
    for (const mode of ['disable', 'require', 'verify-full', 'no-verify']) {
      expect(withoutSslMode(`${BASE}?sslmode=${mode}`)).toBe(BASE);
    }
  });

  test('a URL without sslmode is returned unchanged', () => {
    expect(withoutSslMode(BASE)).toBe(BASE);
    expect(withoutSslMode(`${BASE}?connection_limit=5`)).toBe(`${BASE}?connection_limit=5`);
  });

  test('credentials, host and database are never touched', () => {
    const out = withoutSslMode(`${BASE}?sslmode=require`);
    expect(out).toContain('user:p%40ss@host.pooler.supabase.com:6543/postgres');
  });
});
