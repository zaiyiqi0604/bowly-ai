export type PracticeChallengeType =
  | "straight-bow"
  | "long-note"
  | "calm-posture"
  | "teacher-assignment"
  | "free-practice";

export type PracticeMode = "assignment" | "free";

export type FreePracticeIntention =
  | "just-play"
  | "warm-up"
  | "scales"
  | "teacher-work";

export interface PracticeChallenge {
  id: string;
  type: PracticeChallengeType;
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

export interface PracticeMetrics {
  bowStability: number;
  pitchStability: number;
  rhythmStability: number;
  postureConfidence: number;
  confidenceLevel: number;
}

export interface PoseSnapshotPoint {
  id: number;
  x: number;
  y: number;
  confidence: number;
}

export interface PoseSnapshotLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  confidence: number;
}

export interface AnonymousPoseSnapshot {
  capturedAt: number;
  points: PoseSnapshotPoint[];
  bow?: PoseSnapshotLine;
  violin?: PoseSnapshotLine;
  evidence?: {
    label?: string;
    quality?: "limited" | "usable" | "strong";
    approximateAngleDegrees?: number;
    referenceAngleDegrees?: number;
    note?: string;
  };
}

export interface PracticeReviewMoment {
  id: string;
  key: string;
  title: string;
  suggestion: string;
  firstSeenAt: number;
  lastSeenAt: number;
  occurrences: number;
  totalDurationSeconds: number;
  confidence?: number;
  category?: "framing" | "posture";
  before: AnonymousPoseSnapshot;
  after?: AnonymousPoseSnapshot;
}

export interface PitchEvidenceMoment {
  id: string;
  firstSeenAt: number;
  lastSeenAt: number;
  startOffsetSeconds: number;
  endOffsetSeconds: number;
  totalDurationSeconds: number;
  averageAbsCents: number;
  peakAbsCents: number;
  noteName?: string;
  direction: "sharp" | "flat" | "mixed";
}

export interface PracticeActivityStats {
  phraseCount: number;
  phraseDurationsSeconds: number[];
  pauseCount: number;
  totalPlayingSeconds: number;
  longestContinuousSeconds: number;
  pitchedSeconds: number;
  inTuneSeconds: number;
  stablePitchSeconds: number;
  inTunePercent: number;
  stablePitchPercent: number;
  pitchDataQuality: "insufficient" | "limited" | "good";
  pitchMoments?: PitchEvidenceMoment[];
}

export interface PracticeSessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  childName: string;
  practiceMode?: PracticeMode;
  metrics: PracticeMetrics;
  challenge: PracticeChallenge;
  timeline: TimelineEvent[];
  coachHighlights: string[];
  reviewMoments?: PracticeReviewMoment[];
  activity?: PracticeActivityStats;
}
