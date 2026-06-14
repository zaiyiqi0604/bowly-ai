<script setup lang="ts">
import { computed } from "vue";
import { MusicalNoteIcon } from "@heroicons/vue/24/outline";

const props = defineProps<{
  pitchStability: number;
  noteName: string;
  centsOffset: number;
  permissionState: "idle" | "granted" | "denied";
  errorMessage: string;
  dataQuality: "insufficient" | "limited" | "good";
}>();

const pointerPosition = computed(() =>
  Math.max(3, Math.min(97, 50 + props.centsOffset))
);

const tuningState = computed(() => {
  if (!props.noteName) {
    return {
      label: "Listening",
      detail: "Play one clear note.",
      tone: "listening",
    };
  }

  const absoluteOffset = Math.abs(props.centsOffset);
  if (absoluteOffset <= 15) {
    return {
      label: "Centered",
      detail: "Keep this sound.",
      tone: "tuned",
    };
  }
  if (props.centsOffset < 0) {
    return {
      label: absoluteOffset <= 30 ? "Nearly centered" : "Move higher",
      detail: "Move the finger a tiny bit higher.",
      tone: "adjust",
    };
  }
  return {
    label: absoluteOffset <= 30 ? "Nearly centered" : "Move lower",
    detail: "Move the finger a tiny bit lower.",
    tone: "adjust",
  };
});

const shortNoteName = computed(() => props.noteName.replace(/\d+$/, ""));
</script>

<template>
  <section class="rounded-xl border border-white/15 bg-stage-900/88 px-3 py-2.5 shadow-xl backdrop-blur-md sm:px-4">
    <div class="flex items-center gap-3">
      <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bowly-400/10">
        <MusicalNoteIcon class="h-5 w-5 text-bowly-200" />
      </div>

      <div class="w-28 shrink-0">
        <div class="flex items-center gap-2">
          <span
            class="h-2 w-2 rounded-full"
            :class="tuningState.tone === 'tuned'
              ? 'bg-lime-300'
              : noteName
                ? 'bg-amber-300'
                : 'bg-white/30'"
          ></span>
          <strong
            class="text-sm font-semibold"
            :class="tuningState.tone === 'tuned' ? 'text-lime-200' : 'text-white/85'"
          >
            {{ tuningState.label }}
          </strong>
        </div>
        <span class="mt-0.5 block truncate text-[11px] text-white/45">
          {{ tuningState.detail }}
        </span>
      </div>

      <div class="min-w-0 flex-1">
        <div class="mb-1 flex justify-between text-[9px] font-medium uppercase tracking-[0.1em] text-white/35">
          <span>Higher</span>
          <span class="text-lime-200/70">Good</span>
          <span>Lower</span>
        </div>
        <div class="relative h-5">
          <div class="absolute inset-x-0 top-2 h-1.5 rounded-full bg-gradient-to-r from-amber-300/35 via-lime-300/70 to-amber-300/35"></div>
          <div class="absolute left-[35%] top-1 h-3.5 w-[30%] rounded-full border border-lime-100/25 bg-lime-200/10"></div>
          <div class="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-lime-100/70"></div>
          <div
            v-if="noteName"
            class="absolute top-0.5 h-4 w-1.5 -translate-x-1/2 rounded-full transition-[left,background-color] duration-150"
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

    <p v-if="errorMessage" class="mt-1.5 text-xs text-amber-200/80">{{ errorMessage }}</p>
  </section>
</template>
