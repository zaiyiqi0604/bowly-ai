<script setup lang="ts">
import { computed } from "vue";
import { SparklesIcon } from "@heroicons/vue/24/outline";

const props = defineProps<{
  coachMessage: string;
  loadingCoach: boolean;
  isPlaying: boolean;
  compact?: boolean;
}>();

const displayMessage = computed(() => {
  if (props.isPlaying) return "Bowly is listening. Keep following the music.";
  if (props.loadingCoach) return "Bowly is checking the last phrase. Keep resting for a moment.";
  return props.coachMessage?.trim() || "Take your time. Continue when you are ready.";
});

const statusLabel = computed(() => {
  if (props.isPlaying) return "Listening now";
  if (props.loadingCoach) return "Preparing feedback";
  return "Ready when you are";
});

const helperText = computed(() => {
  if (props.isPlaying) return "No interruption while you are playing.";
  if (props.loadingCoach) return "A short tip will appear here after the pause.";
  return "Feedback waits for a natural pause.";
});
</script>

<template>
  <section :class="compact ? 'p-6' : 'min-h-62 p-6 sm:p-8'">
    <div class="flex items-start justify-between gap-4">
      <h3 class="flex items-center gap-3 text-lg font-semibold text-bowly-300">
        <SparklesIcon class="h-6 w-6" />
        Gentle Coach
      </h3>
      <span
        class="mt-0.5 rounded-full border px-3 py-1 text-[11px] font-semibold"
        :class="
          loadingCoach
            ? 'border-orange-300/25 bg-orange-300/10 text-orange-200'
            : 'border-white/10 bg-white/[0.04] text-white/50'
        "
      >
        {{ statusLabel }}
      </span>
    </div>

    <div class="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4" :class="compact ? '' : 'sm:p-5'">
      <p class="min-h-[4rem] text-lg leading-8 text-white/90">
        {{ displayMessage }}
      </p>
      <div v-if="loadingCoach" class="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div class="h-full w-2/3 animate-pulse rounded-full bg-orange-300"></div>
      </div>
    </div>

    <p v-if="!compact" class="mt-5 flex items-center gap-3 text-sm text-white/50">
      <span
        class="h-2.5 w-2.5 rounded-full transition-colors duration-700"
        :class="isPlaying ? 'bg-lime-300/70' : loadingCoach ? 'bg-orange-300' : 'bg-bowly-400'"
      ></span>
      {{ helperText }}
    </p>
  </section>
</template>
