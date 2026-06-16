import "dotenv/config";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split("=");
    return [key, rest.join("=") || "true"];
  })
);

const apiBase = args.get("--api");
const skipLive = args.has("--skip-live");
const listModels = args.has("--list-models");
const baseURL =
  process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
const model = process.env.QWEN_REPORT_MODEL ?? "qwen3.6-flash";
const timeoutMs = Number(process.env.QWEN_TIMEOUT_MS ?? 30000);
const maxTokens = Number(process.env.QWEN_REPORT_MAX_TOKENS ?? 320);

function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return value;
  }
}

function ms(startedAt) {
  return `${Date.now() - startedAt}ms`;
}

function sampleSession() {
  const now = Date.now();
  const durationSeconds = 190;
  const startedAt = now - durationSeconds * 1000;
  const before = {
    capturedAt: now - 45000,
    points: [
      { id: 5, x: 0.42, y: 0.34, confidence: 0.95 },
      { id: 6, x: 0.58, y: 0.34, confidence: 0.94 },
      { id: 7, x: 0.38, y: 0.48, confidence: 0.9 },
      { id: 8, x: 0.63, y: 0.48, confidence: 0.89 },
      { id: 9, x: 0.31, y: 0.62, confidence: 0.88 },
      { id: 10, x: 0.69, y: 0.62, confidence: 0.87 },
    ],
    violin: { startX: 0.38, startY: 0.38, endX: 0.62, endY: 0.4, confidence: 0.75 },
    bow: { startX: 0.28, startY: 0.62, endX: 0.72, endY: 0.42, confidence: 0.8 },
  };
  return {
    id: "diagnostic-report-session",
    startedAt,
    endedAt: now,
    durationSeconds,
    childName: "Lena",
    practiceMode: "assignment",
    metrics: {
      bowStability: 86,
      pitchStability: 82,
      rhythmStability: 80,
      postureConfidence: 84,
      confidenceLevel: 83,
    },
    challenge: {
      id: "open-strings",
      type: "teacher-assignment",
      title: "Open strings with a soft wrist",
      description: "Slow bow strokes while keeping the shoulder relaxed.",
      target: 3,
      progress: 3,
      completed: true,
    },
    timeline: [],
    coachHighlights: [
      "Lena completed three short phrases and kept the bow moving more steadily.",
    ],
    activity: {
      phraseCount: 3,
      phraseDurationsSeconds: [13, 18, 22],
      pauseCount: 2,
      totalPlayingSeconds: 53,
      longestContinuousSeconds: 22,
      pitchedSeconds: 45,
      inTuneSeconds: 40,
      stablePitchSeconds: 43,
      inTunePercent: 76,
      stablePitchPercent: 82,
      pitchDataQuality: "good",
    },
    reviewMoments: [
      {
        id: "diagnostic-review-1",
        key: "soft-wrist",
        title: "Bow wrist tension",
        suggestion: "Try the next phrase with a softer bow wrist.",
        firstSeenAt: now - 60000,
        lastSeenAt: now - 8000,
        occurrences: 2,
        totalDurationSeconds: 11,
        confidence: 0.9,
        category: "posture",
        before,
        after: before,
      },
    ],
  };
}

function compactReportInput(session) {
  const activity = session.activity;
  return {
    childName: session.childName,
    durationSeconds: session.durationSeconds,
    practiceMode: session.practiceMode ?? "legacy",
    activityTitle: session.challenge.title,
    completed: session.challenge.completed,
    phraseCount: activity?.phraseCount ?? 0,
    totalPlayingSeconds: activity?.totalPlayingSeconds ?? 0,
    longestContinuousSeconds: activity?.longestContinuousSeconds ?? 0,
    inTunePercent: activity?.pitchDataQuality === "good" ? activity.inTunePercent : null,
    pitchDataQuality: activity?.pitchDataQuality ?? "insufficient",
    reviewMoments: (session.reviewMoments ?? []).slice(0, 2).map((moment) => ({
      title: moment.title,
      category: moment.category,
      seconds: moment.totalDurationSeconds,
      occurrences: moment.occurrences,
      suggestion: moment.suggestion,
    })),
  };
}

