import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

// Same mocking convention as the existing telegramChatService.test.js:
// jest.unstable_mockModule (required for native ESM under
// --experimental-vm-modules) + a dynamic import AFTER the mocks are
// registered. config/jwt.js and config/env.js are deliberately NOT
// mocked — real JWT signing/verification is exactly the security-critical
// behavior worth exercising for real (dev/test env already falls back to
// a fixed, insecure-but-stable secret when JWT_SECRET is unset, so no
// extra env setup is needed here).
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(async (arg) =>
    Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma),
  ),
};

const mockSendMail = jest.fn().mockResolvedValue({ delivered: true });

// authService now depends on these two — mocked at the service boundary
// (not by faking Prisma's userTwoFactor/RecoveryCode calls or a real Redis
// connection) since their own real behavior is already verified directly
// elsewhere (twoFactorService against real otplib, loginChallengeService
// against the actual docker-compose redis container). This file only needs
// to exercise authService's OWN orchestration: does it call these with the
// right arguments, and does it react correctly to what they return.
const mockTwoFactorService = {
  isEnrolled: jest.fn().mockResolvedValue(false),
  verifyLoginCode: jest.fn(),
};
const mockLoginChallengeService = {
  createChallenge: jest.fn(),
  getChallenge: jest.fn(),
  incrementAttempt: jest.fn(),
  deleteChallenge: jest.fn(),
};
// Same boundary rule for the password-reset code store: its own behavior
// (hashing, attempt cap, single-use) is tested directly in
// passwordResetOtpService.test.js.
const mockPasswordResetOtpService = {
  issue: jest.fn(),
  verifyAndConsume: jest.fn(),
};

jest.unstable_mockModule('../../config/db.js', () => ({ prisma: mockPrisma }));
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.unstable_mockModule('../../config/logger.js', () => ({ default: mockLogger }));
jest.unstable_mockModule('../../config/mailer.js', () => ({
  sendMail: mockSendMail,
}));
jest.unstable_mockModule('../twoFactorService.js', () => ({ default: mockTwoFactorService }));
jest.unstable_mockModule('../loginChallengeService.js', () => ({
  default: mockLoginChallengeService,
  MAX_CHALLENGE_ATTEMPTS: 5,
}));
jest.unstable_mockModule('../passwordResetOtpService.js', () => ({
  default: mockPasswordResetOtpService,
}));

const { default: authService } = await import('../authService.js');
const { default: environment } = await import('../../config/env.js');
const { ErrorCodes } = await import('../../utils/app-error.js');

const ACTIVE_USER = {
  id: 1,
  username: 'user@example.com',
  role: 'staff',
  status: 'active',
  employeeId: null,
  employee: null,
  createdAt: new Date('2026-01-01'),
  lastLogin: null,
};

function withPasswordHash(user, plainPassword) {
  return { ...user, passwordHash: bcrypt.hashSync(plainPassword, 10) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (arg) =>
    Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma),
  );
  // Explicit, not relying on clearAllMocks() semantics for a default return
  // value — every existing "plain login" test below assumes no 2FA unless
  // it says otherwise.
  mockTwoFactorService.isEnrolled.mockResolvedValue(false);
});

describe('login', () => {
  test('unknown email -> 401 AUTH_INVALID_CREDENTIALS', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'nobody@example.com', password: 'whatever1' }),
    ).rejects.toMatchObject({ statusCode: 401, code: ErrorCodes.AUTH_INVALID_CREDENTIALS });
  });

  test('locked/inactive account -> 403 AUTH_FORBIDDEN', async () => {
    const user = withPasswordHash({ ...ACTIVE_USER, status: 'locked' }, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);

    await expect(
      authService.login({ email: user.username, password: 'correct-horse' }),
    ).rejects.toMatchObject({ statusCode: 403, code: ErrorCodes.AUTH_FORBIDDEN });
  });

  test('wrong password -> 401 AUTH_INVALID_CREDENTIALS', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);

    await expect(
      authService.login({ email: user.username, password: 'totally-wrong' }),
    ).rejects.toMatchObject({ statusCode: 401, code: ErrorCodes.AUTH_INVALID_CREDENTIALS });

    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe('login when 2FA is NOT yet enrolled (mandatory setup)', () => {
  test('returns a setup token instead of real tokens, and does NOT update lastLogin yet', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await authService.login({ email: user.username, password: 'correct-horse' });

    expect(result.setupRequired).toBe(true);
    expect(result.setupToken).toEqual(expect.any(String));
    expect(result.expiresIn).toEqual(expect.any(String));
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  test('still checks password/account status BEFORE ever issuing a setup token', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);

    await expect(
      authService.login({ email: user.username, password: 'wrong-password' }),
    ).rejects.toMatchObject({ statusCode: 401, code: ErrorCodes.AUTH_INVALID_CREDENTIALS });
  });
});

