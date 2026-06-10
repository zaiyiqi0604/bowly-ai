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

function shouldUseMockMode() {
  return (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false";
}

export async function generateCoachFeedback(
  payload: CoachRequest
): Promise<CoachResponse> {
  if (shouldUseMockMode()) return createMockCoachResponse(payload);
  try {
    return await createQwenCoachResponse(payload);
  } catch (error) {
    console.error("Qwen coach failed, falling back to mock.", error);
    return createMockCoachResponse(payload);
  }
}

export async function generateParentReport(
  payload: PracticeSessionRecord
): Promise<ParentReportResponse> {
  if (shouldUseMockMode()) return createMockParentReport(payload);
  try {
    return await createQwenParentReport(payload);
  } catch (error) {
    console.error("Qwen report failed, falling back to mock.", error);
    return createMockParentReport(payload);
  }
}

export async function generateMemorySummary(
  sessions: PracticeSessionRecord[]
): Promise<MemorySummaryResponse> {
  if (shouldUseMockMode()) return createMockMemorySummary(sessions);
  try {
    return await createQwenMemorySummary(sessions);
  } catch (error) {
    console.error("Qwen memory failed, falling back to mock.", error);
    return createMockMemorySummary(sessions);
  }
}
