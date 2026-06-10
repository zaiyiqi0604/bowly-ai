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
