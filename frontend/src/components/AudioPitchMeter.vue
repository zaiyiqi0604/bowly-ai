<script setup lang="ts">
import { MusicalNoteIcon } from "@heroicons/vue/24/outline";

defineProps<{
  pitchStability: number;
  level: number;
}>();
</script>

<template>
  <section class="rounded-2xl border border-white/15 bg-stage-900/85 p-4 shadow-2xl backdrop-blur-md sm:p-5">
    <div class="flex items-center gap-4">
      <MusicalNoteIcon class="h-8 w-8 shrink-0 text-white/80" />
      <div class="min-w-0 flex-1">
        <div class="mb-3 flex items-center gap-2">
          <h3 class="text-sm font-medium text-white">Pitch Stability</h3>
          <span class="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/55">Live</span>
        </div>
        <div class="flex h-8 items-end gap-1 overflow-hidden">
          <span
            v-for="index in 40"
            :key="index"
            class="w-1.5 shrink-0 rounded-full transition-all duration-300"
            :class="index <= Math.round(pitchStability / 2.5)
              ? index < 12 ? 'bg-orange-300' : index < 30 ? 'bg-lime-300' : 'bg-white'
              : 'bg-white/10'"
            :style="{ height: `${35 + ((index * 17) % 65)}%` }"
          ></span>
        </div>
      </div>
      <div class="shrink-0 text-right">
        <strong class="block text-3xl font-semibold text-lime-300">{{ pitchStability }}%</strong>
        <span class="text-xs text-lime-200/80">{{ level > 5 ? "Stable" : "Listening" }}</span>
      </div>
    </div>
  </section>
</template>
