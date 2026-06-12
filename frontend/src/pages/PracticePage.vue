<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  CameraIcon,
  PlayIcon,
  StopIcon,
  ViewfinderCircleIcon,
} from "@heroicons/vue/24/outline";
import CameraPanel from "../components/CameraPanel.vue";
import PracticeCoachPanel from "../components/PracticeCoachPanel.vue";
import AudioPitchMeter from "../components/AudioPitchMeter.vue";
import SessionTimeline from "../components/SessionTimeline.vue";
import ChallengeCard from "../components/ChallengeCard.vue";
import { useMicrophone } from "../composables/useMicrophone";
import { usePracticeSession } from "../composables/usePracticeSession";
import { usePracticeStore } from "../stores/practice";
import type {
  AnonymousPoseSnapshot,
  PracticeReviewMoment,
} from "../types/session";

const practiceStore = usePracticeStore();
const { level, pitchStability, startMicrophone, stopMicrophone } = useMicrophone();
const {
  coachMessage,
  loadingCoach,
  durationSeconds,
  startSession,
  endSession,
} = usePracticeSession();

const showGuideOverlay = ref(false);
const enableDynamicTracking = ref(false);
const isPlaying = ref(false);
const microFeedback = ref("");
const reviewMoments = ref<PracticeReviewMoment[]>([]);
let pulseTimer = 0;
let flowMonitorTimer = 0;
let feedbackHideTimer = 0;
let lastSoundAt = 0;
let heardPlayingSincePause = false;
let lastMicroFeedbackAt = 0;
let lastObservationKey = "";
let pendingObservation: { key: string; message: string } | null = null;
const activeObservationStarts = new Map<string, number>();

onMounted(async () => {
  await startMicrophone();
  flowMonitorTimer = window.setInterval(monitorPracticeFlow, 200);
});

onBeforeUnmount(() => {
  clearInterval(pulseTimer);
  clearInterval(flowMonitorTimer);
  clearTimeout(feedbackHideTimer);
  stopMicrophone();
  if (practiceStore.isSessionActive) {
    closeActiveObservations();
    endSession(reviewMoments.value);
  }
});

function startPractice() {
  startSession();
  lastSoundAt = Date.now();
  heardPlayingSincePause = false;
  pendingObservation = null;
  lastObservationKey = "";
  lastMicroFeedbackAt = 0;
  microFeedback.value = "";
  reviewMoments.value = [];
  activeObservationStarts.clear();
  pulseTimer = window.setInterval(() => {
    practiceStore.setPitchStability(pitchStability.value);
    practiceStore.nudgePostureConfidence(Math.random() > 0.5 ? 1 : -1);
    const challengeWasCompleted = practiceStore.activeChallenge.completed;
    practiceStore.incrementChallenge();
    if (!challengeWasCompleted && practiceStore.activeChallenge.completed) {
      showMicroFeedback("Challenge complete. Nice focused work.");
    }
  }, 5000);
}

function stopPractice() {
  clearInterval(pulseTimer);
  clearTimeout(feedbackHideTimer);
  isPlaying.value = false;
  microFeedback.value = "";
  pendingObservation = null;
  closeActiveObservations();
  endSession(reviewMoments.value);
}

function toggleDynamicTracking() {
  enableDynamicTracking.value = !enableDynamicTracking.value;
  if (enableDynamicTracking.value) showGuideOverlay.value = true;
}

function handleObservation(payload: {
  phase: "issue" | "resolved";
  key: string;
  title: string;
  message: string;
  snapshot: AnonymousPoseSnapshot;
}) {
  if (!practiceStore.isSessionActive) return;
  const now = payload.snapshot.capturedAt;
  if (payload.phase === "issue") {
    const existing = reviewMoments.value.find((moment) => moment.key === payload.key);
    if (existing) {
      existing.occurrences += 1;
      existing.lastSeenAt = now;
      existing.suggestion = payload.message;
    } else {
      reviewMoments.value.push({
        id: crypto.randomUUID(),
        key: payload.key,
        title: payload.title,
        suggestion: payload.message,
        firstSeenAt: now,
        lastSeenAt: now,
        occurrences: 1,
        totalDurationSeconds: 0,
        before: payload.snapshot,
      });
    }
    activeObservationStarts.set(payload.key, now);
    pendingObservation = payload;
    if (payload.key !== lastObservationKey) {
      lastObservationKey = payload.key;
      practiceStore.addTimeline("posture", payload.message);
    }
    return;
  }

  const existing = reviewMoments.value.find((moment) => moment.key === payload.key);
  const startedAt = activeObservationStarts.get(payload.key);
  if (!existing || !startedAt) return;
  existing.lastSeenAt = now;
  existing.totalDurationSeconds += Math.max(1, Math.round((now - startedAt) / 1000));
  existing.after = payload.snapshot;
  activeObservationStarts.delete(payload.key);
}

