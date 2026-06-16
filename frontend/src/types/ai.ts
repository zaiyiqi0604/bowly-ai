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
  ai?: AiResponseMeta;
}

export interface ParentReportResponse {
  summary: string;
  postureInsight: string;
  motivationLevel: "low" | "medium" | "high";
  tomorrowSuggestion: string;
  memoryInsight: string;
  ai?: AiResponseMeta;
}

export interface MemorySummaryResponse {
  summary: string;
  trend: string;
  ai?: AiResponseMeta;
}

export interface AiRuntimeStatus {
  mode: "mock" | "live";
  provider: "mock" | "qwen" | "mock-fallback";
  keyConfigured: boolean;
  model: string;
  reportModel?: string;
  lastRequestAt?: number;
  lastError?: string;
  calls?: Record<"coach" | "report" | "memory", AiCallStatus>;
}

export interface AiResponseMeta {
  mode: "mock" | "live";
  provider: "mock" | "qwen" | "mock-fallback";
  model: string;
  fallbackUsed: boolean;
  lastError?: string;
}

export interface AiCallStatus {
  provider: "mock" | "qwen" | "mock-fallback";
  lastRequestAt?: number;
  lastError?: string;
  durationMs?: number;
  fallbackUsed?: boolean;
}

export interface BackendHealthResponse {
  ok: boolean;
  service: string;
  ai: AiRuntimeStatus;
}
