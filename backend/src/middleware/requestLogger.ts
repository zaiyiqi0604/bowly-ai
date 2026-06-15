import type { NextFunction, Request, Response } from "express";

function writeLog(
  level: "info" | "error",
  event: string,
  fields: Record<string, unknown>,
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") {
    console.error(entry);
  } else {
    console.log(entry);
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = performance.now();
  const requestId = req.header("x-request-id")?.slice(0, 100) || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    writeLog(res.statusCode >= 500 ? "error" : "info", "http_request", {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
      userAgent: req.header("user-agent")?.slice(0, 160),
    });
  });

  res.locals.requestId = requestId;
  next();
}

export function logServerError(
  error: unknown,
  requestId?: string,
  path?: string,
) {
  writeLog("error", "request_error", {
    requestId,
    path,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}
