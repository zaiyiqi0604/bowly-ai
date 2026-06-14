<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  AdjustmentsHorizontalIcon,
  CameraIcon,
  ChevronUpIcon,
  PlayIcon,
  SparklesIcon,
  StopIcon,
  ViewfinderCircleIcon,
} from "@heroicons/vue/24/outline";
import CameraPanel from "../components/CameraPanel.vue";
import PracticeCoachPanel from "../components/PracticeCoachPanel.vue";
import AudioPitchMeter from "../components/AudioPitchMeter.vue";
import SessionTimeline from "../components/SessionTimeline.vue";
import PracticePlanCard from "../components/PracticePlanCard.vue";
import PauseActions from "../components/PauseActions.vue";
import { useMicrophone } from "../composables/useMicrophone";
import { usePracticeSession } from "../composables/usePracticeSession";
import { usePracticeStore } from "../stores/practice";
import type {
  AnonymousPoseSnapshot,
  PracticeActivityStats,
  PracticeReviewMoment,
} from "../types/session";

const practiceStore = usePracticeStore();
const router = useRouter();
const {
  signalActive,
  hasReliablePitch,
  calibrationState,
  pitchStability,
  noteName,
  centsOffset,
  permissionState: microphonePermission,
  errorMessage: microphoneError,
  startMicrophone,
  calibrateNoise,
  stopMicrophone,
} = useMicrophone();
const {
  coachMessage,
  loadingCoach,
  durationSeconds,
  startSession,
  endSession,
  requestCoachMessage,
} = usePracticeSession();

const showGuideOverlay = ref(false);
const enableDynamicTracking = ref(false);
const showCameraControls = ref(false);
const isPlaying = ref(false);
const microFeedback = ref("");
const reviewMoments = ref<PracticeReviewMoment[]>([]);
const activity = ref<PracticeActivityStats>(createEmptyActivity());
const showPauseActions = ref(false);
const startState = ref<"idle" | "preparing" | "blocked">("idle");
const startIssue = ref("");
const allowAudioOnly = ref(false);
const allowStartAnyway = ref(false);
const audioOnlyMode = ref(false);
const cameraRequestId = ref(0);
const cameraEnabled = ref(false);
const cameraStatus = ref<{
  permission: "idle" | "granted" | "denied";
  trackingReady: boolean;
  framing: "good" | "adjust" | "searching";
  message: string;
}>({
  permission: "idle",
  trackingReady: false,
  framing: "searching",
  message: "Waiting for camera.",
});
const pitchDataQuality = computed(() => activity.value.pitchDataQuality);
const mobileAmbientStatus = computed(() => {
  if (startState.value === "preparing") return "Checking camera and microphone";
  if (startIssue.value) return startIssue.value;
  if (!practiceStore.isSessionActive) {
    return cameraStatus.value.framing === "good" ? "Ready to play" : cameraStatus.value.message;
  }
  if (cameraStatus.value.framing !== "good") return cameraStatus.value.message;
  return isPlaying.value ? "Posture steady" : "Listening when you play";
});
const mobileAmbientTone = computed(() =>
  startIssue.value || cameraStatus.value.framing === "adjust" ? "adjust" : "good",
);
let flowMonitorTimer = 0;
let feedbackHideTimer = 0;
let lastSoundAt = 0;
let heardPlayingSincePause = false;
let lastMicroFeedbackAt = 0;
let lastCoachRequestAt = 0;
let lastObservationKey = "";
let pendingObservation: { key: string; message: string } | null = null;
const activeObservationStarts = new Map<string, number>();
let lastFlowSampleAt = 0;
let currentPhraseStartedAt = 0;

function createEmptyActivity(): PracticeActivityStats {
  return {
    phraseCount: 0,
    phraseDurationsSeconds: [],
    pauseCount: 0,
    totalPlayingSeconds: 0,
    longestContinuousSeconds: 0,
    pitchedSeconds: 0,
    inTuneSeconds: 0,
    stablePitchSeconds: 0,
    inTunePercent: 0,
    stablePitchPercent: 0,
    pitchDataQuality: "insufficient",
  };
}