describe('completeLogin', () => {
  test('account locked/inactive -> 403, no tokens issued', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'locked' });

    await expect(authService.completeLogin(ACTIVE_USER.id)).rejects.toMatchObject({
      statusCode: 403,
      code: ErrorCodes.AUTH_FORBIDDEN,
    });
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  test('success: updates lastLogin and issues real tokens', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue(user);
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const result = await authService.completeLogin(user.id);

    expect(result.user.id).toBe(user.id);
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(result.tokens.refreshToken).toEqual(expect.any(String));
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: user.id }, data: { lastLogin: expect.any(Date) } }),
    );

    const createArgs = mockPrisma.refreshToken.create.mock.calls[0][0].data;
    expect(createArgs.tokenHash).not.toBe(result.tokens.refreshToken);
    expect(createArgs.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('login when 2FA is enrolled', () => {
  test('returns a challenge instead of tokens, and does NOT update lastLogin yet', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockTwoFactorService.isEnrolled.mockResolvedValue(true);
    mockLoginChallengeService.createChallenge.mockResolvedValue({
      challengeId: 'chal-1',
      expiresIn: 300,
      availableMethods: ['totp'],
    });

    const result = await authService.login({ email: user.username, password: 'correct-horse' });

    expect(result).toEqual({
      challengeRequired: true,
      challengeId: 'chal-1',
      expiresIn: 300,
      availableMethods: ['totp'],
    });
    expect(mockLoginChallengeService.createChallenge).toHaveBeenCalledWith(user.id, ['totp']);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  test('still checks password/account status BEFORE ever creating a challenge', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockTwoFactorService.isEnrolled.mockResolvedValue(true);

    await expect(
      authService.login({ email: user.username, password: 'wrong-password' }),
    ).rejects.toMatchObject({ statusCode: 401, code: ErrorCodes.AUTH_INVALID_CREDENTIALS });

    expect(mockLoginChallengeService.createChallenge).not.toHaveBeenCalled();
  });
});

describe('verifyTwoFactorChallenge', () => {
  const CHALLENGE_ID = 'chal-1';

  test('no such challenge (expired or never existed) -> 401', async () => {
    mockLoginChallengeService.getChallenge.mockResolvedValue(null);

    await expect(authService.verifyTwoFactorChallenge(CHALLENGE_ID, '123456')).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_UNAUTHORIZED,
    });
    expect(mockLoginChallengeService.incrementAttempt).not.toHaveBeenCalled();
  });

  test('wrong code -> 401 AUTH_INVALID_CREDENTIALS, attempt count incremented, challenge NOT deleted (can retry)', async () => {
    mockLoginChallengeService.getChallenge.mockResolvedValue({ userId: 1, methodsAvailable: ['totp'], attemptCount: 0 });
    mockLoginChallengeService.incrementAttempt.mockResolvedValue(1);
    mockTwoFactorService.verifyLoginCode.mockResolvedValue(false);

    await expect(authService.verifyTwoFactorChallenge(CHALLENGE_ID, '000000')).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
    });
    expect(mockLoginChallengeService.incrementAttempt).toHaveBeenCalledWith(CHALLENGE_ID);
    expect(mockLoginChallengeService.deleteChallenge).not.toHaveBeenCalled();
  });

  test('exceeding max attempts deletes the challenge and locks it out (401)', async () => {
    mockLoginChallengeService.getChallenge.mockResolvedValue({ userId: 1, methodsAvailable: ['totp'], attemptCount: 4 });
    mockLoginChallengeService.incrementAttempt.mockResolvedValue(6); // > MAX_CHALLENGE_ATTEMPTS (5)

    await expect(authService.verifyTwoFactorChallenge(CHALLENGE_ID, '123456')).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_UNAUTHORIZED,
    });
    expect(mockLoginChallengeService.deleteChallenge).toHaveBeenCalledWith(CHALLENGE_ID);
    expect(mockTwoFactorService.verifyLoginCode).not.toHaveBeenCalled();
  });

  test('success: deletes the (single-use) challenge, updates lastLogin, issues tokens', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockLoginChallengeService.getChallenge.mockResolvedValue({ userId: user.id, methodsAvailable: ['totp'], attemptCount: 0 });
    mockLoginChallengeService.incrementAttempt.mockResolvedValue(1);
    mockTwoFactorService.verifyLoginCode.mockResolvedValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue(user);
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const result = await authService.verifyTwoFactorChallenge(CHALLENGE_ID, '123456');

    expect(result.user.id).toBe(user.id);
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(mockLoginChallengeService.deleteChallenge).toHaveBeenCalledWith(CHALLENGE_ID);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: user.id }, data: { lastLogin: expect.any(Date) } }),
    );
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  test('account locked between password check and challenge completion -> 403, no tokens issued', async () => {
    mockLoginChallengeService.getChallenge.mockResolvedValue({ userId: 1, methodsAvailable: ['totp'], attemptCount: 0 });
    mockLoginChallengeService.incrementAttempt.mockResolvedValue(1);
    mockTwoFactorService.verifyLoginCode.mockResolvedValue(true);
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'locked' });

    await expect(authService.verifyTwoFactorChallenge(CHALLENGE_ID, '123456')).rejects.toMatchObject({
      statusCode: 403,
      code: ErrorCodes.AUTH_FORBIDDEN,
    });
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe('refreshToken (rotation + reuse detection)', () => {
  async function loginAndCaptureRow(user = withPasswordHash(ACTIVE_USER, 'correct-horse')) {
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue(user);
    mockPrisma.refreshToken.create.mockResolvedValue({});

    // Not going through login() here — that now returns a setup/challenge
    // response for the cases this fixture doesn't care about (see the
    // "login when 2FA is NOT yet enrolled" describe above). completeLogin()
    // is the actual shared "issue real tokens" step regardless of how a
    // login got there, and is exactly what this fixture needs.
    const { tokens } = await authService.completeLogin(user.id);
    const row = { ...mockPrisma.refreshToken.create.mock.calls[0][0].data, isRevoked: false };
    return { user, rawRefreshToken: tokens.refreshToken, row };
  }

  test('missing token -> 401 AUTH_REFRESH_TOKEN_INVALID', async () => {
    await expect(authService.refreshToken(undefined)).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
    });
  });

  test('garbage/invalid JWT -> 401 AUTH_REFRESH_TOKEN_INVALID', async () => {
    await expect(authService.refreshToken('not-a-real-jwt')).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
    });
  });

  test('valid JWT but no matching row in store -> 401 AUTH_REFRESH_TOKEN_INVALID', async () => {
    const { rawRefreshToken } = await loginAndCaptureRow();
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(authService.refreshToken(rawRefreshToken)).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
    });
  });

  test('revoked row (reuse) -> 401 AUTH_REFRESH_TOKEN_REVOKED, distinct from a plain invalid token', async () => {
    const { rawRefreshToken, row } = await loginAndCaptureRow();
    mockPrisma.refreshToken.findUnique.mockResolvedValue({ ...row, isRevoked: true });

    await expect(authService.refreshToken(rawRefreshToken)).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_REFRESH_TOKEN_REVOKED,
    });
  });

  test('expired row -> 401 AUTH_REFRESH_TOKEN_INVALID', async () => {
    const { rawRefreshToken, row } = await loginAndCaptureRow();
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      ...row,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(authService.refreshToken(rawRefreshToken)).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
    });
  });

  test('success: rotates - old row revoked, a genuinely NEW refresh token is issued and persisted', async () => {
    const { user, rawRefreshToken, row } = await loginAndCaptureRow();
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      ...row,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.refreshToken.create.mockClear();

    const result = await authService.refreshToken(rawRefreshToken);

    expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: row.id },
      data: { isRevoked: true },
    });
    expect(result.refreshToken).not.toBe(rawRefreshToken);
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  test('user no longer active at refresh time -> 401', async () => {
    const { user, rawRefreshToken, row } = await loginAndCaptureRow();
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      ...row,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    mockPrisma.user.findUnique.mockResolvedValue({ ...user, status: 'locked' });

    await expect(authService.refreshToken(rawRefreshToken)).rejects.toMatchObject({
      statusCode: 401,
      code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
    });
  });
});

