<script setup lang="ts">
import { computed, ref, watch } from "vue";
import puppyImage from "../assets/practice-pets/puppy.webp";
import owlImage from "../assets/practice-pets/owl.webp";
import robotImage from "../assets/practice-pets/robot.webp";

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

const PET_STORAGE_KEY = "bowly-practice-pet";

const pets: Array<{
  id: PetId;
  name: string;
  image: string;
  hint: string;
}> = [
  {
    id: "owl",
    name: "Owl",
    image: owlImage,
    hint: "Calm listener",
  },
  {
    id: "puppy",
    name: "Puppy",
    image: puppyImage,
    hint: "Warm buddy",
  },
  {
    id: "robot",
    name: "Robot",
    image: robotImage,
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
  window.localStorage.setItem(PET_STORAGE_KEY, next);
});

const petState = computed(() => {
  if (props.startIssue || props.cameraFraming === "adjust") {
    return {
      tone: "coach",
      label: "Need a clearer view",
      message: "Step back a little so Bowly can see your bow hand.",
      face: "concerned",
    };
  }

  if (!props.sessionActive) {
    return {
      tone: "ready",
      label: "Ready when you are",
      message: "I will listen quietly while you play.",
      face: "calm",
    };
  }

  if (props.microFeedback) {
    return {
      tone: "coach",
      label: "Tiny practice hint",
      message: props.microFeedback,
      face: "focused",
    };
  }

  if (props.isPlaying && props.pitchStability >= 70) {
    return {
      tone: "great",
      label: "Steady sound",
      message: "Nice, keep the bow moving smoothly.",
      face: "happy",
    };
  }

  if (props.isPlaying && props.noteName) {
    return {
      tone: "playing",
      label: "Playing with you",
      message: "Keep going. I am following your sound.",
      face: "focused",
    };
  }

  return {
    tone: "listening",
    label: "Listening",
    message: "Start with one calm phrase.",
    face: "calm",
  };
});
</script>

<template>
  <section
    class="practice-pet"
    :class="`practice-pet--${petState.tone}`"
    aria-live="polite"
  >
    <div class="practice-pet__avatar-wrap" :class="`practice-pet__avatar-wrap--${petState.face}`">
      <img
        class="practice-pet__avatar"
        :src="selectedPet.image"
        :alt="`${selectedPet.name} practice buddy`"
      />
    </div>
    <div class="min-w-0">
      <div class="practice-pet__heading">
        <p class="practice-pet__label">{{ petState.label }}</p>
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
            <img :src="pet.image" alt="" />
          </button>
        </div>
      </div>
      <p class="practice-pet__message">{{ petState.message }}</p>
    </div>
  </section>
</template>

<style scoped>
.practice-pet {
  display: flex;
  max-width: min(22rem, calc(100vw - 2rem));
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1.25rem;
  background: rgba(18, 16, 22, 0.76);
  padding: 0.7rem 0.85rem;
  color: white;
  box-shadow: 0 18px 44px rgba(8, 6, 12, 0.34);
  backdrop-filter: blur(18px);
}

.practice-pet--great {
  border-color: rgba(190, 242, 100, 0.34);
  background: rgba(20, 30, 20, 0.76);
}

.practice-pet--coach {
  border-color: rgba(251, 191, 36, 0.34);
  background: rgba(44, 34, 21, 0.78);
}

.practice-pet--ready,
.practice-pet--playing,
.practice-pet--listening {
  border-color: rgba(197, 173, 255, 0.28);
}

.practice-pet__avatar-wrap {
  position: relative;
  display: grid;
  width: 3.65rem;
  height: 3.65rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.12), rgba(139, 92, 246, 0.1));
  box-shadow:
    inset 0 -0.2rem 0 rgba(255, 255, 255, 0.05),
    0 0 0 0.35rem rgba(255, 255, 255, 0.05),
    0 0 24px rgba(139, 92, 246, 0.22);
  overflow: hidden;
}

.practice-pet__avatar {
  width: 116%;
  height: 116%;
  object-fit: cover;
  transition:
    transform 220ms ease,
    filter 220ms ease;
}

.practice-pet__avatar-wrap--happy .practice-pet__avatar {
  transform: translateY(-2px) scale(1.06);
  filter: saturate(1.1) brightness(1.08);
}

.practice-pet__avatar-wrap--focused .practice-pet__avatar {
  transform: scale(1.04);
}

.practice-pet__avatar-wrap--concerned .practice-pet__avatar {
  transform: rotate(-3deg) scale(1.03);
  filter: saturate(0.9) brightness(0.96);
}

.practice-pet__heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.practice-pet__label {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(221, 208, 255, 0.9);
}

.practice-pet__chooser {
  display: flex;
  flex: 0 0 auto;
  gap: 0.24rem;
}

.practice-pet__choice {
  display: grid;
  width: 1.35rem;
  height: 1.35rem;
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

.practice-pet__message {
  margin: 0.18rem 0 0;
  display: -webkit-box;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.86rem;
  font-weight: 650;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 767px) {
  .practice-pet {
    max-width: calc(100vw - 1.5rem);
    border-radius: 1rem;
    padding: 0.55rem 0.65rem;
  }

  .practice-pet__avatar-wrap {
    width: 3rem;
    height: 3rem;
  }

  .practice-pet__message {
    font-size: 0.78rem;
  }

  .practice-pet__chooser {
    display: none;
  }
}
</style>
