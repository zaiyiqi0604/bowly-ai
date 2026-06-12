<script setup lang="ts">
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
</script>

<template>
  <div class="min-h-screen bg-[#f8f5ef]">
    <header class="sticky top-0 z-40 border-b border-stone-200/80 bg-[#fbf9f4]/95 backdrop-blur">
      <div class="mx-auto flex h-18 max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <RouterLink to="/" class="flex shrink-0 items-center gap-3 text-xl font-bold tracking-tight text-stage-950">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-bowly-100 text-2xl font-black text-bowly-500">B</span>
          <span>Bowly AI</span>
        </RouterLink>

        <nav class="ml-auto flex items-center gap-1 overflow-x-auto">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="group flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-5 text-sm font-medium text-stone-500 hover:text-stage-950"
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