describe('logout', () => {
  test('no refresh token provided -> success, no DB call', async () => {
    const result = await authService.logout('some-access-token', undefined);
    expect(result).toEqual({ success: true });
    expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  test('revokes only the matching, currently-non-revoked row', async () => {
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await authService.logout('access-token', 'raw-refresh-token');

    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/), isRevoked: false },
      data: { isRevoked: true },
    });
  });

  test('idempotent: a second logout with the same token still succeeds', async () => {
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    const result = await authService.logout('access-token', 'raw-refresh-token');
    expect(result).toEqual({ success: true });
  });
});

describe('changePassword', () => {
  test('user not found -> 404', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      authService.changePassword(1, { currentPassword: 'x', newPassword: 'newpass1' }),
    ).rejects.toMatchObject({ statusCode: 404, code: ErrorCodes.USER_NOT_FOUND });
  });

  test('wrong current password -> 401', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);

    await expect(
      authService.changePassword(1, { currentPassword: 'wrong', newPassword: 'newpass1' }),
    ).rejects.toMatchObject({ statusCode: 401, code: ErrorCodes.AUTH_INVALID_CREDENTIALS });
  });

  test('new password too short -> 422', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);

    await expect(
      authService.changePassword(1, { currentPassword: 'correct-horse', newPassword: 'ab' }),
    ).rejects.toMatchObject({ statusCode: 422, code: ErrorCodes.VALIDATION_ERROR });
  });

  test('success: persists a new bcrypt hash', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({});

    const result = await authService.changePassword(1, {
      currentPassword: 'correct-horse',
      newPassword: 'brand-new-pass1',
    });

    expect(result).toEqual({ success: true });
    const newHash = mockPrisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(newHash).not.toBe(user.passwordHash);
    expect(bcrypt.compareSync('brand-new-pass1', newHash)).toBe(true);
  });
});

