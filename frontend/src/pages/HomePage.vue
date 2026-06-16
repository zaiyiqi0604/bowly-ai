<script setup lang="ts">
import {
  ArrowRightIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  CloudIcon,
  CpuChipIcon,
  FaceSmileIcon,
  MapPinIcon,
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
            <p class="section-kicker">Violin practice for young learners</p>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-bowly-100 px-3 py-1 text-xs font-semibold text-bowly-700">
              <MapPinIcon class="h-3.5 w-3.5" />
              Local-first sensing
            </span>
          </div>
          <h1 class="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-stage-950 sm:text-6xl">
            A kinder way for kids to
            <span class="text-bowly-500"> practise violin.</span>
          </h1>
          <p class="mt-7 max-w-xl text-lg leading-8 text-stone-600">
            Bowly watches posture and listens to tone on the local device, then asks Qwen to turn each signal into calm, specific encouragement between lessons.
          </p>
          <div class="mt-9 flex flex-wrap gap-3">
            <RouterLink to="/practice" class="primary-button">
              Start a 10-minute practice
              <ArrowRightIcon class="h-5 w-5" />
            </RouterLink>
            <RouterLink to="/demo" class="inline-flex items-center rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stage-900 hover:bg-white">
              Open Demo
            </RouterLink>
          </div>
          <div class="mt-10 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-3">
            <div>
              <VideoCameraIcon class="h-5 w-5 text-bowly-600" />
              <p class="mt-2 text-sm font-semibold text-stage-950">Child-aware posture</p>
              <p class="mt-1 text-xs leading-5 text-stone-500">Camera cues catch bow arm and shoulder tension.</p>
            </div>
            <div>
              <CpuChipIcon class="h-5 w-5 text-orange-500" />
              <p class="mt-2 text-sm font-semibold text-stage-950">Local perception</p>
              <p class="mt-1 text-xs leading-5 text-stone-500">Audio and pose checks stay quick during practice.</p>
            </div>
            <div>
              <ChatBubbleLeftRightIcon class="h-5 w-5 text-lime-600" />
              <p class="mt-2 text-sm font-semibold text-stage-950">Qwen gentle feedback</p>
              <p class="mt-1 text-xs leading-5 text-stone-500">Mistakes become one clear next step, not pressure.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="relative min-h-[520px] bg-stage-950 p-6 sm:p-10 lg:min-h-0">
        <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(139,92,246,.18),rgba(18,16,22,.2)_42%,rgba(18,16,22,.82))]"></div>
        <div class="relative grid h-full content-center gap-4">
          <div class="surface-panel overflow-hidden p-6 sm:p-8">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="max-w-md">
                <p class="section-kicker">Live practice moment</p>
                <h2 class="mt-3 text-3xl font-semibold leading-tight text-white">Lena is practising open strings</h2>
              </div>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-300">
                <CloudIcon class="h-3.5 w-3.5" />
                Qwen feedback ready
              </span>
            </div>
            <div class="mt-8 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <div class="relative min-h-[290px] overflow-hidden rounded-2xl border border-white/10 bg-[#241c2d] p-5">
                <div class="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-stage-950/70 px-3 py-1 text-xs font-medium text-white/70">
                  <span class="h-2 w-2 rounded-full bg-lime-300"></span>
                  Camera + mic local
                </div>
                <div class="absolute bottom-8 left-1/2 w-64 -translate-x-1/2">
                  <div class="mx-auto h-16 w-16 rounded-full bg-[#f4c7a1] shadow-lg shadow-black/20">
                    <div class="mx-auto h-10 w-12 rounded-b-full bg-stage-950/80"></div>
                  </div>
                  <div class="mx-auto mt-3 h-28 w-32 rounded-t-[2rem] bg-bowly-500 shadow-xl shadow-black/30"></div>
                  <div class="absolute left-1 top-20 h-4 w-36 -rotate-12 rounded-full bg-[#f1d6a9]"></div>
                  <div class="absolute right-4 top-[5.5rem] h-3 w-28 rotate-12 rounded-full bg-[#f1d6a9]"></div>
                  <div class="absolute left-[4.5rem] top-16 h-28 w-9 -rotate-12 rounded-full bg-orange-300 shadow-md shadow-black/20"></div>
                  <div class="absolute left-[5.25rem] top-7 h-40 w-1 -rotate-12 rounded-full bg-white/70"></div>
                  <div class="absolute left-28 top-10 h-32 w-1 rotate-[72deg] rounded-full bg-white/80"></div>
                </div>
                <div class="absolute right-5 top-16 space-y-2">
                  <div class="rounded-xl border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-xs font-medium text-lime-100">
                    Bow arm relaxed
                  </div>
                  <div class="rounded-xl border border-orange-300/20 bg-orange-300/10 px-3 py-2 text-xs font-medium text-orange-100">
                    D string drifting sharp
                  </div>
                </div>
              </div>

              <div class="grid content-between gap-3">
                <div class="rounded-xl bg-white/5 p-4">
                  <div class="flex items-center gap-3">
                    <VideoCameraIcon class="h-6 w-6 text-bowly-300" />
                    <div>
                      <p class="text-sm font-medium text-white">Local posture read</p>
                      <p class="text-xs leading-5 text-white/45">Shoulders level, wrist needs softening</p>
                    </div>
                  </div>
                </div>
                <div class="rounded-xl bg-white/5 p-4">
                  <div class="flex items-center gap-3">
                    <MusicalNoteIcon class="h-6 w-6 text-orange-300" />
                    <div>
                      <p class="text-sm font-medium text-white">Pitch stability</p>
                      <p class="text-xs leading-5 text-white/45">82% steady across this phrase</p>
                    </div>
                  </div>
                </div>
                <div class="rounded-xl border border-lime-300/20 bg-lime-300/10 p-4">
                  <div class="flex items-start gap-3">
                    <FaceSmileIcon class="mt-0.5 h-6 w-6 text-lime-300" />
                    <div>
                      <p class="text-sm font-medium text-lime-100">Qwen says</p>
                      <p class="mt-1 text-sm leading-6 text-white/75">"Great steady bow. Try the D string again with a softer wrist."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="surface-panel p-5">
              <div class="flex items-center gap-3">
                <ShieldCheckIcon class="h-6 w-6 text-lime-300" />
                <div>
                  <p class="text-sm text-white/45">Works through weak Wi-Fi</p>
                  <p class="mt-1 text-base font-semibold text-white">Local cues keep the lesson moving</p>
                </div>
              </div>
            </div>
            <div class="surface-panel p-5">
              <div class="flex items-center gap-3">
                <ChartBarSquareIcon class="h-6 w-6 text-bowly-300" />
                <div>
                  <p class="text-sm text-white/45">Parent-ready summary</p>
                  <p class="mt-1 text-base font-semibold text-white">Tone steadier, posture calmer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
