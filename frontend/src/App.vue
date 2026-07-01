<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import {
  BeakerIcon,
  ChartBarSquareIcon,
  HomeIcon,
  MusicalNoteIcon,
} from "@heroicons/vue/24/outline";

const navItems = [
  { label: "Home", to: "/", icon: HomeIcon },
  { label: "Practice", to: "/practice", icon: MusicalNoteIcon },
  { label: "Parent Report", to: "/report", icon: ChartBarSquareIcon },
  { label: "Demo", to: "/demo", icon: BeakerIcon },
];

const route = useRoute();
const isPracticeRoute = computed(() => route.path.startsWith("/practice"));
</script>

<template>
  <div
    class="min-h-screen bg-[#f8f5ef]"
    :style="{ '--app-header-height': isPracticeRoute ? '3.5rem' : '4.5rem' }"
  >
    <header
      class="z-40 border-b border-stone-200/80 bg-[#fbf9f4]/95 backdrop-blur"
      :class="isPracticeRoute ? 'relative' : 'sticky top-0'"
    >
      <div
        class="mx-auto flex max-w-[1600px] items-center px-4 sm:px-6 lg:px-8"
        :class="isPracticeRoute ? 'h-14 gap-4' : 'h-18 gap-6'"
      >
        <RouterLink
          to="/"
          class="flex shrink-0 items-center gap-3 font-bold tracking-tight text-stage-950"
          :class="isPracticeRoute ? 'text-lg' : 'text-xl'"
        >
          <span
            class="grid place-items-center rounded-xl bg-bowly-100 font-black text-bowly-500"
            :class="isPracticeRoute ? 'h-8 w-8 text-xl' : 'h-10 w-10 text-2xl'"
          >B</span>
          <span class="max-[380px]:sr-only">Bowly AI</span>
        </RouterLink>

        <nav class="ml-auto flex items-center gap-1 overflow-x-auto">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="group flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-stone-500 hover:text-stage-950"
            :class="isPracticeRoute ? 'py-4' : 'py-5'"
            active-class="!border-bowly-500 !text-bowly-600"
          >
            <component :is="item.icon" class="h-5 w-5 lg:hidden" />
            <span class="hidden sm:inline">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
