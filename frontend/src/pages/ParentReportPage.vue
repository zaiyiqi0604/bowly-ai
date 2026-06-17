<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  LightBulbIcon,
  MusicalNoteIcon,
  PlayCircleIcon,
  StarIcon,
  TrophyIcon,
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
const showParentReport = ref(false);
const showProgressDetails = ref(false);
const showObservationDetails = ref(false);
const latestSession = computed(() => memoryStore.latestSession);
const activity = computed(() => latestSession.value?.activity);
const continuityInsight = computed(() => {
  const durations = activity.value?.phraseDurationsSeconds ?? [];
  if (durations.length < 4) return "A few more playing sections will make this trend more reliable.";
  const midpoint = Math.ceil(durations.length / 2);
  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const early = average(durations.slice(0, midpoint));
  const later = average(durations.slice(midpoint));
  if (later > early * 1.12) return "Later playing sections lasted longer.";
  if (later < early * 0.88) return "Later playing sections became shorter.";
  return "Playing-section length stayed consistent.";
});
const reliableReviewMoments = computed(() =>
  [...(latestSession.value?.reviewMoments ?? [])]
    .filter((moment) => (moment.confidence ?? 0) >= 0.8)
    .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds)
);
const postureReviewMoments = computed(() =>
  reliableReviewMoments.value.filter((moment) => moment.category === "posture"),
);
const framingReviewMoments = computed(() =>
  reliableReviewMoments.value.filter((moment) => moment.category !== "posture"),
);
const reviewMoments = computed(() => {
  if (!postureReviewMoments.value.length) return framingReviewMoments.value.slice(0, 3);
  return [
    ...postureReviewMoments.value.slice(0, 2),
    ...framingReviewMoments.value.slice(0, 1),
  ];
});
const postureMoments = computed(() =>
  reviewMoments.value.filter((moment) => moment.category === "posture"),
);
const framingMoments = computed(() =>
  reviewMoments.value.filter((moment) => moment.category !== "posture"),
);
function shortInstruction(value: string) {
  const sentence = value.split(/[.!?]/)[0]?.trim() || value.trim();
  const words = sentence.split(/\s+/);
  return words.length > 14 ? `${words.slice(0, 14).join(" ")}.` : `${sentence}.`;
}
const focusText = computed(() => {
  if (postureMoments.value[0]) return shortInstruction(postureMoments.value[0].suggestion);
  const stable = activity.value?.stablePitchPercent ?? 0;
  if (stable < 55 && (activity.value?.pitchDataQuality ?? "insufficient") === "good") {
    return "Play one slow note and listen for a steady sound.";
  }
  if ((activity.value?.longestContinuousSeconds ?? 0) < 8) {
    return "Try one calm phrase without stopping.";
  }
  return "Play one favorite phrase with a relaxed shoulder.";
});
const goodMoments = computed(() => {
  const items: string[] = [];
  if ((activity.value?.stablePitchPercent ?? 0) >= 60) items.push("Your sound stayed steady for longer.");
  if ((activity.value?.phraseCount ?? 0) > 0) {
    items.push(`${activity.value?.phraseCount} playing sections completed.`);
  }
  if (!postureMoments.value.length) items.push("No repeated playing-position issue stood out today.");
  return items.slice(0, 2);
});
const previousSessions = computed(() => validSessions.value.slice(0, -1).slice(-3));
const previousAverage = computed(() => ({
  duration: average(previousSessions.value.map((session) => session.durationSeconds)),
  phrase: average(
    previousSessions.value.map((session) => session.activity?.longestContinuousSeconds ?? 0),
  ),
  sound: average(
    previousSessions.value
      .filter((session) => session.activity?.pitchDataQuality === "good")
      .map((session) => session.activity?.stablePitchPercent ?? 0),
  ),
}));
function relativeLabel(current: number, baseline: number, good: string, steady: string, growing: string) {
  if (!baseline) return current > 0 ? steady : growing;
  if (current >= baseline * 1.12) return good;
  if (current >= baseline * 0.88) return steady;
  return growing;
}
const practiceStars = computed(() => {
  let stars = 1;
  if ((latestSession.value?.durationSeconds ?? 0) >= 30) stars += 1;
  if ((activity.value?.phraseCount ?? 0) >= 2) stars += 1;
  if (
    previousAverage.value.phrase > 0 &&
    (activity.value?.longestContinuousSeconds ?? 0) > previousAverage.value.phrase * 1.1
  ) stars += 1;
  if (
    activity.value?.pitchDataQuality === "good" &&
    previousAverage.value.sound > 0 &&
    (activity.value?.stablePitchPercent ?? 0) > previousAverage.value.sound * 1.1
  ) stars += 1;
  return Math.min(5, stars);
});
const childSkills = computed(() => [
  {
    label: "Focus",
    value: relativeLabel(
      latestSession.value?.durationSeconds ?? 0,
      previousAverage.value.duration,
      "Improved",
      "Steady",
      "Good start",
    ),
    tone: "bg-lime-100 text-lime-800",
  },
  {
    label: "Sound",
    value:
      activity.value?.pitchDataQuality !== "good"
        ? "Still listening"
        : relativeLabel(
            activity.value?.stablePitchPercent ?? 0,
            previousAverage.value.sound,
            "Improved",
            "Steady",
            "Growing",
          ),
    tone: "bg-orange-100 text-orange-800",
  },
  {
    label: "Movement",
    value: postureMoments.value.length
      ? postureMoments.value.some((moment) => moment.after)
        ? "Improved"
        : "Next focus"
      : "Looked comfortable",
    tone: "bg-bowly-100 text-bowly-800",
  },
]);
const childWin = computed(() =>
  goodMoments.value[0] ??
  report.value?.memoryInsight ??
  "You completed your practice and kept trying.",
);
const validSessions = computed(() =>
  memoryStore.sessions.filter((session) => session.durationSeconds >= 10),
);
const recentSessions = computed(() => validSessions.value.slice(-5));
function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}
function trendLabel(values: number[], unit: string) {
  if (values.length < 3) return "Keep practicing to reveal this trend";
  const midpoint = Math.ceil(values.length / 2);
  const early = average(values.slice(0, midpoint));
  const later = average(values.slice(midpoint));
  if (later > early * 1.1) return `Improving - ${Math.round(later)}${unit} recently`;
  if (later < early * 0.9) return `Changing - ${Math.round(later)}${unit} recently`;
  return `Steady - about ${Math.round(later)}${unit}`;
}
const practiceDaysLast7 = computed(() => {
  const today = Date.now();
  return new Set(
    validSessions.value
      .filter((session) => today - session.startedAt <= 7 * 24 * 60 * 60 * 1000)
      .map((session) => new Date(session.startedAt).toDateString()),
  ).size;
});
const longTermTrends = computed(() => [
  {
    label: "Practice habit",
    value: `${practiceDaysLast7.value} ${practiceDaysLast7.value === 1 ? "day" : "days"} this week`,
    detail: validSessions.value.length < 3 ? "Building a new routine" : "Short, regular sessions count",
    icon: CalendarDaysIcon,
    tone: "bg-bowly-50 text-bowly-700",
  },
  {
    label: "Long phrases",
    value: trendLabel(
      recentSessions.value.map((session) => session.activity?.longestContinuousSeconds ?? 0),
      " sec",
    ),
    detail: "Longest continuous playing section",
    icon: ArrowTrendingUpIcon,
    tone: "bg-lime-50 text-lime-700",
  },
  {
    label: "Steady sound",
    value: trendLabel(
      recentSessions.value
        .filter((session) => session.activity?.pitchDataQuality === "good")
        .map((session) => session.activity?.stablePitchPercent ?? 0),
      "%",
    ),
    detail: "Only sessions with enough clear pitch data",
    icon: MusicalNoteIcon,
    tone: "bg-orange-50 text-orange-700",
  },
]);
const badges = computed(() => {
  const sessions = validSessions.value;
  const definitions = [
    {
      id: "first-session",
      name: "First Practice",
      description: "Completed the first Bowly session",
      unlocked: sessions.length >= 1,
    },
    {
      id: "three-sessions",
      name: "Keep Going",
      description: "Completed 3 practice sessions",
      unlocked: sessions.length >= 3,
    },
    {
      id: "long-phrase",
      name: "Long Phrase",
      description: "Played continuously for 15 seconds",
      unlocked: sessions.some((session) => (session.activity?.longestContinuousSeconds ?? 0) >= 15),
    },
    {
      id: "steady-sound",
      name: "Steady Sound",
      description: "Reached 70% sound stability with good data",
      unlocked: sessions.some(
        (session) =>
          session.activity?.pitchDataQuality === "good" &&
          (session.activity?.stablePitchPercent ?? 0) >= 70,
      ),
    },
  ];
  return definitions;
});
const unlockedBadgeCount = computed(() => badges.value.filter((badge) => badge.unlocked).length);
function setupSuggestion(key: string) {
  if (key === "too-far") {
    return "Keep both hands visible. Only move the phone slightly closer if tracking is still unclear.";
  }
  if (key === "too-close") {
    return "Move the phone slightly farther away so both hands and the bow fit in the frame.";
  }
  if (key === "off-center") {
    return "Center the player while keeping both hands and the bow inside the frame.";
  }
  if (key === "body-not-visible") {
    return "Step back or tilt the phone until the shoulders and instrument are visible.";
  }
  if (key === "arms-not-visible") {
    return "Keep both arms and the bow inside the camera view before starting the next phrase.";
  }
  return "Place the phone slightly farther away or turn it sideways so both hands and the bow remain visible.";
}
const fallbackSuggestion = computed(() =>
  latestSession.value?.practiceMode === "assignment"
    ? "Continue the same assigned section with one calm repeat."
    : "Choose one small intention before the next free practice."
);
const reportCall = computed(() => aiStatus.value?.calls?.report);
const reportModelLabel = computed(
  () => report.value?.ai?.model ?? aiStatus.value?.reportModel ?? aiStatus.value?.model ?? "report AI",
);
const reportDurationMs = computed(() => report.value?.ai?.durationMs ?? reportCall.value?.durationMs);
function formatDurationMs(value?: number) {
  if (!value) return "";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 0)}s`;
}
const reportDurationLabel = computed(() => formatDurationMs(reportDurationMs.value));
const aiReportState = computed<"pending" | "generating" | "ready" | "fallback" | "demo">(() => {
  if (loading.value) return "generating";
  if (report.value?.ai?.provider === "qwen") return "ready";
  if (report.value?.ai?.provider === "mock-fallback") return "fallback";
  if (report.value?.ai?.provider === "mock") return "demo";
  if (aiStatus.value?.mode === "live" && aiStatus.value.keyConfigured) return "pending";
  return "demo";
});
const aiReportStateLabel = computed(() => {
  if (aiReportState.value === "ready") return "AI parent summary ready";
  if (aiReportState.value === "generating") return "AI parent summary generating";
  if (aiReportState.value === "fallback") return "Local summary active";
  if (aiReportState.value === "pending") return "AI parent summary pending";
  return "Demo summary active";
});
const aiReportStateTone = computed(() => {
  if (aiReportState.value === "ready") return "bg-lime-50 text-lime-800 ring-lime-200";
  if (aiReportState.value === "fallback") return "bg-orange-50 text-orange-800 ring-orange-200";
  if (aiReportState.value === "generating" || aiReportState.value === "pending") {
    return "bg-bowly-50 text-bowly-800 ring-bowly-200";
  }
  return "bg-stone-100 text-stone-600 ring-stone-200";
});
const aiWritingBody = computed(() => {
  if (aiReportState.value === "ready") {
    return `Report updated by ${reportModelLabel.value}${reportDurationLabel.value ? ` in ${reportDurationLabel.value}` : ""}.`;
  }
  if (aiReportState.value === "fallback") {
    return "Cloud AI did not finish, so Bowly kept the local summary available.";
  }
  if (aiReportState.value === "generating") {
    return "Local report is visible now. AI wording will update the highlighted sections automatically.";
  }
  if (aiReportState.value === "pending") {
    return "Bowly will request an AI parent summary after the latest session loads.";
  }
  return "Demo mode uses the same report shape with stable sample data.";
});
const aiPipelineStepTitle = computed(() =>
  aiReportState.value === "ready" ? "Parent summary ready" : "Parent summary writing",
);
const aiWritingBadge = computed(() => {
  if (aiReportState.value === "ready") return "AI refined";
  if (aiReportState.value === "fallback") return "local fallback";
  if (aiReportState.value === "generating") return "AI writing";
  return "local draft";
});
const aiWritingBadgeTone = computed(() => {
  if (aiReportState.value === "ready") return "bg-bowly-50 text-bowly-700 ring-bowly-200";
  if (aiReportState.value === "fallback") return "bg-orange-50 text-orange-800 ring-orange-200";
  return "bg-white text-bowly-700 ring-bowly-200";
});
const pipelineStepTwoClass = computed(() => {
  if (aiReportState.value === "ready") return "border-lime-200 bg-lime-50 text-lime-900";
  if (aiReportState.value === "fallback") return "border-orange-200 bg-orange-50 text-orange-900";
  return "border-bowly-200 bg-bowly-50 text-bowly-900";
});
const qwenProofText = computed(() => {
  const responseAi = report.value?.ai;
  if (responseAi?.provider === "qwen") {
    return `Live ${responseAi.model} returned this report response with fallback disabled.`;
  }
  if (responseAi?.provider === "mock-fallback") {
    return `Qwen did not return this report: ${responseAi.lastError ?? "provider unavailable"}`;
  }
  if (responseAi?.provider === "mock") {
    return "Demo mode uses the same report response structure with stable sample data.";
  }
  const reportCall = aiStatus.value?.calls?.report;
  if (reportCall?.provider === "mock-fallback") {
    return `Last report used fallback: ${reportCall.lastError ?? "provider unavailable"}`;
  }
  if (aiStatus.value?.provider === "qwen") {
    return `Health check confirms live ${aiStatus.value.model}; report POST can still fall back if it runs long.`;
  }
  if (aiStatus.value?.provider === "mock-fallback") {
    return "Health check shows the fallback path is active, keeping the demo reliable under timeout.";
  }
  if (aiStatus.value?.mode === "live" && aiStatus.value.keyConfigured) {
    return `${reportModelLabel.value} is configured; Bowly keeps the report usable if the cloud call is slow.`;
  }
  if (aiStatus.value?.mode === "live" && !aiStatus.value.keyConfigured) {
    return "The report contract remains usable while cloud AI credentials are being set up.";
  }
  return "The demo keeps a stable report contract for judges to review.";
});
const reportMetricStats = computed(() => [
  {
    label: "Practice duration",
    value:
      (latestSession.value?.durationSeconds ?? 0) < 60
        ? "<1 min"
        : `${Math.round((latestSession.value?.durationSeconds ?? 0) / 60)} min`,
    detail: "short focused session",
    tone: "bg-bowly-50 text-bowly-800",
    icon: ClockIcon,
  },
  {
    label: "Playing sections",
    value: `${activity.value?.phraseCount ?? "--"}`,
    detail: `Longest ${Math.round(activity.value?.longestContinuousSeconds ?? 0)} sec`,
    tone: "bg-lime-50 text-lime-800",
    icon: PlayCircleIcon,
  },
  {
    label: "Near note",
    value: (activity.value?.pitchedSeconds ?? 0) >= 12 ? `${activity.value?.inTunePercent}%` : "--",
    detail:
      (activity.value?.pitchedSeconds ?? 0) >= 12
        ? "Uses a comfortable +/-20 cent range"
        : "Not enough clear pitch data",
    tone: "bg-orange-50 text-orange-800",
    icon: MusicalNoteIcon,
  },
]);
const aiStatusTooltip = computed(() => {
  if (aiStatus.value?.provider === "qwen") return "The cloud AI summary completed successfully.";
  if (aiStatus.value?.provider === "mock-fallback") {
    return "The cloud AI summary did not finish, so Bowly kept the report available locally.";
  }
  return "Bowly can show a local parent summary even when cloud AI is still connecting.";
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
    errorText.value = "Showing a local summary because the cloud report did not finish in time.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="min-h-[calc(100vh-4.5rem)] px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <div v-if="latestSession && !showParentReport" class="mx-auto max-w-md md:hidden">
        <div class="flex items-center justify-between">
          <RouterLink to="/practice" class="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stage-900">
            <ArrowLeftIcon class="h-5 w-5" />
          </RouterLink>
          <div class="text-center">
            <h1 class="text-lg font-semibold text-stage-950">Practice recap</h1>
            <p class="text-xs text-stone-400">
              {{ latestSession.durationSeconds < 60 ? "<1 min" : `${Math.round(latestSession.durationSeconds / 60)} min` }}
            </p>
          </div>
          <span class="w-10"></span>
        </div>

        <section class="mt-7 rounded-3xl bg-gradient-to-br from-bowly-50 to-orange-50 p-6 text-center">
          <div class="flex justify-center gap-2">
            <StarIcon
              v-for="index in 5"
              :key="index"
              class="h-9 w-9"
              :class="index <= practiceStars
                ? 'fill-orange-300 text-orange-400 drop-shadow-sm'
                : 'fill-white/70 text-stone-200'"
            />
          </div>
          <p class="mt-4 text-2xl font-semibold leading-8 text-stage-950">
            You earned {{ practiceStars }} practice {{ practiceStars === 1 ? "star" : "stars" }}!
          </p>
          <p class="mt-2 text-sm leading-6 text-stone-500">
            Stars celebrate effort, focus, and finishing your practice.
          </p>
        </section>

        <section class="mt-5 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white px-5">
          <div
            v-for="skill in childSkills"
            :key="skill.label"
            class="flex items-center justify-between py-4"
          >
            <span class="font-semibold text-stage-950">{{ skill.label }}</span>
            <span class="rounded-full px-3 py-1 text-sm font-semibold" :class="skill.tone">
              {{ skill.value }}
            </span>
          </div>
        </section>

        <section class="mt-5 rounded-2xl bg-lime-50 p-5 text-lime-950">
          <div class="flex items-center gap-2 font-semibold">
            <CheckCircleIcon class="h-5 w-5 text-lime-600" />
            Your win
          </div>
          <p class="mt-3 text-lg font-semibold leading-7">{{ childWin }}</p>
        </section>

        <section class="mt-5 rounded-2xl bg-stage-900 p-5 text-white">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-bowly-200">Next mini challenge</p>
          <p class="mt-3 text-xl font-semibold leading-7">{{ focusText }}</p>
          <p class="mt-2 text-sm text-white/55">Try it once slowly before starting the piece.</p>
        </section>

        <section v-if="framingMoments.length" class="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div class="flex items-start gap-3">
            <CameraIcon class="mt-0.5 h-5 w-5 shrink-0 text-stone-500" />
            <div>
              <p class="font-semibold text-stage-950">Camera setup</p>
              <p class="mt-1 text-sm leading-6 text-stone-500">
                {{ framingMoments[0]?.suggestion }} No practice stars were lost.
              </p>
            </div>
          </div>
        </section>

        <section class="mt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="section-kicker">Growing over time</p>
              <h2 class="mt-1 text-xl font-semibold text-stage-950">Your badges</h2>
            </div>
            <span class="text-sm font-semibold text-bowly-600">
              {{ unlockedBadgeCount }}/{{ badges.length }}
            </span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <article
              v-for="badge in badges"
              :key="badge.id"
              class="rounded-2xl border p-4 text-center"
              :class="badge.unlocked
                ? 'border-orange-200 bg-orange-50'
                : 'border-stone-200 bg-stone-50 opacity-55'"
            >
              <div
                class="mx-auto grid h-11 w-11 place-items-center rounded-full"
                :class="badge.unlocked ? 'bg-orange-200 text-orange-700' : 'bg-stone-200 text-stone-500'"
              >
                <TrophyIcon class="h-6 w-6" />
              </div>
              <p class="mt-3 text-sm font-semibold text-stage-950">{{ badge.name }}</p>
              <p class="mt-1 text-[11px] leading-4 text-stone-500">{{ badge.description }}</p>
            </article>
          </div>
        </section>

        <div class="sticky bottom-0 mt-7 flex gap-3 bg-white/90 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <RouterLink to="/practice" class="primary-button flex-1 justify-center">Practice again</RouterLink>
          <button
            type="button"
            class="secondary-button justify-center"
            @click="showParentReport = true"
          >
            Parent report
          </button>
        </div>
      </div>

      <div
        id="parent-details"
        :class="showParentReport ? 'block' : 'max-md:hidden'"
      >
      <button
        v-if="showParentReport"
        type="button"
        class="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-bowly-700 md:hidden"
        @click="showParentReport = false"
      >
        <ArrowLeftIcon class="h-4 w-4" />
        Back to child recap
      </button>
      <p class="section-kicker">{{ latestSession ? "Hackathon demo proof" : "Progress overview" }}</p>
      <div class="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 class="text-4xl font-semibold tracking-tight text-stage-950">
            {{
              latestSession
                ? "Private practice signals become an AI-ready parent report."
                : "Today's Practice Report"
            }}
          </h1>
          <p class="mt-3 max-w-2xl text-stone-500">
            {{
              latestSession
                ? "Edge perception stays on device, Qwen or local fallback writes the family summary, and raw video/audio is not stored."
                : "A simple summary of today's practice, what went well, and one calm next step."
            }}
          </p>
        </div>
        <div class="flex flex-col items-start gap-3 sm:items-end">
          <div class="flex flex-wrap justify-start gap-2 sm:justify-end">
            <span class="inline-flex items-center gap-2 rounded-full bg-lime-50 px-3 py-1.5 text-xs font-semibold text-lime-800 ring-1 ring-inset ring-lime-200">
              <CheckCircleIcon class="h-4 w-4" />
              Local facts ready
            </span>
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset"
              :class="aiReportStateTone"
              :title="aiStatusTooltip"
            >
              <span
                class="h-2 w-2 rounded-full bg-current opacity-70"
                :class="loading ? 'animate-pulse' : ''"
              ></span>
              {{ aiReportStateLabel }}
            </span>
          </div>
          <RouterLink to="/practice" class="primary-button">Start a new session</RouterLink>
        </div>
      </div>

      <div v-if="!latestSession" class="mt-10 light-card text-center">
        <p class="text-lg font-medium">No completed sessions yet.</p>
        <p class="mt-2 text-sm text-stone-500">Complete a practice session to create the first report.</p>
      </div>

      <section v-else class="mt-8 space-y-5">
        <article class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="grid gap-4 lg:grid-cols-[1fr_1.2fr_1fr_auto] lg:items-center">
            <div class="flex items-start gap-4">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lime-100 text-lime-700">
                <CheckCircleIcon class="h-7 w-7" />
              </span>
              <div>
                <p class="text-sm font-semibold text-lime-800">1. Edge perception complete</p>
                <p class="mt-1 text-sm leading-6 text-stone-500">
                  {{ activity?.phraseCount ?? 0 }} sections captured on device<br />
                  Longest phrase {{ Math.round(activity?.longestContinuousSeconds ?? 0) }} sec
                </p>
              </div>
            </div>
            <div
              class="rounded-2xl border p-5"
              :class="pipelineStepTwoClass"
            >
              <div class="flex items-start gap-4">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-lg font-semibold ring-1 ring-inset ring-current/20">
                  2
                </span>
                <div>
                <p class="font-semibold">{{ aiPipelineStepTitle }}</p>
                  <p class="mt-1 text-sm leading-6 opacity-75">
                    {{ aiWritingBody }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <span
                class="grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg font-semibold"
                :class="aiReportState === 'ready' ? 'border-lime-300 bg-lime-50 text-lime-700' : 'border-stone-300 bg-white text-stone-500'"
              >
                3
              </span>
              <div>
                <p class="text-sm font-semibold text-stage-950">Report ready</p>
                <p class="mt-1 text-sm leading-6 text-stone-500">
                  AI summary updates highlighted sections automatically.
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-2 lg:items-end">
              <span class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
                <ClockIcon class="h-4 w-4" />
                {{ reportDurationLabel || "about 15-25 sec" }}
              </span>
              <span class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
                Report AI: {{ reportModelLabel }}
              </span>
            </div>
          </div>
          <p class="mt-4 text-sm leading-6 text-stone-500">
            Local facts show first so the report is useful immediately. AI wording updates the parent-facing summary when it is ready.
          </p>
        </article>

        <div class="grid gap-5 lg:grid-cols-[0.85fr_1.35fr_1fr]">
          <article class="rounded-3xl border border-bowly-100 bg-bowly-50 p-6 text-bowly-950 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <CameraIcon class="h-8 w-8 text-bowly-600" />
              <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-bowly-700 ring-1 ring-bowly-200">
                local signals
              </span>
            </div>
            <p class="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-bowly-600">
              Local perception
            </p>
            <p class="mt-3 text-5xl font-semibold leading-none">{{ activity?.phraseCount ?? 0 }}</p>
            <p class="mt-2 font-semibold leading-7 text-stage-950">sections captured on device</p>
            <div class="mt-6 space-y-3 border-t border-bowly-200/70 pt-5 text-sm leading-6 text-bowly-900/75">
              <p>Longest phrase <strong>{{ Math.round(activity?.longestContinuousSeconds ?? 0) }} sec</strong></p>
              <p>{{ reviewMoments.length }} private movement {{ reviewMoments.length === 1 ? "moment" : "moments" }}</p>
              <p>{{ activity?.pitchDataQuality ?? "insufficient" }} pitch data</p>
            </div>
          </article>

          <article class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="section-kicker">AI summary</p>
                <h2 class="mt-2 text-2xl font-semibold text-stage-950">
                  {{ aiReportState === "ready" ? "Parent summary ready" : "Parent summary in progress" }}
                </h2>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset"
                :class="aiWritingBadgeTone"
              >
                {{ aiWritingBadge }}
              </span>
            </div>
            <p class="mt-3 text-sm leading-6 text-stone-500">
              {{ qwenProofText }}
            </p>
            <div class="mt-6 space-y-3">
              <div class="rounded-2xl bg-stage-900 p-5 text-white shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <LightBulbIcon class="h-6 w-6 text-orange-300" />
                    <p class="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-orange-300">
                      Tomorrow's suggestion
                    </p>
                  </div>
                  <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 ring-1 ring-white/10">
                    {{ aiWritingBadge }}
                  </span>
                </div>
                <p class="mt-4 text-xl font-semibold leading-8">
                  {{ report?.tomorrowSuggestion ?? fallbackSuggestion }}
                </p>
              </div>
              <div class="rounded-2xl border border-stone-200 bg-white p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="font-semibold text-stage-950">What went well today</p>
                  <span class="text-xs font-semibold text-bowly-600">{{ aiWritingBadge }}</span>
                </div>
                <p class="mt-3 text-sm leading-6 text-stone-600">
                  {{ report?.summary ?? latestSession.coachHighlights.join(" ") }}
                </p>
              </div>
              <div class="rounded-2xl border border-stone-200 bg-white p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="font-semibold text-stage-950">Memory note for next step</p>
                  <span class="text-xs font-semibold text-lime-700">{{ aiWritingBadge }}</span>
                </div>
                <p class="mt-3 text-sm leading-6 text-stone-600">
                  {{ report?.memoryInsight ?? continuityInsight }}
                </p>
              </div>
            </div>
            <p class="mt-5 rounded-2xl bg-bowly-50 px-4 py-3 text-sm leading-6 text-bowly-800">
              These sections are refined by AI. If the cloud call is slow, the local version stays visible.
            </p>
          </article>

          <article class="rounded-3xl border border-lime-200 bg-lime-50 p-6 text-lime-950 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <EyeIcon class="h-7 w-7 text-lime-700" />
              <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-lime-800 ring-1 ring-lime-200">
                privacy + fallback
              </span>
            </div>
            <p class="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
              Privacy & reliability
            </p>
            <h3 class="mt-3 text-2xl font-semibold leading-8 text-stage-950">
              No raw video or audio stored.
            </h3>
            <p class="mt-4 text-sm leading-6 text-lime-900/75">
              Bowly keeps structured practice signals only, and the local summary stays visible if AI is slow.
            </p>
            <div class="mt-6 space-y-3 text-sm font-medium text-lime-900">
              <p class="flex items-center gap-2">
                <CheckCircleIcon class="h-5 w-5 text-lime-700" />
                Raw media is not stored
              </p>
              <p class="flex items-center gap-2">
                <CheckCircleIcon class="h-5 w-5 text-lime-700" />
                Local facts are always available
              </p>
              <p class="flex items-center gap-2">
                <CheckCircleIcon class="h-5 w-5 text-lime-700" />
                Nothing is lost if AI is slow
              </p>
            </div>
          </article>
        </div>

        <article class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p class="section-kicker">Today's practice report</p>
          <div class="mt-4 grid gap-3 md:grid-cols-3">
            <article
              v-for="stat in reportMetricStats"
              :key="stat.label"
              class="rounded-2xl p-4 ring-1 ring-inset ring-black/5"
              :class="stat.tone"
            >
              <div class="flex items-start justify-between gap-3">
                <component :is="stat.icon" class="h-5 w-5" />
                <span class="rounded-full bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">
                  local
                </span>
              </div>
              <p class="mt-3 text-xs font-semibold uppercase tracking-[0.12em] opacity-65">
                {{ stat.label }}
              </p>
              <p class="mt-1 text-2xl font-semibold">{{ stat.value }}</p>
              <p class="mt-1 text-xs leading-5 opacity-70">{{ stat.detail }}</p>
            </article>
          </div>
        </article>
      </section>

      <div v-if="latestSession" class="mt-5 grid gap-5 md:grid-cols-3">
        <section class="rounded-2xl border border-stone-200/80 bg-white shadow-sm md:col-span-3">
          <div class="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p class="section-kicker">Recent progress</p>
              <h2 class="mt-2 text-2xl font-semibold text-stage-950">Long-term trends</h2>
              <p class="mt-2 text-sm leading-6 text-stone-500">
                {{ validSessions.length }} recorded sessions. Open this only when judges ask about retention or progress over time.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stage-900 hover:bg-stone-50"
              @click="showProgressDetails = !showProgressDetails"
            >
              {{ showProgressDetails ? "Hide details" : "Show trends" }}
            </button>
          </div>
          <div v-if="showProgressDetails" class="border-t border-stone-100 p-5">
            <div class="grid gap-4 md:grid-cols-3">
              <article
                v-for="trend in longTermTrends"
                :key="trend.label"
                class="rounded-2xl p-5"
                :class="trend.tone"
              >
                <component :is="trend.icon" class="h-6 w-6" />
                <p class="mt-4 text-sm font-semibold opacity-70">{{ trend.label }}</p>
                <p class="mt-2 text-lg font-semibold leading-7">{{ trend.value }}</p>
                <p class="mt-1 text-xs leading-5 opacity-65">{{ trend.detail }}</p>
              </article>
            </div>
            <div class="mt-6 border-t border-stone-100 pt-5">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-stage-950">Achievements</h3>
                <span class="text-sm text-stone-400">{{ unlockedBadgeCount }} unlocked</span>
              </div>
              <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  v-for="badge in badges"
                  :key="badge.id"
                  class="rounded-xl border p-4"
                  :class="badge.unlocked
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-stone-200 bg-stone-50 opacity-50'"
                >
                  <TrophyIcon class="h-5 w-5" :class="badge.unlocked ? 'text-orange-600' : 'text-stone-400'" />
                  <p class="mt-3 font-semibold text-stage-950">{{ badge.name }}</p>
                  <p class="mt-1 text-xs leading-5 text-stone-500">{{ badge.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-stone-200/80 bg-white shadow-sm md:col-span-3">
          <div class="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p class="section-kicker">Helpful practice notes</p>
              <h2 class="mt-2 text-2xl font-semibold text-stage-950">
                Practice observations
              </h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                {{ reviewMoments.length ? `${reviewMoments.length} private movement note available.` : "No persistent movement concern was recorded." }}
                Original video is not stored.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="hidden items-center gap-2 text-sm text-lime-700 sm:inline-flex">
                <EyeIcon class="h-5 w-5" />
                Private by design
              </span>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stage-900 hover:bg-stone-50"
                @click="showObservationDetails = !showObservationDetails"
              >
                {{ showObservationDetails ? "Hide notes" : "Show notes" }}
              </button>
            </div>
          </div>

          <div v-if="showObservationDetails && reviewMoments.length" class="space-y-6 border-t border-stone-100 p-5">
            <article
              v-for="moment in reviewMoments"
              :key="moment.id"
              class="rounded-2xl border border-stone-200 bg-stone-50/70 p-5"
            >
              <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p
                    class="mb-2 text-xs font-semibold uppercase tracking-[0.16em]"
                    :class="moment.category === 'posture' ? 'text-bowly-600' : 'text-stone-500'"
                  >
                    {{ moment.category === "posture" ? "Local movement signal" : "Camera view note" }}
                  </p>
                  <h3 class="text-lg font-semibold text-stage-950">{{ moment.title }}</h3>
                  <p class="mt-1 text-sm text-stone-500">
                    Seen {{ moment.occurrences }} {{ moment.occurrences === 1 ? "time" : "times" }}
                    - {{ moment.totalDurationSeconds }} sec total
                  </p>
                </div>
                <p class="max-w-md text-sm leading-6 text-stone-600">{{ moment.suggestion }}</p>
              </div>

              <div
                class="mt-5 rounded-xl p-4"
                :class="moment.category === 'posture' ? 'bg-bowly-50' : 'bg-stone-100'"
              >
                <p class="text-sm font-semibold text-stage-950">
                  {{
                    moment.category === "posture"
                      ? "What this means"
                      : "This was about the camera view, not your child's playing"
                  }}
                </p>
                <p class="mt-2 text-sm leading-6 text-stone-600">
                  {{
                    moment.category === "posture"
                      ? `Bowly found this local pose pattern in usable samples for about ${moment.totalDurationSeconds} seconds.`
                      : "The camera could not clearly see part of the playing position, so Bowly did not use it to judge the child's movement."
                  }}
                </p>
                <p v-if="moment.category === 'posture'" class="mt-3 text-sm font-medium text-bowly-800">
                  Next time: {{ moment.suggestion }}
                </p>
                <p v-if="moment.after" class="mt-3 flex items-center gap-2 text-sm font-medium text-lime-700">
                  <CheckCircleIcon class="h-4 w-4" />
                  The view or movement improved later.
                </p>
              </div>

              <div class="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-bowly-600">
                    Edge evidence sample
                  </p>
                  <PoseSnapshot :snapshot="moment.before" tone="before" />
                </div>
                <div>
                  <p class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">
                    <CheckCircleIcon class="h-4 w-4" />
                    {{ moment.after ? "Later sample closer to target" : "Setup for next time" }}
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
                    {{ setupSuggestion(moment.key) }}
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-else-if="showObservationDetails" class="border-t border-stone-100 p-5">
          <div class="rounded-2xl bg-lime-50 p-6 text-lime-900">
            <p class="font-semibold">No persistent movement concern was recorded.</p>
            <p class="mt-2 text-sm leading-6 text-lime-800">
              Bowly stays quiet when there is not enough reliable evidence for a movement suggestion.
            </p>
          </div>
          </div>
        </section>
      </div>
      <p v-if="loading" class="mt-6 text-sm text-stone-500">Building gentle report...</p>
      <p v-if="errorText" class="mt-3 text-sm text-orange-700">{{ errorText }}</p>
      </div>
    </div>
  </section>
</template>
