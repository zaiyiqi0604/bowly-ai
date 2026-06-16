export type AiProvider = "mock" | "qwen" | "mock-fallback";

export interface CoachRequest {
  childName: string;
  practiceMode: "assignment" | "free";
  practiceTitle: string;
  pitchStability: number;
  naturalPause: boolean;
  activity: {
    phraseCount: number;
    totalPlayingSeconds: number;
    longestContinuousSeconds: number;
    inTunePercent: number;
    stablePitchPercent: number;
    pitchDataQuality: "insufficient" | "limited" | "good";
  };
  observations: Array<{
    type: string;
    title: string;
    durationSeconds: number;
    occurrences: number;
    confidence: number;
    category: "framing" | "posture";
  }>;
}

export interface CoachResponse {
  action: "stay_quiet" | "micro_feedback";
  message: string;
  focus: "effort" | "pitch" | "posture" | "continuity";
}

export interface ParentReportResponse {
  summary: string;
  postureInsight: string;
  motivationLevel: "low" | "medium" | "high";
  tomorrowSuggestion: string;
  memoryInsight: string;
}

export interface MemorySummaryResponse {
  summary: string;
  trend: string;
}

export interface AiResponseMeta {
  mode: "mock" | "live";
  provider: "mock" | "qwen" | "mock-fallback";
  model: string;
  fallbackUsed: boolean;
  lastError?: string;
}

export type WithAiMeta<T> = T & {
  ai: AiResponseMeta;
};