describe('requestPasswordReset (no account enumeration)', () => {
  test('unknown email -> success, no code issued, no email sent', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await authService.requestPasswordReset('nobody@example.com');

    expect(result).toEqual({ success: true });
    expect(mockPasswordResetOtpService.issue).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test('inactive account -> success, no code issued, no email sent (still no enumeration signal)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'locked' });

    const result = await authService.requestPasswordReset(ACTIVE_USER.username);

    expect(result).toEqual({ success: true });
    expect(mockPasswordResetOtpService.issue).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test('active account -> a code is issued and emailed to that address (code in the body, no link)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPasswordResetOtpService.issue.mockResolvedValue({ code: '042917', expiresIn: 600 });

    const result = await authService.requestPasswordReset(ACTIVE_USER.username);

    expect(result).toEqual({ success: true });
    expect(mockPasswordResetOtpService.issue).toHaveBeenCalledWith(ACTIVE_USER.id);
    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.to).toBe(ACTIVE_USER.username);
    expect(mail.text).toContain('042917');
    expect(mail.html).toContain('042917');
    expect(mail.text).not.toMatch(/https?:\/\//);
  });

  test('inside the resend cooldown (issue -> null) -> success, but no second email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPasswordResetOtpService.issue.mockResolvedValue(null);

    const result = await authService.requestPasswordReset(ACTIVE_USER.username);

    expect(result).toEqual({ success: true });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test('mail delivery failing does NOT throw — otherwise only real accounts would 500', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPasswordResetOtpService.issue.mockResolvedValue({ code: '123456', expiresIn: 600 });
    mockSendMail.mockRejectedValueOnce(new Error('Resend: recipient not allowed'));

    await expect(authService.requestPasswordReset(ACTIVE_USER.username)).resolves.toEqual({
      success: true,
    });
  });

  test('DEV ONLY: when delivery fails outside production, the code is logged so it is still usable', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPasswordResetOtpService.issue.mockResolvedValue({ code: '042917', expiresIn: 600 });
    mockSendMail.mockRejectedValueOnce(new Error('Resend: recipient not allowed'));

    await authService.requestPasswordReset(ACTIVE_USER.username);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('042917'),
      expect.objectContaining({ action: 'auth.password_reset.dev_code' }),
    );
  });

  test('in production the code is NEVER logged, even when delivery fails', async () => {
    const original = environment.isProduction;
    environment.isProduction = true;
    try {
      mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
      mockPasswordResetOtpService.issue.mockResolvedValue({ code: '042917', expiresIn: 600 });
      mockSendMail.mockRejectedValueOnce(new Error('Resend: recipient not allowed'));

      await authService.requestPasswordReset(ACTIVE_USER.username);

      const logged = JSON.stringify([
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls,
        ...mockLogger.info.mock.calls,
      ]);
      expect(logged).not.toContain('042917');
    } finally {
      environment.isProduction = original;
    }
  });

  test('the code store (Redis) being down does NOT throw either', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPasswordResetOtpService.issue.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(authService.requestPasswordReset(ACTIVE_USER.username)).resolves.toEqual({
      success: true,
    });
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});

