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
import { normalizeMotivationLevel } from "./reportNormalize.js";

const CoachSchema = z.object({
  action: z.enum(["stay_quiet", "micro_feedback"]),
  message: z.string(),
  focus: z.enum(["effort", "pitch", "posture", "continuity"]),
});

const ParentReportSchema = z.object({
  summary: z.string(),
  postureInsight: z.string(),
  motivationLevel: z.preprocess(
    normalizeMotivationLevel,
    z.enum(["low", "medium", "high"])
  ),
  tomorrowSuggestion: z.string(),
  memoryInsight: z.string(),
});

const MemorySummarySchema = z.object({
  summary: z.string(),
  trend: z.string(),
});

const QWEN_TIMEOUT_MS = Number(process.env.QWEN_TIMEOUT_MS ?? 30000);

interface StructuredResponseOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

function createClient() {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error("QWEN_API_KEY is required for live mode.");
  }
  return new OpenAI({
    apiKey,
    timeout: QWEN_TIMEOUT_MS,
    baseURL:
      process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
}

async function createStructuredResponse<T>(
  schema: z.ZodType<T>,
  prompt: string,
  options: StructuredResponseOptions = {}
): Promise<T> {
  const client = createClient();
  const response = await client.chat.completions.create({
    model: options.model ?? process.env.QWEN_MODEL ?? "qwen-plus",
    messages: [
      { role: "system", content: BOWLY_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${prompt}

Return only one valid JSON object. Do not include markdown or commentary.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: options.maxTokens,
    temperature: options.temperature,
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
    `Decide whether Bowly should stay quiet or give one gentle sentence.

Return these JSON fields:
- action: stay_quiet or micro_feedback
- message: an empty string when staying quiet, otherwise one child-friendly sentence
- focus: effort, pitch, posture, or continuity

Rules:
- Only use micro_feedback during a natural pause.
- Stay quiet when evidence is weak, the issue is minor, or no useful observation exists.
- Never claim that a note, body part, or technique is wrong.
- Framing observations only describe camera visibility. Never turn them into posture advice.
- Do not discuss pitch percentages unless pitchDataQuality is good.
- Prefer acknowledging effort or suggesting one small next action.
- Do not mention scores, percentages, AI, detection, or challenges.
- Keep the message under 14 words.

Child: ${payload.childName}
Practice mode: ${payload.practiceMode}
Practice activity: ${payload.practiceTitle}
Natural pause: ${payload.naturalPause}
Pitch stability: ${payload.pitchStability}
Practice activity: ${JSON.stringify(payload.activity)}
Persistent observations: ${JSON.stringify(payload.observations)}`
  );
  return response;
}

export async function createQwenParentReport(
  payload: PracticeSessionRecord
): Promise<ParentReportResponse> {
  const activity = payload.activity;
  const reviewMoments = (payload.reviewMoments ?? []).slice(0, 2).map((moment) => ({
    title: moment.title,
    category: moment.category,
    seconds: moment.totalDurationSeconds,
    occurrences: moment.occurrences,
    suggestion: moment.suggestion,
  }));
  const compactInput = {
    childName: payload.childName,
    durationSeconds: payload.durationSeconds,
    practiceMode: payload.practiceMode ?? "legacy",
    activityTitle: payload.challenge.title,
    completed: payload.challenge.completed,
    phraseCount: activity?.phraseCount ?? 0,
    totalPlayingSeconds: activity?.totalPlayingSeconds ?? 0,
    longestContinuousSeconds: activity?.longestContinuousSeconds ?? 0,
    inTunePercent: activity?.pitchDataQuality === "good" ? activity.inTunePercent : null,
    pitchDataQuality: activity?.pitchDataQuality ?? "insufficient",
    reviewMoments,
  };
  return createStructuredResponse(
    ParentReportSchema,
    `Return compact JSON for a parent violin practice report.
Fields: summary, postureInsight, motivationLevel, tomorrowSuggestion, memoryInsight.
Rules: use only input facts; no invented emotion/progress; framing means camera view only; keep each field one short sentence.
motivationLevel must be exactly one word: low, medium, or high (no other values or phrases).
Input: ${JSON.stringify(compactInput)}`,
    {
      model: process.env.QWEN_REPORT_MODEL ?? "qwen3.6-flash",
      maxTokens: Number(process.env.QWEN_REPORT_MAX_TOKENS ?? 320),
      temperature: 0.2,
    }
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
        practiceMode: session.practiceMode,
        phraseCount: session.activity?.phraseCount,
        totalPlayingSeconds: session.activity?.totalPlayingSeconds,
        inTunePercent: session.activity?.inTunePercent,
      }))
    )}`
  );
}
