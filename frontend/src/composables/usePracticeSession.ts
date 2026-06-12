import { computed, onBeforeUnmount, ref } from "vue";
import { usePracticeStore } from "../stores/practice";
import { useMemoryStore } from "../stores/memory";
import { fetchCoachFeedback } from "../services/api";
import type {
  PracticeReviewMoment,
  PracticeSessionRecord,
} from "../types/session";

export function usePracticeSession() {
  const practiceStore = usePracticeStore();
  const memoryStore = useMemoryStore();
  const coachMessage = ref("Welcome back. Let's try one small challenge today.");
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

  async function requestCoachMessage() {
    loadingCoach.value = true;
    try {
      const response = await fetchCoachFeedback({
        childName: practiceStore.childName,
        challengeTitle: practiceStore.activeChallenge.title,
        metrics: {
          pitchStability: practiceStore.metrics.pitchStability,
          postureConfidence: practiceStore.metrics.postureConfidence,
          rhythmStability: practiceStore.metrics.rhythmStability,
          confidenceLevel: practiceStore.metrics.confidenceLevel,
        },
      });

      coachMessage.value = [response.praise, response.correction, response.encouragement]
        .filter(Boolean)
        .join(" ");
      practiceStore.addTimeline("coach", coachMessage.value);
    } catch (error) {
      console.error(error);
      coachMessage.value = "Nice effort. Let's keep this bow smooth and calm together.";
    } finally {
      loadingCoach.value = false;
    }
  }

  function startSession() {
    practiceStore.startSession();
    practiceStore.addTimeline("coach", "Session started with calm focus.");
  }

  function endSession(reviewMoments: PracticeReviewMoment[] = []) {
    const now = Date.now();
    practiceStore.endSession();
    const record: PracticeSessionRecord = {
      id: crypto.randomUUID(),
      startedAt: practiceStore.sessionStartedAt,
      endedAt: now,
      durationSeconds: Math.max(0, Math.floor((now - practiceStore.sessionStartedAt) / 1000)),
      childName: practiceStore.childName,
      metrics: { ...practiceStore.metrics },
      challenge: { ...practiceStore.activeChallenge },
      timeline: [...practiceStore.timeline],
      coachHighlights: practiceStore.timeline
        .filter((event) => event.type === "coach")
        .map((event) => event.message)
        .slice(0, 3),
      reviewMoments,
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
