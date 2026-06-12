export interface CoachRequest {
  childName: string;
  metrics: {
    pitchStability: number;
    postureConfidence: number;
    rhythmStability: number;
    confidenceLevel: number;
  };
  challengeTitle: string;
}

export interface CoachResponse {
  praise: string;
  correction?: string;
  encouragement: string;
  scenario:
    | "good_improvement"
    | "low_motivation"
    | "posture_issue"
    | "challenge_success";
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

export interface AiRuntimeStatus {
  mode: "mock" | "live";
  provider: "mock" | "qwen" | "mock-fallback";
  keyConfigured: boolean;
  model: string;
  lastRequestAt?: number;
  lastError?: string;
}

export interface BackendHealthResponse {
  ok: boolean;
  service: string;
  ai: AiRuntimeStatus;
}
