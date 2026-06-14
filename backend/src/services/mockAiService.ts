import type {
  CoachRequest,
  CoachResponse,
  MemorySummaryResponse,
  ParentReportResponse,
} from "../types/ai.js";
import type { PracticeSessionRecord } from "../types/session.js";

export function createMockCoachResponse(request: CoachRequest): CoachResponse {
  if (!request.naturalPause) {
    return { action: "stay_quiet", message: "", focus: "continuity" };
  }
  const persistentObservation = request.observations
    .filter((item) =>
      item.category === "framing" &&
      item.confidence >= 0.8 &&
      (item.durationSeconds >= 4 || item.occurrences >= 2)
    )
    .sort((a, b) => b.durationSeconds - a.durationSeconds)[0];
  if (persistentObservation) {
    return {
      action: "micro_feedback",
      message: persistentObservation.type === "arms-not-visible"
        ? "Before the next phrase, keep both hands inside the camera view."
        : "Before the next phrase, adjust the camera view a little.",
      focus: "continuity",
    };
  }
  if (
    request.activity.pitchDataQuality === "good" &&
    request.pitchStability >= 70
  ) {
    return {
      action: "micro_feedback",
      message: "That phrase sounded steady. Continue when you are ready.",
      focus: "pitch",
    };
  }
  return {
    action: "stay_quiet",
    message: "",
    focus: "effort",
  };
}

export function createMockParentReport(
  session: PracticeSessionRecord
): ParentReportResponse {
  const activity = session.activity;
  const phraseDurations = activity?.phraseDurationsSeconds ?? [];
  const midpoint = Math.ceil(phraseDurations.length / 2);
  const average = (values: number[]) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
  const firstHalfAverage = average(phraseDurations.slice(0, midpoint));
  const secondHalfAverage = average(phraseDurations.slice(midpoint));
  const continuityInsight = phraseDurations.length >= 4
    ? secondHalfAverage > firstHalfAverage * 1.12
      ? "Later playing sections lasted longer than the early sections."
      : secondHalfAverage < firstHalfAverage * 0.88
        ? "Later playing sections became shorter; a brief rest may help next time."
        : "Playing-section length stayed consistent across the session."
    : "More playing sections are needed for a reliable within-session comparison.";
  const activitySummary = activity
    ? `${activity.phraseCount} playing sections were heard, with ${Math.round(
        activity.totalPlayingSeconds
      )} seconds of active playing.`
    : "No detailed playing activity was recorded.";
  const framingMoment = session.reviewMoments?.find(
    (moment) =>
      moment.category === "framing" && (moment.confidence ?? 0) >= 0.8
  );
  return {
    summary: `${session.childName} practised for ${Math.max(
      1,
      Math.round(session.durationSeconds / 60)
    )} minutes today. ${activitySummary}`,
    postureInsight: framingMoment
      ? `The camera view needed adjustment for ${framingMoment.totalDurationSeconds} seconds.`
      : "The camera did not record a persistent visibility problem.",
    motivationLevel: "medium",
    tomorrowSuggestion: session.practiceMode === "assignment"
      ? "Continue the same assigned section with one calm repeat."
      : "Choose one small intention before the next free practice.",
    memoryInsight: activity
      ? continuityInsight
      : "More sessions are needed before showing a reliable trend.",
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
