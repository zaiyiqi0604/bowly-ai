<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useCamera } from "../composables/useCamera";

type FaceDetectorLike = {
  detect: (
    source: HTMLVideoElement
  ) => Promise<Array<{ boundingBox?: { x: number; y: number; width: number; height: number } }>>;
};

type FaceDetectorCtor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorLike;

const { showGuideOverlay, enableDynamicTracking } = defineProps<{
  showGuideOverlay: boolean;
  enableDynamicTracking: boolean;
}>();

const { stream, permissionState, errorMessage, startCamera } = useCamera();
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const detectorReady = ref(false);
const trackingError = ref("");
const trackingStatus = ref("Waiting to start pose tracking...");
const DETECTION_INTERVAL_MS = 150;
let trackingFrame = 0;
let lastDetectionTs = 0;
let faceDetector: FaceDetectorLike | null = null;

onMounted(async () => {
  await startCamera();
});

watch(
  [stream, permissionState],
  async ([newStream, newPermissionState]) => {
    if (newPermissionState !== "granted" || !newStream) return;
    await nextTick();
    if (videoRef.value) {
      videoRef.value.srcObject = newStream;
    }
  },
  { immediate: true }
);

watch(videoRef, (element) => {
  if (element && stream.value) {
    element.srcObject = stream.value;
  }
});

function drawLink(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  from: number,
  to: number
) {
  const start = points[from];
  const end = points[to];
  if (!start || !end) return;

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function drawPseudoSkeleton(
  faceBox: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(130, 181, 156, 0.92)";
  ctx.fillStyle = "rgba(111, 90, 213, 0.88)";

  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;
  const centerX = (faceBox.x + faceBox.width * 0.5) * scaleX;
  const headY = (faceBox.y + faceBox.height * 0.5) * scaleY;
  const shoulderY = (faceBox.y + faceBox.height * 1.2) * scaleY;
  const hipY = shoulderY + faceBox.height * 1.2 * scaleY;
  const shoulderOffset = faceBox.width * 0.95 * scaleX;
  const handY = shoulderY + faceBox.height * 0.95 * scaleY;
  const handOffset = faceBox.width * 1.25 * scaleX;

  const points = [
    { x: centerX, y: headY }, // head
    { x: centerX - shoulderOffset, y: shoulderY }, // left shoulder
    { x: centerX + shoulderOffset, y: shoulderY }, // right shoulder
    { x: centerX, y: hipY }, // hip center
    { x: centerX - handOffset, y: handY }, // left hand
    { x: centerX + handOffset, y: handY }, // right hand
  ];

  const links: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 2],
    [1, 3],
    [2, 3],
    [1, 4],
    [2, 5],
  ];
  links.forEach(([from, to]) => drawLink(ctx, points, from, to));

  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

async function initDynamicTracking() {
  try {
    trackingStatus.value = "Loading dynamic detector...";
    const detectorCtor = (window as Window & { FaceDetector?: FaceDetectorCtor })
      .FaceDetector;
    if (!detectorCtor) {
      throw new Error("FaceDetector API is not supported in this browser.");
    }
    faceDetector = new detectorCtor({
      fastMode: true,
      maxDetectedFaces: 1,
    });
    detectorReady.value = true;
    trackingError.value = "";
    trackingStatus.value = "Dynamic tracking is active.";
    lastDetectionTs = 0;
  } catch (error) {
    detectorReady.value = false;
    trackingError.value =
      "Dynamic tracking is unavailable on this browser. Use Static Overlay for stable guidance.";
    console.error(error);
  }
}

async function runTracking() {
  if (!showGuideOverlay || !enableDynamicTracking) return;
  if (!faceDetector || !videoRef.value) {
    trackingStatus.value = "Waiting for camera and model...";
    trackingFrame = requestAnimationFrame(() => {
      void runTracking();
    });
    return;
  }
  if (videoRef.value.readyState < 2 || videoRef.value.videoWidth === 0) {
    trackingStatus.value = "Waiting for camera frames...";
    trackingFrame = requestAnimationFrame(() => {
      void runTracking();
    });
    return;
  }
  const now = performance.now();
  if (now - lastDetectionTs < DETECTION_INTERVAL_MS) {
    trackingFrame = requestAnimationFrame(() => {
      void runTracking();
    });
    return;
  }
  lastDetectionTs = now;

  try {
    const faces = await faceDetector.detect(videoRef.value);
    const faceBox = faces[0]?.boundingBox;
    if (faceBox && faceBox.width && faceBox.height) {
      drawPseudoSkeleton(
        {
          x: faceBox.x,
          y: faceBox.y,
          width: faceBox.width,
          height: faceBox.height,
        },
        videoRef.value.videoWidth,
        videoRef.value.videoHeight
      );
      trackingStatus.value = "Tracking reference guides in real time.";
    } else {
      const canvas = canvasRef.value;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      trackingStatus.value = "No face detected yet. Keep your upper body in frame.";
    }
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    trackingStatus.value = "Tracking frame failed, retrying safely...";
    console.warn("Pose tracking frame error:", errorText);
  }

  trackingFrame = requestAnimationFrame(() => {
    void runTracking();
  });
}

