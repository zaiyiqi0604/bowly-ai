<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
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
} = defineProps<{
  showGuideOverlay: boolean;
  enableDynamicTracking: boolean;
  isPracticeActive: boolean;
  isPlaying: boolean;
  microFeedback: string;
}>();
const emit = defineEmits<{
  observation: [payload: {
    phase: "issue" | "resolved";
    key: string;
    title: string;
    message: string;
    snapshot: AnonymousPoseSnapshot;
  }];
}>();

const { stream, permissionState, errorMessage, startCamera } = useCamera();
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const detectorReady = ref(false);
const trackingError = ref("");
const trackingStatus = ref("Waiting to start pose tracking...");
const framingTitle = ref("Step into the guide");
const framingDetail = ref("Keep your head, shoulders, elbows, and hands visible.");
const framingTone = ref<"good" | "adjust" | "searching">("searching");
const faceStatus = ref("Face not visible");
const instrumentStatus = ref("Instrument calibration");
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
const TARGET_DETECTION_INTERVAL_MS = 80;
const MAX_DETECTION_INTERVAL_MS = 180;
const PROCESSING_WIDTH = 320;
const PROCESSING_HEIGHT = 240;
const MIN_KEYPOINT_SCORE = 0.42;
const MAX_KEYPOINT_STEP = 42;
let trackingTimer = 0;
let renderFrame = 0;
let lastVideoTime = -1;
let consecutiveTrackingErrors = 0;
let poseDetector: PoseDetector | null = null;
let targetPose: Keypoint[] | null = null;
let renderedPose: Keypoint[] | null = null;
let stablePose: Keypoint[] | null = null;
let secondaryArm: "left" | "right" | null = null;
let secondaryArmHoldUntil = 0;
let pendingCueKey = "";
let pendingCueSince = 0;
let activeCueKey = "";
let emittedCueKey = "";
let violinGuide: { start: Keypoint; end: Keypoint; confidence: number } | null = null;
let bowGuide: { start: Keypoint; end: Keypoint; confidence: number } | null = null;
let bowDetectionStreak = 0;
const processingCanvas = document.createElement("canvas");
processingCanvas.width = PROCESSING_WIDTH;
processingCanvas.height = PROCESSING_HEIGHT;

const BODY_CONNECTIONS = [
  { start: 7, end: 9, group: "arm" },
  { start: 8, end: 10, group: "arm" },
] as const;

onMounted(async () => {
  await startCamera();
});

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

function segmentsIntersect(
  a: Keypoint,
  b: Keypoint,
  c: Keypoint,
  d: Keypoint
) {
  const cross = (p1: Keypoint, p2: Keypoint, p3: Keypoint) =>
    (p2.x - p1.x) * (p3.y - p1.y) -
    (p2.y - p1.y) * (p3.x - p1.x);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createAnonymousSnapshot(landmarks: Keypoint[]): AnonymousPoseSnapshot {
  const normalizeLine = (
    guide: { start: Keypoint; end: Keypoint; confidence: number } | null
  ) => guide
    ? {
        startX: clamp(guide.start.x / PROCESSING_WIDTH, 0, 1),
        startY: clamp(guide.start.y / PROCESSING_HEIGHT, 0, 1),
        endX: clamp(guide.end.x / PROCESSING_WIDTH, 0, 1),
        endY: clamp(guide.end.y / PROCESSING_HEIGHT, 0, 1),
        confidence: clamp(guide.confidence, 0, 1),
      }
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
    bow: normalizeLine(bowGuide),
    violin: normalizeLine(violinGuide),
  };
}

