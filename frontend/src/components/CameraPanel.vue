<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { ChevronUpIcon } from "@heroicons/vue/24/outline";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import {
  SupportedModels,
  createDetector,
  type Keypoint,
  type PoseDetector,
} from "@tensorflow-models/pose-detection";
import { useCamera } from "../composables/useCamera";
import type { AnonymousPoseSnapshot } from "../types/session";

const {
  showGuideOverlay,
  enableDynamicTracking,
  isPracticeActive,
  isPlaying,
  microFeedback,
  cameraRequestId,
  hideAmbientStatus,
  cameraEnabled,
} = defineProps<{
  showGuideOverlay: boolean;
  enableDynamicTracking: boolean;
  isPracticeActive: boolean;
  isPlaying: boolean;
  microFeedback: string;
  cameraRequestId: number;
  hideAmbientStatus?: boolean;
  cameraEnabled: boolean;
}>();
const emit = defineEmits<{
  observation: [payload: {
    phase: "issue" | "resolved";
    key: string;
    title: string;
    message: string;
    confidence: number;
    category: "framing" | "posture";
    snapshot: AnonymousPoseSnapshot;
  }];
  status: [payload: {
    permission: "idle" | "granted" | "denied";
    trackingReady: boolean;
    framing: "good" | "adjust" | "searching";
    message: string;
  }];
}>();

const { stream, permissionState, errorMessage, startCamera, stopCamera } = useCamera();
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const detectorReady = ref(false);
const trackingError = ref("");
const trackingStatus = ref("Waiting to start pose tracking...");
const framingTitle = ref("Step into the guide");
const framingDetail = ref("Keep your head, shoulders, elbows, and hands visible.");
const framingTone = ref<"good" | "adjust" | "searching">("searching");
const faceStatus = ref("Face not visible");
const visibilityStatus = ref("Waiting for a clear body view");
const showStatusDetail = ref(false);
const practiceCueTitle = ref("Move naturally");
const practiceCueDetail = ref("Gentle feedback appears only when an adjustment persists.");
const practiceCueTone = ref<"good" | "adjust">("good");
const coachTitle = computed(() =>
  microFeedback
    ? "A small idea for the next phrase"
    : framingTone.value === "good"
      ? practiceCueTitle.value
      : framingTitle.value
);
const coachDetail = computed(() =>
  microFeedback ||
  (framingTone.value === "good" ? practiceCueDetail.value : framingDetail.value)
);
const coachTone = computed(() =>
  framingTone.value === "good" ? practiceCueTone.value : framingTone.value
);
const ambientStatus = computed(() => {
  if (microFeedback) return microFeedback;
  if (framingTone.value === "good") {
    return practiceCueTone.value === "adjust"
      ? practiceCueTitle.value
      : "Upper body in view";
  }
  return framingDetail.value;
});
const TARGET_DETECTION_INTERVAL_MS = 80;
const MAX_DETECTION_INTERVAL_MS = 180;
const PROCESSING_WIDTH = 320;
const PROCESSING_HEIGHT = 240;
const MIN_KEYPOINT_SCORE = 0.42;
const MAX_KEYPOINT_STEP = 30;
let trackingTimer = 0;
let renderFrame = 0;
let lastVideoTime = -1;
let consecutiveTrackingErrors = 0;
let poseDetector: PoseDetector | null = null;
let targetPose: Keypoint[] | null = null;
let renderedPose: Keypoint[] | null = null;
let stablePose: Keypoint[] | null = null;
let pendingCueKey = "";
let pendingCueSince = 0;
let activeCueKey = "";
let emittedCueKey = "";
let currentFramingIssue: {
  key: string;
  title: string;
  detail: string;
  confidence: number;
} | null = null;
const processingCanvas = document.createElement("canvas");
processingCanvas.width = PROCESSING_WIDTH;
processingCanvas.height = PROCESSING_HEIGHT;

watch(
  () => cameraRequestId,
  (requestId, previousRequestId) => {
    if (cameraEnabled && requestId > previousRequestId) void startCamera();
  }
);

