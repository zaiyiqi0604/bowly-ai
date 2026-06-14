import { computed, onBeforeUnmount, ref } from "vue";
import { usePracticeStore } from "../stores/practice";
import { useMemoryStore } from "../stores/memory";
import { fetchCoachFeedback } from "../services/api";
import type {
  PracticeActivityStats,
  PracticeReviewMoment,
  PracticeSessionRecord,
} from "../types/session";

export function usePracticeSession() {
  const practiceStore = usePracticeStore();
  const memoryStore = useMemoryStore();
  const coachMessage = ref("Choose what you want to practise. Bowly will listen quietly.");
  const loadingCoach = ref(false);
  const clockTick = ref(Date.now());
  const clockTimer = window.setInterval(() => {
    clockTick.value = Date.now();
  }, 1000);

  const durationSeconds = computed(() => {
    if (!practiceStore.isSessionActive) return 0;
    return Math.max(0, Math.floor((clockTick.value - practiceStore.sessionStartedAt) / 1000));
  });

  onBeforeUnmount(() => {
    window.clearInterval(clockTimer);
  });

  async function requestCoachMessage(
    reviewMoments: PracticeReviewMoment[] = [],
    activity: PracticeActivityStats,
  ) {
    loadingCoach.value = true;
    try {
      const response = await fetchCoachFeedback({
        childName: practiceStore.childName,
        practiceMode: practiceStore.practiceMode,
        practiceTitle: practiceStore.activeChallenge.title,
        pitchStability: activity.stablePitchPercent,
        naturalPause: true,
        activity: {
          phraseCount: activity.phraseCount,
          totalPlayingSeconds: activity.totalPlayingSeconds,
          longestContinuousSeconds: activity.longestContinuousSeconds,
          inTunePercent: activity.inTunePercent,
          stablePitchPercent: activity.stablePitchPercent,
          pitchDataQuality: activity.pitchDataQuality,
        },
        observations: reviewMoments.slice(-3).map((moment) => ({
          type: moment.key,
          title: moment.title,
          durationSeconds: moment.totalDurationSeconds,
          occurrences: moment.occurrences,
          confidence: moment.confidence ?? 0,
          category: moment.category ?? "posture",
        })),
      });

      if (response.action === "stay_quiet") return;
      coachMessage.value = response.message;
      practiceStore.addTimeline("coach", response.message);
    } catch (error) {
      console.error(error);
      coachMessage.value = "Take your time. Continue when you are ready.";
    } finally {
      loadingCoach.value = false;
    }
  }

  function startSession() {
    practiceStore.startSession();
    practiceStore.addTimeline(
      "coach",
      practiceStore.practiceMode === "assignment"
        ? `Started: ${practiceStore.activeChallenge.title}.`
        : `Free practice started: ${practiceStore.activeChallenge.title}.`,
    );
  }

  function endSession(
    reviewMoments: PracticeReviewMoment[] = [],
    activity?: PracticeActivityStats,
  ) {
    const now = Date.now();
    practiceStore.endSession();
    const record: PracticeSessionRecord = {
      id: crypto.randomUUID(),
      startedAt: practiceStore.sessionStartedAt,
      endedAt: now,
      durationSeconds: Math.max(0, Math.floor((now - practiceStore.sessionStartedAt) / 1000)),
      childName: practiceStore.childName,
      practiceMode: practiceStore.practiceMode,
      metrics: { ...practiceStore.metrics },
      challenge: { ...practiceStore.activeChallenge },
      timeline: [...practiceStore.timeline],
      coachHighlights: practiceStore.timeline
        .filter((event) => event.type === "coach")
        .map((event) => event.message)
        .slice(0, 3),
      reviewMoments,
      activity,
    };
    memoryStore.saveSession(record);
  }

  return {
    durationSeconds,
    coachMessage,
    loadingCoach,
    startSession,
    endSession,
    requestCoachMessage,
  };
}
