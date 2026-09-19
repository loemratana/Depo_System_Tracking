// utils/app-error.js
//
// One error shape for expected, "operational" failures — a resource
// missing, invalid credentials, a business-rule conflict — so the global
// error handler (middleware/errorHandler.js) can produce a consistent
// { success, message, code } response instead of every controller
// re-inventing its own client-error allowlist (see the old per-controller
// `handleError()` methods this replaces, one module at a time).
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    // Distinguishes an anticipated failure (safe to show `message` to the
    // client) from a genuine bug/unhandled exception (global handler hides
    // the real message behind "Internal server error" for those instead).
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }
}

// A small, deliberately short list — codes a frontend/mobile client can
// actually branch on, not one per possible error message. Add to this as
// real call sites need a new distinct code, not speculatively.
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
  AUTH_REFRESH_TOKEN_REVOKED: 'AUTH_REFRESH_TOKEN_REVOKED',

  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',

  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