watch(
  () => cameraEnabled,
  (enabled) => {
    if (enabled) return;
    stopCamera();
    if (videoRef.value) videoRef.value.srcObject = null;
    window.clearTimeout(trackingTimer);
    stopRenderLoop();
  },
);

watch(
  [stream, permissionState],
  async ([newStream, newPermissionState]) => {
    if (newPermissionState !== "granted" || !newStream) return;
    await nextTick();
    if (videoRef.value) videoRef.value.srcObject = newStream;
  },
  { immediate: true }
);

watch(videoRef, (element) => {
  if (element && stream.value) element.srcObject = stream.value;
});

watch(
  () => isPlaying,
  (playing) => {
    if (playing) showStatusDetail.value = false;
  }
);

watch(
  [permissionState, detectorReady, framingTone, framingDetail],
  ([permission, ready, framing, message]) => {
    emit("status", {
      permission,
      trackingReady: ready,
      framing,
      message,
    });
  },
  { immediate: true }
);

function resizeDrawingCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.round(displayWidth * pixelRatio);
  const nextHeight = Math.round(displayHeight * pixelRatio);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { ctx, displayWidth, displayHeight };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createAnonymousSnapshot(landmarks: Keypoint[]): AnonymousPoseSnapshot {
  return {
    capturedAt: Date.now(),
    points: [5, 6, 7, 8, 9, 10].flatMap((id) => {
      const point = landmarks[id];
      if (!point || (point.score ?? 0) < MIN_KEYPOINT_SCORE) return [];
      return [{
        id,
        x: clamp(point.x / PROCESSING_WIDTH, 0, 1),
        y: clamp(point.y / PROCESSING_HEIGHT, 0, 1),
        confidence: clamp(point.score ?? 0, 0, 1),
      }];
    }),
  };
}

function drawPose(landmarks: Keypoint[]) {
  const video = videoRef.value;
  const drawing = resizeDrawingCanvas();
  if (!drawing || !video) return;
  const { ctx, displayWidth, displayHeight } = drawing;

  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const videoAspect = video.videoWidth / video.videoHeight;
  const displayAspect = displayWidth / displayHeight;
  const renderedWidth = displayAspect > videoAspect
    ? displayWidth
    : displayHeight * videoAspect;
  const renderedHeight = displayAspect > videoAspect
    ? displayWidth / videoAspect
    : displayHeight;
  const offsetX = (displayWidth - renderedWidth) / 2;
  const offsetY = (displayHeight - renderedHeight) / 2;
  const pointAt = (landmark: Keypoint) => ({
    x: offsetX + (landmark.x / PROCESSING_WIDTH) * renderedWidth,
    y: offsetY + (landmark.y / PROCESSING_HEIGHT) * renderedHeight,
  });

  [7, 8, 9, 10].forEach((index) => {
    const landmark = landmarks[index];
    if (!landmark || (landmark.score ?? 0) < MIN_KEYPOINT_SCORE) return;
    const point = pointAt(landmark);
    const isHand = index === 9 || index === 10;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isHand ? 7 : 4, 0, Math.PI * 2);
    ctx.shadowBlur = isHand ? 10 : 4;
    ctx.shadowColor = currentFramingIssue
      ? "rgba(252, 211, 77, 0.45)"
      : "rgba(190, 242, 100, 0.45)";
    ctx.fillStyle = "rgba(32, 29, 40, 0.72)";
    ctx.fill();
    ctx.lineWidth = isHand ? 2 : 1.5;
    ctx.strokeStyle = currentFramingIssue
      ? "rgba(252, 211, 77, 0.82)"
      : "rgba(190, 242, 100, 0.78)";
    ctx.stroke();
  });
  ctx.restore();
}

