// middleware/requestId.js
import { randomUUID } from "node:crypto";
import { runWithContext } from "../config/requestContext.js";

const REQUEST_ID_HEADER = "x-request-id";
// Loose but bounded: letters/digits/dash/dot/underscore, 1-100 chars. Just
// sanity-checks a client-supplied id before we reuse and echo it back —
// not a strict format requirement.
const VALID_REQUEST_ID = /^[\w.-]{1,100}$/;

function shortId() {
  return `req-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Assigns req.requestId for every request and runs the rest of the request
 * inside an AsyncLocalStorage context so logs anywhere downstream (services,
 * db calls) can pick it up without threading it through every function.
 *
 * A client-supplied X-Request-ID is reused when it looks safe (so requests
 * behind a gateway/load balancer that already assigns one keep a single id
 * end-to-end); otherwise a new id is generated.
 */
export function requestIdMiddleware(req, res, next) {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incoming === "string" && VALID_REQUEST_ID.test(incoming)
      ? incoming
      : shortId();

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  runWithContext({ requestId, userId: undefined }, next);
}