describe('resetPassword (emailed 6-digit code)', () => {
  const INVALID = { statusCode: 401, code: ErrorCodes.AUTH_UNAUTHORIZED };

  test('newPassword too short -> 422, before touching the user or the code', async () => {
    await expect(
      authService.resetPassword({ email: 'a@b.com', otp: '123456', newPassword: 'ab' }),
    ).rejects.toMatchObject({ statusCode: 422, code: ErrorCodes.VALIDATION_ERROR });
    expect(mockPasswordResetOtpService.verifyAndConsume).not.toHaveBeenCalled();
  });

  test('unknown email -> the same 401 as a wrong code, and no code is checked', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.resetPassword({ email: 'nobody@example.com', otp: '123456', newPassword: 'newpass1' }),
    ).rejects.toMatchObject(INVALID);
    expect(mockPasswordResetOtpService.verifyAndConsume).not.toHaveBeenCalled();
  });

  test('inactive account -> the same 401', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'locked' });

    await expect(
      authService.resetPassword({ email: ACTIVE_USER.username, otp: '123456', newPassword: 'newpass1' }),
    ).rejects.toMatchObject(INVALID);
    expect(mockPasswordResetOtpService.verifyAndConsume).not.toHaveBeenCalled();
  });

  test('wrong/expired/used code -> 401 with the identical message, password untouched', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPasswordResetOtpService.verifyAndConsume.mockResolvedValue(false);

    await expect(
      authService.resetPassword({ email: ACTIVE_USER.username, otp: '000000', newPassword: 'newpass1' }),
    ).rejects.toMatchObject({ ...INVALID, message: 'Invalid or expired verification code' });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  test('success: checks the code for THIS user, updates the password AND revokes every refresh token', async () => {
    const user = withPasswordHash(ACTIVE_USER, 'correct-horse');
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPasswordResetOtpService.verifyAndConsume.mockResolvedValue(true);

    const result = await authService.resetPassword({
      email: user.username,
      otp: '042917',
      newPassword: 'brand-new-pass1',
    });

    expect(result).toEqual({ success: true });
    expect(mockPasswordResetOtpService.verifyAndConsume).toHaveBeenCalledWith(user.id, '042917');
    expect(mockPrisma.$transaction).toHaveBeenCalledWith([
      expect.any(Promise),
      expect.any(Promise),
    ]);
    const { data } = mockPrisma.user.update.mock.calls[0][0];
    expect(bcrypt.compareSync('brand-new-pass1', data.passwordHash)).toBe(true);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });
  });
});
