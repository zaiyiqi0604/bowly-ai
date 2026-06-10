import { defineStore } from "pinia";
import type { PracticeChallenge, PracticeMetrics, TimelineEvent } from "../types/session";

function createDefaultChallenge(): PracticeChallenge {
  return {
    id: crypto.randomUUID(),
    type: "straight-bow",
    title: "Straight Bow Challenge",
    description: "Keep your bow steady for 5 slow strokes.",
    target: 5,
    progress: 0,
    completed: false,
  };
}

const defaultMetrics: PracticeMetrics = {
  bowStability: 48,
  pitchStability: 44,
  rhythmStability: 46,
  postureConfidence: 52,
  confidenceLevel: 60,
};

export const usePracticeStore = defineStore("practice", {
  state: () => ({
    childName: "Emily",
    isSessionActive: false,
    sessionStartedAt: 0,
    metrics: { ...defaultMetrics },
    timeline: [] as TimelineEvent[],
    activeChallenge: createDefaultChallenge(),
  }),
  actions: {
    startSession() {
      this.isSessionActive = true;
      this.sessionStartedAt = Date.now();
      this.timeline = [];
      this.activeChallenge = createDefaultChallenge();
    },
    endSession() {
      this.isSessionActive = false;
    },
    addTimeline(type: TimelineEvent["type"], message: string) {
      this.timeline.unshift({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type,
        message,
      });
    },
    setPitchStability(value: number) {
      this.metrics.pitchStability = value;
    },
    nudgePostureConfidence(delta: number) {
      const nextValue = this.metrics.postureConfidence + delta;
      this.metrics.postureConfidence = Math.max(5, Math.min(100, Math.round(nextValue)));
    },
    incrementChallenge() {
      if (this.activeChallenge.completed) return;
      this.activeChallenge.progress += 1;
      if (this.activeChallenge.progress >= this.activeChallenge.target) {
        this.activeChallenge.completed = true;
        this.addTimeline("challenge", "Challenge completed with calm focus.");
      }
    },
  },
});