function updateActivityPercentages() {
  const pitchedSeconds = activity.value.pitchedSeconds;
  activity.value.inTunePercent = pitchedSeconds
    ? Math.round((activity.value.inTuneSeconds / pitchedSeconds) * 100)
    : 0;
  activity.value.stablePitchPercent = pitchedSeconds
    ? Math.round((activity.value.stablePitchSeconds / pitchedSeconds) * 100)
    : 0;
  activity.value.pitchDataQuality =
    pitchedSeconds < 3
      ? "insufficient"
      : pitchedSeconds < 12
        ? "limited"
        : "good";
}

function finishCurrentPhrase() {
  if (!currentPhraseStartedAt) return;
  const phraseSeconds = Math.max(0, (lastSoundAt - currentPhraseStartedAt) / 1000);
  activity.value.longestContinuousSeconds = Math.max(
    activity.value.longestContinuousSeconds,
    phraseSeconds,
  );
  if (phraseSeconds >= 0.5) {
    activity.value.phraseDurationsSeconds.push(phraseSeconds);
  }
  currentPhraseStartedAt = 0;
}

onMounted(() => {
  flowMonitorTimer = window.setInterval(monitorPracticeFlow, 200);
});

onBeforeUnmount(() => {
  clearInterval(flowMonitorTimer);
  clearTimeout(feedbackHideTimer);
  stopMicrophone();
  cameraEnabled.value = false;
  if (practiceStore.isSessionActive) {
    finishCurrentPhrase();
    closeActiveObservations();
    updateActivityPercentages();
    practiceStore.setPitchStability(activity.value.stablePitchPercent);
    endSession(reviewMoments.value, activity.value);
  }
});

function beginSession() {
  startSession();
  lastSoundAt = Date.now();
  heardPlayingSincePause = false;
  pendingObservation = null;
  lastObservationKey = "";
  lastMicroFeedbackAt = 0;
  lastCoachRequestAt = 0;
  microFeedback.value = "";
  reviewMoments.value = [];
  activity.value = createEmptyActivity();
  lastFlowSampleAt = Date.now();
  currentPhraseStartedAt = 0;
  showPauseActions.value = false;
  activeObservationStarts.clear();
}

function waitForCameraCheck(timeoutMs = 3500) {
  return new Promise<void>((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (
        cameraStatus.value.framing === "good" ||
        cameraStatus.value.permission === "denied" ||
        Date.now() - startedAt >= timeoutMs
      ) {
        window.clearInterval(timer);
        resolve();
      }
    }, 120);
  });
}

async function startPractice() {
  if (startState.value === "preparing") return;
  startState.value = "preparing";
  startIssue.value = "";
  allowAudioOnly.value = false;
  allowStartAnyway.value = false;
  audioOnlyMode.value = false;
  prepareCamera();

  await startMicrophone();
  if (microphonePermission.value !== "granted") {
    cameraEnabled.value = false;
    startState.value = "blocked";
    startIssue.value = "Microphone access is needed to listen to the practice.";
    return;
  }
  if (calibrationState.value !== "ready") {
    const calibrated = await calibrateNoise();
    if (!calibrated) {
      cameraEnabled.value = false;
      stopMicrophone();
      startState.value = "blocked";
      startIssue.value = "The microphone could not measure the room sound.";
      return;
    }
  }

  await waitForCameraCheck();
  if (cameraStatus.value.permission === "denied") {
    cameraEnabled.value = false;
    startState.value = "blocked";
    startIssue.value = "Camera access is unavailable. You can continue with audio only.";
    allowAudioOnly.value = true;
    return;
  }
  if (cameraStatus.value.framing !== "good") {
    if (window.matchMedia("(max-width: 767px)").matches) {
      startState.value = "idle";
      startIssue.value = "";
      allowStartAnyway.value = false;
      beginSession();
      showMicroFeedback("Partial view active. Only clearly visible movement will be assessed.");
      return;
    }
    startState.value = "blocked";
    startIssue.value =
      cameraStatus.value.message ||
      "Keep your upper body and both hands inside the camera view.";
    allowStartAnyway.value = true;
    stopMicrophone();
    return;
  }

  startState.value = "idle";
  beginSession();
}

function startAudioOnly() {
  audioOnlyMode.value = true;
  showGuideOverlay.value = false;
  enableDynamicTracking.value = false;
  startState.value = "idle";
  startIssue.value = "";
  beginSession();
}

function startWithoutGoodFraming() {
  startState.value = "idle";
  startIssue.value = "";
  allowStartAnyway.value = false;
  beginSession();
}