function resolveArmIdentity(nextPose: Keypoint[]) {
  if (!stablePose) return nextPose;
  const resolved = nextPose.map((point) => ({ ...point }));
  const pairs = [
    [7, 8],
    [9, 10],
  ] as const;

  for (const [leftIndex, rightIndex] of pairs) {
    const previousLeft = stablePose[leftIndex];
    const previousRight = stablePose[rightIndex];
    const nextLeft = resolved[leftIndex];
    const nextRight = resolved[rightIndex];
    if (!previousLeft || !previousRight || !nextLeft || !nextRight) continue;
    if (
      (nextLeft.score ?? 0) < MIN_KEYPOINT_SCORE ||
      (nextRight.score ?? 0) < MIN_KEYPOINT_SCORE
    ) continue;

    const directCost =
      Math.hypot(nextLeft.x - previousLeft.x, nextLeft.y - previousLeft.y) +
      Math.hypot(nextRight.x - previousRight.x, nextRight.y - previousRight.y);
    const swappedCost =
      Math.hypot(nextRight.x - previousLeft.x, nextRight.y - previousLeft.y) +
      Math.hypot(nextLeft.x - previousRight.x, nextLeft.y - previousRight.y);

    if (swappedCost + 18 < directCost) {
      resolved[leftIndex] = { ...nextRight };
      resolved[rightIndex] = { ...nextLeft };
    }
  }

  return resolved;
}

function stabilizePose(nextPose: Keypoint[]) {
  nextPose = resolveArmIdentity(nextPose);
  if (!stablePose || stablePose.length !== nextPose.length) {
    stablePose = nextPose.map((point) => ({ ...point }));
    return stablePose;
  }

  stablePose = nextPose.map((next, index) => {
    const previous = stablePose?.[index] ?? next;
    const nextScore = next.score ?? 0;
    const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
    const isWrist = index === 9 || index === 10;
    const isElbow = index === 7 || index === 8;

    if (nextScore < MIN_KEYPOINT_SCORE) {
      return {
        ...previous,
        score: Math.max(0, (previous.score ?? 0) - 0.055),
      };
    }

    const maxStep = isWrist
      ? MAX_KEYPOINT_STEP
      : isElbow
        ? MAX_KEYPOINT_STEP * 0.8
        : MAX_KEYPOINT_STEP * 0.55;
    const confidenceEase = nextScore > 0.75 ? 1 : nextScore > 0.58 ? 0.72 : 0.48;
    const motionEase = isWrist
      ? distance > 18 ? 0.58 : 0.36
      : isElbow
        ? distance > 14 ? 0.46 : 0.3
        : 0.22;
    const allowedDistance = Math.min(distance, maxStep * confidenceEase);
    const ratio = distance > 0
      ? Math.min(motionEase, allowedDistance / distance)
      : 1;
    return {
      ...next,
      x: previous.x + (next.x - previous.x) * ratio,
      y: previous.y + (next.y - previous.y) * ratio,
      score:
        (previous.score ?? nextScore) +
        (nextScore - (previous.score ?? nextScore)) * 0.35,
    };
  });

  return stablePose;
}

