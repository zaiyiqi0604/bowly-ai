<script setup lang="ts">
import { computed, ref, watch } from "vue";
import puppyImage from "../assets/practice-pets/puppy.webp";
import puppyListeningImage from "../assets/practice-pets/puppy-listening.webp";
import puppySteadyImage from "../assets/practice-pets/puppy-steady.webp";
import puppyClearerImage from "../assets/practice-pets/puppy-clearer.webp";
import owlImage from "../assets/practice-pets/owl.webp";
import owlListeningImage from "../assets/practice-pets/owl-listening.webp";
import owlSteadyImage from "../assets/practice-pets/owl-steady.webp";
import owlClearerImage from "../assets/practice-pets/owl-clearer.webp";
import robotImage from "../assets/practice-pets/robot.webp";
import robotListeningImage from "../assets/practice-pets/robot-listening.webp";
import robotSteadyImage from "../assets/practice-pets/robot-steady.webp";
import robotClearerImage from "../assets/practice-pets/robot-clearer.webp";

const props = defineProps<{
  sessionActive: boolean;
  isPlaying: boolean;
  pitchStability: number;
  noteName: string;
  cameraFraming: "good" | "adjust" | "searching";
  startIssue: string;
  microFeedback: string;
}>();

type PetId = "owl" | "puppy" | "robot";
type PetTone = "ready" | "listening" | "playing" | "great" | "coach";
type PetVisualState = "ready" | "listening" | "steady" | "clearer";

const PET_STORAGE_KEY = "bowly-practice-pet";

const pets: Array<{
  id: PetId;
  name: string;
  images: Record<PetVisualState, string>;
  hint: string;
}> = [
  {
    id: "owl",
    name: "Owl",
    images: {
      ready: owlImage,
      listening: owlListeningImage,
      steady: owlSteadyImage,
      clearer: owlClearerImage,
    },
    hint: "Calm listener",
  },
  {
    id: "puppy",
    name: "Puppy",
    images: {
      ready: puppyImage,
      listening: puppyListeningImage,
      steady: puppySteadyImage,
      clearer: puppyClearerImage,
    },
    hint: "Warm buddy",
  },
  {
    id: "robot",
    name: "Robot",
    images: {
      ready: robotImage,
      listening: robotListeningImage,
      steady: robotSteadyImage,
      clearer: robotClearerImage,
    },
    hint: "AI helper",
  },
];

const savedPet =
  typeof window === "undefined"
    ? ""
    : window.localStorage.getItem(PET_STORAGE_KEY);
const selectedPetId = ref<PetId>(
  pets.some((pet) => pet.id === savedPet) ? (savedPet as PetId) : "owl",
);

const selectedPet = computed(
  () => pets.find((pet) => pet.id === selectedPetId.value) ?? pets[0],
);

watch(selectedPetId, (next) => {
  if (typeof window !== "undefined") window.localStorage.setItem(PET_STORAGE_KEY, next);
});

const petState = computed(() => {
  if (props.startIssue || props.cameraFraming === "adjust") {
    return {
      tone: "coach",
      label: "Need a clearer view",
      message: "Step back a little",
      face: "concerned",
      symbol: "!",
      showMessage: true,
      visual: "clearer",
    };
  }

  if (!props.sessionActive) {
    return {
      tone: "ready",
      label: "Ready",
      message: "",
      face: "calm",
      symbol: "OK",
      showMessage: false,
      visual: "ready",
    };
  }

  if (props.microFeedback) {
    return {
      tone: "coach",
      label: "Hint",
      message: props.microFeedback,
      face: "focused",
      symbol: "i",
      showMessage: true,
      visual: "clearer",
    };
  }

  if (props.isPlaying && props.pitchStability >= 70) {
    return {
      tone: "great",
      label: "Steady",
      message: "",
      face: "happy",
      symbol: "~",
      showMessage: false,
      visual: "steady",
    };
  }

  if (props.isPlaying && props.noteName) {
    return {
      tone: "playing",
      label: "Playing",
      message: "",
      face: "focused",
      symbol: "~",
      showMessage: false,
      visual: "listening",
    };
  }

  return {
    tone: "listening",
    label: "Listening",
    message: "",
    face: "calm",
    symbol: "...",
    showMessage: false,
    visual: "listening",
  };
});

const petToneClass = computed(() => `practice-pet--${petState.value.tone as PetTone}`);
const selectedPetImage = computed(
  () => selectedPet.value.images[petState.value.visual as PetVisualState],
);
</script>

<template>
  <section class="practice-pet" :class="petToneClass" aria-live="polite">
    <span class="practice-pet__glow"></span>
    <span class="practice-pet__shadow"></span>

    <div class="practice-pet__avatar-wrap" :class="`practice-pet__avatar-wrap--${petState.face}`">
      <img
        class="practice-pet__avatar"
        :src="selectedPetImage"
        :alt="`${selectedPet.name} practice buddy`"
      />
    </div>

    <div
      class="practice-pet__status"
      :class="{ 'practice-pet__status--message': petState.showMessage }"
    >
      <span class="practice-pet__signal">{{ petState.symbol }}</span>
      <span v-if="petState.showMessage" class="practice-pet__message">{{ petState.message }}</span>
      <span v-else class="practice-pet__sr-label">{{ petState.label }}</span>
    </div>

    <div class="practice-pet__chooser" aria-label="Choose practice buddy">
      <button
        v-for="pet in pets"
        :key="pet.id"
        type="button"
        class="practice-pet__choice"
        :class="{ 'practice-pet__choice--active': selectedPetId === pet.id }"
        :aria-label="`Choose ${pet.name}, ${pet.hint}`"
        :aria-pressed="selectedPetId === pet.id"
        @click="selectedPetId = pet.id"
      >
        <img :src="pet.images.ready" alt="" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.practice-pet {
  position: relative;
  width: 18rem;
  min-height: 9.2rem;
  color: rgb(221, 208, 255);
  overflow: visible;
  isolation: isolate;
}

