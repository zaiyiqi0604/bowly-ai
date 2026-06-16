<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CheckCircleIcon, PlayCircleIcon } from "@heroicons/vue/24/outline";
import { createDemoSessions } from "../demo/demoSessions";
import { useMemoryStore } from "../stores/memory";

const route = useRoute();
const router = useRouter();
const memoryStore = useMemoryStore();

const demoScenes = [
  { title: "Welcome", detail: "Welcome back Emily. Let's try one small challenge today." },
  { title: "Observe", detail: "Camera and microphone activate with calm observation mode." },
  { title: "Listen", detail: "That note became steadier after slowing the bow." },
  { title: "Adjust", detail: "Try lifting the violin just a little." },
  { title: "Celebrate", detail: "Great work today. Challenge completed." },
  { title: "Report", detail: "Parent report generated with tomorrow's gentle suggestion." },
];

onMounted(() => {
  if (route.query.seed !== "report") return;
  memoryStore.replaceDemoSessions(createDemoSessions());
  void router.replace("/report");
});
</script>

<template>
  <section class="min-h-[calc(100vh-4.5rem)] bg-stage-950 px-4 py-12 text-white sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl">
      <p class="section-kicker">Reliable presentation flow</p>
      <h1 class="mt-4 text-4xl font-semibold">Hackathon Demo Mode</h1>
      <p class="mt-4 max-w-2xl text-base leading-7 text-white/50">
        A stable scripted walkthrough using mock AI responses, designed to work even when the live API is unavailable.
      </p>

      <div class="mt-10 grid gap-4 md:grid-cols-2">
        <article
          v-for="(scene, index) in demoScenes"
          :key="scene.title"
          class="surface-panel flex gap-4 p-5 hover:bg-white/[0.07]"
        >
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bowly-500/15 text-sm font-semibold text-bowly-300">
            {{ index + 1 }}
          </span>
          <div>
            <h2 class="font-semibold">{{ scene.title }}</h2>
            <p class="mt-2 text-sm leading-6 text-white/45">{{ scene.detail }}</p>
          </div>
          <CheckCircleIcon class="ml-auto h-5 w-5 shrink-0 text-lime-300/70" />
        </article>
      </div>

      <RouterLink to="/practice" class="primary-button mt-8">
        <PlayCircleIcon class="h-5 w-5" />
        Open practice experience
      </RouterLink>
    </div>
  </section>
</template>
