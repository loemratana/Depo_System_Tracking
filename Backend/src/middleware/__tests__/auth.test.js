import { jest } from '@jest/globals';

const mockPrisma = {
  user: { findUnique: jest.fn() },
};
const mockSetContextUserId = jest.fn();
const mockRoleHasPermission = jest.fn();

jest.unstable_mockModule('../../config/db.js', () => ({ prisma: mockPrisma }));
jest.unstable_mockModule('../../config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.unstable_mockModule('../../config/requestContext.js', () => ({
  setContextUserId: mockSetContextUserId,
  getRequestId: jest.fn(),
  getContextUserId: jest.fn(),
  runWithContext: (store, cb) => cb(),
}));
jest.unstable_mockModule('../../services/permissionService.js', () => ({
  default: { roleHasPermission: mockRoleHasPermission },
}));

const { default: authMiddleware } = await import('../auth.js');
const jwtConfig = (await import('../../config/jwt.js')).default;
const { authenticate, authorize, hasPermission } = authMiddleware;

function mockReqRes(headers = {}) {
  const req = { headers, cookies: {} };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
}

const ACTIVE_USER = { id: 1, username: 'user@example.com', role: 'staff', status: 'active', createdAt: new Date() };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authenticate', () => {
  test('no Authorization header -> 401, next() not called', async () => {
    const { req, res, next } = mockReqRes({});
    await authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('header without Bearer prefix -> 401', async () => {
    const { req, res, next } = mockReqRes({ authorization: 'Basic abc123' });
    await authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('malformed/garbage token -> 401, caught cleanly (no throw escapes)', async () => {
    const { req, res, next } = mockReqRes({ authorization: 'Bearer not-a-real-jwt' });
    await authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('valid token but user no longer exists in the DB -> 401', async () => {
    const token = jwtConfig.generateAccessToken({ userId: 1, email: 'user@example.com', role: 'staff' });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    await authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('valid token but account is not active -> 401 (role/status is re-checked against the DB, not trusted from the token)', async () => {
    const token = jwtConfig.generateAccessToken({ userId: 1, email: 'user@example.com', role: 'staff' });
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'locked' });

    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    await authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('a REFRESH token cannot be used as an access token (type discrimination)', async () => {
    const refreshToken = jwtConfig.generateRefreshToken({ userId: 1, email: 'user@example.com', role: 'staff' });

    const { req, res, next } = mockReqRes({ authorization: `Bearer ${refreshToken}` });
    await authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('success: sets req.user from the DB (not from the token payload) and calls next()', async () => {
    const token = jwtConfig.generateAccessToken({ userId: 1, email: 'user@example.com', role: 'staff' });
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(ACTIVE_USER);
    expect(mockSetContextUserId).toHaveBeenCalledWith(ACTIVE_USER.id);
  });
});

describe('authorize (role allowlist)', () => {
  test('no req.user -> 401', () => {
    const { req, res, next } = mockReqRes();
    authorize('admin')(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('role not in the allowlist -> 403', () => {
    const { req, res, next } = mockReqRes();
    req.user = { ...ACTIVE_USER, role: 'viewer' };

    authorize('admin', 'manager')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('role in the allowlist -> next() called', () => {
    const { req, res, next } = mockReqRes();
    req.user = { ...ACTIVE_USER, role: 'admin' };

    authorize('admin', 'manager')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });
});

describe('hasPermission', () => {
  test('no req.user -> 401, permissionService never consulted', async () => {
    const { req, res, next } = mockReqRes();
    await hasPermission('depots.manage')(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(mockRoleHasPermission).not.toHaveBeenCalled();
  });

  test('permission denied -> 403', async () => {
    mockRoleHasPermission.mockResolvedValue(false);
    const { req, res, next } = mockReqRes();
    req.user = { ...ACTIVE_USER, role: 'viewer' };

    await hasPermission('depots.manage')(req, res, next);

    expect(mockRoleHasPermission).toHaveBeenCalledWith('viewer', 'depots.manage');
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('permission granted -> next() called', async () => {
    mockRoleHasPermission.mockResolvedValue(true);
    const { req, res, next } = mockReqRes();
    req.user = { ...ACTIVE_USER, role: 'manager' };

    await hasPermission('depots.manage')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('permissionService throwing -> 500, not an unhandled rejection', async () => {
    mockRoleHasPermission.mockRejectedValue(new Error('db exploded'));
    const { req, res, next } = mockReqRes();
    req.user = ACTIVE_USER;

    await hasPermission('depots.manage')(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(next).not.toHaveBeenCalled();
  });
});
