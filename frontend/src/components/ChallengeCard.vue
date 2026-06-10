<script setup lang="ts">
import type { PracticeChallenge } from "../types/session";

defineProps<{
  challenge: PracticeChallenge;
}>();
</script>

<template>
  <section class="card">
    <h3 class="section-title">{{ challenge.title }}</h3>
    <p class="muted">{{ challenge.description }}</p>
    <div class="progress-row">
      <div class="track">
        <div
          class="fill"
          :style="{ width: `${Math.round((challenge.progress / challenge.target) * 100)}%` }"
        ></div>
      </div>
      <span>{{ challenge.progress }}/{{ challenge.target }}</span>
    </div>
    <p v-if="challenge.completed" class="done">Great work today. Challenge complete.</p>
  </section>
</template>

<style scoped>
.progress-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.track {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: #efe7db;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd16c, #6f5ad5);
}

.done {
  margin-top: 8px;
  color: #1f6a43;
  font-weight: 600;
}
</style>
