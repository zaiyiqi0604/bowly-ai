<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
  LightBulbIcon,
} from "@heroicons/vue/24/outline";
import { useMemoryStore } from "../stores/memory";
import { fetchBackendHealth, fetchParentReport } from "../services/api";
import type { AiRuntimeStatus, ParentReportResponse } from "../types/ai";
import PoseSnapshot from "../components/PoseSnapshot.vue";

const memoryStore = useMemoryStore();
const loading = ref(false);
const report = ref<ParentReportResponse | null>(null);
const aiStatus = ref<AiRuntimeStatus | null>(null);
const errorText = ref("");
const latestSession = computed(() => memoryStore.latestSession);
const reviewMoments = computed(() =>
  [...(latestSession.value?.reviewMoments ?? [])]
    .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds)
    .slice(0, 3)
);
const primaryReview = computed(() => reviewMoments.value[0] ?? null);
const aiStatusLabel = computed(() => {
  if (!aiStatus.value) return "AI status unavailable";
  if (aiStatus.value.provider === "qwen") return `Qwen Live · ${aiStatus.value.model}`;
  if (aiStatus.value.provider === "mock-fallback") return "Qwen unavailable · Mock fallback";
  if (aiStatus.value.mode === "live") {
    return aiStatus.value.keyConfigured
      ? `Qwen configured · ${aiStatus.value.model}`
      : "Live mode · API key missing";
  }
  return aiStatus.value.keyConfigured
    ? "Mock mode · API key configured"
    : "Mock mode · API key not configured";
});
const aiStatusTone = computed(() => {
  if (aiStatus.value?.provider === "qwen") return "bg-lime-50 text-lime-800 ring-lime-200";
  if (
    aiStatus.value?.provider === "mock-fallback" ||
    (aiStatus.value?.mode === "live" && !aiStatus.value.keyConfigured)
  ) {
    return "bg-orange-50 text-orange-800 ring-orange-200";
  }
  return "bg-stone-100 text-stone-600 ring-stone-200";
});

