<script setup lang="ts">
import { ClockIcon } from "@heroicons/vue/24/outline";
import type { TimelineEvent } from "../types/session";

defineProps<{
  events: TimelineEvent[];
}>();

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventColor(type: TimelineEvent["type"]) {
  if (type === "challenge") return "bg-orange-300";
  if (type === "posture") return "bg-bowly-400";
  return "bg-lime-300";
}
</script>

<template>
  <section class="p-6 sm:p-8">
    <h3 class="flex items-center gap-3 text-lg font-semibold text-lime-300">
      <ClockIcon class="h-6 w-6" />
      Session Timeline
    </h3>
    <ul class="mt-7 space-y-0">
      <li v-for="(event, index) in events" :key="event.id" class="relative grid grid-cols-[18px_64px_1fr] gap-3 pb-6">
        <span v-if="index < events.length - 1" class="absolute left-[8px] top-4 h-full w-px bg-white/20"></span>
        <span class="relative mt-1 h-4 w-4 rounded-full border-2 border-stage-800" :class="eventColor(event.type)"></span>
        <span class="text-sm text-white/45">{{ formatTime(event.timestamp) }}</span>
        <span>
          <span class="block text-sm capitalize text-white/85">{{ event.type }}</span>
          <span class="mt-1 block text-xs leading-5 text-white/40">{{ event.message }}</span>
        </span>
      </li>
      <li v-if="events.length === 0" class="grid grid-cols-[18px_1fr] gap-3">
        <span class="mt-1 h-4 w-4 rounded-full border-2 border-white/25"></span>
        <span class="text-sm text-white/45">Timeline will appear when practice starts.</span>
      </li>
    </ul>
  </section>
</template>