function updateTrackingGuidance(landmarks: Keypoint[]) {
  const visible = landmarks.filter((point) => (point.score ?? 0) >= MIN_KEYPOINT_SCORE);
  const facePoints = landmarks.slice(0, 5);
  const visibleFacePoints = facePoints.filter(
    (point) => (point?.score ?? 0) >= MIN_KEYPOINT_SCORE
  );
  const shoulders = [landmarks[5], landmarks[6]];
  const elbows = [landmarks[7], landmarks[8]];
  const wrists = [landmarks[9], landmarks[10]];
  const shouldersVisible = shoulders.every(
    (point) => point && (point.score ?? 0) >= MIN_KEYPOINT_SCORE
  );
  const armsVisible = [...elbows, ...wrists].filter(
    (point) => point && (point.score ?? 0) >= MIN_KEYPOINT_SCORE
  ).length;

  if (visibleFacePoints.length >= 3) {
    faceStatus.value = "Face visible";
  } else {
    faceStatus.value = "Keep your face visible";
  }

  if (visible.length < 7 || !shouldersVisible) {
    currentFramingIssue = {
      key: "body-not-visible",
      title: "Camera view",
      detail: "Move into the camera view before the next phrase.",
      confidence: 0.9,
    };
    framingTone.value = "searching";
    framingTitle.value = "Finding your upper body";
    framingDetail.value = "Face the camera and improve the light on your shoulders.";
    return;
  }

  const shoulderWidth = Math.abs(shoulders[1]!.x - shoulders[0]!.x);
  const shoulderCenter = (shoulders[0]!.x + shoulders[1]!.x) / 2;
  if (armsVisible < 3) {
    currentFramingIssue = {
      key: "arms-not-visible",
      title: "Camera framing",
      detail: "Move the phone slightly farther away or turn it sideways so both hands stay visible.",
      confidence: 0.86,
    };
    framingTone.value = "adjust";
    framingTitle.value = "Keep both hands in view";
    framingDetail.value = "A wider view is more useful than moving closer.";
    return;
  }
  if (shoulderWidth > PROCESSING_WIDTH * 0.48) {
    currentFramingIssue = {
      key: "too-close",
      title: "Camera framing",
      detail: "Move the phone slightly farther away or turn it sideways so both hands stay visible.",
      confidence: 0.88,
    };
    framingTone.value = "adjust";
    framingTitle.value = "Move back a little";
    framingDetail.value = "Leave enough room for both elbows and hands.";
    return;
  }
  if (armsVisible === 4 && shoulderWidth < PROCESSING_WIDTH * 0.12) {
    currentFramingIssue = {
      key: "too-far",
      title: "Camera distance",
      detail: "If tracking remains unclear, move the phone slightly closer without cropping either hand.",
      confidence: 0.86,
    };
    framingTone.value = "adjust";
    framingTitle.value = "Tracking view is very small";
    framingDetail.value = "Keep both hands visible if you adjust the phone.";
    return;
  }
  if (shoulderCenter < PROCESSING_WIDTH * 0.32) {
    currentFramingIssue = {
      key: "off-center",
      title: "Camera position",
      detail: "Move slightly right to stay inside the camera view.",
      confidence: 0.84,
    };
    framingTone.value = "adjust";
    framingTitle.value = "Move slightly right";
    framingDetail.value = "Center your shoulders inside the camera frame.";
    return;
  }
  if (shoulderCenter > PROCESSING_WIDTH * 0.68) {
    currentFramingIssue = {
      key: "off-center",
      title: "Camera position",
      detail: "Move slightly left to stay inside the camera view.",
      confidence: 0.84,
    };
    framingTone.value = "adjust";
    framingTitle.value = "Move slightly left";
    framingDetail.value = "Center your shoulders inside the camera frame.";
    return;
  }
  currentFramingIssue = null;
  framingTone.value = "good";
  framingTitle.value = "Framing looks good";
  framingDetail.value = "Upper body and playing arms are clearly visible.";
}

function updatePracticeCue(landmarks: Keypoint[]) {
  const candidate = currentFramingIssue;
  const now = performance.now();
  const candidateKey = candidate?.key ?? "clear";
  if (candidateKey !== pendingCueKey) {
    pendingCueKey = candidateKey;
    pendingCueSince = now;
    return;
  }
  if (candidateKey === activeCueKey || now - pendingCueSince < 2500) return;

  activeCueKey = candidateKey;
  practiceCueTitle.value = candidate?.title ?? "Tracking looks clear";
  practiceCueDetail.value =
    candidate?.detail ?? "Bowly can see both hands and your upper body.";
  practiceCueTone.value = candidate ? "adjust" : "good";
  visibilityStatus.value = candidate
    ? "View needs a small adjustment"
    : "Hands and upper body visible";
  if (isPracticeActive && candidate && candidate.key !== emittedCueKey) {
    emittedCueKey = candidate.key;
    emit("observation", {
      phase: "issue",
      key: candidate.key,
      title: candidate.title,
      message: candidate.detail,
      confidence: candidate.confidence,
      category: "framing",
      snapshot: createAnonymousSnapshot(landmarks),
    });
  }
  if (isPracticeActive && !candidate && emittedCueKey) {
    emit("observation", {
      phase: "resolved",
      key: emittedCueKey,
      title: "Camera view",
      message: "The camera view became clear again.",
      confidence: 0.9,
      category: "framing",
      snapshot: createAnonymousSnapshot(landmarks),
    });
    emittedCueKey = "";
  }
}

