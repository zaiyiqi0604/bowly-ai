import type {
  BackendHealthResponse,
  CoachRequest,
  CoachResponse,
  MemorySummaryResponse,
  ParentReportResponse,
} from "../types/ai";
import type { PracticeSessionRecord } from "../types/session";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? "https://api.bowly.io" : "http://localhost:8787");
const DEFAULT_TIMEOUT_MS = 45000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The cloud service took too long to respond. Bowly can continue with a local summary.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getJson<TResponse>(path: string): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return (await response.json()) as TResponse;
}

async function postJson<TRequest, TResponse>(
  path: string,
  body: TRequest
): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

export async function fetchCoachFeedback(
  payload: CoachRequest
): Promise<CoachResponse> {
  return postJson<CoachRequest, CoachResponse>("/coach", payload);
}

export async function fetchParentReport(
  payload: PracticeSessionRecord
): Promise<ParentReportResponse> {
  return postJson<PracticeSessionRecord, ParentReportResponse>("/report", payload);
}

export async function fetchMemorySummary(
  payload: { sessions: PracticeSessionRecord[] }
): Promise<MemorySummaryResponse> {
  return postJson<{ sessions: PracticeSessionRecord[] }, MemorySummaryResponse>(
    "/memory/summary",
    payload
  );
}

export async function fetchBackendHealth(): Promise<BackendHealthResponse> {
  return getJson<BackendHealthResponse>("/health");
}
