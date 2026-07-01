<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
  MusicalNoteIcon,
  PlayCircleIcon,
  VideoCameraIcon,
} from "@heroicons/vue/24/outline";
import { createDemoSessions } from "../demo/demoSessions";
import owlCompanion from "../assets/practice-pets/owl.webp";
import { useMemoryStore } from "../stores/memory";

const route = useRoute();
const router = useRouter();
const memoryStore = useMemoryStore();

const demoSteps = [
  {
    title: "Start safely",
    detail: "Camera and mic stay local. Demo data starts immediately.",
    coach: "Bowly is ready. Play one calm open string.",
    signal: "Local sensors ready",
    pitch: "Listening",
    posture: "Camera view clear",
  },
  {
    title: "Watch posture",
    detail: "The camera notices only simple shoulder, wrist, and bow-arm cues.",
    coach: "I can see the bow arm. Keep the shoulder soft.",
    signal: "Motion capture active",
    pitch: "Closest note: D",
    posture: "Bow wrist high",
  },
  {
    title: "Listen to tone",
    detail: "The mic tracks clear pitch time without storing raw audio.",
    coach: "That note is a little sharp. Try one slower bow.",
    signal: "Clear pitch detected",
    pitch: "22 cents high",
    posture: "Shoulder steady",
  },
  {
    title: "Give one cue",
    detail: "Bowly waits for a natural pause before showing feedback.",
    coach: "Nice focus. Try the D string again with a softer wrist.",
    signal: "Natural pause found",
    pitch: "Pitch center improving",
    posture: "Wrist cue ready",
  },
  {
    title: "Finish report",
    detail: "A parent-ready report appears from structured signals only.",
    coach: "Practice complete. I saved one helpful next step.",
    signal: "Report ready",
    pitch: "82% steady sound",
    posture: "Goal completed",
  },
];

const activeStep = ref(0);
const isRunning = ref(false);
let demoTimer = 0;

const currentStep = computed(() => demoSteps[activeStep.value]);
const progressPercent = computed(() =>
  Math.round(((activeStep.value + (isRunning.value ? 0.2 : 0)) / demoSteps.length) * 100),
);
const isComplete = computed(() => activeStep.value === demoSteps.length - 1 && !isRunning.value);
const timeline = computed(() => demoSteps.slice(0, activeStep.value + 1).reverse());

function seedReport() {
  memoryStore.replaceDemoSessions(createDemoSessions());
}

function finishDemo() {
  window.clearInterval(demoTimer);
  isRunning.value = false;
  activeStep.value = demoSteps.length - 1;
  seedReport();
}

function runDemo() {
  window.clearInterval(demoTimer);
  activeStep.value = 0;
  isRunning.value = true;
  seedReport();
  demoTimer = window.setInterval(() => {
    const nextStep = activeStep.value + 1;
    if (nextStep >= demoSteps.length - 1) {
      finishDemo();
      return;
    }
    activeStep.value = nextStep;
  }, 1400);
}

function resetDemo() {
  window.clearInterval(demoTimer);
  isRunning.value = false;
  activeStep.value = 0;
}

function openReport() {
  seedReport();
  void router.push("/report");
}

onMounted(() => {
  if (route.query.seed !== "report") return;
  seedReport();
  void router.replace("/report");
});

onBeforeUnmount(() => {
  window.clearInterval(demoTimer);
});
</script>

