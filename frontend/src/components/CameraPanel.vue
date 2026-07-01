<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { ChevronUpIcon } from "@heroicons/vue/24/outline";
import type { Keypoint, PoseDetector } from "@tensorflow-models/pose-detection";
import type { Hand, HandDetector } from "@tensorflow-models/hand-pose-detection";
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
const TARGET_DETECTION_INTERVAL_MS = 55;
const MAX_DETECTION_INTERVAL_MS = 140;
const HAND_DETECTION_INTERVAL_MS = 320;
const PROCESSING_WIDTH = 320;
const PROCESSING_HEIGHT = 240;
const MIN_KEYPOINT_SCORE = 0.42;
const MIN_HAND_SCORE = 0.52;
const MAX_KEYPOINT_STEP = 42;
const MAX_TRACE_POINT_STEP = 54;
const TRACE_RETENTION_MS = 620;
const TRACE_MIN_POINTS = 3;
const TRACE_ANCHOR_EASE = 0.68;
type HandSignal = {
  handedness: "Left" | "Right";
  score: number;
  center: { x: number; y: number };
  radius: number;
};
type MotionTracePoint = {
  x: number;
  y: number;
  confidence: number;
  time: number;
};
type TfRuntime = typeof import("@tensorflow/tfjs-core");
type PoseDetectionRuntime = typeof import("@tensorflow-models/pose-detection");
type HandPoseRuntime = typeof import("@tensorflow-models/hand-pose-detection");
type BodyTrackingRuntime = {
  tf: TfRuntime;
  pose: PoseDetectionRuntime;
};
let trackingTimer = 0;
let renderFrame = 0;
let lastVideoTime = -1;
let consecutiveTrackingErrors = 0;
let consecutiveHandTrackingErrors = 0;
let poseDetector: PoseDetector | null = null;
let handDetector: HandDetector | null = null;
let handTrackingAvailable = false;
let handDetectionInFlight = false;
let lastHandDetectionAt = 0;
let targetPose: Keypoint[] | null = null;
let renderedPose: Keypoint[] | null = null;
let stablePose: Keypoint[] | null = null;
let targetHands: HandSignal[] = [];
let renderedHands: HandSignal[] = [];
let motionTraceTrail: MotionTracePoint[] = [];
let stableMotionAnchor: MotionTracePoint | null = null;
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
let bodyTrackingRuntimePromise: Promise<BodyTrackingRuntime> | null = null;
let handTrackingRuntimePromise: Promise<HandPoseRuntime> | null = null;
const processingCanvas = document.createElement("canvas");
processingCanvas.width = PROCESSING_WIDTH;
processingCanvas.height = PROCESSING_HEIGHT;
const handProcessingCanvas = document.createElement("canvas");
handProcessingCanvas.width = PROCESSING_WIDTH;
handProcessingCanvas.height = PROCESSING_HEIGHT;

function loadBodyTrackingRuntime() {
  if (!bodyTrackingRuntimePromise) {
    bodyTrackingRuntimePromise = (async () => {
      const [tfRuntime, poseRuntime] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow-models/pose-detection"),
      ]);
      await Promise.all([
        import("@tensorflow/tfjs-backend-webgl"),
        import("@tensorflow/tfjs-backend-cpu"),
      ]);
      return {
        tf: tfRuntime,
        pose: poseRuntime,
      };
    })();
  }
  return bodyTrackingRuntimePromise;
}

function loadHandTrackingRuntime() {
  if (!handTrackingRuntimePromise) {
    handTrackingRuntimePromise = import("@tensorflow-models/hand-pose-detection");
  }
  return handTrackingRuntimePromise;
}

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
  const elbow = landmarks[8] ?? landmarks[7];
  const wrist = landmarks[10] ?? landmarks[9];
  const approximateAngleDegrees =
    elbow &&
    wrist &&
    (elbow.score ?? 0) >= MIN_KEYPOINT_SCORE &&
    (wrist.score ?? 0) >= MIN_KEYPOINT_SCORE
      ? Math.round(Math.abs(Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) * (180 / Math.PI)))
      : undefined;
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
    evidence: {
      label: "live local pose sample",
      quality: approximateAngleDegrees == null ? "limited" : "usable",
      approximateAngleDegrees,
      note: approximateAngleDegrees == null ? "partial view" : "movement signal",
    },
  };
}

