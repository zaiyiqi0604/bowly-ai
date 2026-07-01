<script setup lang="ts">
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  MusicalNoteIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  VideoCameraIcon,
} from "@heroicons/vue/24/outline";
import heroChildViolin from "../assets/hero-child-violin-capture.png";
import owlCompanion from "../assets/practice-pets/owl.webp";

const steps = [
  {
    title: "Sees the bow arm",
    detail: "Only simple camera cues, like shoulders and wrist movement.",
    icon: VideoCameraIcon,
    tone: "bowly",
  },
  {
    title: "Listens to tone",
    detail: "The microphone checks whether the sound is steady.",
    icon: MusicalNoteIcon,
    tone: "orange",
  },
  {
    title: "Says one kind thing",
    detail: "Bowly turns the moment into a small next step.",
    icon: ChatBubbleLeftRightIcon,
    tone: "lime",
  },
];
</script>

<template>
  <section class="overflow-hidden bg-[#fbf8f1]">
    <div class="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[1500px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:px-14 lg:py-14 xl:gap-14">
      <div class="flex min-w-0 items-center">
        <div class="w-full max-w-[35rem]">
          <div class="inline-flex max-w-full items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-2 text-xs font-semibold text-stage-900 shadow-sm">
            <span class="grid h-5 w-5 place-items-center rounded-full bg-lime-300/20">
              <span class="h-2 w-2 rounded-full bg-lime-500 shadow-[0_0_10px_rgba(132,204,22,.65)]"></span>
            </span>
            <span>Camera and mic stay local</span>
            <span class="h-4 w-px bg-stone-200"></span>
            <ShieldCheckIcon class="h-4 w-4 text-bowly-500" />
            <span class="text-stone-500">Parent-friendly feedback</span>
          </div>

          <h1 class="mt-8 text-4xl font-semibold leading-[1.04] tracking-tight text-stage-950 sm:text-6xl xl:text-7xl">
            A calmer way for kids to
            <span class="text-bowly-500"> practise violin.</span>
          </h1>
          <p class="mt-6 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">
            Bowly sits beside practice, notices a few useful signals, and gives one gentle next step at a time.
          </p>

          <div class="mt-8 hidden gap-3 sm:grid">
            <div
              v-for="(step, index) in steps"
              :key="step.title"
              class="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white/70 p-4 shadow-sm"
            >
              <span
                class="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                :class="{
                  'bg-bowly-100 text-bowly-600': step.tone === 'bowly',
                  'bg-orange-100 text-orange-500': step.tone === 'orange',
                  'bg-lime-100 text-lime-600': step.tone === 'lime',
                }"
              >
                <component :is="step.icon" class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-stage-950">
                  {{ index + 1 }}. {{ step.title }}
                </p>
                <p class="mt-1 text-sm leading-6 text-stone-500">{{ step.detail }}</p>
              </div>
            </div>
          </div>

          <div class="mt-8 flex flex-wrap gap-3">
            <RouterLink to="/practice" class="primary-button min-h-14 min-w-60 justify-center rounded-2xl text-base">
              Start practice
              <ArrowRightIcon class="h-5 w-5" />
            </RouterLink>
            <RouterLink
              to="/demo"
              class="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white/75 px-6 text-base font-semibold text-stage-900 shadow-sm hover:bg-white"
            >
              <PlayCircleIcon class="h-5 w-5" />
              Watch demo
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="flex min-w-0 items-center">
        <div class="w-full">
          <div class="relative overflow-hidden rounded-[2.25rem] border border-bowly-300/35 bg-stage-950 p-4 shadow-2xl shadow-bowly-950/20 sm:p-5 lg:p-6">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_52%_26%,rgba(139,92,246,.24),transparent_34%),linear-gradient(135deg,rgba(139,92,246,.14),rgba(18,16,22,.96)_45%,rgba(18,16,22,1))]"></div>

            <div class="relative grid gap-5 lg:grid-cols-[1fr_17rem]">
              <div class="relative min-h-[30rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#191521]">
                <div class="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(197,173,255,.06)_95%),linear-gradient(90deg,transparent_95%,rgba(197,173,255,.05)_95%)] bg-[length:48px_48px] opacity-45"></div>

                <div class="absolute left-5 top-5 z-20 rounded-2xl border border-white/10 bg-stage-950/72 px-4 py-3 text-white shadow-lg backdrop-blur-md">
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Live practice</p>
                  <p class="mt-1 text-sm font-semibold">Bowly watches gently</p>
                </div>

                <div class="absolute bottom-4 left-1/2 z-10 h-20 w-80 -translate-x-1/2 rounded-[50%] border border-bowly-300/25 bg-bowly-500/10 shadow-[0_0_60px_rgba(139,92,246,.18)]"></div>
                <img
                  :src="heroChildViolin"
                  alt="Cartoon child practicing violin with motion capture landmarks"
                  class="absolute bottom-8 left-1/2 z-20 h-[23rem] w-[28rem] -translate-x-1/2 object-contain drop-shadow-2xl sm:h-[27rem] sm:w-[34rem]"
                />
                <div class="pointer-events-none absolute right-8 top-6 z-30 hidden rounded-full border border-white/10 bg-stage-950/70 px-3 py-1.5 text-[11px] font-semibold text-lime-300 shadow-lg backdrop-blur-md sm:inline-flex">
                  Local motion capture
                </div>

                <div class="absolute bottom-5 left-5 right-5 z-30 rounded-[1.5rem] border border-lime-300/20 bg-lime-300/10 p-4 text-white shadow-2xl backdrop-blur-md sm:left-1/2 sm:right-auto sm:w-[24rem] sm:-translate-x-1/2">
                  <div class="flex items-start gap-4">
                    <img :src="owlCompanion" alt="Bowly owl companion" class="h-20 w-20 shrink-0 object-contain" />
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 text-lime-300">
                        <SparklesIcon class="h-5 w-5" />
                        <p class="text-sm font-semibold">Bowly says</p>
                      </div>
                      <p class="mt-2 text-base leading-7 text-white/85">Great steady bow. Try the D string again with a softer wrist.</p>
                    </div>
                  </div>
                </div>

              </div>

              <div class="grid gap-4">
                <div class="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-5 text-white">
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">For kids</p>
                  <p class="mt-3 text-xl font-semibold leading-7">One thing to try next.</p>
                  <p class="mt-2 text-sm leading-6 text-white/50">No long critique during practice.</p>
                </div>

                <div class="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-5 text-white">
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">For parents</p>
                  <p class="mt-3 text-xl font-semibold leading-7">A simple recap after.</p>
                  <p class="mt-2 text-sm leading-6 text-white/50">What improved, what to watch, and what felt hard.</p>
                </div>

                <div class="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-5 text-white">
                  <div class="flex items-center gap-3">
                    <span class="grid h-10 w-10 place-items-center rounded-full bg-lime-300/10 text-lime-300">
                      <LockClosedIcon class="h-5 w-5" />
                    </span>
                    <div>
                      <p class="font-semibold">Private by design</p>
                      <p class="mt-1 text-sm text-white/50">Camera and mic signals stay local.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p class="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-stone-500">
            <LockClosedIcon class="h-5 w-5 text-orange-500" />
            <span class="font-semibold text-stage-900">Private. Local. Yours.</span>
            <span>No videos or audio leave your device.</span>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
