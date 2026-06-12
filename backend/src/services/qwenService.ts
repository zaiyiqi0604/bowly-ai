import OpenAI from "openai";
import { z } from "zod";
import { BOWLY_SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import type {
  CoachRequest,
  CoachResponse,
  MemorySummaryResponse,
  ParentReportResponse,
} from "../types/ai.js";
import type { PracticeSessionRecord } from "../types/session.js";

const CoachSchema = z.object({
  praise: z.string(),
  correction: z.string().nullable(),
  encouragement: z.string(),
  scenario: z.enum([
    "good_improvement",
    "low_motivation",
    "posture_issue",
    "challenge_success",
  ]),
});

const ParentReportSchema = z.object({
  summary: z.string(),
  postureInsight: z.string(),
  motivationLevel: z.enum(["low", "medium", "high"]),
  tomorrowSuggestion: z.string(),
  memoryInsight: z.string(),
});

const MemorySummarySchema = z.object({
  summary: z.string(),
  trend: z.string(),
});

function createClient() {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error("QWEN_API_KEY is required for live mode.");
  }
  return new OpenAI({
    apiKey,
    baseURL:
      process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
}

async function createStructuredResponse<T>(
  schema: z.ZodType<T>,
  prompt: string
): Promise<T> {
  const client = createClient();
  const response = await client.chat.completions.create({
    model: process.env.QWEN_MODEL ?? "qwen-plus",
    messages: [
      { role: "system", content: BOWLY_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${prompt}

Return only one valid JSON object. Do not include markdown or commentary.`,
      },
    ],
    response_format: { type: "json_object" },
  });
  const content = response.choices[0]?.message.content;
  if (!content) {
    throw new Error("Qwen returned an empty response.");
  }
  return schema.parse(JSON.parse(content));
}

export async function createQwenCoachResponse(
  payload: CoachRequest
): Promise<CoachResponse> {
  const response = await createStructuredResponse(
    CoachSchema,
    `Create a gentle coaching response with these JSON fields:
- praise: string
- correction: string or null
- encouragement: string
- scenario: one of good_improvement, low_motivation, posture_issue, challenge_success

Child: ${payload.childName}
Challenge: ${payload.challengeTitle}
Pitch stability: ${payload.metrics.pitchStability}
Posture confidence: ${payload.metrics.postureConfidence}
Rhythm stability: ${payload.metrics.rhythmStability}
Confidence level: ${payload.metrics.confidenceLevel}`
  );
  return {
    ...response,
    correction: response.correction ?? undefined,
  };
}

export async function createQwenParentReport(
  payload: PracticeSessionRecord
): Promise<ParentReportResponse> {
  return createStructuredResponse(
    ParentReportSchema,
    `Create a short parent report with these JSON fields:
- summary: string
- postureInsight: string
- motivationLevel: one of low, medium, high
- tomorrowSuggestion: string
- memoryInsight: string

Child: ${payload.childName}
Duration seconds: ${payload.durationSeconds}
Pitch: ${payload.metrics.pitchStability}
Posture: ${payload.metrics.postureConfidence}
Confidence: ${payload.metrics.confidenceLevel}`
  );
}

export async function createQwenMemorySummary(
  sessions: PracticeSessionRecord[]
): Promise<MemorySummaryResponse> {
  return createStructuredResponse(
    MemorySummarySchema,
    `Summarize the practice trend with these JSON fields:
- summary: string
- trend: string

Number of sessions: ${sessions.length}
Sessions snapshot: ${JSON.stringify(
      sessions.slice(-5).map((session) => ({
        durationSeconds: session.durationSeconds,
        confidenceLevel: session.metrics.confidenceLevel,
        postureConfidence: session.metrics.postureConfidence,
      }))
    )}`
  );
}
