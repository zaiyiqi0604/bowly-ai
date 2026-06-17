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

const LABELS = new Map([
  [5, "shoulder"],
  [6, "shoulder"],
  [7, "elbow"],
  [8, "elbow"],
  [9, "wrist"],
  [10, "wrist"],
]);

type CanvasPoint = {
  x: number;
  y: number;
  confidence: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawRoundedLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign = "left"
) {
  ctx.save();
  ctx.font = "600 10px Avenir Next, Segoe UI, sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  const metrics = ctx.measureText(text);
  const width = metrics.width + 12;
  const height = 18;
  const left = align === "right" ? x - width : x;
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(left, y - height / 2, width, height, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, align === "right" ? x - 6 : x + 6, y);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(120, 113, 108, 0.1)";
  ctx.lineWidth = 1;
  for (let x = 24; x < width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 16);
    ctx.lineTo(x, height - 16);
    ctx.stroke();
  }
  for (let y = 24; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(width - 16, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWristAngle(
  ctx: CanvasRenderingContext2D,
  elbow?: CanvasPoint,
  wrist?: CanvasPoint,
  degrees?: number,
  accent = "rgba(168, 85, 247, 0.9)"
) {
  if (!elbow || !wrist || degrees == null) return;
  const radius = 22;
  const startAngle = Math.atan2(elbow.y - wrist.y, elbow.x - wrist.x);
  const endAngle = startAngle + clamp(degrees, -55, 55) * (Math.PI / 180);
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(wrist.x, wrist.y, radius, startAngle, endAngle, degrees < 0);
  ctx.stroke();
  drawRoundedLabel(ctx, `~${Math.abs(Math.round(degrees))}deg`, wrist.x + 16, wrist.y - 28, accent);
  ctx.restore();
}

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
  drawGrid(ctx, width, height);

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
  const accentColor = `rgba(${accent}, 0.95)`;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [startId, endId] of CONNECTIONS) {
    const start = pointMap.get(startId);
    const end = pointMap.get(endId);
    if (!start || !end) continue;
    const confidence = clamp(Math.min(start.confidence, end.confidence), 0.25, 1);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 2 + confidence * 2;
    ctx.strokeStyle = `rgba(${accent}, ${confidence})`;
    ctx.stroke();
  }

  for (const [id, point] of pointMap.entries()) {
    const confidence = clamp(point.confidence, 0.25, 1);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3.5 + confidence * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${accent}, ${confidence})`;
    ctx.stroke();
    if (id === 7 || id === 8 || id === 9 || id === 10) {
      const label = LABELS.get(id);
      if (label) {
        drawRoundedLabel(
          ctx,
          label,
          point.x + (id % 2 === 0 ? 10 : -10),
          point.y - 15,
          `rgba(${accent}, 0.78)`,
          id % 2 === 0 ? "left" : "right"
        );
      }
    }
  }

  const drawGuide = (
    guide: AnonymousPoseSnapshot["bow"] | AnonymousPoseSnapshot["violin"],
    color: string,
    label: string,
    dashed = false
  ) => {
    if (!guide) return;
    const confidence = clamp(guide.confidence, 0.25, 1);
    const startX = padding + guide.startX * (width - padding * 2);
    const startY = padding + guide.startY * (height - padding * 2);
    const endX = padding + guide.endX * (width - padding * 2);
    const endY = padding + guide.endY * (height - padding * 2);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.lineWidth = dashed ? 2 : 3;
    ctx.strokeStyle = color.replace("ALPHA", String(confidence));
    ctx.stroke();
    ctx.setLineDash([]);
    drawRoundedLabel(ctx, label, endX + 8, endY, color.replace("ALPHA", "0.92"));
  };

  drawGuide(props.snapshot.violin, "rgba(139, 92, 246, ALPHA)", "instrument", true);
  drawGuide(props.snapshot.bow, "rgba(249, 115, 22, ALPHA)", "bow path");
  drawWristAngle(
    ctx,
    pointMap.get(8) ?? pointMap.get(7),
    pointMap.get(10) ?? pointMap.get(9),
    props.snapshot.evidence?.approximateAngleDegrees,
    accentColor
  );

  if (props.snapshot.evidence?.quality || props.snapshot.evidence?.label) {
    const quality = props.snapshot.evidence.quality ?? "usable";
    const label = props.snapshot.evidence.label ?? "local pose sample";
    const note = props.snapshot.evidence.note ?? quality;
    drawRoundedLabel(ctx, `${label} · ${note}`, 16, height - 18, accentColor);
  }
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
    class="h-44 w-full rounded-xl bg-[radial-gradient(circle_at_center,#fbfaf7,#f0ede7)]"
    role="img"
    aria-label="Anonymous posture snapshot without camera image"
  ></canvas>
</template>