.practice-pet--great {
  color: rgb(217, 249, 157);
}

.practice-pet--coach {
  color: rgb(253, 230, 138);
}

.practice-pet__glow {
  position: absolute;
  left: 1.8rem;
  top: 0.8rem;
  z-index: 0;
  width: 7.4rem;
  height: 6.4rem;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.18);
  filter: blur(20px);
  animation: pet-glow 2.8s ease-in-out infinite;
}

.practice-pet__shadow {
  position: absolute;
  left: 1.95rem;
  top: 6.78rem;
  z-index: 0;
  width: 7.7rem;
  height: 1.05rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.38);
  filter: blur(8px);
  animation: pet-shadow 3.2s ease-in-out infinite;
}

.practice-pet__avatar-wrap {
  position: absolute;
  left: 0.65rem;
  top: 0;
  display: grid;
  width: 9.6rem;
  height: 9.6rem;
  place-items: center;
  overflow: visible;
  animation: pet-float 3.2s ease-in-out infinite;
}

.practice-pet__avatar {
  width: 122%;
  height: 122%;
  object-fit: contain;
  filter: drop-shadow(0 1rem 1.1rem rgba(0, 0, 0, 0.32));
  transition:
    transform 220ms ease,
    filter 220ms ease;
}

.practice-pet__avatar-wrap--happy .practice-pet__avatar {
  transform: translateY(-4px) scale(1.08);
  filter: saturate(1.1) brightness(1.08) drop-shadow(0 1rem 1.1rem rgba(0, 0, 0, 0.32));
}

.practice-pet__avatar-wrap--focused .practice-pet__avatar {
  transform: translateY(-1px) scale(1.06);
}

.practice-pet__avatar-wrap--concerned .practice-pet__avatar {
  transform: rotate(-4deg) scale(1.05);
  filter: saturate(0.9) brightness(0.96) drop-shadow(0 1rem 1.1rem rgba(0, 0, 0, 0.32));
}

.practice-pet__status {
  position: absolute;
  left: 9.9rem;
  top: 6.45rem;
  z-index: 2;
  display: inline-flex;
  min-height: 1.9rem;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(18, 16, 22, 0.48);
  padding: 0.32rem;
  box-shadow: 0 10px 24px rgba(8, 6, 12, 0.22);
  backdrop-filter: blur(10px);
}

.practice-pet__status--message {
  max-width: min(11.75rem, calc(100vw - 2rem));
  padding-right: 0.65rem;
}

.practice-pet__signal {
  display: grid;
  min-width: 1.12rem;
  height: 1.12rem;
  place-items: center;
  border-radius: 999px;
  background: currentColor;
  color: #18131f;
  font-size: 0.58rem;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 0 16px color-mix(in srgb, currentColor 45%, transparent);
}

.practice-pet__message {
  min-width: 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.practice-pet__sr-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.practice-pet__chooser {
  position: absolute;
  left: 8.45rem;
  top: 0.45rem;
  z-index: 3;
  display: flex;
  gap: 0.22rem;
  opacity: 0;
  transform: translateY(0.25rem);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.practice-pet:hover .practice-pet__chooser,
.practice-pet:focus-within .practice-pet__chooser {
  opacity: 1;
  transform: translateY(0);
}

.practice-pet__choice {
  display: grid;
  width: 1.55rem;
  height: 1.55rem;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  padding: 0;
  opacity: 0.72;
  transition:
    border-color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;
}

.practice-pet__choice:hover,
.practice-pet__choice--active {
  border-color: rgba(221, 208, 255, 0.72);
  opacity: 1;
  transform: translateY(-1px);
}

.practice-pet__choice img {
  width: 135%;
  height: 135%;
  object-fit: cover;
}

@keyframes pet-float {
  0%,
  100% {
    transform: translateY(0) rotate(-1deg);
  }

  50% {
    transform: translateY(-0.35rem) rotate(1deg);
  }
}

@keyframes pet-shadow {
  0%,
  100% {
    opacity: 0.36;
    transform: scaleX(0.9);
  }

  50% {
    opacity: 0.22;
    transform: scaleX(1.06);
  }
}

@keyframes pet-glow {
  0%,
  100% {
    opacity: 0.58;
    transform: scale(0.94);
  }

  50% {
    opacity: 0.9;
    transform: scale(1.08);
  }
}

@media (max-width: 767px) {
  .practice-pet {
    width: 13.8rem;
    min-height: 7.75rem;
  }

  .practice-pet__avatar-wrap {
    left: 0.25rem;
    width: 7.4rem;
    height: 7.4rem;
  }

  .practice-pet__glow {
    left: 1.1rem;
    width: 5.8rem;
    height: 5rem;
  }

  .practice-pet__shadow {
    left: 1.2rem;
    top: 5.8rem;
    width: 5.9rem;
  }

  .practice-pet__status {
    left: 7.2rem;
    top: 5.45rem;
  }

  .practice-pet__status--message {
    max-width: min(8.5rem, calc(100vw - 1.5rem));
  }

  .practice-pet__message {
    font-size: 0.72rem;
  }

  .practice-pet__chooser {
    display: none;
  }
}
</style>