function updateRenderedPose() {
  if (targetPose) {
    if (!renderedPose || renderedPose.length !== targetPose.length) {
      renderedPose = targetPose.map((point) => ({ ...point }));
    } else {
      renderedPose = renderedPose.map((current, index) => {
        const target = targetPose?.[index] ?? current;
        const distance = Math.hypot(target.x - current.x, target.y - current.y);
        const isHand = index === 9 || index === 10;
        const positionEase = isHand
          ? distance > 20 ? 0.62 : 0.42
          : distance > 30 ? 0.48 : distance > 12 ? 0.3 : 0.2;
        return {
          ...target,
          x: current.x + (target.x - current.x) * positionEase,
          y: current.y + (target.y - current.y) * positionEase,
          score:
            (current.score ?? 0) +
            ((target.score ?? 0) - (current.score ?? 0)) * 0.25,
        };
      });
    }
    drawPose(renderedPose);
  } else {
    const drawing = resizeDrawingCanvas();
    drawing?.ctx.clearRect(0, 0, drawing.displayWidth, drawing.displayHeight);
  }
  renderFrame = window.requestAnimationFrame(updateRenderedPose);
}

function startRenderLoop() {
  window.cancelAnimationFrame(renderFrame);
  renderFrame = window.requestAnimationFrame(updateRenderedPose);
}

function stopRenderLoop() {
  window.cancelAnimationFrame(renderFrame);
  renderFrame = 0;
  targetPose = null;
  renderedPose = null;
  stablePose = null;
  currentFramingIssue = null;
  visibilityStatus.value = "Waiting for a clear body view";
  pendingCueKey = "";
  pendingCueSince = 0;
  activeCueKey = "";
  emittedCueKey = "";
  practiceCueTitle.value = "Move naturally";
  practiceCueDetail.value =
    "Gentle feedback appears only when an adjustment persists.";
  practiceCueTone.value = "good";
}

async function initDynamicTracking() {
  try {
    trackingStatus.value = "Loading TensorFlow.js body tracking...";
    try {
      const webglReady = await tf.setBackend("webgl");
      if (!webglReady) throw new Error("WebGL backend is unavailable.");
    } catch {
      await tf.setBackend("cpu");
    }
    await tf.ready();
    poseDetector = await createDetector(SupportedModels.PoseNet, {
      architecture: "MobileNetV1",
      outputStride: 16,
      inputResolution: { width: 257, height: 257 },
      multiplier: 0.75,
      quantBytes: 2,
      modelUrl: "/models/posenet-model.json",
    });
    detectorReady.value = true;
    trackingError.value = "";
    trackingStatus.value = `Body tracking is ready (${tf.getBackend().toUpperCase()}).`;
    lastVideoTime = -1;
    consecutiveTrackingErrors = 0;
  } catch (error) {
    poseDetector?.dispose();
    poseDetector = null;
    detectorReady.value = false;
    trackingError.value =
      "Could not load TensorFlow.js body tracking. Reload and try again.";
    console.error(error);
  }
}

function scheduleTracking(delay = TARGET_DETECTION_INTERVAL_MS) {
  window.clearTimeout(trackingTimer);
  trackingTimer = window.setTimeout(() => {
    void runTracking();
  }, delay);
}

