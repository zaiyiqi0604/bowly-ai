import type {
  CoachRequest,
  CoachResponse,
  MemorySummaryResponse,
  ParentReportResponse,
} from "../types/ai.js";
import type { PracticeSessionRecord } from "../types/session.js";

const coachScenarios: Record<CoachResponse["scenario"], CoachResponse> = {
  good_improvement: {
    praise: "Nice improvement. Your tone is becoming steadier.",
    correction: "Try one slower bow to keep this smooth.",
    encouragement: "Great effort today.",
    scenario: "good_improvement",
  },
  low_motivation: {
    praise: "You showed calm effort by starting practice.",
    correction: "Let's do just one tiny challenge together.",
    encouragement: "Small steps still count as strong progress.",
    scenario: "low_motivation",
  },
  posture_issue: {
    praise: "Good focus. Your bow hand stayed calm.",
    correction: "Try lifting the violin just a little.",
    encouragement: "You're getting more balanced each minute.",
    scenario: "posture_issue",
  },
  challenge_success: {
    praise: "Wonderful work. You completed the challenge.",
    correction: "Keep this same slow rhythm for the next note.",
    encouragement: "You practiced with confidence today.",
    scenario: "challenge_success",
  },
};

function chooseScenario(request: CoachRequest): CoachResponse["scenario"] {
  if (request.metrics.postureConfidence < 45) return "posture_issue";
  if (request.metrics.confidenceLevel < 45) return "low_motivation";
  if (request.metrics.pitchStability > 70) return "challenge_success";
  return "good_improvement";
}

export function createMockCoachResponse(request: CoachRequest): CoachResponse {
  return coachScenarios[chooseScenario(request)];
}

export function createMockParentReport(
  session: PracticeSessionRecord
): ParentReportResponse {
  return {
    summary: `${session.childName} practiced for ${Math.max(
      1,
      Math.round(session.durationSeconds / 60)
    )} minutes today. Bow movement became steadier after slowing down.`,
    postureInsight:
      "Violin position improved throughout the session with calmer shoulders.",
    motivationLevel:
      session.metrics.confidenceLevel > 70
        ? "high"
        : session.metrics.confidenceLevel < 45
          ? "low"
          : "medium",
    tomorrowSuggestion: "Tomorrow, start with 3 slow bows before full songs.",
    memoryInsight:
      "Long-note stability is improving across recent sessions.",
  };
}

export function createMockMemorySummary(
  sessions: PracticeSessionRecord[]
): MemorySummaryResponse {
  if (sessions.length === 0) {
    return {
      summary: "No saved sessions yet. Start with one gentle practice today.",
      trend: "Routine building",
    };
  }
  const recent = sessions.slice(-3);
  const avgConfidence =
    recent.reduce((sum, current) => sum + current.metrics.confidenceLevel, 0) /
    recent.length;
  return {
    summary:
      avgConfidence > 65
        ? "Confidence has improved in recent practices."
        : "Confidence is still building with short, calm sessions.",
    trend:
      recent.length >= 3
        ? "Consistent sessions across the last 3 days."
        : "Early consistency trend forming.",
  };
}
