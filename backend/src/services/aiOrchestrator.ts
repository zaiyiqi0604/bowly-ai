import type {
  CoachRequest,
  CoachResponse,
  MemorySummaryResponse,
  ParentReportResponse,
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

export type AiProvider = "mock" | "qwen" | "mock-fallback";

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
  runtimeStatus = {
    provider: "mock-fallback",
    lastRequestAt: Date.now(),
    lastError: error instanceof Error ? error.message : "Unknown Qwen error",
  };
}

export async function generateCoachFeedback(
  payload: CoachRequest
): Promise<CoachResponse> {
  if (shouldUseMockMode()) {
    recordSuccess("mock");
    return createMockCoachResponse(payload);
  }
  try {
    const response = await createQwenCoachResponse(payload);
    recordSuccess("qwen");
    return response;
  } catch (error) {
    console.error("Qwen coach failed, falling back to mock.", error);
    recordFallback(error);
    return createMockCoachResponse(payload);
  }
}

export async function generateParentReport(
  payload: PracticeSessionRecord
): Promise<ParentReportResponse> {
  if (shouldUseMockMode()) {
    recordSuccess("mock");
    return createMockParentReport(payload);
  }
  try {
    const response = await createQwenParentReport(payload);
    recordSuccess("qwen");
    return response;
  } catch (error) {
    console.error("Qwen report failed, falling back to mock.", error);
    recordFallback(error);
    return createMockParentReport(payload);
  }
}

export async function generateMemorySummary(
  sessions: PracticeSessionRecord[]
): Promise<MemorySummaryResponse> {
  if (shouldUseMockMode()) {
    recordSuccess("mock");
    return createMockMemorySummary(sessions);
  }
  try {
    const response = await createQwenMemorySummary(sessions);
    recordSuccess("qwen");
    return response;
  } catch (error) {
    console.error("Qwen memory failed, falling back to mock.", error);
    recordFallback(error);
    return createMockMemorySummary(sessions);
  }
}
