<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { MusicalNoteIcon } from "@heroicons/vue/24/outline";

const props = defineProps<{
  pitchStability: number;
  noteName: string;
  centsOffset: number;
  permissionState: "idle" | "granted" | "denied";
  errorMessage: string;
  dataQuality: "insufficient" | "limited" | "good";
  compact?: boolean;
}>();

const displayedCents = ref(0);
watch(
  () => props.centsOffset,
  (next) => {
    const softened = Math.abs(next) <= 8 ? 0 : next;
    displayedCents.value += (softened - displayedCents.value) * 0.35;
  },
  { immediate: true },
);
watch(
  () => props.noteName,
  (next, previous) => {
    if (next !== previous) displayedCents.value = 0;
  },
);

const pointerPosition = computed(() =>
  Math.max(5, Math.min(95, 50 + displayedCents.value * 0.8))
);

const tuningState = computed(() => {
  if (!props.noteName) {
    return {
      label: "Listening",
      detail: "Play one clear, steady note.",
      tone: "listening",
    };
  }

  const absoluteOffset = Math.abs(props.centsOffset);
  if (absoluteOffset <= 20) {
    return {
      label: "Centered",
      detail: "Within +/-20 cents of the nearest note.",
      tone: "tuned",
    };
  }
  if (props.centsOffset < 0) {
    return {
      label: absoluteOffset <= 35 ? "Nearly there" : "A little low",
      detail: "Only adjust if this pitch is intentional.",
      tone: "adjust",
    };
  }
  return {
    label: absoluteOffset <= 35 ? "Nearly there" : "A little high",
    detail: "Only adjust if this pitch is intentional.",
    tone: "adjust",
  };
});

const shortNoteName = computed(() => props.noteName.replace(/\d+$/, ""));
</script>

<template>
  <section
    class="rounded-xl border border-white/15 bg-stage-900/88 shadow-xl backdrop-blur-md"
    :class="compact ? 'px-2.5 py-2' : 'px-3 py-2.5 sm:px-4'"
  >
    <div class="flex items-center" :class="compact ? 'gap-2' : 'gap-3'">
      <div
        class="shrink-0 place-items-center rounded-lg bg-bowly-400/10"
        :class="compact ? 'hidden' : 'grid h-8 w-8'"
      >
        <MusicalNoteIcon class="h-5 w-5 text-bowly-200" />
      </div>

      <div :class="compact ? 'w-[4.6rem] shrink-0' : 'w-28 shrink-0'">
        <div class="flex items-center gap-2">
          <span
            v-if="compact && noteName"
            class="text-lg font-semibold leading-none text-white"
          >
            {{ shortNoteName }}
          </span>
          <span
            class="h-2 w-2 rounded-full"
            :class="[
              { hidden: compact && noteName },
              tuningState.tone === 'tuned'
                ? 'bg-lime-300'
                : noteName
                  ? 'bg-amber-300'
                  : 'bg-white/30',
            ]"
          ></span>
          <strong
            class="font-semibold"
            :class="[
              compact ? 'truncate text-[11px]' : 'text-sm',
              tuningState.tone === 'tuned' ? 'text-lime-200' : 'text-white/85',
            ]"
          >
            {{ tuningState.label }}
          </strong>
        </div>
        <span v-if="!compact" class="mt-0.5 block truncate text-[11px] text-white/45">
          {{ tuningState.detail }}
        </span>
      </div>

      <div class="min-w-0 flex-1">
        <div v-if="!compact" class="mb-1 flex justify-between text-[9px] font-medium uppercase tracking-[0.1em] text-white/35">
          <span>Low</span>
          <span class="text-lime-200/70">Center</span>
          <span>High</span>
        </div>
        <div class="relative" :class="compact ? 'h-4' : 'h-5'">
          <div class="absolute inset-x-0 top-2 h-1.5 rounded-full bg-gradient-to-r from-amber-300/35 via-lime-300/70 to-amber-300/35"></div>
          <div class="absolute left-[30%] top-1 h-3.5 w-[40%] rounded-full border border-lime-100/25 bg-lime-200/10"></div>
          <div
            v-if="noteName"
            class="absolute top-0.5 h-4 w-2 -translate-x-1/2 rounded-full transition-[left,background-color] duration-300 ease-out"
            :class="tuningState.tone === 'tuned'
              ? 'bg-lime-100 shadow-[0_0_10px_rgba(190,242,100,.7)]'
              : 'bg-amber-200'"
            :style="{ left: `${pointerPosition}%` }"
          ></div>
        </div>
      </div>

      <div class="hidden w-20 shrink-0 text-right sm:block">
        <span class="block text-[10px] text-white/35">
          {{
            noteName
              ? `Detected ${shortNoteName}`
              : permissionState === "denied"
                ? "Mic blocked"
                : "Waiting"
          }}
        </span>
        <span class="text-xs font-medium text-white/55">
          {{
            dataQuality === "insufficient"
              ? "Collecting data"
              : `${pitchStability}% steady`
          }}
        </span>
      </div>
    </div>

    <p v-if="errorMessage && !compact" class="mt-1.5 text-xs text-amber-200/80">{{ errorMessage }}</p>
  </section>
</template>