watch(
  [() => showGuideOverlay, () => enableDynamicTracking],
  async ([overlayEnabled, dynamicEnabled]) => {
    if (!overlayEnabled || !dynamicEnabled) {
      cancelAnimationFrame(trackingFrame);
      trackingStatus.value = dynamicEnabled
        ? "Pose tracking paused."
        : "Static guide mode is active.";
      if (!dynamicEnabled) {
        trackingError.value = "";
      }
      lastDetectionTs = 0;
      const canvas = canvasRef.value;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    if (!detectorReady.value) {
      await initDynamicTracking();
    }
    if (!faceDetector) {
      return;
    }
    cancelAnimationFrame(trackingFrame);
    trackingStatus.value = "Starting live pose tracking...";
    trackingFrame = requestAnimationFrame(() => {
      void runTracking();
    });
  }
);

onBeforeUnmount(() => {
  cancelAnimationFrame(trackingFrame);
  faceDetector = null;
});
</script>

<template>
  <section class="card">
    <div class="panel-header">
      <h3 class="section-title">Camera Observation</h3>
      <span class="overlay-badge" :class="{ active: showGuideOverlay }">
        {{
          showGuideOverlay
            ? enableDynamicTracking
              ? "Dynamic Overlay"
              : "Static Overlay"
            : "Overlay Off"
        }}
      </span>
    </div>
    <p class="muted">Bowly quietly watches posture and violin balance.</p>
    <div class="video-wrap">
      <video v-if="permissionState === 'granted'" ref="videoRef" autoplay playsinline muted></video>
      <div v-if="permissionState === 'granted' && showGuideOverlay" class="overlay">
        <template v-if="enableDynamicTracking">
          <canvas ref="canvasRef" class="overlay-canvas"></canvas>
          <div v-if="trackingError" class="overlay-status">{{ trackingError }}</div>
          <div v-else class="overlay-status">{{ trackingStatus }}</div>
        </template>
        <template v-else>
          <div class="guide head"></div>
          <div class="guide torso"></div>
          <div class="guide shoulder-line"></div>
          <div class="guide hip-line"></div>
          <div class="guide violin-body"></div>
          <div class="guide bow-line"></div>
          <div class="overlay-status">Static reference guides are on.</div>
        </template>
      </div>
      <div v-else class="placeholder">
        {{ errorMessage ?? "Waiting for camera permission..." }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.overlay-badge {
  font-size: 0.78rem;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eee6d8;
  color: #6f6781;
}

.overlay-badge.active {
  background: rgba(111, 90, 213, 0.14);
  color: #5142a2;
}

.video-wrap {
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #f8f4ee;
  min-height: 220px;
  position: relative;
}

video {
  width: 100%;
  max-height: 280px;
  display: block;
  object-fit: cover;
}

.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.overlay-canvas {
  width: 100%;
  height: 100%;
}

.guide {
  position: absolute;
  border-color: rgba(130, 181, 156, 0.85);
}

.head {
  width: 38px;
  height: 38px;
  border: 2px solid rgba(130, 181, 156, 0.9);
  border-radius: 999px;
  left: 50%;
  top: 16%;
  transform: translateX(-50%);
}

.torso {
  width: 2px;
  height: 30%;
  background: rgba(130, 181, 156, 0.9);
  left: 50%;
  top: 31%;
}

.shoulder-line {
  width: 24%;
  border-top: 2px dashed rgba(130, 181, 156, 0.9);
  left: 38%;
  top: 33%;
}

.hip-line {
  width: 20%;
  border-top: 2px dashed rgba(130, 181, 156, 0.8);
  left: 40%;
  top: 56%;
}

.violin-body {
  width: 64px;
  height: 40px;
  border: 2px solid rgba(111, 90, 213, 0.8);
  border-radius: 20px;
  left: 56%;
  top: 41%;
  transform: rotate(-18deg);
}

.bow-line {
  width: 36%;
  border-top: 2px solid rgba(111, 90, 213, 0.75);
  left: 42%;
  top: 46%;
  transform: rotate(22deg);
}

.overlay-status {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.75);
  color: #4d3f7f;
  font-size: 0.78rem;
}

.placeholder {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #7b728d;
  font-size: 0.95rem;
}
</style>