<template>
  <section class="min-h-[calc(100vh-4.5rem)] bg-stage-950 px-4 py-10 text-white sm:px-6 lg:px-8">
    <div class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="flex min-w-0 flex-col justify-center">
        <p class="section-kicker">Hackathon demo mode</p>
        <h1 class="mt-4 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
          A complete Bowly practice in under one minute.
        </h1>
        <p class="mt-5 max-w-xl text-base leading-7 text-white/55">
          This mode runs a scripted session with local mock signals, so the product story works even when camera, microphone, Wi-Fi, or AI services are unreliable on stage.
        </p>

        <div class="mt-7 flex flex-wrap gap-3">
          <button class="primary-button" type="button" @click="runDemo">
            <PlayCircleIcon class="h-5 w-5" />
            {{ isRunning ? "Restart demo" : "Run demo" }}
          </button>
          <button class="secondary-button" type="button" @click="resetDemo">
            <ArrowPathIcon class="h-5 w-5" />
            Reset
          </button>
          <button class="secondary-button" type="button" @click="openReport">
            <ChartBarIcon class="h-5 w-5" />
            Open report
          </button>
        </div>

        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <LockClosedIcon class="h-6 w-6 text-lime-300" />
            <p class="mt-3 text-sm font-semibold">No live setup</p>
            <p class="mt-1 text-xs leading-5 text-white/45">No permissions needed.</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <VideoCameraIcon class="h-6 w-6 text-bowly-300" />
            <p class="mt-3 text-sm font-semibold">Shows sensing</p>
            <p class="mt-1 text-xs leading-5 text-white/45">Camera and mic story is visible.</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <ChartBarIcon class="h-6 w-6 text-orange-300" />
            <p class="mt-3 text-sm font-semibold">Creates report</p>
            <p class="mt-1 text-xs leading-5 text-white/45">Seeds real report data.</p>
          </div>
        </div>
      </div>

      <div class="min-w-0 rounded-[2rem] border border-white/10 bg-[#1c1824] p-4 shadow-2xl shadow-black/30 sm:p-5">
        <div class="rounded-[1.5rem] border border-white/10 bg-stage-950/80 p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-bowly-300">Live scripted session</p>
              <h2 class="mt-2 text-2xl font-semibold">{{ currentStep.title }}</h2>
              <p class="mt-2 text-sm leading-6 text-white/50">{{ currentStep.detail }}</p>
            </div>
            <span
              class="rounded-full border px-3 py-1 text-xs font-semibold"
              :class="isComplete ? 'border-lime-300/25 bg-lime-300/10 text-lime-200' : 'border-orange-300/25 bg-orange-300/10 text-orange-200'"
            >
              {{ isComplete ? "Complete" : isRunning ? "Running" : "Ready" }}
            </span>
          </div>

          <div class="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div class="h-full rounded-full bg-bowly-400 transition-all duration-500" :style="{ width: `${progressPercent}%` }"></div>
          </div>

          <div class="mt-6 grid gap-4 md:grid-cols-[1fr_14rem]">
            <div class="relative min-h-72 overflow-hidden rounded-2xl border border-white/10 bg-[#15121d] p-5">
              <div class="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(197,173,255,.06)_95%),linear-gradient(90deg,transparent_95%,rgba(197,173,255,.05)_95%)] bg-[length:40px_40px] opacity-45"></div>
              <div class="relative z-10 flex h-full flex-col justify-between">
                <div class="flex items-center justify-between gap-3">
                  <span class="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-300">
                    {{ currentStep.signal }}
                  </span>
                  <span class="rounded-full bg-white/5 px-3 py-1 text-xs text-white/45">Demo data</span>
                </div>

                <div class="mx-auto grid h-32 w-32 place-items-center rounded-full border border-bowly-300/30 bg-bowly-500/10">
                  <img :src="owlCompanion" alt="Bowly owl companion" class="h-28 w-28 object-contain" />
                </div>

                <div class="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4">
                  <p class="text-sm font-semibold text-lime-300">Bowly says</p>
                  <p class="mt-2 text-base leading-7 text-white/85">{{ currentStep.coach }}</p>
                </div>
              </div>
            </div>

            <div class="grid gap-3">
              <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <VideoCameraIcon class="h-5 w-5 text-bowly-300" />
                <p class="mt-3 text-sm font-semibold">Posture</p>
                <p class="mt-1 text-sm leading-6 text-white/50">{{ currentStep.posture }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <MusicalNoteIcon class="h-5 w-5 text-orange-300" />
                <p class="mt-3 text-sm font-semibold">Sound</p>
                <p class="mt-1 text-sm leading-6 text-white/50">{{ currentStep.pitch }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <CheckCircleIcon class="h-5 w-5 text-lime-300" />
                <p class="mt-3 text-sm font-semibold">Privacy</p>
                <p class="mt-1 text-sm leading-6 text-white/50">No video or audio stored.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-lg font-semibold">Session timeline</h3>
            <span class="text-xs text-white/40">{{ activeStep + 1 }} / {{ demoSteps.length }}</span>
          </div>
          <div class="mt-5 space-y-3">
            <div v-for="(step, index) in timeline" :key="step.title" class="flex gap-3">
              <span
                class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                :class="index === 0 ? 'bg-lime-300' : 'bg-bowly-400'"
              ></span>
              <div>
                <p class="text-sm font-semibold">{{ step.title }}</p>
                <p class="mt-1 text-sm leading-6 text-white/45">{{ step.detail }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
