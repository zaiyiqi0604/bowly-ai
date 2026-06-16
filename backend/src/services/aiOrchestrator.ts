import type {
  CoachRequest,
  CoachResponse,
  AiProvider,
  AiResponseMeta,
  MemorySummaryResponse,
  ParentReportResponse,
  WithAiMeta,
} from "../types/ai.js";
import type { PracticeSessionRecord } from "../types/session.js";
import {
  createMockCoachResponse,
  createMockMemorySummary,
  createMockParentReport,
} from "./mockAiService.js";
import {
  createQwenCoachResponse,
  createQwenMemorySummary,
  createQwenParentReport,
} from "./qwenService.js";

export type { AiProvider } from "../types/ai.js";

export interface AiRuntimeStatus {
  mode: "mock" | "live";
  provider: AiProvider;
  keyConfigured: boolean;
  model: string;
  lastRequestAt?: number;
  lastError?: string;
}

let runtimeStatus: Pick<
  AiRuntimeStatus,
  "provider" | "lastRequestAt" | "lastError"
> = {
  provider: "mock",
};

function shouldUseMockMode() {
  return (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false";
}

export function getAiRuntimeStatus(): AiRuntimeStatus {
  const mockMode = shouldUseMockMode();
  const keyConfigured = Boolean(process.env.QWEN_API_KEY?.trim());
  return {
    mode: mockMode ? "mock" : "live",
    provider: mockMode ? "mock" : runtimeStatus.provider,
    keyConfigured,
    model: process.env.QWEN_MODEL ?? "qwen-plus",
    lastRequestAt: runtimeStatus.lastRequestAt,
    lastError:
      !mockMode && !keyConfigured
        ? "Live mode is enabled but QWEN_API_KEY is not configured."
        : runtimeStatus.lastError,
  };
}

function recordSuccess(provider: AiProvider) {
  runtimeStatus = {
    provider,
    lastRequestAt: Date.now(),
    lastError: undefined,
  };
}

function recordFallback(error: unknown) {
  const lastError = error instanceof Error ? error.message : "Unknown Qwen error";
  runtimeStatus = {
    provider: "mock-fallback",
    lastRequestAt: Date.now(),
    lastError,
  };
  return lastError;
}

function createResponseMeta(
  provider: AiProvider,
  fallbackUsed: boolean,
  lastError?: string
): AiResponseMeta {
  return {
    mode: shouldUseMockMode() ? "mock" : "live",
    provider,
    model: process.env.QWEN_MODEL ?? "qwen-plus",
    fallbackUsed,
    lastError,
  };
}

function withAiMeta<T>(
  response: T,
  provider: AiProvider,
  fallbackUsed = false,
  lastError?: string
): WithAiMeta<T> {
  return {
    ...response,
    ai: createResponseMeta(provider, fallbackUsed, lastError),
  };
}

function timeoutAfter<T>(milliseconds: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), milliseconds);
  });
}

function getReportQwenTimeoutMs() {
  return Number(process.env.REPORT_QWEN_TIMEOUT_MS ?? 8000);
}

export async function generateCoachFeedback(
  payload: CoachRequest
): Promise<WithAiMeta<CoachResponse>> {
  if (shouldUseMockMode()) {
    recordSuccess("mock");
    return withAiMeta(createMockCoachResponse(payload), "mock");
  }
  try {
    const response = await createQwenCoachResponse(payload);
    recordSuccess("qwen");
    return withAiMeta(response, "qwen");
  } catch (error) {
    console.error("Qwen coach failed, falling back to mock.", error);
    const lastError = recordFallback(error);
    return withAiMeta(createMockCoachResponse(payload), "mock-fallback", true, lastError);
  }
}

export async function generateParentReport(
  payload: PracticeSessionRecord
): Promise<WithAiMeta<ParentReportResponse>> {
  if (shouldUseMockMode()) {
    recordSuccess("mock");
    return withAiMeta(createMockParentReport(payload), "mock");
  }
  try {
    const response = await Promise.race([
      createQwenParentReport(payload),
      timeoutAfter<ParentReportResponse>(
        getReportQwenTimeoutMs(),
        "Qwen report timed out before the report response deadline."
      ),
    ]);
    recordSuccess("qwen");
    return withAiMeta(response, "qwen");
  } catch (error) {
    console.error("Qwen report failed, falling back to mock.", error);
    const lastError = recordFallback(error);
    return withAiMeta(createMockParentReport(payload), "mock-fallback", true, lastError);
  }
}

export async function generateMemorySummary(
  sessions: PracticeSessionRecord[]
): Promise<WithAiMeta<MemorySummaryResponse>> {
  if (shouldUseMockMode()) {
    recordSuccess("mock");
    return withAiMeta(createMockMemorySummary(sessions), "mock");
  }
  try {
    const response = await createQwenMemorySummary(sessions);
    recordSuccess("qwen");
    return withAiMeta(response, "qwen");
  } catch (error) {
    console.error("Qwen memory failed, falling back to mock.", error);
    const lastError = recordFallback(error);
    return withAiMeta(createMockMemorySummary(sessions), "mock-fallback", true, lastError);
  }
}
