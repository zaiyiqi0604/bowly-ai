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
    <span class="practice-pet__glow"></span>
    <span class="practice-pet__shadow"></span>
    <div class="practice-pet__avatar-wrap" :class="`practice-pet__avatar-wrap--${petState.face}`">
      <img
        class="practice-pet__avatar"
        :src="selectedPet.image"
        :alt="`${selectedPet.name} practice buddy`"
      />
    </div>
    <div class="practice-pet__content">
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
  position: relative;
  min-height: 6.35rem;
  max-width: min(25.5rem, calc(100vw - 2rem));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 1.45rem;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 42%),
    radial-gradient(circle at 18% 20%, rgba(197, 173, 255, 0.22), transparent 30%),
    rgba(18, 16, 22, 0.82);
  padding: 0.9rem 0.9rem 0.9rem 6.65rem;
  color: white;
  box-shadow:
    0 18px 44px rgba(8, 6, 12, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
  overflow: visible;
  isolation: isolate;
}

.practice-pet--great {
  border-color: rgba(190, 242, 100, 0.34);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 42%),
    radial-gradient(circle at 20% 20%, rgba(190, 242, 100, 0.2), transparent 32%),
    rgba(20, 30, 20, 0.8);
}

.practice-pet--coach {
  border-color: rgba(251, 191, 36, 0.34);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 42%),
    radial-gradient(circle at 20% 20%, rgba(251, 191, 36, 0.2), transparent 32%),
    rgba(44, 34, 21, 0.82);
}

.practice-pet--ready,
.practice-pet--playing,
.practice-pet--listening {
  border-color: rgba(197, 173, 255, 0.28);
}

.practice-pet__glow {
  position: absolute;
  left: 0.85rem;
  top: 0.65rem;
  z-index: -1;
  width: 5.8rem;
  height: 5.8rem;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.2);
  filter: blur(18px);
  animation: pet-glow 2.8s ease-in-out infinite;
}

.practice-pet__shadow {
  position: absolute;
  left: 1.05rem;
  bottom: 0.45rem;
  z-index: -1;
  width: 5.5rem;
  height: 1.05rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.38);
  filter: blur(8px);
  animation: pet-shadow 3.2s ease-in-out infinite;
}

.practice-pet__avatar-wrap {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  display: grid;
  width: 6.1rem;
  height: 6.1rem;
  transform: translateY(-52%);
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.16), transparent 44%),
    rgba(255, 255, 255, 0.04);
  box-shadow:
    inset 0 -0.25rem 0 rgba(0, 0, 0, 0.1),
    0 0 0 0.35rem rgba(255, 255, 255, 0.05);
  overflow: hidden;
  animation: pet-float 3.2s ease-in-out infinite;
}

.practice-pet__avatar {
  width: 128%;
  height: 128%;
  object-fit: contain;
  transition:
    transform 220ms ease,
    filter 220ms ease;
}

.practice-pet__avatar-wrap--happy .practice-pet__avatar {
  transform: translateY(-4px) scale(1.08);
  filter: saturate(1.1) brightness(1.08);
}

.practice-pet__avatar-wrap--focused .practice-pet__avatar {
  transform: translateY(-1px) scale(1.06);
}

.practice-pet__avatar-wrap--concerned .practice-pet__avatar {
  transform: rotate(-4deg) scale(1.05);
  filter: saturate(0.9) brightness(0.96);
}

.practice-pet__content {
  min-width: 0;
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
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(221, 208, 255, 0.9);
  text-shadow: 0 1px 8px rgba(139, 92, 246, 0.24);
}

.practice-pet__chooser {
  display: flex;
  flex: 0 0 auto;
  gap: 0.24rem;
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

.practice-pet__message {
  margin: 0.28rem 0 0;
  display: -webkit-box;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@keyframes pet-float {
  0%,
  100% {
    transform: translateY(-52%) rotate(-1deg);
  }

  50% {
    transform: translateY(-58%) rotate(1deg);
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
    max-width: calc(100vw - 1.5rem);
    border-radius: 1rem;
    min-height: 5.25rem;
    padding: 0.7rem 0.75rem 0.7rem 5.4rem;
  }

  .practice-pet__avatar-wrap {
    left: 0.35rem;
    width: 5rem;
    height: 5rem;
  }

  .practice-pet__label {
    font-size: 0.64rem;
  }

  .practice-pet__message {
    font-size: 0.84rem;
  }

  .practice-pet__chooser {
    display: none;
  }

  .practice-pet__glow {
    left: 0.55rem;
    top: 0.5rem;
    width: 4.6rem;
    height: 4.6rem;
  }

  .practice-pet__shadow {
    left: 0.75rem;
    width: 4.5rem;
  }
}
</style>