async function qwenJson(messages, label) {
  const client = new OpenAI({
    apiKey: process.env.QWEN_API_KEY,
    baseURL,
    timeout: timeoutMs,
  });
  const startedAt = Date.now();
  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature: 0.2,
    });
    const content = response.choices[0]?.message?.content ?? "";
    JSON.parse(content);
    console.log(`[PASS] ${label}: ${ms(startedAt)}`);
    console.log(`       content=${content.slice(0, 240).replace(/\s+/g, " ")}`);
  } catch (error) {
    console.log(`[FAIL] ${label}: ${ms(startedAt)}`);
    console.log(`       ${error?.name ?? "Error"}: ${error?.message ?? String(error)}`);
    if (error?.status) console.log(`       status=${error.status}`);
    if (error?.code) console.log(`       code=${error.code}`);
  }
}

async function printModels() {
  const client = new OpenAI({
    apiKey: process.env.QWEN_API_KEY,
    baseURL,
    timeout: timeoutMs,
  });
  const startedAt = Date.now();
  try {
    const models = await client.models.list();
    console.log(`[PASS] models.list: ${ms(startedAt)}`);
    console.log(JSON.stringify(models.data?.map((item) => item.id), null, 2));
  } catch (error) {
    console.log(`[FAIL] models.list: ${ms(startedAt)}`);
    console.log(`       ${error?.name ?? "Error"}: ${error?.message ?? String(error)}`);
  }
}

async function postReportApi(base) {
  const startedAt = Date.now();
  const target = `${base.replace(/\/$/, "")}/report`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(args.get("--api-timeout") ?? 30000));
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleSession()),
      signal: controller.signal,
    });
    const text = await response.text();
    console.log(`[API] POST ${target}: HTTP ${response.status}, ${ms(startedAt)}`);
    console.log(`      ${text.slice(0, 700).replace(/\s+/g, " ")}`);
  } catch (error) {
    console.log(`[API FAIL] POST ${target}: ${ms(startedAt)}`);
    console.log(`           ${error?.name ?? "Error"}: ${error?.message ?? String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

console.log("Bowly Qwen report diagnostic");
console.log(JSON.stringify({
  useMockAi: process.env.USE_MOCK_AI,
  keyConfigured: Boolean(process.env.QWEN_API_KEY),
  baseURL: redactUrl(baseURL),
  qwenModel: process.env.QWEN_MODEL,
  qwenReportModel: process.env.QWEN_REPORT_MODEL,
  effectiveReportModel: model,
  qwenTimeoutMs: timeoutMs,
  qwenReportMaxTokens: maxTokens,
  reportQwenTimeoutMs: process.env.REPORT_QWEN_TIMEOUT_MS,
}, null, 2));

if (!process.env.QWEN_API_KEY) {
  console.log("[SKIP] QWEN_API_KEY is not configured in backend/.env or environment.");
} else if (!skipLive) {
  if (listModels) {
    await printModels();
  }

  await qwenJson([
    { role: "system", content: "Return valid JSON only." },
    { role: "user", content: 'Return exactly {"ok":true,"message":"pong"}.' },
  ], "direct minimal Qwen JSON");

  await qwenJson([
    { role: "system", content: "You are Bowly. Return valid JSON only." },
    {
      role: "user",
      content: `Return compact JSON with fields summary, postureInsight, motivationLevel, tomorrowSuggestion, memoryInsight. Rules: use only facts; each value one short sentence. Input: ${JSON.stringify(compactReportInput(sampleSession()))}`,
    },
  ], "compact parent report Qwen JSON");
}

if (apiBase) {
  await postReportApi(apiBase);
}
