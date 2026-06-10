export interface PracticeMetrics {
  bowStability: number;
  pitchStability: number;
  rhythmStability: number;
  postureConfidence: number;
  confidenceLevel: number;
}

export interface PracticeChallenge {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: "coach" | "posture" | "audio" | "challenge";
  message: string;
}

export interface PracticeSessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  childName: string;
  metrics: PracticeMetrics;
  challenge: PracticeChallenge;
  timeline: TimelineEvent[];
  coachHighlights: string[];
}
