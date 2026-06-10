<script setup lang="ts">
const demoScenes = [
  {
    title: "Scene 1",
    detail: "Welcome back Emily. Let's try one small challenge today.",
  },
  {
    title: "Scene 2",
    detail: "Camera and microphone activate with calm observation mode.",
  },
  {
    title: "Scene 3",
    detail: "That note became steadier after slowing the bow.",
  },
  {
    title: "Scene 4",
    detail: "Try lifting the violin just a little.",
  },
  {
    title: "Scene 5",
    detail: "Great work today. Challenge completed.",
  },
  {
    title: "Scene 6",
    detail: "Parent report generated with tomorrow's gentle suggestion.",
  },
];
</script>

<template>
  <section class="card">
    <h2 class="section-title">Hackathon Demo Mode</h2>
    <p class="muted">
      Stable scripted flow using mock AI responses. Works even if live API is unavailable.
    </p>
    <ul class="demo-list">
      <li v-for="scene in demoScenes" :key="scene.title">
        <strong>{{ scene.title }}</strong>
        <span>{{ scene.detail }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.demo-list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

li {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff8ec;
}
</style>
