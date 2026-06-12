<script setup lang="ts">
import {
  ArrowRightIcon,
  ChartBarSquareIcon,
  CloudIcon,
  CpuChipIcon,
  MusicalNoteIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
} from "@heroicons/vue/24/outline";
</script>

<template>
  <section class="overflow-hidden">
    <div class="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[1600px] lg:grid-cols-[0.9fr_1.1fr]">
      <div class="flex items-center px-6 py-16 sm:px-10 lg:px-16">
        <div class="max-w-2xl">
          <div class="flex flex-wrap items-center gap-3">
            <p class="section-kicker">Gentle AI practice companion</p>
            <span class="rounded-full bg-bowly-100 px-3 py-1 text-xs font-semibold text-bowly-700">
              Qwen Cloud EdgeAgent
            </span>
          </div>
          <h1 class="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-stage-950 sm:text-6xl">
            Practice with focus.
            <span class="text-bowly-500">Grow with confidence.</span>
          </h1>
          <p class="mt-7 max-w-xl text-lg leading-8 text-stone-600">
            Bowly listens, watches, and encourages young violin players with calm coaching between lessons.
          </p>
          <div class="mt-9 flex flex-wrap gap-3">
            <RouterLink to="/practice" class="primary-button">
              Start Practice
              <ArrowRightIcon class="h-5 w-5" />
            </RouterLink>
            <RouterLink to="/demo" class="inline-flex items-center rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stage-900 hover:bg-white">
              Open Demo
            </RouterLink>
          </div>
          <div class="mt-10 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-3">
            <div>
              <CpuChipIcon class="h-5 w-5 text-bowly-600" />
              <p class="mt-2 text-sm font-semibold text-stage-950">Local perception</p>
              <p class="mt-1 text-xs leading-5 text-stone-500">Pose and audio stay responsive on device.</p>
            </div>
            <div>
              <CloudIcon class="h-5 w-5 text-orange-500" />
              <p class="mt-2 text-sm font-semibold text-stage-950">Qwen reasoning</p>
              <p class="mt-1 text-xs leading-5 text-stone-500">Practice signals become calm, contextual coaching.</p>
            </div>
            <div>
              <ShieldCheckIcon class="h-5 w-5 text-lime-600" />
              <p class="mt-2 text-sm font-semibold text-stage-950">Graceful fallback</p>
              <p class="mt-1 text-xs leading-5 text-stone-500">Practice continues during weak or lost connectivity.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="relative min-h-[520px] bg-stage-950 p-6 sm:p-10 lg:min-h-0">
        <div class="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,.28),transparent_38%)]"></div>
        <div class="relative grid h-full content-center gap-4">
          <div class="surface-panel p-6 sm:p-8">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="section-kicker">Edge-to-cloud practice agent</p>
                <h2 class="mt-3 text-3xl font-semibold text-white">A calm 10-minute session</h2>
              </div>
              <span class="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-300">
                Qwen connected
              </span>
            </div>
            <div class="mt-8 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl bg-white/5 p-4">
                <VideoCameraIcon class="h-6 w-6 text-bowly-300" />
                <p class="mt-4 text-sm font-medium text-white">Posture guidance</p>
                <p class="mt-1 text-xs leading-5 text-white/40">Quiet camera observation</p>
              </div>
              <div class="rounded-xl bg-white/5 p-4">
                <MusicalNoteIcon class="h-6 w-6 text-orange-300" />
                <p class="mt-4 text-sm font-medium text-white">Pitch stability</p>
                <p class="mt-1 text-xs leading-5 text-white/40">Live listening feedback</p>
              </div>
              <div class="rounded-xl bg-white/5 p-4">
                <ChartBarSquareIcon class="h-6 w-6 text-lime-300" />
                <p class="mt-4 text-sm font-medium text-white">Parent insights</p>
                <p class="mt-1 text-xs leading-5 text-white/40">Clear progress summaries</p>
              </div>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="surface-panel p-5">
              <p class="text-sm text-white/45">Pitch stability</p>
              <p class="mt-2 text-3xl font-semibold text-lime-300">82%</p>
            </div>
            <div class="surface-panel p-5">
              <p class="text-sm text-white/45">Current challenge</p>
              <p class="mt-2 text-base font-semibold text-white">Smooth bow strokes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
