<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { AnonymousPoseSnapshot } from "../types/session";

const props = defineProps<{
  snapshot: AnonymousPoseSnapshot;
  tone?: "before" | "after";
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const CONNECTIONS = [
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
] as const;

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = 18;
  const pointMap = new Map(
    props.snapshot.points.map((point) => [
      point.id,
      {
        x: padding + point.x * (width - padding * 2),
        y: padding + point.y * (height - padding * 2),
        confidence: point.confidence,
      },
    ])
  );
  const accent = props.tone === "after" ? "132, 204, 22" : "168, 85, 247";

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [startId, endId] of CONNECTIONS) {
    const start = pointMap.get(startId);
    const end = pointMap.get(endId);
    if (!start || !end) continue;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(${accent}, ${Math.min(start.confidence, end.confidence)})`;
    ctx.stroke();
  }

  for (const point of pointMap.values()) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${accent}, 0.95)`;
    ctx.stroke();
  }

  const drawGuide = (
    guide: AnonymousPoseSnapshot["bow"] | AnonymousPoseSnapshot["violin"],
    color: string,
    dashed = false
  ) => {
    if (!guide) return;
    ctx.beginPath();
    ctx.moveTo(
      padding + guide.startX * (width - padding * 2),
      padding + guide.startY * (height - padding * 2)
    );
    ctx.lineTo(
      padding + guide.endX * (width - padding * 2),
      padding + guide.endY * (height - padding * 2)
    );
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawGuide(props.snapshot.violin, "rgba(139, 92, 246, 0.55)", true);
  drawGuide(props.snapshot.bow, "rgba(249, 115, 22, 0.8)");
}

onMounted(async () => {
  await nextTick();
  draw();
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvasRef.value);
  }
});

watch(() => props.snapshot, draw, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="h-44 w-full rounded-xl bg-[radial-gradient(circle_at_center,#fafafa,#f1eee8)]"
    role="img"
    aria-label="Anonymous posture snapshot without camera image"
  ></canvas>
</template>