function updateInstrumentEstimate(
  landmarks: Keypoint[],
  processingContext: CanvasRenderingContext2D
) {
  const shoulders = [landmarks[5], landmarks[6]];
  const wrists = [landmarks[9], landmarks[10]];
  if (
    shoulders.some((point) => !point || (point.score ?? 0) < 0.55) ||
    wrists.some((point) => !point || (point.score ?? 0) < 0.48)
  ) {
    violinGuide = null;
    bowGuide = null;
    bowDetectionStreak = 0;
    instrumentStatus.value = "Keep both hands visible";
    return;
  }

  const shoulderCenter = {
    x: (shoulders[0]!.x + shoulders[1]!.x) / 2,
    y: (shoulders[0]!.y + shoulders[1]!.y) / 2,
    score: 1,
  };
  const shoulderWidth = Math.max(24, Math.abs(shoulders[1]!.x - shoulders[0]!.x));
  const wristScores = wrists.map(
    (wrist) =>
      Math.abs(wrist!.x - shoulderCenter.x) -
      Math.abs(wrist!.y - shoulderCenter.y) * 0.45
  );
  const violinWristIndex = wristScores[0] >= wristScores[1] ? 9 : 10;
  const bowWristIndex = violinWristIndex === 9 ? 10 : 9;
  const violinWrist = landmarks[violinWristIndex]!;
  const bowWrist = landmarks[bowWristIndex]!;
  const nose = landmarks[0];
  const chin = {
    x: nose && (nose.score ?? 0) >= 0.45
      ? nose.x + (shoulderCenter.x - nose.x) * 0.38
      : shoulderCenter.x,
    y: nose && (nose.score ?? 0) >= 0.45
      ? nose.y + (shoulderCenter.y - nose.y) * 0.48
      : shoulderCenter.y - shoulderWidth * 0.35,
    score: 0.72,
  };
  violinGuide = {
    start: chin,
    end: { ...violinWrist },
    confidence: Math.min(0.82, violinWrist.score ?? 0),
  };

  const image = processingContext.getImageData(
    0,
    0,
    PROCESSING_WIDTH,
    PROCESSING_HEIGHT
  );
  const pixels = image.data;
  const brightness = (x: number, y: number) => {
    const safeX = clamp(Math.round(x), 0, PROCESSING_WIDTH - 1);
    const safeY = clamp(Math.round(y), 0, PROCESSING_HEIGHT - 1);
    const index = (safeY * PROCESSING_WIDTH + safeX) * 4;
    return pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
  };

  let bestAngle = 0;
  let bestScore = 0;
  const halfLength = clamp(shoulderWidth * 1.65, 48, 112);
  for (let angleDegrees = 0; angleDegrees < 180; angleDegrees += 10) {
    const angle = (angleDegrees * Math.PI) / 180;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const px = -dy;
    const py = dx;
    let score = 0;
    let samples = 0;
    for (let distance = -halfLength; distance <= halfLength; distance += 5) {
      const x = bowWrist.x + dx * distance;
      const y = bowWrist.y + dy * distance;
      if (x < 3 || x >= PROCESSING_WIDTH - 3 || y < 3 || y >= PROCESSING_HEIGHT - 3) {
        continue;
      }
      const center = brightness(x, y);
      const sideA = brightness(x + px * 3, y + py * 3);
      const sideB = brightness(x - px * 3, y - py * 3);
      score += Math.abs(center - (sideA + sideB) / 2);
      samples += 1;
    }
    const normalizedScore = samples ? score / samples : 0;
    if (normalizedScore > bestScore) {
      bestScore = normalizedScore;
      bestAngle = angle;
    }
  }

  if (bestScore < 15) {
    bowDetectionStreak = Math.max(0, bowDetectionStreak - 1);
    if (bowDetectionStreak === 0) bowGuide = null;
    instrumentStatus.value = "Searching for the bow";
    return;
  }

  bowDetectionStreak = Math.min(4, bowDetectionStreak + 1);
  const dx = Math.cos(bestAngle);
  const dy = Math.sin(bestAngle);
  const nextGuide = {
    start: {
      x: clamp(bowWrist.x - dx * halfLength, 0, PROCESSING_WIDTH),
      y: clamp(bowWrist.y - dy * halfLength, 0, PROCESSING_HEIGHT),
      score: 1,
    },
    end: {
      x: clamp(bowWrist.x + dx * halfLength, 0, PROCESSING_WIDTH),
      y: clamp(bowWrist.y + dy * halfLength, 0, PROCESSING_HEIGHT),
      score: 1,
    },
    confidence: Math.min(0.9, bestScore / 36),
  };
  if (!bowGuide) {
    bowGuide = nextGuide;
  } else {
    const ease = 0.16;
    bowGuide = {
      start: {
        ...nextGuide.start,
        x: bowGuide.start.x + (nextGuide.start.x - bowGuide.start.x) * ease,
        y: bowGuide.start.y + (nextGuide.start.y - bowGuide.start.y) * ease,
      },
      end: {
        ...nextGuide.end,
        x: bowGuide.end.x + (nextGuide.end.x - bowGuide.end.x) * ease,
        y: bowGuide.end.y + (nextGuide.end.y - bowGuide.end.y) * ease,
      },
      confidence: nextGuide.confidence,
    };
  }
  instrumentStatus.value =
    bowDetectionStreak >= 2 ? "Violin and bow guides ready" : "Stabilizing bow line";
}

