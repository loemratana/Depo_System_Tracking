import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createMiddleware } from "@tanstack/react-start";

// Error-handling middleware — compatible with all server presets
export const middleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    const captured = consumeLastCapturedError() ?? error;
    console.error(captured);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

