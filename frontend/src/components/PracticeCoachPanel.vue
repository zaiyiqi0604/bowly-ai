<script setup lang="ts">
defineProps<{
  coachMessage: string;
  loadingCoach: boolean;
}>();
</script>

<template>
  <section class="card">
    <h3 class="section-title">Gentle Coach</h3>
    <p class="coach-text">{{ coachMessage }}</p>
    <p class="muted" v-if="loadingCoach">Bowly is preparing the next gentle tip...</p>
  </section>
</template>

<style scoped>
.coach-text {
  margin: 10px 0 8px;
  font-size: 1.05rem;
  color: var(--ink-700);
  line-height: 1.45;
}
</style>
