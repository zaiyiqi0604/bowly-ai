import { defineStore } from "pinia";
import type {
  FreePracticeIntention,
  PracticeChallenge,
  PracticeMetrics,
  PracticeMode,
  TimelineEvent,
} from "../types/session";

const PRACTICE_CONTEXT_KEY = "bowly-practice-context";

function loadPracticeContext() {
  if (typeof localStorage === "undefined") return { title: "", image: "" };
  try {
    const value = JSON.parse(localStorage.getItem(PRACTICE_CONTEXT_KEY) ?? "{}");
    return {
      title: typeof value.title === "string" ? value.title : "",
      image: typeof value.image === "string" ? value.image : "",
    };
  } catch {
    return { title: "", image: "" };
  }
}

const savedPracticeContext = loadPracticeContext();

function savePracticeContext(title: string, image: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PRACTICE_CONTEXT_KEY, JSON.stringify({ title, image }));
  } catch {
    try {
      localStorage.setItem(PRACTICE_CONTEXT_KEY, JSON.stringify({ title, image: "" }));
    } catch {
      // Practice can still start when browser storage is unavailable.
    }
  }
}

const freePracticeLabels: Record<FreePracticeIntention, {
  title: string;
  description: string;
}> = {
  "just-play": {
    title: "Just play",
    description: "Play what you feel like playing. Bowly will listen quietly.",
  },
  "warm-up": {
    title: "Warm up",
    description: "Use a few comfortable notes to help your hands settle in.",
  },
  scales: {
    title: "Scales and long bows",
    description: "Explore an even sound at your own pace.",
  },
  "teacher-work": {
    title: "Teacher's music",
    description: "Practise the music your teacher gave you without uploading a score.",
  },
};

function createPracticePlan(
  mode: PracticeMode = "free",
  assignmentTitle = "",
  intention: FreePracticeIntention = "just-play",
): PracticeChallenge {
  if (mode === "assignment") {
    return {
      id: crypto.randomUUID(),
      type: "teacher-assignment",
      title: assignmentTitle.trim() || "Teacher's practice",
      description: "Work on the part your teacher asked you to practise.",
      target: 2,
      progress: 0,
      completed: false,
    };
  }
  const copy = freePracticeLabels[intention];
  return {
    id: crypto.randomUUID(),
    type: "free-practice",
    title: copy.title,
    description: copy.description,
    target: 0,
    progress: 0,
    completed: false,
  };
}

const defaultMetrics: PracticeMetrics = {
  bowStability: 0,
  pitchStability: 0,
  rhythmStability: 0,
  postureConfidence: 0,
  confidenceLevel: 0,
};

export const usePracticeStore = defineStore("practice", {
  state: () => ({
    childName: "Emily",
    isSessionActive: false,
    sessionStartedAt: 0,
    practiceMode: (savedPracticeContext.title ? "assignment" : "free") as PracticeMode,
    assignmentTitle: savedPracticeContext.title,
    assignmentImage: savedPracticeContext.image,
    freePracticeIntention: "just-play" as FreePracticeIntention,
    metrics: { ...defaultMetrics },
    timeline: [] as TimelineEvent[],
    activeChallenge: createPracticePlan(
      savedPracticeContext.title ? "assignment" : "free",
      savedPracticeContext.title,
    ),
  }),
  actions: {
    startSession() {
      this.isSessionActive = true;
      this.sessionStartedAt = Date.now();
      this.timeline = [];
      this.metrics = { ...defaultMetrics };
      this.activeChallenge = createPracticePlan(
        this.practiceMode,
        this.assignmentTitle,
        this.freePracticeIntention,
      );
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
    setPracticeMode(mode: PracticeMode) {
      if (this.isSessionActive) return;
      this.practiceMode = mode;
      this.activeChallenge = createPracticePlan(
        mode,
        this.assignmentTitle,
        this.freePracticeIntention,
      );
    },
    setAssignmentTitle(title: string) {
      if (this.isSessionActive) return;
      this.assignmentTitle = title;
      savePracticeContext(title, this.assignmentImage);
      if (this.practiceMode === "assignment") {
        this.activeChallenge = createPracticePlan(
          "assignment",
          title,
          this.freePracticeIntention,
        );
      }
    },
    setAssignmentImage(image: string) {
      if (this.isSessionActive) return;
      this.assignmentImage = image;
      savePracticeContext(this.assignmentTitle, image);
    },
    setFreePracticeIntention(intention: FreePracticeIntention) {
      if (this.isSessionActive) return;
      this.freePracticeIntention = intention;
      if (this.practiceMode === "free") {
        this.activeChallenge = createPracticePlan(
          "free",
          this.assignmentTitle,
          intention,
        );
      }
    },
    markPracticeRound() {
      if (
        this.practiceMode !== "assignment" ||
        this.activeChallenge.completed
      ) return;
      this.activeChallenge.progress += 1;
      if (this.activeChallenge.progress >= this.activeChallenge.target) {
        this.activeChallenge.completed = true;
        this.addTimeline("challenge", "Today's practice goal was completed.");
      }
    },
    completePracticeGoal() {
      if (this.practiceMode !== "assignment") return;
      this.activeChallenge.progress = this.activeChallenge.target;
      this.activeChallenge.completed = true;
      this.addTimeline("challenge", "Today's practice goal was completed.");
    },
  },
});
