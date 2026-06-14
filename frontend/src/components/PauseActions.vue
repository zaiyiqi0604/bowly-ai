<script setup lang="ts">
import {
  ArrowPathIcon,
  ArrowRightIcon,
  StopIcon,
} from "@heroicons/vue/24/outline";

defineProps<{
  assignmentMode: boolean;
}>();

const emit = defineEmits<{
  again: [];
  next: [];
  end: [];
}>();
</script>

<template>
  <section class="border-t border-white/10 bg-stage-900/95 p-4 sm:p-5">
    <p class="text-center text-sm font-medium text-white/70">What would you like to do?</p>
    <div class="mt-3 grid gap-2 sm:grid-cols-3">
      <button class="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium hover:bg-white/15" @click="emit('again')">
        <ArrowPathIcon class="mr-2 inline h-4 w-4" />
        Play again
      </button>
      <button class="rounded-xl bg-bowly-500 px-4 py-3 text-sm font-medium hover:bg-bowly-400" @click="emit('next')">
        <ArrowRightIcon class="mr-2 inline h-4 w-4" />
        {{ assignmentMode ? "Next section" : "Keep playing" }}
      </button>
      <button class="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/55 hover:text-white" @click="emit('end')">
        <StopIcon class="mr-2 inline h-4 w-4" />
        End practice
      </button>
    </div>
  </section>
</template>