function monitorPracticeFlow() {
  if (!practiceStore.isSessionActive) {
    isPlaying.value = false;
    return;
  }

  const now = Date.now();
  const soundIsActive = level.value >= 4;
  if (soundIsActive) {
    lastSoundAt = now;
    heardPlayingSincePause = true;
    if (!isPlaying.value) {
      isPlaying.value = true;
      microFeedback.value = "";
      clearTimeout(feedbackHideTimer);
    }
    return;
  }

  if (
    isPlaying.value &&
    heardPlayingSincePause &&
    now - lastSoundAt >= 1200
  ) {
    isPlaying.value = false;
    heardPlayingSincePause = false;
    deliverPendingObservation();
  }
}

function deliverPendingObservation() {
  if (
    !pendingObservation ||
    Date.now() - lastMicroFeedbackAt < 8000
  ) return;
  showMicroFeedback(pendingObservation.message);
  pendingObservation = null;
}

function showMicroFeedback(message: string) {
  lastMicroFeedbackAt = Date.now();
  microFeedback.value = message;
  clearTimeout(feedbackHideTimer);
  feedbackHideTimer = window.setTimeout(() => {
    microFeedback.value = "";
  }, 4500);
}

function closeActiveObservations() {
  const now = Date.now();
  for (const [key, startedAt] of activeObservationStarts) {
    const moment = reviewMoments.value.find((item) => item.key === key);
    if (!moment) continue;
    moment.lastSeenAt = now;
    moment.totalDurationSeconds += Math.max(1, Math.round((now - startedAt) / 1000));
  }
  activeObservationStarts.clear();
}
</script>

<template>
  <section class="min-h-[calc(100vh-4.5rem)] bg-stage-950 text-white">
    <div class="mx-auto grid max-w-[1600px] xl:grid-cols-[minmax(0,2.25fr)_minmax(340px,0.9fr)]">
      <div class="min-w-0 border-white/10 xl:border-r">
        <div class="relative">
          <CameraPanel
            :show-guide-overlay="showGuideOverlay"
            :enable-dynamic-tracking="enableDynamicTracking"
            :is-practice-active="practiceStore.isSessionActive"
            :is-playing="isPlaying"
            :micro-feedback="microFeedback"
            @observation="handleObservation"
          />

          <div class="absolute left-4 top-4 z-20 w-44 rounded-2xl border border-white/10 bg-stage-900/80 p-3 shadow-2xl backdrop-blur-md sm:left-6 sm:top-6">
            <div class="mb-3 flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-medium">
              <span class="h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,.8)]"></span>
              Camera
            </div>
            <button
              class="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-white/5"
              @click="showGuideOverlay = !showGuideOverlay"
            >
              <span class="flex items-center gap-2">
                <ViewfinderCircleIcon class="h-5 w-5" />
                Reference Overlay
              </span>
              <span
                class="relative h-6 w-11 shrink-0 rounded-full transition"
                :class="showGuideOverlay ? 'bg-bowly-500' : 'bg-white/25'"
              >
                <span
                  class="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
                  :class="showGuideOverlay ? 'left-6' : 'left-1'"
                ></span>
              </span>
            </button>
            <button
              class="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-white/5"
              @click="toggleDynamicTracking"
            >
              <span class="flex items-center gap-2">
                <CameraIcon class="h-5 w-5" />
                Dynamic Tracking
              </span>
              <span
                class="relative h-6 w-11 shrink-0 rounded-full transition"
                :class="enableDynamicTracking ? 'bg-bowly-500' : 'bg-white/25'"
              >
                <span
                  class="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
                  :class="enableDynamicTracking ? 'left-6' : 'left-1'"
                ></span>
              </span>
            </button>
          </div>

          <div class="absolute right-4 top-4 z-20 rounded-xl border border-white/10 bg-stage-900/75 px-4 py-2 text-sm backdrop-blur-md sm:right-6 sm:top-6">
            {{ Math.floor(durationSeconds / 60).toString().padStart(2, "0") }}:{{ (durationSeconds % 60).toString().padStart(2, "0") }}
          </div>

          <div class="absolute inset-x-4 bottom-4 z-20 sm:inset-x-6 sm:bottom-6">
            <AudioPitchMeter :pitch-stability="practiceStore.metrics.pitchStability" :level="level" />
          </div>
        </div>

        <div class="flex flex-col gap-4 border-t border-white/10 bg-stage-900 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
          <button class="primary-button" :disabled="practiceStore.isSessionActive" @click="startPractice">
            <PlayIcon class="h-5 w-5" />
            Start Session
          </button>
          <p class="text-sm text-white/45 sm:mx-auto">Ensure good lighting and a clear view of your upper body.</p>
          <button class="secondary-button" :disabled="!practiceStore.isSessionActive" @click="stopPractice">
            <StopIcon class="h-5 w-5" />
            End Session
          </button>
        </div>
      </div>

      <aside class="divide-y divide-white/10 bg-[#201d28]">
        <PracticeCoachPanel
          :coach-message="coachMessage"
          :loading-coach="loadingCoach"
          :is-playing="isPlaying"
        />
        <ChallengeCard :challenge="practiceStore.activeChallenge" />
        <SessionTimeline :events="practiceStore.timeline" />
      </aside>
    </div>
  </section>
</template>