function getVideoProjection(video: HTMLVideoElement, displayWidth: number, displayHeight: number) {
  const videoAspect = video.videoWidth / video.videoHeight;
  const displayAspect = displayWidth / displayHeight;
  const renderedWidth = displayAspect > videoAspect
    ? displayWidth
    : displayHeight * videoAspect;
  const renderedHeight = displayAspect > videoAspect
    ? displayWidth / videoAspect
    : displayHeight;
  return {
    renderedWidth,
    renderedHeight,
    offsetX: (displayWidth - renderedWidth) / 2,
    offsetY: (displayHeight - renderedHeight) / 2,
  };
}

function mapProcessingPoint(
  point: { x: number; y: number },
  projection: ReturnType<typeof getVideoProjection>
) {
  return {
    x: projection.offsetX + (point.x / PROCESSING_WIDTH) * projection.renderedWidth,
    y: projection.offsetY + (point.y / PROCESSING_HEIGHT) * projection.renderedHeight,
  };
}

function createHandSignals(hands: Hand[]): HandSignal[] {
  return hands.flatMap((hand) => {
    if ((hand.score ?? 0) < MIN_HAND_SCORE) return [];
    const visiblePoints = hand.keypoints.filter((point) => (point.score ?? 1) >= 0.35);
    if (visiblePoints.length < 9) return [];
    const xs = visiblePoints.map((point) => point.x);
    const ys = visiblePoints.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const center = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
    return [{
      handedness: hand.handedness,
      score: hand.score ?? 0,
      center,
      radius: clamp(Math.max(width, height) / 2, 12, 44),
    }];
  });
}

function drawCaptureLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tone: "lime" | "amber" | "lavender" = "lime"
) {
  const colors = {
    lime: "rgba(190, 242, 100, 0.92)",
    amber: "rgba(252, 211, 77, 0.94)",
    lavender: "rgba(196, 181, 253, 0.92)",
  };
  ctx.save();
  ctx.font = "700 11px Avenir Next, Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(text).width + 18;
  ctx.fillStyle = "rgba(18, 16, 22, 0.66)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.13)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y - 12, width, 24, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors[tone];
  ctx.fillText(text, x + 9, y);
  ctx.restore();
}

function chooseMotionAnchor(points: Map<number, { x: number; y: number; score: number }>) {
  const candidates = [points.get(10), points.get(9)].flatMap((point) => point ? [point] : []);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.score - a.score)[0];
}

