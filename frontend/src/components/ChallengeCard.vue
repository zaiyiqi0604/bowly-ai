<script setup lang="ts">
import { ArrowTrendingUpIcon } from "@heroicons/vue/24/outline";
import type { PracticeChallenge } from "../types/session";

defineProps<{
  challenge: PracticeChallenge;
}>();
</script>

<template>
  <section class="p-6 sm:p-8">
    <h3 class="flex items-center gap-3 text-lg font-semibold text-orange-300">
      <ArrowTrendingUpIcon class="h-6 w-6" />
      Today's Challenge
    </h3>
    <p class="mt-7 text-base font-medium text-white/90">{{ challenge.title }}</p>
    <p class="mt-2 text-sm leading-6 text-white/50">{{ challenge.description }}</p>
    <div class="mt-6 flex items-center gap-4">
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          class="h-full rounded-full bg-orange-300 transition-all duration-500"
          :style="{ width: `${Math.min(100, Math.round((challenge.progress / challenge.target) * 100))}%` }"
        ></div>
      </div>
      <span class="text-lg font-semibold text-orange-200">{{ challenge.progress }} / {{ challenge.target }}</span>
    </div>
    <p v-if="challenge.completed" class="mt-4 text-sm font-semibold text-lime-300">
      Great work today. Challenge complete.
    </p>
  </section>
</template>
