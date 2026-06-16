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
  action: z.enum(["stay_quiet", "micro_feedback"]),
  message: z.string(),
  focus: z.enum(["effort", "pitch", "posture", "continuity"]),
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

const QWEN_TIMEOUT_MS = Number(process.env.QWEN_TIMEOUT_MS ?? 12000);

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
Practice mode: ${payload.practiceMode ?? "legacy session"}
Practice activity: ${payload.challenge.title}
Pitch: ${payload.metrics.pitchStability}
Measured activity: ${JSON.stringify(payload.activity ?? null)}
Recorded review moments: ${JSON.stringify(
      (payload.reviewMoments ?? []).slice(0, 3).map((moment) => ({
        title: moment.title,
        durationSeconds: moment.totalDurationSeconds,
        occurrences: moment.occurrences,
        suggestion: moment.suggestion,
      }))
    )}

Use measured playing time, phrase count, longest continuous phrase, pitch
percentages, completed rounds, and recorded camera-view observations as facts.
Do not invent posture, motivation, emotional state, technique, or progress.
Framing observations are camera setup notes, not posture problems. When
evidence is unavailable, say that no reliable observation was recorded. Do not
interpret pitch percentages when pitchDataQuality is insufficient or limited.`
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
