<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ArrowUpTrayIcon,
  BookOpenIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import type {
  PracticeActivityStats,
  PracticeChallenge,
  PracticeMode,
} from "../types/session";

const props = defineProps<{
  mode: PracticeMode;
  assignmentTitle: string;
  assignmentImage?: string;
  plan: PracticeChallenge;
  isSessionActive: boolean;
  isPlaying: boolean;
  activity: PracticeActivityStats;
  startState?: "idle" | "preparing" | "blocked";
  startIssue?: string;
  allowAudioOnly?: boolean;
  allowStartAnyway?: boolean;
}>();

const emit = defineEmits<{
  "update:mode": [mode: PracticeMode];
  "update:assignment-title": [title: string];
  "update:assignment-image": [image: string];
  "mark-round": [];
  complete: [];
  start: [];
  retry: [];
  "audio-only": [];
  "start-anyway": [];
}>();

const editingTask = ref(false);
const draftTitle = ref(props.assignmentTitle);
const hasRememberedTask = computed(() => Boolean(props.assignmentTitle.trim()));

function openTaskEditor() {
  draftTitle.value = props.assignmentTitle;
  editingTask.value = true;
}

function saveTask() {
  const title = draftTitle.value.trim();
  emit("update:assignment-title", title);
  emit("update:mode", title ? "assignment" : "free");
  editingTask.value = false;
}

function startRememberedTask() {
  emit("update:mode", hasRememberedTask.value ? "assignment" : "free");
  emit("start");
}

function startWithoutTask() {
  emit("update:mode", "free");
  emit("start");
}

function handleImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (typeof reader.result !== "string") return;
    const image = new Image();
    image.addEventListener("load", () => {
      const maxEdge = 720;
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      emit("update:assignment-image", canvas.toDataURL("image/jpeg", 0.72));
    });
    image.src = reader.result;
  });
  reader.readAsDataURL(file);
}
</script>

