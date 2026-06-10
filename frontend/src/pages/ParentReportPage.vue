<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useMemoryStore } from "../stores/memory";
import { fetchParentReport } from "../services/api";
import type { ParentReportResponse } from "../types/ai";

const memoryStore = useMemoryStore();
const loading = ref(false);
const report = ref<ParentReportResponse | null>(null);
const errorText = ref("");

const latestSession = computed(() => memoryStore.latestSession);

onMounted(async () => {
  if (!latestSession.value) return;
  loading.value = true;
  try {
    report.value = await fetchParentReport(latestSession.value);
  } catch (error) {
    console.error(error);
    errorText.value = "Using local summary because report service is unavailable.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="card">
    <h2 class="section-title">Parent Practice Report</h2>
    <p v-if="!latestSession" class="muted">No completed sessions yet. Start a practice session first.</p>
    <div v-else class="report-grid">
      <article class="card nested">
        <h3>Practice Duration</h3>
        <p>{{ Math.round(latestSession.durationSeconds / 60) }} minutes</p>
      </article>
      <article class="card nested">
        <h3>Progress Trend</h3>
        <p>{{ memoryStore.consistencyTrend }}</p>
      </article>
      <article class="card nested">
        <h3>Motivation</h3>
        <p>{{ report?.motivationLevel ?? "medium" }}</p>
      </article>
      <article class="card nested span-two">
        <h3>Highlights</h3>
        <p>{{ report?.summary ?? latestSession.coachHighlights.join(" ") }}</p>
        <p class="muted">{{ report?.postureInsight ?? "Posture confidence improves with slow starts." }}</p>
        <p class="muted">{{ report?.tomorrowSuggestion ?? "Tomorrow: begin with 3 slow bows." }}</p>
        <p class="muted">{{ report?.memoryInsight ?? "Consistency is growing week by week." }}</p>
      </article>
    </div>
    <p v-if="loading" class="muted">Building gentle report...</p>
    <p v-if="errorText" class="muted">{{ errorText }}</p>
  </section>
</template>

<style scoped>
.report-grid {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.nested {
  border-radius: 12px;
}

.span-two {
  grid-column: span 2;
}

h3 {
  margin: 0 0 8px;
}
</style>