function drawMotionTrace(
  ctx: CanvasRenderingContext2D,
  anchor: { x: number; y: number; score: number } | null,
  tone: "good" | "adjust",
  displayWidth: number
) {
  const now = performance.now();
  if (anchor && anchor.score >= MIN_KEYPOINT_SCORE) {
    const anchorStep = stableMotionAnchor
      ? Math.hypot(anchor.x - stableMotionAnchor.x, anchor.y - stableMotionAnchor.y)
      : 0;
    if (!stableMotionAnchor || anchorStep > MAX_TRACE_POINT_STEP * 1.8) {
      stableMotionAnchor = { x: anchor.x, y: anchor.y, confidence: anchor.score, time: now };
      motionTraceTrail = [];
    } else {
      const ease = anchorStep > 18 ? TRACE_ANCHOR_EASE : 0.46;
      stableMotionAnchor = {
        x: stableMotionAnchor.x + (anchor.x - stableMotionAnchor.x) * ease,
        y: stableMotionAnchor.y + (anchor.y - stableMotionAnchor.y) * ease,
        confidence: anchor.score,
        time: now,
      };
    }

    const last = motionTraceTrail.at(-1);
    const step = last && stableMotionAnchor
      ? Math.hypot(stableMotionAnchor.x - last.x, stableMotionAnchor.y - last.y)
      : 0;
    if (stableMotionAnchor && (!last || step > 2.4 || now - last.time > 95)) {
      motionTraceTrail = [
        ...motionTraceTrail.slice(-5),
        stableMotionAnchor,
      ];
    }
  } else if (stableMotionAnchor && now - stableMotionAnchor.time > 260) {
    stableMotionAnchor = null;
  }
  motionTraceTrail = motionTraceTrail.filter((point) => now - point.time < TRACE_RETENTION_MS).slice(-6);
  if (motionTraceTrail.length < TRACE_MIN_POINTS) return;

  const isAdjust = tone === "adjust";
  const stroke = isAdjust ? "252, 211, 77" : "190, 242, 100";
  const xs = motionTraceTrail.map((point) => point.x);
  const ys = motionTraceTrail.map((point) => point.y);
  const bounds = {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
  const hasEnoughMotion = Math.hypot(bounds.right - bounds.left, bounds.bottom - bounds.top) > 18;
  ctx.save();
  ctx.shadowColor = `rgba(${stroke}, ${isAdjust ? 0.38 : 0.32})`;
  ctx.shadowBlur = 10;
  ctx.lineWidth = isAdjust ? 2.8 : 2.2;
  ctx.strokeStyle = `rgba(${stroke}, ${isAdjust ? 0.68 : 0.56})`;
  ctx.beginPath();
  motionTraceTrail.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
      return;
    }
    const previous = motionTraceTrail[index - 1];
    const cx = (previous.x + point.x) / 2;
    const cy = (previous.y + point.y) / 2;
    ctx.quadraticCurveTo(previous.x, previous.y, cx, cy);
  });
  ctx.stroke();

  motionTraceTrail.forEach((point, index) => {
    const age = index / Math.max(1, motionTraceTrail.length - 1);
    const radius = 1.6 + age * 3.4;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${stroke}, ${0.1 + age * 0.58})`;
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const latest = motionTraceTrail.at(-1);
  if (latest) {
    const previous = motionTraceTrail.at(-2);
    if (previous && hasEnoughMotion) {
      const angle = Math.atan2(latest.y - previous.y, latest.x - previous.x);
      const guideLength = 34;
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(${stroke}, 0.36)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(latest.x - Math.cos(angle) * guideLength * 0.45, latest.y - Math.sin(angle) * guideLength * 0.45);
      ctx.lineTo(latest.x + Math.cos(angle) * guideLength, latest.y + Math.sin(angle) * guideLength);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.fillStyle = "rgba(18, 16, 22, 0.74)";
    ctx.arc(latest.x, latest.y, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${stroke}, 0.95)`;
    ctx.stroke();
    ctx.beginPath();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(${stroke}, 0.42)`;
    ctx.arc(latest.x, latest.y, 14, 0.1 * Math.PI, 1.65 * Math.PI);
    ctx.stroke();

    const labelX = Math.min(displayWidth - 150, latest.x + 14);
    drawCaptureLabel(
      ctx,
      isAdjust ? "Adjust view" : hasEnoughMotion ? "Motion trace" : "Holding steady",
      labelX,
      latest.y + 4,
      isAdjust ? "amber" : "lime",
    );
  }
  ctx.restore();
}

function drawHandSignals(
  ctx: CanvasRenderingContext2D,
  hands: HandSignal[],
  projection: ReturnType<typeof getVideoProjection>,
  wristAnchors: Array<{ x: number; y: number; score: number }>
) {
  const shouldShowQuietSignal =
    showGuideOverlay && (Boolean(currentFramingIssue) || showStatusDetail.value || isPracticeActive || isPlaying);
  if (!shouldShowQuietSignal) return;

  if (hands.length) {
    hands.slice(0, 2).forEach((hand) => {
      const center = mapProcessingPoint(hand.center, projection);
      const radius = hand.radius * (projection.renderedWidth / PROCESSING_WIDTH);
      const confidence = clamp(hand.score, 0.35, 1);
      ctx.save();
      ctx.shadowColor = currentFramingIssue
        ? "rgba(252, 211, 77, 0.3)"
        : "rgba(190, 242, 100, 0.24)";
      ctx.shadowBlur = 18;
      const quietAlpha = showStatusDetail.value ? 1 : 0.72;
      ctx.fillStyle = currentFramingIssue
        ? `rgba(252, 211, 77, ${(0.04 + confidence * 0.035) * quietAlpha})`
        : `rgba(190, 242, 100, ${(0.035 + confidence * 0.035) * quietAlpha})`;
      ctx.strokeStyle = currentFramingIssue
        ? `rgba(252, 211, 77, ${(0.22 + confidence * 0.18) * quietAlpha})`
        : `rgba(190, 242, 100, ${(0.2 + confidence * 0.18) * quietAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radius * 0.72, radius * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    return;
  }

  wristAnchors.forEach((anchor) => {
    ctx.save();
    ctx.shadowColor = "rgba(252, 211, 77, 0.32)";
    ctx.shadowBlur = 14;
    ctx.strokeStyle = currentFramingIssue ? "rgba(252, 211, 77, 0.5)" : "rgba(190, 242, 100, 0.44)";
    ctx.fillStyle = currentFramingIssue ? "rgba(252, 211, 77, 0.055)" : "rgba(190, 242, 100, 0.05)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, currentFramingIssue ? 16 : 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
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

  const projection = getVideoProjection(video, displayWidth, displayHeight);
  const pointAt = (landmark: Keypoint) => mapProcessingPoint(landmark, projection);
  const pointMap = new Map<number, { x: number; y: number; score: number }>();
  [5, 6, 7, 8, 9, 10].forEach((index) => {
    const landmark = landmarks[index];
    if (!landmark || (landmark.score ?? 0) < MIN_KEYPOINT_SCORE) return;
    const point = pointAt(landmark);
    pointMap.set(index, { ...point, score: landmark.score ?? 0 });
  });

  const shouldDrawGuidance =
    showGuideOverlay && (Boolean(currentFramingIssue) || showStatusDetail.value || isPracticeActive || isPlaying);
  const quietGuidanceAlpha = showStatusDetail.value || currentFramingIssue ? 1 : 0.72;
  const traceAnchor = chooseMotionAnchor(pointMap);
  if (shouldDrawGuidance) {
    drawMotionTrace(
      ctx,
      traceAnchor,
      currentFramingIssue ? "adjust" : "good",
      displayWidth,
    );
  }

  if (shouldDrawGuidance) {
    [9, 10].forEach((index) => {
      const landmark = landmarks[index];
      if (!landmark || (landmark.score ?? 0) < MIN_KEYPOINT_SCORE) return;
      const point = pointAt(landmark);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
      ctx.shadowBlur = 8;
      ctx.shadowColor = currentFramingIssue
        ? "rgba(252, 211, 77, 0.35)"
        : "rgba(190, 242, 100, 0.3)";
      ctx.fillStyle = showStatusDetail.value || currentFramingIssue
        ? "rgba(32, 29, 40, 0.48)"
        : "rgba(32, 29, 40, 0.34)";
      ctx.fill();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = currentFramingIssue
        ? "rgba(252, 211, 77, 0.58)"
        : `rgba(190, 242, 100, ${0.54 * quietGuidanceAlpha})`;
      ctx.stroke();
    });
    const statusLabel = currentFramingIssue
      ? currentFramingIssue.title
      : renderedHands.length
        ? "LIVE hand capture"
        : "LIVE motion capture";
    if (!hideAmbientStatus) {
      drawCaptureLabel(
        ctx,
        statusLabel,
        18,
        28,
        currentFramingIssue ? "amber" : renderedHands.length ? "lime" : "lavender",
      );
    }
  } else {
    motionTraceTrail = motionTraceTrail.slice(-3);
    stableMotionAnchor = null;
  }
  drawHandSignals(
    ctx,
    renderedHands,
    projection,
    [pointMap.get(9), pointMap.get(10)].flatMap((point) => point ? [point] : [])
  );
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
          ? distance > 20 ? 0.82 : 0.62
          : distance > 30 ? 0.58 : distance > 12 ? 0.38 : 0.26;
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
    if (targetHands.length) {
      renderedHands = targetHands.map((target, index) => {
        const current = renderedHands[index];
        if (!current) return target;
        const ease = 0.5;
        return {
          ...target,
          center: {
            x: current.center.x + (target.center.x - current.center.x) * ease,
            y: current.center.y + (target.center.y - current.center.y) * ease,
          },
          radius: current.radius + (target.radius - current.radius) * ease,
        };
      });
    } else {
      renderedHands = [];
    }
    drawPose(renderedPose);
  } else {
    const drawing = resizeDrawingCanvas();
    drawing?.ctx.clearRect(0, 0, drawing.displayWidth, drawing.displayHeight);
    motionTraceTrail = [];
    stableMotionAnchor = null;
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
  targetHands = [];
  renderedHands = [];
  motionTraceTrail = [];
  stableMotionAnchor = null;
  handDetectionInFlight = false;
  lastHandDetectionAt = 0;
  consecutiveHandTrackingErrors = 0;
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
    trackingStatus.value = "Loading local movement tracking...";
    const { tf, pose } = await loadBodyTrackingRuntime();
    try {
      const webglReady = await tf.setBackend("webgl");
      if (!webglReady) throw new Error("WebGL backend is unavailable.");
    } catch {
      await tf.setBackend("cpu");
    }
    await tf.ready();
    poseDetector = await pose.createDetector(pose.SupportedModels.PoseNet, {
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
    consecutiveHandTrackingErrors = 0;
    void initHandDetailTracking(tf);
  } catch (error) {
    poseDetector?.dispose();
    handDetector?.dispose();
    poseDetector = null;
    handDetector = null;
    handTrackingAvailable = false;
    detectorReady.value = false;
    trackingError.value =
      "Could not load TensorFlow.js body tracking. Reload and try again.";
    console.error(error);
  }
}

async function initHandDetailTracking(tf: TfRuntime) {
  if (!poseDetector || handDetector || handTrackingAvailable) return;
  try {
    const hands = await loadHandTrackingRuntime();
    if (!poseDetector) return;
    handDetector = await hands.createDetector(hands.SupportedModels.MediaPipeHands, {
      runtime: "tfjs",
      modelType: "lite",
      maxHands: 2,
    });
    handTrackingAvailable = true;
    trackingStatus.value = `Body and hand detail tracking are ready (${tf.getBackend().toUpperCase()}).`;
  } catch (handError) {
    handDetector?.dispose();
    handDetector = null;
    handTrackingAvailable = false;
    console.warn("Hand detail tracking unavailable:", handError);
  }
}

function scheduleTracking(delay = TARGET_DETECTION_INTERVAL_MS) {
  window.clearTimeout(trackingTimer);
  trackingTimer = window.setTimeout(() => {
    void runTracking();
  }, delay);
}

function scheduleHandDetection() {
  if (
    !handDetector ||
    !handTrackingAvailable ||
    handDetectionInFlight ||
    performance.now() - lastHandDetectionAt < HAND_DETECTION_INTERVAL_MS
  ) {
    return;
  }
  const handContext = handProcessingCanvas.getContext("2d", { alpha: false });
  if (!handContext) return;

  handContext.drawImage(processingCanvas, 0, 0);
  lastHandDetectionAt = performance.now();
  handDetectionInFlight = true;
  void handDetector.estimateHands(handProcessingCanvas, {
    flipHorizontal: false,
    staticImageMode: false,
  }).then((hands) => {
    targetHands = createHandSignals(hands);
    consecutiveHandTrackingErrors = 0;
  }).catch((handError) => {
    consecutiveHandTrackingErrors += 1;
    targetHands = [];
    console.warn("Hand tracking frame error:", handError);
    if (consecutiveHandTrackingErrors >= 4) {
      handTrackingAvailable = false;
      visibilityStatus.value = "Body view visible";
    }
  }).finally(() => {
    handDetectionInFlight = false;
  });
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
      scheduleHandDetection();
      updateTrackingGuidance(targetPose);
      updatePracticeCue(targetPose);
      if (framingTone.value === "good" && handTrackingAvailable && targetHands.length) {
        visibilityStatus.value = "Hands, fingers, and upper body visible";
      }
      trackingStatus.value = handTrackingAvailable
        ? "Tracking local body and hand signals in real time."
        : "Tracking local movement signals in real time.";
    } else {
      targetPose = null;
      targetHands = [];
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
      consecutiveHandTrackingErrors = 0;
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
  handDetector?.dispose();
  poseDetector = null;
  handDetector = null;
  handTrackingAvailable = false;
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