async function runTracking() {
  if (!showGuideOverlay || !enableDynamicTracking) return;
  const video = videoRef.value;
  if (!poseDetector || !video) {
    trackingStatus.value = "Waiting for camera and model...";
    scheduleTracking();
    return;
  }
  if (video.readyState < 2 || video.videoWidth === 0) {
    trackingStatus.value = "Waiting for camera frames...";
    scheduleTracking();
    return;
  }
  if (video.currentTime === lastVideoTime) {
    scheduleTracking();
    return;
  }
  lastVideoTime = video.currentTime;

  try {
    const inferenceStartedAt = performance.now();
    const processingContext = processingCanvas.getContext("2d", { alpha: false });
    if (!processingContext) throw new Error("Could not create the tracking canvas.");
    processingContext.drawImage(
      video,
      0,
      0,
      PROCESSING_WIDTH,
      PROCESSING_HEIGHT
    );
    const result = await poseDetector.estimatePoses(processingCanvas, {
      maxPoses: 1,
      flipHorizontal: false,
    });
    const landmarks = result[0]?.keypoints;
    if (landmarks?.length) {
      targetPose = stabilizePose(landmarks);
      updateTrackingGuidance(targetPose);
      updatePracticeCue(targetPose);
      trackingStatus.value = "Tracking your posture in real time.";
    } else {
      targetPose = null;
      framingTone.value = "searching";
      framingTitle.value = "No body detected";
      framingDetail.value = "Stand facing the camera with your upper body visible.";
      faceStatus.value = "Face not visible";
      trackingStatus.value = "No pose detected yet. Keep your upper body in frame.";
    }
    consecutiveTrackingErrors = 0;
    const inferenceDuration = performance.now() - inferenceStartedAt;
    scheduleTracking(Math.min(
      MAX_DETECTION_INTERVAL_MS,
      Math.max(0, TARGET_DETECTION_INTERVAL_MS - inferenceDuration)
    ));
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    consecutiveTrackingErrors += 1;
    console.warn("Pose tracking frame error:", errorText);
    if (consecutiveTrackingErrors >= 3) {
      trackingError.value = `Tracking paused: ${errorText}`;
      trackingStatus.value = "Static Overlay is still available.";
      return;
    }
    trackingStatus.value =
      `Tracking frame failed (${consecutiveTrackingErrors}/3), retrying...`;
    scheduleTracking(MAX_DETECTION_INTERVAL_MS);
  }
}