function getSecondaryArm(landmarks: Keypoint[]) {
  const leftSegments = [
    [landmarks[5], landmarks[7]],
    [landmarks[7], landmarks[9]],
  ] as const;
  const rightSegments = [
    [landmarks[6], landmarks[8]],
    [landmarks[8], landmarks[10]],
  ] as const;
  const crossing = leftSegments.some(([leftStart, leftEnd]) =>
    rightSegments.some(
      ([rightStart, rightEnd]) =>
        leftStart &&
        leftEnd &&
        rightStart &&
        rightEnd &&
        segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)
    )
  );

  if (crossing) {
    const leftConfidence = Math.min(
      landmarks[5]?.score ?? 0,
      landmarks[7]?.score ?? 0,
      landmarks[9]?.score ?? 0
    );
    const rightConfidence = Math.min(
      landmarks[6]?.score ?? 0,
      landmarks[8]?.score ?? 0,
      landmarks[10]?.score ?? 0
    );
    secondaryArm = leftConfidence < rightConfidence ? "left" : "right";
    secondaryArmHoldUntil = performance.now() + 320;
  } else if (performance.now() > secondaryArmHoldUntil) {
    secondaryArm = null;
  }

  return secondaryArm;
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

  const shoulderWidth = Math.max(
    1,
    Math.abs((landmarks[6]?.x ?? 0) - (landmarks[5]?.x ?? 0))
  );
  const currentSecondaryArm = getSecondaryArm(landmarks);
  const showBowGuide = Boolean(bowGuide && bowDetectionStreak >= 2);
  const bowSide = violinGuide
    ? Math.hypot(landmarks[9]!.x - violinGuide.end.x, landmarks[9]!.y - violinGuide.end.y) <
      Math.hypot(landmarks[10]!.x - violinGuide.end.x, landmarks[10]!.y - violinGuide.end.y)
      ? "right"
      : "left"
    : null;
  if (showBowGuide && bowGuide) {
    const from = pointAt(bowGuide.start);
    const to = pointAt(bowGuide.end);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = 5;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(18, 16, 22, 0.65)";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(251, 146, 60, 0.45)";
    ctx.strokeStyle = `rgba(251, 146, 60, ${bowGuide.confidence})`;
    ctx.stroke();
  }
  for (const connection of BODY_CONNECTIONS) {
    const { start: startIndex, end: endIndex, group } = connection;
    const isForearm = startIndex === 7 || startIndex === 8;
    const side = startIndex % 2 === 1 ? "left" : "right";
    if (showBowGuide && bowSide && side !== bowSide) continue;
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    if (
      !start ||
      !end ||
      (start.score ?? 0) < MIN_KEYPOINT_SCORE ||
      (end.score ?? 0) < MIN_KEYPOINT_SCORE
    ) continue;

    const from = pointAt(start);
    const to = pointAt(end);
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
    const maxLength = shoulderWidth * (isForearm ? 2.15 : 1.75);
    if (group === "arm" && segmentLength > maxLength) continue;

    const color = practiceCueTone.value === "adjust"
      ? "252, 211, 77"
      : "190, 242, 100";
    const confidence = Math.min(start.score ?? 0, end.score ?? 0);
    const isSecondary =
      !showBowGuide && group === "arm" && side === currentSecondaryArm;

    if (group === "arm" && !isSecondary) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.setLineDash([]);
      ctx.lineWidth = 4.6;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(18, 16, 22, 0.7)";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.setLineDash(isSecondary ? [6, 6] : []);
    ctx.lineWidth = isSecondary ? 1.5 : 2;
    ctx.shadowBlur = isSecondary ? 1 : 5;
    ctx.shadowColor = `rgba(${color}, ${isSecondary ? 0.15 : 0.4})`;
    ctx.strokeStyle = `rgba(${color}, ${
      isSecondary ? Math.min(0.42, confidence) : Math.min(0.95, confidence + 0.14)
    })`;
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const jointIndexes = showBowGuide && bowSide
    ? bowSide === "left"
      ? [7, 9]
      : [8, 10]
    : [7, 8, 9, 10];
  jointIndexes.forEach((index) => {
    const landmark = landmarks[index];
    if (!landmark || (landmark.score ?? 0) < MIN_KEYPOINT_SCORE) return;
    const point = pointAt(landmark);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.shadowBlur = 7;
    ctx.shadowColor = "rgba(167, 139, 250, 0.65)";
    ctx.fillStyle = "rgba(40, 33, 53, 0.72)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(196, 181, 253, 0.95)";
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

    if (nextScore < MIN_KEYPOINT_SCORE) {
      return {
        ...previous,
        score: Math.max(0, (previous.score ?? 0) - 0.12),
      };
    }

    if (distance <= MAX_KEYPOINT_STEP) return { ...next };

    const step = nextScore > 0.72 ? MAX_KEYPOINT_STEP : MAX_KEYPOINT_STEP * 0.45;
    const ratio = step / distance;
    return {
      ...next,
      x: previous.x + (next.x - previous.x) * ratio,
      y: previous.y + (next.y - previous.y) * ratio,
      score: nextScore > 0.72 ? nextScore : Math.min(nextScore, 0.55),
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
    const leftScore = (landmarks[1]?.score ?? 0) + (landmarks[3]?.score ?? 0);
    const rightScore = (landmarks[2]?.score ?? 0) + (landmarks[4]?.score ?? 0);
    faceStatus.value = Math.abs(leftScore - rightScore) > 0.55
      ? "Turn your face slightly toward the camera"
      : "Face position ready";
  } else {
    faceStatus.value = "Keep your face visible";
  }

  if (visible.length < 7 || !shouldersVisible) {
    framingTone.value = "searching";
    framingTitle.value = "Finding your upper body";
    framingDetail.value = "Face the camera and improve the light on your shoulders.";
    return;
  }

  const shoulderWidth = Math.abs(shoulders[1]!.x - shoulders[0]!.x);
  const shoulderCenter = (shoulders[0]!.x + shoulders[1]!.x) / 2;
  if (shoulderWidth > PROCESSING_WIDTH * 0.48) {
    framingTone.value = "adjust";
    framingTitle.value = "Move back a little";
    framingDetail.value = "Leave enough room for both elbows and hands.";
    return;
  }
  if (shoulderWidth < PROCESSING_WIDTH * 0.16) {
    framingTone.value = "adjust";
    framingTitle.value = "Move a little closer";
    framingDetail.value = "Your shoulders are too small for stable tracking.";
    return;
  }
  if (shoulderCenter < PROCESSING_WIDTH * 0.32) {
    framingTone.value = "adjust";
    framingTitle.value = "Move slightly right";
    framingDetail.value = "Center your shoulders inside the camera frame.";
    return;
  }
  if (shoulderCenter > PROCESSING_WIDTH * 0.68) {
    framingTone.value = "adjust";
    framingTitle.value = "Move slightly left";
    framingDetail.value = "Center your shoulders inside the camera frame.";
    return;
  }
  if (armsVisible < 3) {
    framingTone.value = "adjust";
    framingTitle.value = "Show both arms";
    framingDetail.value = "Keep elbows and hands inside the frame while playing.";
    return;
  }

  framingTone.value = "good";
  framingTitle.value = "Framing looks good";
  framingDetail.value = "Upper body and playing arms are clearly visible.";
}

function updatePracticeCue(landmarks: Keypoint[]) {
  if (framingTone.value !== "good") {
    pendingCueKey = "";
    pendingCueSince = 0;
    return;
  }

  const leftShoulder = landmarks[5];
  const rightShoulder = landmarks[6];
  if (!leftShoulder || !rightShoulder) return;
  const shoulderWidth = Math.max(1, Math.abs(rightShoulder.x - leftShoulder.x));
  const shoulderTilt = Math.abs(rightShoulder.y - leftShoulder.y) / shoulderWidth;

  let candidate: {
    key: string;
    title: string;
    detail: string;
    tone: "good" | "adjust";
  } = {
    key: "steady",
    title: "Nice, steady movement",
    detail: "Keep playing naturally. No correction is needed right now.",
    tone: "good",
  };

  if (secondaryArm) {
    candidate = {
      key: "arms-overlap",
      title: "Keep moving naturally",
      detail: "Give your arms a little more space on the next phrase.",
      tone: "adjust",
    };
  } else if (shoulderTilt > 0.28) {
    candidate = {
      key: "shoulders",
      title: "Keep moving naturally",
      detail: "Relax your shoulder a little on the next phrase.",
      tone: "adjust",
    };
  }

  const now = performance.now();
  if (candidate.key !== pendingCueKey) {
    pendingCueKey = candidate.key;
    pendingCueSince = now;
    return;
  }
  const requiredDuration = candidate.tone === "adjust" ? 1400 : 800;
  if (candidate.key === activeCueKey || now - pendingCueSince < requiredDuration) return;

  activeCueKey = candidate.key;
  practiceCueTitle.value = candidate.title;
  practiceCueDetail.value = candidate.detail;
  practiceCueTone.value = candidate.tone;
  if (isPracticeActive && candidate.tone === "adjust" && candidate.key !== emittedCueKey) {
    emittedCueKey = candidate.key;
    emit("observation", {
      phase: "issue",
      key: candidate.key,
      title: candidate.key === "shoulders" ? "Shoulder balance" : "Arm visibility",
      message: candidate.detail,
      snapshot: createAnonymousSnapshot(landmarks),
    });
  }
  if (isPracticeActive && candidate.tone === "good" && emittedCueKey) {
    emit("observation", {
      phase: "resolved",
      key: emittedCueKey,
      title: emittedCueKey === "shoulders" ? "Shoulder balance" : "Arm visibility",
      message: "The movement became clearer and more relaxed.",
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
        const positionEase = distance > 30 ? 0.5 : distance > 12 ? 0.32 : 0.2;
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
  secondaryArm = null;
  secondaryArmHoldUntil = 0;
  violinGuide = null;
  bowGuide = null;
  bowDetectionStreak = 0;
  instrumentStatus.value = "Instrument calibration";
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
      updateInstrumentEstimate(targetPose, processingContext);
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
          <div
            v-if="isPracticeActive && isPlaying && framingTone === 'good' && !microFeedback"
            class="absolute bottom-40 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-stage-950/45 px-3 py-2 text-[11px] text-white/45 backdrop-blur-sm sm:left-6"
          >
            <span
              class="h-2 w-2 rounded-full transition-colors duration-700"
              :class="practiceCueTone === 'adjust' ? 'bg-amber-300/70' : 'bg-lime-300/70'"
            ></span>
            Bowly is listening quietly
          </div>
          <div
            v-else
            class="absolute bottom-40 left-4 max-w-[min(22rem,calc(100%-2rem))] rounded-2xl border border-white/10 bg-stage-950/80 p-3 text-white shadow-xl backdrop-blur-md transition-opacity duration-500 sm:left-6"
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
            <div class="mt-2 flex items-center gap-2 border-t border-white/10 pt-2 text-[11px] text-white/45">
              <span class="rounded-full bg-white/[0.06] px-2 py-1">{{ faceStatus }}</span>
              <span class="rounded-full bg-orange-300/10 px-2 py-1 text-orange-200/70">
                {{ instrumentStatus }}
              </span>
              <span class="hidden sm:inline">{{ trackingError || trackingStatus }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="absolute left-1/2 top-[17%] h-12 w-12 -translate-x-1/2 rounded-full border-2 border-lime-300/80"></div>
          <div class="absolute left-1/2 top-[29%] h-[31%] w-0.5 bg-lime-300/80"></div>
          <div class="absolute left-[37%] top-[32%] w-[26%] border-t-2 border-dashed border-lime-300/80"></div>
          <div class="absolute left-[40%] top-[56%] w-[20%] border-t-2 border-dashed border-lime-300/70"></div>
          <div class="absolute left-[56%] top-[41%] h-11 w-18 -rotate-12 rounded-[50%] border-2 border-bowly-400/80"></div>
          <div class="absolute left-[42%] top-[46%] w-[36%] rotate-[22deg] border-t-2 border-bowly-400/80"></div>
          <div class="absolute bottom-40 left-6 rounded-lg bg-stage-950/70 px-3 py-2 text-xs text-white/70 backdrop-blur">
            Static reference guides are on.
          </div>
        </template>
    </div>

    <div v-if="permissionState !== 'granted'" class="absolute inset-0 grid place-items-center p-8">
      <div class="max-w-md text-center">
        <div class="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/5 text-3xl text-bowly-300">B</div>
        <h2 class="mt-6 text-2xl font-semibold">Camera Observation</h2>
        <p class="mt-3 text-sm leading-6 text-white/45">
          {{ errorMessage ?? "Waiting for camera permission so Bowly can observe posture and violin balance." }}
        </p>
        <button
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
