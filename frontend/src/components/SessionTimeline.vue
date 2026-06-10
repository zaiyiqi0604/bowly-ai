<script setup lang="ts">
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
</script>

<template>
  <section class="card">
    <h3 class="section-title">Session Timeline</h3>
    <ul class="timeline-list">
      <li v-for="event in events" :key="event.id">
        <span class="time">{{ formatTime(event.timestamp) }}</span>
        <span class="type">{{ event.type }}</span>
        <span class="message">{{ event.message }}</span>
      </li>
      <li v-if="events.length === 0" class="muted">
        Timeline will appear when practice starts.
      </li>
    </ul>
  </section>
</template>

<style scoped>
.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

li {
  display: grid;
  grid-template-columns: 70px 74px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
  padding: 8px 10px;
  border-radius: 10px;
  background: #fff8ec;
}

.time {
  color: #6f6781;
}

.type {
  text-transform: capitalize;
  color: #5948ad;
}

.message {
  color: #302842;
}
</style>