watch(
  [() => showGuideOverlay, () => enableDynamicTracking],
  async ([overlayEnabled, dynamicEnabled]) => {
    if (!overlayEnabled || !dynamicEnabled) {
      window.clearTimeout(trackingTimer);
      stopRenderLoop();
      trackingStatus.value = dynamicEnabled
        ? "Pose tracking paused."
        : "Static guide mode is active.";
      if (!dynamicEnabled) trackingError.value = "";
      lastVideoTime = -1;
      consecutiveTrackingErrors = 0;
      const canvas = canvasRef.value;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (!detectorReady.value) await initDynamicTracking();
    if (!poseDetector) return;
    window.clearTimeout(trackingTimer);
    trackingError.value = "";
    consecutiveTrackingErrors = 0;
    trackingStatus.value = "Starting live pose tracking...";
    startRenderLoop();
    scheduleTracking(0);
  }
);

onBeforeUnmount(() => {
  window.clearTimeout(trackingTimer);
  stopRenderLoop();
  poseDetector?.dispose();
  poseDetector = null;
});
</script>

<template>
  <section class="relative min-h-[620px] overflow-hidden bg-stage-950 lg:min-h-[calc(100vh-9rem)]">
    <video
      v-if="permissionState === 'granted'"
      ref="videoRef"
      autoplay
      playsinline
      muted
      class="absolute inset-0 h-full w-full object-cover"
    ></video>
    <div
      v-if="permissionState === 'granted'"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(18,16,22,.18)_70%,rgba(18,16,22,.65)_100%)]"
    ></div>

    <div v-if="permissionState === 'granted' && showGuideOverlay" class="pointer-events-none absolute inset-0">
        <template v-if="enableDynamicTracking">
          <canvas ref="canvasRef" class="h-full w-full"></canvas>
          <div class="absolute inset-x-[19%] bottom-[22%] top-[15%] opacity-35">
            <span class="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l border-t border-lime-200/70"></span>
            <span class="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r border-t border-lime-200/70"></span>
            <span class="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b border-l border-lime-200/70"></span>
            <span class="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b border-r border-lime-200/70"></span>
          </div>

          <button
            v-if="!hideAmbientStatus"
            type="button"
            class="pointer-events-auto absolute bottom-40 left-1/2 flex min-h-9 w-[min(72%,32rem)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/10 bg-stage-950/55 px-3.5 py-2 text-left text-xs text-white/70 shadow-lg backdrop-blur-md transition hover:bg-stage-950/70"
            :aria-expanded="showStatusDetail"
            @click="showStatusDetail = !showStatusDetail"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full transition-colors duration-700"
              :class="{
                'bg-lime-300/80 shadow-[0_0_10px_rgba(190,242,100,.5)]': coachTone === 'good',
                'bg-amber-300/80 shadow-[0_0_10px_rgba(252,211,77,.4)]': coachTone === 'adjust',
                'bg-white/35': coachTone === 'searching',
              }"
            ></span>
            <span class="min-w-0 flex-1 truncate">{{ ambientStatus }}</span>
            <ChevronUpIcon
              class="h-4 w-4 shrink-0 text-white/35 transition-transform"
              :class="showStatusDetail ? 'rotate-180' : ''"
            />
          </button>

          <div
            v-if="showStatusDetail && !hideAmbientStatus"
            class="pointer-events-auto absolute bottom-[12rem] left-1/2 w-[min(72%,32rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-stage-950/85 p-3 text-white shadow-xl backdrop-blur-xl"
          >
            <div class="flex items-start gap-3">
              <span
                class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                :class="{
                  'bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,.8)]': coachTone === 'good',
                  'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,.6)]': coachTone === 'adjust',
                  'bg-white/35': coachTone === 'searching',
                }"
              ></span>
              <div>
                <p class="text-sm font-semibold">{{ coachTitle }}</p>
                <p class="mt-0.5 text-xs leading-5 text-white/55">{{ coachDetail }}</p>
              </div>
            </div>
            <div class="mt-2 border-t border-white/10 pt-2 text-[11px] leading-5 text-white/45">
              {{ faceStatus }} · {{ visibilityStatus }}
              <span class="hidden sm:inline"> · {{ trackingError || trackingStatus }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="absolute inset-x-[19%] bottom-[22%] top-[15%] opacity-35">
            <span class="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l border-t border-lime-200/70"></span>
            <span class="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r border-t border-lime-200/70"></span>
            <span class="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b border-l border-lime-200/70"></span>
            <span class="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b border-r border-lime-200/70"></span>
          </div>
          <div
            v-if="!hideAmbientStatus"
            class="absolute bottom-40 left-1/2 flex h-9 w-[min(72%,32rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-stage-950/55 px-3.5 text-xs text-white/60 backdrop-blur-md"
          >
            <span class="h-2 w-2 rounded-full bg-lime-300/70"></span>
            Keep your upper body and both hands in view
          </div>
        </template>
    </div>

    <div v-if="permissionState !== 'granted'" class="absolute inset-0 grid place-items-center p-8">
      <div class="max-w-md text-center">
        <div class="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/5 text-3xl text-bowly-300">B</div>
        <h2 class="mt-6 text-2xl font-semibold">
          {{ cameraEnabled ? "Camera Observation" : "Ready when you are" }}
        </h2>
        <p class="mt-3 text-sm leading-6 text-white/45">
          {{
            cameraEnabled
              ? errorMessage ?? "Waiting for camera permission so Bowly can observe posture and violin balance."
              : "Camera and microphone stay off until you start practice."
          }}
        </p>
        <button
          v-if="cameraEnabled && permissionState === 'denied'"
          type="button"
          class="primary-button mt-6 pointer-events-auto"
          @click="startCamera"
        >
          Retry camera
        </button>
      </div>
    </div>

    <div class="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-stage-950 via-stage-950/35 to-transparent"></div>
  </section>
</template>