function stopPractice() {
  clearTimeout(feedbackHideTimer);
  finishCurrentPhrase();
  isPlaying.value = false;
  microFeedback.value = "";
  pendingObservation = null;
  showPauseActions.value = false;
  closeActiveObservations();
  updateActivityPercentages();
  practiceStore.setPitchStability(activity.value.stablePitchPercent);
  endSession(reviewMoments.value, activity.value);
  stopMicrophone();
  cameraEnabled.value = false;
  void router.push("/report");
}

function toggleDynamicTracking() {
  enableDynamicTracking.value = !enableDynamicTracking.value;
  if (enableDynamicTracking.value) showGuideOverlay.value = true;
}

watch(isPlaying, (playing) => {
  if (playing) showCameraControls.value = false;
});

function prepareCamera() {
  cameraEnabled.value = true;
  showGuideOverlay.value = true;
  enableDynamicTracking.value = true;
  cameraRequestId.value += 1;
}

function handleCameraStatus(payload: typeof cameraStatus.value) {
  cameraStatus.value = payload;
}

function continueAfterPause(action: "again" | "next") {
  showPauseActions.value = false;
  microFeedback.value = "";
  if (action === "next") {
    if (practiceStore.practiceMode === "assignment") {
      practiceStore.markPracticeRound();
    }
    practiceStore.addTimeline(
      "coach",
      practiceStore.practiceMode === "assignment"
        ? "Moved to the next practice section."
        : "Continued free practice.",
    );
  }
}

