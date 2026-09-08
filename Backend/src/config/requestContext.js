// config/requestContext.js
//
// Propagates a per-request context (requestId, userId) through the async
// call chain — HTTP middleware -> controller -> service -> Prisma calls —
// using Node's built-in AsyncLocalStorage. No extra dependency needed, and
// no function signature has to be threaded with a "requestId" parameter:
// any `logger.*()` call made anywhere during a request automatically picks
// this up (see the context format in config/logger.js).
import { AsyncLocalStorage } from "node:async_hooks";

export const requestContext = new AsyncLocalStorage();

export function runWithContext(store, callback) {
  return requestContext.run(store, callback);
}

export function getRequestId() {
  return requestContext.getStore()?.requestId;
}

export function getContextUserId() {
  return requestContext.getStore()?.userId;
}

export function setContextUserId(userId) {
  const store = requestContext.getStore();
  if (store) store.userId = userId;
}