<template>
  <section class="p-6 sm:p-8">
    <template v-if="!isSessionActive">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-bowly-300/80">
        Welcome back
      </p>

      <div v-if="hasRememberedTask && !editingTask" class="mt-4 flex items-center gap-4">
        <div
          class="grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.055]"
        >
          <img
            v-if="assignmentImage"
            :src="assignmentImage"
            alt="Previously scanned practice page"
            class="h-full w-full object-cover"
          />
          <PhotoIcon v-else class="h-6 w-6 text-white/25" />
        </div>
        <div class="min-w-0">
          <p class="text-sm text-white/40">Continue today?</p>
          <h3 class="mt-1 line-clamp-2 text-xl font-semibold leading-7 text-white">
            {{ assignmentTitle }}
          </h3>
        </div>
      </div>

      <div v-else-if="!editingTask" class="mt-4">
        <h3 class="text-2xl font-semibold text-white">Ready when you are.</h3>
        <p class="mt-2 text-sm leading-6 text-white/45">
          Start playing now, or add a short note about today’s practice.
        </p>
      </div>

      <div
        v-if="editingTask"
        class="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-white">Today’s practice</p>
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-white"
            aria-label="Close practice editor"
            @click="editingTask = false"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>
        <textarea
          v-model="draftTitle"
          rows="3"
          class="mt-3 w-full resize-none rounded-xl border border-white/10 bg-stage-950/45 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-bowly-400"
          placeholder="For example: Minuet No. 1, bars 12–20, slowly"
        ></textarea>
        <div class="mt-3 flex items-center justify-between gap-3">
          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-white/45 hover:text-white/75">
            <ArrowUpTrayIcon class="h-4 w-4" />
            Add a photo
            <input class="sr-only" type="file" accept="image/*" capture="environment" @change="handleImage" />
          </label>
          <button
            type="button"
            class="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
            @click="saveTask"
          >
            Save
          </button>
        </div>
      </div>

      <button
        class="primary-button mt-7 w-full justify-center py-3.5"
        :disabled="startState === 'preparing'"
        @click="startRememberedTask"
      >
        {{ startState === "preparing" ? "Preparing..." : "Start Practice" }}
      </button>

      <div v-if="!editingTask" class="mt-4 flex items-center justify-center gap-5 text-xs">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 font-medium text-white/45 hover:text-white"
          @click="openTaskEditor"
        >
          <PencilSquareIcon class="h-4 w-4" />
          {{ hasRememberedTask ? "Change today’s practice" : "Add today’s practice" }}
        </button>
        <button
          v-if="hasRememberedTask"
          type="button"
          class="font-medium text-white/35 hover:text-white"
          @click="startWithoutTask"
        >
          Just play
        </button>
      </div>

      <div
        v-if="startState === 'blocked' && startIssue"
        class="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3"
      >
        <p class="text-sm leading-6 text-amber-100">{{ startIssue }}</p>
        <div class="mt-2 flex flex-wrap gap-3">
          <button class="text-xs font-semibold text-white hover:text-amber-100" @click="emit('retry')">
            Try again
          </button>
          <button
            v-if="allowAudioOnly"
            class="text-xs font-semibold text-white/55 hover:text-white"
            @click="emit('audio-only')"
          >
            Continue with audio only
          </button>
          <button
            v-if="allowStartAnyway"
            class="text-xs font-semibold text-white/55 hover:text-white"
            @click="emit('start-anyway')"
          >
            Start anyway
          </button>
        </div>
      </div>
      <p v-else-if="startState === 'preparing'" class="mt-3 text-center text-xs text-white/40">
        Checking microphone and camera...
      </p>
    </template>

    <template v-else>
      <h3 class="flex items-center gap-3 text-lg font-semibold text-orange-300">
        <BookOpenIcon class="h-6 w-6" />
        {{ mode === "assignment" ? "Today’s Practice" : "Free Practice" }}
      </h3>

      <div class="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <p class="text-base font-medium text-white/90">{{ plan.title }}</p>
        <p class="mt-2 text-sm leading-6 text-white/50">{{ plan.description }}</p>

        <template v-if="mode === 'assignment'">
          <div class="mt-5 flex items-center gap-4">
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                class="h-full rounded-full bg-orange-300 transition-all duration-500"
                :style="{ width: `${Math.min(100, Math.round((plan.progress / plan.target) * 100))}%` }"
              ></div>
            </div>
            <span class="text-base font-semibold text-orange-200">{{ plan.progress }} / {{ plan.target }}</span>
          </div>
          <div v-if="!isPlaying && !plan.completed" class="mt-4 grid grid-cols-2 gap-2">
            <button class="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/15" @click="emit('mark-round')">
              Finished one round
            </button>
            <button class="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/50 hover:text-white/80" @click="emit('complete')">
              Finish this part
            </button>
          </div>
          <p v-if="plan.completed" class="mt-4 flex items-center gap-2 text-sm font-semibold text-lime-300">
            <CheckCircleIcon class="h-5 w-5" />
            You completed what you planned.
          </p>
        </template>
        <p v-else class="mt-4 text-xs leading-5 text-white/35">
          No score and no pass/fail. Bowly records time, pauses, and reliable observations.
        </p>
      </div>

      <div class="mt-4 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl bg-white/[0.04] px-2 py-3">
          <p class="text-lg font-semibold text-white/85">{{ activity.phraseCount }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-wide text-white/30">Sections</p>
        </div>
        <div class="rounded-xl bg-white/[0.04] px-2 py-3">
          <p class="text-lg font-semibold text-white/85">{{ Math.round(activity.totalPlayingSeconds) }}s</p>
          <p class="mt-1 text-[10px] uppercase tracking-wide text-white/30">Playing</p>
        </div>
        <div class="rounded-xl bg-white/[0.04] px-2 py-3">
          <p class="text-lg font-semibold text-white/85">{{ activity.pitchedSeconds ? `${activity.inTunePercent}%` : "—" }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-wide text-white/30">Near centre</p>
        </div>
      </div>
    </template>
  </section>
</template>
