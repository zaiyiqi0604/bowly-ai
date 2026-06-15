const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? "https://api.bowly.io" : "http://localhost:8787");

type ClientErrorEvent = {
  message: string;
  source?: string;
  route?: string;
  userAgent?: string;
  occurredAt: number;
};

const recentErrors = new Map<string, number>();

function reportClientError(event: ClientErrorEvent) {
  const key = `${event.source}:${event.message}`;
  const now = Date.now();
  if (now - (recentErrors.get(key) ?? 0) < 30_000) return;
  recentErrors.set(key, now);

  void fetch(`${API_BASE_URL}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // Monitoring must never interfere with practice.
  });
}

export function installErrorMonitoring() {
  window.addEventListener("error", (event) => {
    reportClientError({
      message: event.message || "Unknown browser error",
      source: event.filename?.split("/").at(-1),
      route: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 200),
      occurredAt: Date.now(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportClientError({
      message:
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "Unhandled promise rejection").slice(0, 500),
      source: "unhandledrejection",
      route: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 200),
      occurredAt: Date.now(),
    });
  });
}