onMounted(async () => {
  try {
    aiStatus.value = (await fetchBackendHealth()).ai;
  } catch (error) {
    console.error(error);
  }
  if (!latestSession.value) return;
  loading.value = true;
  try {
    report.value = await fetchParentReport(latestSession.value);
    aiStatus.value = (await fetchBackendHealth()).ai;
  } catch (error) {
    console.error(error);
    errorText.value = "Using local summary because report service is unavailable.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="min-h-[calc(100vh-4.5rem)] px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <p class="section-kicker">Progress overview</p>
      <div class="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 class="text-4xl font-semibold tracking-tight text-stage-950">Parent Practice Report</h1>
          <p class="mt-3 text-stone-500">A calm summary of progress, confidence, and the next small step.</p>
        </div>
        <div class="flex flex-col items-start gap-3 sm:items-end">
          <span
            class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset"
            :class="aiStatusTone"
            :title="aiStatus?.lastError"
          >
            <span class="h-2 w-2 rounded-full bg-current opacity-70"></span>
            {{ aiStatusLabel }}
          </span>
          <RouterLink to="/practice" class="primary-button">Start a new session</RouterLink>
        </div>
      </div>

      <div v-if="!latestSession" class="mt-10 light-card text-center">
        <p class="text-lg font-medium">No completed sessions yet.</p>
        <p class="mt-2 text-sm text-stone-500">Complete a practice session to create the first report.</p>
      </div>

      <div v-else class="mt-10 grid gap-5 md:grid-cols-3">
        <article class="light-card">
          <ClockIcon class="h-7 w-7 text-bowly-500" />
          <p class="mt-5 text-sm text-stone-500">Practice duration</p>
          <p class="mt-1 text-3xl font-semibold">{{ Math.round(latestSession.durationSeconds / 60) }} min</p>
        </article>
        <article class="light-card">
          <ArrowTrendingUpIcon class="h-7 w-7 text-lime-600" />
          <p class="mt-5 text-sm text-stone-500">Progress trend</p>
          <p class="mt-1 text-lg font-semibold">{{ memoryStore.consistencyTrend }}</p>
        </article>
        <article class="light-card">
          <HeartIcon class="h-7 w-7 text-orange-500" />
          <p class="mt-5 text-sm text-stone-500">Motivation</p>
          <p class="mt-1 text-3xl font-semibold capitalize">{{ report?.motivationLevel ?? "medium" }}</p>
        </article>

        <article class="light-card md:col-span-2">
          <p class="section-kicker">Session highlights</p>
          <p class="mt-4 text-xl leading-8 text-stage-900">
            {{ report?.summary ?? latestSession.coachHighlights.join(" ") }}
          </p>
          <div class="mt-7 grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">
              {{ report?.postureInsight ?? "Posture confidence improves with slow starts." }}
            </div>
            <div class="rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">
              {{ report?.memoryInsight ?? "Consistency is growing week by week." }}
            </div>
          </div>
        </article>
        <article class="rounded-2xl bg-stage-900 p-6 text-white shadow-sm">
          <LightBulbIcon class="h-7 w-7 text-orange-300" />
          <p class="mt-5 text-sm text-white/45">Tomorrow's suggestion</p>
          <p class="mt-3 text-lg leading-7">
            {{ report?.tomorrowSuggestion ?? "Begin with 3 slow bows." }}
          </p>
        </article>

        <section class="light-card md:col-span-3">
          <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p class="section-kicker">Practice reflections</p>
              <h2 class="mt-2 text-2xl font-semibold text-stage-950">
                Key moments without saving camera images
              </h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                These are anonymous joint diagrams. Faces, clothing, room details, and the original video are not stored.
              </p>
            </div>
            <span class="inline-flex items-center gap-2 text-sm text-lime-700">
              <EyeIcon class="h-5 w-5" />
              Private by design
            </span>
          </div>

          <div v-if="reviewMoments.length" class="mt-7 space-y-6">
            <article
              v-for="moment in reviewMoments"
              :key="moment.id"
              class="rounded-2xl border border-stone-200 bg-stone-50/70 p-5"
            >
              <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h3 class="text-lg font-semibold text-stage-950">{{ moment.title }}</h3>
                  <p class="mt-1 text-sm text-stone-500">
                    Seen {{ moment.occurrences }} {{ moment.occurrences === 1 ? "time" : "times" }}
                    · {{ moment.totalDurationSeconds }} sec total
                  </p>
                </div>
                <p class="max-w-md text-sm leading-6 text-stone-600">{{ moment.suggestion }}</p>
              </div>

              <div class="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-bowly-600">
                    Moment to notice
                  </p>
                  <PoseSnapshot :snapshot="moment.before" tone="before" />
                </div>
                <div>
                  <p class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">
                    <CheckCircleIcon class="h-4 w-4" />
                    {{ moment.after ? "Improved later" : "Next practice target" }}
                  </p>
                  <PoseSnapshot
                    v-if="moment.after"
                    :snapshot="moment.after"
                    tone="after"
                  />
                  <div
                    v-else
                    class="grid h-44 place-items-center rounded-xl border border-dashed border-lime-300 bg-lime-50 px-6 text-center text-sm leading-6 text-lime-800"
                  >
                    Try this again next session. Bowly will add the comparison when the movement becomes clearer.
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="mt-7 rounded-2xl bg-lime-50 p-6 text-lime-900">
            <p class="font-semibold">No persistent posture issue was recorded.</p>
            <p class="mt-2 text-sm leading-6 text-lime-800">
              Bowly only saves a review moment when an adjustment lasts long enough to be useful.
            </p>
          </div>
        </section>

        <section
          v-if="primaryReview"
          class="rounded-2xl bg-gradient-to-br from-bowly-600 to-bowly-800 p-6 text-white shadow-sm md:col-span-3"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-bowly-100">
            Child-friendly recap
          </p>
          <p class="mt-3 text-2xl font-semibold">
            {{
              primaryReview.after
                ? "You kept going and found a clearer movement."
                : "You found one useful idea for next time."
            }}
          </p>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-white/75">
            Today you worked on {{ primaryReview.title.toLowerCase() }}.
            Next time, try one slow phrase with this small idea:
            {{ primaryReview.suggestion }}
          </p>
        </section>
      </div>
      <p v-if="loading" class="mt-6 text-sm text-stone-500">Building gentle report...</p>
      <p v-if="errorText" class="mt-3 text-sm text-orange-700">{{ errorText }}</p>
    </div>
  </section>
</template>
