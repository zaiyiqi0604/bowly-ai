<script setup lang="ts">
import { SparklesIcon } from "@heroicons/vue/24/outline";

defineProps<{
  coachMessage: string;
  loadingCoach: boolean;
  isPlaying: boolean;
  compact?: boolean;
}>();
</script>

<template>
  <section :class="compact ? 'p-6' : 'min-h-62 p-6 sm:p-8'">
    <h3 class="flex items-center gap-3 text-lg font-semibold text-bowly-300">
      <SparklesIcon class="h-6 w-6" />
      Gentle Coach
    </h3>
    <blockquote :class="compact ? 'mt-5' : 'mt-7 border-b border-white/10 pb-7'">
      <span class="block text-4xl leading-4 text-white/25">“</span>
      <p class="mt-2 text-lg leading-8 text-white/90">
        {{
          isPlaying
            ? "Bowly is listening. Keep following the music."
            : loadingCoach
              ? "Listening back to that phrase..."
              : coachMessage
        }}
      </p>
    </blockquote>
    <p v-if="!compact" class="mt-5 flex items-center gap-3 text-sm text-white/45">
      <span
        class="h-2.5 w-2.5 rounded-full transition-colors duration-700"
        :class="isPlaying ? 'bg-lime-300/70' : 'bg-bowly-400'"
      ></span>
      {{
        isPlaying
          ? "No interruption while you are playing."
          : loadingCoach
            ? "Bowly is preparing the next gentle tip..."
            : "Feedback waits for a natural pause."
      }}
    </p>
  </section>
</template>
