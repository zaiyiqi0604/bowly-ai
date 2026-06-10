<script setup lang="ts">
defineProps<{
  pitchStability: number;
  level: number;
}>();
</script>

<template>
  <section class="card">
    <h3 class="section-title">Audio Meter</h3>
    <p class="muted">Pitch stability estimate</p>
    <div class="meter">
      <div class="bar" :style="{ width: `${pitchStability}%` }"></div>
    </div>
    <div class="meter-row">
      <span>Stability: {{ pitchStability }}%</span>
      <span>Energy: {{ level }}%</span>
    </div>
  </section>
</template>

<style scoped>
.meter {
  width: 100%;
  margin-top: 10px;
  height: 12px;
  border-radius: 999px;
  background: #efe7db;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #b7d9c8, #6f5ad5);
  transition: width 0.4s ease;
}

.meter-row {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  color: #6f6781;
  font-size: 0.9rem;
}
</style>