function handleObservation(payload: {
  phase: "issue" | "resolved";
  key: string;
  title: string;
  message: string;
  confidence: number;
  category: "framing" | "posture";
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
      existing.confidence = Math.max(existing.confidence ?? 0, payload.confidence);
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
        confidence: payload.confidence,
        category: payload.category,
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
  practiceStore.setPitchStability(pitchStability.value);
  if (!practiceStore.isSessionActive) {
    isPlaying.value = false;
    return;
  }

  const now = Date.now();
  const sampleSeconds = lastFlowSampleAt
    ? Math.min(0.5, Math.max(0, (now - lastFlowSampleAt) / 1000))
    : 0;
  lastFlowSampleAt = now;
  const soundIsActive = signalActive.value && hasReliablePitch.value;
  if (soundIsActive) {
    activity.value.totalPlayingSeconds += sampleSeconds;
    if (noteName.value) {
      activity.value.pitchedSeconds += sampleSeconds;
      if (Math.abs(centsOffset.value) <= 15) {
        activity.value.inTuneSeconds += sampleSeconds;
      }
      if (pitchStability.value >= 70) {
        activity.value.stablePitchSeconds += sampleSeconds;
      }
      updateActivityPercentages();
    }
    lastSoundAt = now;
    heardPlayingSincePause = true;
    if (!isPlaying.value) {
      isPlaying.value = true;
      showPauseActions.value = false;
      currentPhraseStartedAt = now;
      activity.value.phraseCount += 1;
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
    showPauseActions.value = true;
    activity.value.pauseCount += 1;
    finishCurrentPhrase();
    deliverPendingObservation();
    if (now - lastCoachRequestAt >= 15000) {
      lastCoachRequestAt = now;
      void requestPauseFeedback();
    }
  }
}

async function requestPauseFeedback() {
  const message = await requestCoachMessage(reviewMoments.value, activity.value);
  if (message && !isPlaying.value && practiceStore.isSessionActive) {
    showMicroFeedback(message);
    return;
  }
  if (
    !microFeedback.value &&
    !isPlaying.value &&
    practiceStore.isSessionActive &&
    activity.value.phraseCount > 0
  ) {
    showMicroFeedback("Nice focus. Take one calm breath before the next phrase.");
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
  <section class="min-h-[calc(100vh-4.5rem)] bg-stage-950 pb-0 text-white">
    <div class="mx-auto grid max-w-[1600px] xl:grid-cols-[minmax(0,2.25fr)_minmax(340px,0.9fr)]">
      <div class="min-w-0 border-white/10 xl:border-r">
        <div class="relative max-md:h-[calc(100dvh-4.25rem)] max-md:min-h-[34rem] max-md:overflow-hidden">
          <CameraPanel
            class="max-md:!h-full max-md:!min-h-0"
            :show-guide-overlay="showGuideOverlay"
            :enable-dynamic-tracking="enableDynamicTracking"
            :is-practice-active="practiceStore.isSessionActive"
            :is-playing="isPlaying"
            :micro-feedback="microFeedback"
            :camera-request-id="cameraRequestId"
            :camera-enabled="cameraEnabled"
            hide-ambient-status
            @observation="handleObservation"
            @status="handleCameraStatus"
          />

          <div class="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
            <div class="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-stage-900/55 px-3 text-xs font-medium shadow-lg backdrop-blur-md">
              <span class="h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,.8)]"></span>
              Camera
            </div>
          </div>

          <div
            class="absolute left-4 top-14 z-20 flex max-w-[calc(100%-8rem)] items-center gap-2 rounded-full border border-white/10 bg-stage-950/55 px-3 py-1.5 text-[11px] text-white/70 shadow-lg backdrop-blur-md md:hidden"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="mobileAmbientTone === 'good'
                ? 'bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,.55)]'
                : 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.45)]'"
            ></span>
            <span class="truncate">{{ mobileAmbientStatus }}</span>
          </div>

          <div class="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
            <div class="rounded-full border border-white/10 bg-stage-900/55 px-3 py-2 text-xs tabular-nums backdrop-blur-md">
              {{ Math.floor(durationSeconds / 60).toString().padStart(2, "0") }}:{{ (durationSeconds % 60).toString().padStart(2, "0") }}
            </div>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-stage-900/55 text-white/75 shadow-lg backdrop-blur-md hover:bg-stage-900/80 hover:text-white"
              :aria-expanded="showCameraControls"
              aria-label="Camera display settings"
              @click="showCameraControls = !showCameraControls"
            >
              <AdjustmentsHorizontalIcon class="h-5 w-5" />
            </button>

            <div
              v-if="showCameraControls"
              class="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-stage-900/90 p-2 shadow-2xl backdrop-blur-xl"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5"
                @click="showGuideOverlay = !showGuideOverlay"
              >
                <span class="flex items-center gap-2.5">
                  <ViewfinderCircleIcon class="h-5 w-5 text-white/60" />
                  Reference overlay
                </span>
                <span
                  class="relative h-5 w-9 shrink-0 rounded-full transition"
                  :class="showGuideOverlay ? 'bg-bowly-500' : 'bg-white/20'"
                >
                  <span
                    class="absolute top-1 h-3 w-3 rounded-full bg-white transition-all"
                    :class="showGuideOverlay ? 'left-5' : 'left-1'"
                  ></span>
                </span>
              </button>
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5"
                @click="toggleDynamicTracking"
              >
                <span class="flex items-center gap-2.5">
                  <CameraIcon class="h-5 w-5 text-white/60" />
                  Dynamic tracking
                </span>
                <span
                  class="relative h-5 w-9 shrink-0 rounded-full transition"
                  :class="enableDynamicTracking ? 'bg-bowly-500' : 'bg-white/20'"
                >
                  <span
                    class="absolute top-1 h-3 w-3 rounded-full bg-white transition-all"
                    :class="enableDynamicTracking ? 'left-5' : 'left-1'"
                  ></span>
                </span>
              </button>
              <p class="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] text-white/35">
                <ChevronUpIcon class="h-3.5 w-3.5 rotate-90" />
                Controls stay hidden while you play.
              </p>
            </div>
          </div>

          <div class="absolute bottom-4 left-1/2 z-20 hidden w-[min(94%,46rem)] -translate-x-1/2 md:block">
            <AudioPitchMeter
              :pitch-stability="pitchStability"
              :note-name="noteName"
              :cents-offset="centsOffset"
              :permission-state="microphonePermission"
              :error-message="microphoneError"
              :data-quality="pitchDataQuality"
            />
          </div>

          <div
            v-if="microFeedback"
            class="absolute inset-x-3 bottom-[5.75rem] z-30 flex items-start gap-2.5 rounded-2xl border border-bowly-300/20 bg-stage-950/82 px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-xl md:hidden"
          >
            <SparklesIcon class="mt-0.5 h-4 w-4 shrink-0 text-bowly-200" />
            <div class="min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-bowly-200/70">AI Coach</p>
              <p class="mt-0.5 truncate text-white/85">{{ microFeedback }}</p>
            </div>
          </div>

          <div class="absolute inset-x-0 bottom-0 z-40 border-t border-white/10 bg-stage-950/88 px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(9,8,14,.35)] backdrop-blur-xl md:hidden">
            <div
              v-if="startIssue"
              class="mb-2 flex items-center justify-between gap-2 rounded-xl bg-amber-300/10 px-3 py-2 text-[11px] text-amber-100/85"
            >
              <span class="line-clamp-2">{{ startIssue }}</span>
              <button
                v-if="allowAudioOnly"
                type="button"
                class="shrink-0 font-semibold text-bowly-200"
                @click="startAudioOnly"
              >
                Audio only
              </button>
              <button
                v-else-if="allowStartAnyway"
                type="button"
                class="shrink-0 font-semibold text-bowly-200"
                @click="startWithoutGoodFraming"
              >
                Start anyway
              </button>
            </div>
            <div class="flex items-center gap-2.5">
              <AudioPitchMeter
                class="min-w-0 flex-1"
                compact
                :pitch-stability="pitchStability"
                :note-name="noteName"
                :cents-offset="centsOffset"
                :permission-state="microphonePermission"
                :error-message="microphoneError"
                :data-quality="pitchDataQuality"
              />
              <button
                v-if="practiceStore.isSessionActive"
                type="button"
                class="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-bowly-500 px-4 text-sm font-semibold text-white shadow-lg shadow-bowly-950/30"
                @click="stopPractice"
              >
                <StopIcon class="h-4 w-4" />
                Stop
              </button>
              <button
                v-else
                type="button"
                class="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-bowly-500 px-4 text-sm font-semibold text-white shadow-lg shadow-bowly-950/30 disabled:cursor-wait disabled:opacity-70"
                :disabled="startState === 'preparing'"
                @click="startPractice"
              >
                <PlayIcon class="h-4 w-4" />
                {{ startState === "preparing" ? "Checking" : "Start" }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="practiceStore.isSessionActive"
          class="hidden flex-col gap-4 border-t border-white/10 bg-stage-900 px-4 py-5 sm:flex-row sm:items-center sm:px-6 md:flex"
        >
          <p class="text-sm text-white/45 sm:mr-auto">
            {{ audioOnlyMode ? "Audio-only practice is active." : "Practice session is active." }}
          </p>
          <button class="secondary-button" @click="stopPractice">
            <StopIcon class="h-5 w-5" />
            End Practice
          </button>
        </div>
        <PauseActions
          v-if="practiceStore.isSessionActive && showPauseActions && !isPlaying"
          class="max-md:hidden"
          :assignment-mode="practiceStore.practiceMode === 'assignment'"
          @again="continueAfterPause('again')"
          @next="continueAfterPause('next')"
          @end="stopPractice"
        />
      </div>

      <aside class="divide-y divide-white/10 bg-[#201d28] max-md:hidden">
        <template v-if="isPlaying">
          <PracticeCoachPanel
            :coach-message="coachMessage"
            :loading-coach="loadingCoach"
            :is-playing="true"
            compact
          />
        </template>
        <template v-else-if="!practiceStore.isSessionActive">
          <PracticePlanCard
            :mode="practiceStore.practiceMode"
            :assignment-title="practiceStore.assignmentTitle"
            :assignment-image="practiceStore.assignmentImage"
            :plan="practiceStore.activeChallenge"
            :is-session-active="false"
            :is-playing="false"
            :activity="activity"
            :start-state="startState"
            :start-issue="startIssue"
            :allow-audio-only="allowAudioOnly"
            :allow-start-anyway="allowStartAnyway"
            @update:mode="practiceStore.setPracticeMode"
            @update:assignment-title="practiceStore.setAssignmentTitle"
            @update:assignment-image="practiceStore.setAssignmentImage"
            @start="startPractice"
            @retry="startPractice"
            @audio-only="startAudioOnly"
            @start-anyway="startWithoutGoodFraming"
          />
        </template>
        <template v-else>
          <PracticeCoachPanel
            :coach-message="coachMessage"
            :loading-coach="loadingCoach"
            :is-playing="false"
          />
          <PracticePlanCard
            :mode="practiceStore.practiceMode"
            :assignment-title="practiceStore.assignmentTitle"
            :assignment-image="practiceStore.assignmentImage"
            :plan="practiceStore.activeChallenge"
            :is-session-active="true"
            :is-playing="false"
            :activity="activity"
            @mark-round="practiceStore.markPracticeRound"
            @complete="practiceStore.completePracticeGoal"
          />
          <SessionTimeline :events="practiceStore.timeline" />
        </template>
      </aside>
    </div>
  </section>
</template>
