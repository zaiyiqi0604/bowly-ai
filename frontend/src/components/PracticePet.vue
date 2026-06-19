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
import eggNestImage from "../assets/practice-pets/egg-nest.webp";

const props = defineProps<{
  sessionActive: boolean;
  isPlaying: boolean;
  pitchStability: number;
  durationSeconds: number;
  playingSeconds: number;
  stablePlayingSeconds: number;
  noteName: string;
  cameraFraming: "good" | "adjust" | "searching";
  startIssue: string;
  microFeedback: string;
}>();

type PetId = "owl" | "puppy" | "robot";
type PetTone = "ready" | "listening" | "playing" | "great" | "coach";
type PetVisualState = "ready" | "listening" | "steady" | "clearer";
type PetMissionStage = "egg" | "listening" | "calm";

const PET_STORAGE_KEY = "bowly-practice-pet";
const PET_MISSION_STORAGE_KEY = "bowly-practice-pet-mission";

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

function readPetMission() {
  if (typeof window === "undefined") return {} as Record<PetId, boolean>;
  try {
    return JSON.parse(window.localStorage.getItem(PET_MISSION_STORAGE_KEY) ?? "{}") as Record<
      PetId,
      boolean
    >;
  } catch {
    return {} as Record<PetId, boolean>;
  }
}

const awakenedPets = ref<Record<PetId, boolean>>(readPetMission());
const selectedPetAwake = computed(() => awakenedPets.value[selectedPetId.value] === true);

watch(selectedPetId, (next) => {
  if (typeof window !== "undefined") window.localStorage.setItem(PET_STORAGE_KEY, next);
});

watch(
  () => [
    selectedPetId.value,
    props.sessionActive,
    props.playingSeconds,
    props.stablePlayingSeconds,
  ],
  () => {
    const readyToWake =
      props.sessionActive &&
      props.playingSeconds >= 30 &&
      (props.stablePlayingSeconds >= 6 || props.pitchStability >= 55);
    if (!readyToWake || selectedPetAwake.value) return;

    awakenedPets.value = {
      ...awakenedPets.value,
      [selectedPetId.value]: true,
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PET_MISSION_STORAGE_KEY, JSON.stringify(awakenedPets.value));
    }
  },
);

const missionStage = computed<PetMissionStage>(() => {
  if (!selectedPetAwake.value && props.playingSeconds < 8) return "egg";
  if (props.sessionActive && props.stablePlayingSeconds >= 15) return "calm";
  if (props.isPlaying || props.sessionActive || props.playingSeconds >= 8) return "listening";
  return selectedPetAwake.value ? "calm" : "egg";
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
const habitatClass = computed(() => `practice-pet--${selectedPet.value.id}`);
const habitatStateClass = computed(() => `practice-pet--${petState.value.visual as PetVisualState}`);
const missionStageClass = computed(() => `practice-pet--mission-${missionStage.value}`);
const missionProgress = computed(() => {
  if (missionStage.value === "calm") return 100;
  if (missionStage.value === "listening") {
    return Math.min(96, Math.max(42, 42 + props.stablePlayingSeconds * 3.6));
  }
  return Math.min(34, Math.max(12, 12 + props.playingSeconds * 2.6));
});
const wakeProgress = computed(() => Math.min(100, Math.round((props.playingSeconds / 30) * 100)));
const wakeSecondsRemaining = computed(() =>
  Math.max(0, 30 - Math.floor(props.playingSeconds)),
);
const missionRingStyle = computed(() => ({
  "--pet-progress": `${missionProgress.value}%`,
  "--pet-ring-deg": `${Math.round(wakeProgress.value * 3.6)}deg`,
}));
</script>

<template>
  <section
    class="practice-pet"
    :class="[petToneClass, habitatClass, habitatStateClass, missionStageClass]"
    aria-live="polite"
  >
    <div class="practice-pet__habitat" aria-hidden="true">
      <span class="practice-pet__habitat-back"></span>
      <img class="practice-pet__hatch-preview" :src="selectedPetImage" alt="" />
      <img class="practice-pet__egg" :src="eggNestImage" alt="" />
      <span class="practice-pet__sleep-z practice-pet__sleep-z--one">z</span>
      <span class="practice-pet__sleep-z practice-pet__sleep-z--two">z</span>
      <span class="practice-pet__habitat-mark practice-pet__habitat-mark--one"></span>
      <span class="practice-pet__habitat-mark practice-pet__habitat-mark--two"></span>
      <span class="practice-pet__habitat-meter">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span class="practice-pet__mission-ring" :style="missionRingStyle"></span>
    </div>
    <div class="practice-pet__wake-copy" aria-hidden="true">
      <span class="practice-pet__sparkle">+</span>
      <strong>Waking up</strong>
      <small>Keep playing a little longer!</small>
    </div>
    <div class="practice-pet__wake-meter" :style="missionRingStyle" aria-hidden="true">
      <strong>{{ wakeSecondsRemaining }}</strong>
      <span>sec</span>
      <em>of music</em>
    </div>
    <span class="practice-pet__glow"></span>
    <span class="practice-pet__shadow"></span>

    <div class="practice-pet__avatar-wrap" :class="`practice-pet__avatar-wrap--${petState.face}`">
      <Transition name="pet-sprite">
        <img
          :key="selectedPetImage"
          class="practice-pet__avatar"
          :src="selectedPetImage"
          :alt="`${selectedPet.name} practice buddy`"
        />
      </Transition>
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

.practice-pet--mission-egg {
  width: min(22rem, calc(100vw - 1.25rem));
  min-height: 8.4rem;
}

.practice-pet--great {
  color: rgb(217, 249, 157);
}

.practice-pet--coach {
  color: rgb(253, 230, 138);
}

.practice-pet__habitat {
  position: absolute;
  left: 0.15rem;
  top: 1.4rem;
  z-index: 0;
  width: 10.6rem;
  height: 7.2rem;
  pointer-events: none;
  transform-origin: 48% 70%;
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.practice-pet__habitat-back {
  position: absolute;
  inset: auto 0 0;
  height: 4.65rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px 999px 1.75rem 1.75rem;
  opacity: 0.9;
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.12),
    0 1.15rem 2rem rgba(0, 0, 0, 0.2);
}

.practice-pet__habitat-mark {
  position: absolute;
  border-radius: 999px;
  opacity: 0.88;
}

.practice-pet__habitat-mark--one {
  left: 1.2rem;
  top: 1.55rem;
  width: 1.7rem;
  height: 0.34rem;
  transform: rotate(-15deg);
}

.practice-pet__habitat-mark--two {
  right: 1.15rem;
  top: 2.05rem;
  width: 1.05rem;
  height: 1.05rem;
  border: 2px solid currentColor;
  background: transparent;
}

.practice-pet__habitat-meter {
  position: absolute;
  right: 1.3rem;
  bottom: 1.05rem;
  display: flex;
  align-items: end;
  gap: 0.18rem;
  opacity: 0.75;
}

.practice-pet__habitat-meter span {
  width: 0.24rem;
  border-radius: 999px;
  background: currentColor;
  transform-origin: bottom;
  animation: habitat-meter 1.15s ease-in-out infinite;
}

.practice-pet__habitat-meter span:nth-child(1) {
  height: 0.5rem;
}

.practice-pet__habitat-meter span:nth-child(2) {
  height: 0.86rem;
  animation-delay: 120ms;
}

.practice-pet__habitat-meter span:nth-child(3) {
  height: 0.64rem;
  animation-delay: 240ms;
}

.practice-pet__mission-orb {
  position: absolute;
  left: 2.35rem;
  bottom: 1.36rem;
  z-index: 2;
  width: 4.85rem;
  height: 5.2rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 52% 52% 46% 46%;
  background:
    radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.92), transparent 16%),
    radial-gradient(circle at 62% 68%, color-mix(in srgb, currentColor 36%, transparent), transparent 44%),
    linear-gradient(145deg, rgb(250, 244, 226), rgb(205, 189, 255) 54%, rgb(136, 113, 214));
  box-shadow:
    inset 0 0.8rem 1.25rem rgba(255, 255, 255, 0.26),
    inset 0 -0.9rem 1.4rem rgba(60, 45, 108, 0.28),
    0 0.9rem 1.8rem rgba(0, 0, 0, 0.35),
    0 0 2.4rem color-mix(in srgb, currentColor 32%, transparent);
  opacity: 0;
  transform: translateY(0.25rem) scale(0.82);
  transition:
    opacity 220ms ease,
    transform 240ms ease;
}

.practice-pet__egg {
  position: absolute;
  left: -0.5rem;
  bottom: 0.45rem;
  z-index: 3;
  width: 7.6rem;
  height: 7.6rem;
  object-fit: contain;
  opacity: 0;
  transform: translateY(0.35rem) scale(0.86);
  filter: drop-shadow(0 1rem 1.5rem rgba(0, 0, 0, 0.34));
  transition:
    opacity 220ms ease,
    transform 240ms ease;
}

.practice-pet__hatch-preview {
  position: absolute;
  left: 4.95rem;
  bottom: 0.9rem;
  z-index: 2;
  width: 5.15rem;
  height: 5.15rem;
  object-fit: contain;
  opacity: 0;
  transform: translateX(-0.55rem) scale(0.72);
  filter: blur(0.15px) saturate(0.92) brightness(1.04) drop-shadow(0 0.8rem 1rem rgba(0, 0, 0, 0.34));
  transition:
    opacity 240ms ease,
    transform 260ms ease;
}

.practice-pet__sleep-z {
  position: absolute;
  z-index: 4;
  display: none;
  color: rgba(221, 208, 255, 0.82);
  font-size: 0.78rem;
  font-weight: 900;
  text-shadow: 0 0 12px rgba(196, 181, 253, 0.55);
  text-transform: uppercase;
}

.practice-pet__sleep-z--one {
  left: 0.2rem;
  top: 1.25rem;
}

.practice-pet__sleep-z--two {
  left: 0.95rem;
  top: 0.65rem;
  font-size: 0.62rem;
  opacity: 0.72;
}

.practice-pet__wake-copy {
  position: absolute;
  left: 7.35rem;
  top: 2.35rem;
  z-index: 4;
  display: none;
  min-width: 6.8rem;
  color: rgb(221, 208, 255);
}

.practice-pet__wake-copy strong {
  display: block;
  color: rgb(196, 181, 253);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.05;
}

.practice-pet__wake-copy small {
  display: block;
  margin-top: 0.36rem;
  color: rgba(255, 255, 255, 0.72);
  max-width: 7.1rem;
  font-size: 0.66rem;
  font-weight: 600;
  line-height: 1.2;
}

.practice-pet__sparkle {
  position: absolute;
  left: -1.12rem;
  top: -0.05rem;
  color: rgb(253, 224, 71);
  font-size: 1.05rem;
  font-weight: 900;
  text-shadow: 0 0 14px rgba(253, 224, 71, 0.7);
  transform: rotate(18deg);
}

.practice-pet__wake-meter {
  position: absolute;
  left: 15.25rem;
  top: 1.52rem;
  z-index: 4;
  display: none;
  width: 4.95rem;
  height: 4.95rem;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, rgba(20, 16, 29, 0.96) 0 52%, transparent 53%),
    conic-gradient(rgb(196, 181, 253) var(--pet-ring-deg), rgba(255, 255, 255, 0.15) 0);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.11),
    0 0 0 0.35rem rgba(196, 181, 253, 0.06),
    0 0 1.65rem rgba(196, 181, 253, 0.26);
  text-align: center;
}

.practice-pet__wake-meter::after {
  position: absolute;
  inset: 0.48rem;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.1);
  content: "";
}

.practice-pet__wake-meter strong {
  display: block;
  color: white;
  font-size: 1.02rem;
  font-weight: 900;
  line-height: 1;
}

.practice-pet__wake-meter span {
  display: block;
  margin-top: 0.1rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.52rem;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.practice-pet__wake-meter em {
  display: block;
  margin-top: 0.12rem;
  color: rgba(255, 255, 255, 0.54);
  font-size: 0.46rem;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
}

.practice-pet__mission-ring {
  position: absolute;
  left: 0.85rem;
  bottom: 0.72rem;
  width: 7.9rem;
  height: 0.34rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  opacity: 0.72;
}

.practice-pet__mission-ring::before {
  position: absolute;
  inset: 0;
  width: var(--pet-progress);
  border-radius: inherit;
  background: linear-gradient(90deg, currentColor, rgba(190, 242, 100, 0.95));
  box-shadow: 0 0 1rem color-mix(in srgb, currentColor 42%, transparent);
  content: "";
  transition: width 260ms ease;
}

.practice-pet--mission-egg .practice-pet__mission-orb {
  opacity: 1;
  transform: translateY(0) scale(1);
  animation: mission-egg 2.8s ease-in-out infinite;
}

.practice-pet--mission-egg .practice-pet__habitat {
  opacity: 1;
  width: 13.9rem;
  transform: translateY(-0.08rem) scale(1.02);
}

.practice-pet--mission-egg .practice-pet__habitat-back {
  left: -0.2rem;
  width: 8.1rem;
  height: 3.25rem;
  border-radius: 48% 48% 1.55rem 1.55rem;
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in srgb, currentColor 48%, transparent), transparent 56%),
    linear-gradient(135deg, rgba(94, 75, 132, 0.98), rgba(42, 34, 54, 0.96));
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.22),
    0 1rem 2rem rgba(0, 0, 0, 0.28),
    0 0 2.25rem color-mix(in srgb, currentColor 24%, transparent);
}

.practice-pet--mission-egg .practice-pet__habitat-mark--one {
  left: 0.25rem;
  top: 4.75rem;
  width: 2.5rem;
  height: 0.24rem;
  opacity: 0.78;
  transform: rotate(-12deg);
}

.practice-pet--mission-egg .practice-pet__habitat-mark--two {
  left: 4.7rem;
  right: auto;
  top: 4.75rem;
  width: 2.15rem;
  height: 0.24rem;
  border: 0;
  opacity: 0.7;
  transform: rotate(13deg);
}

.practice-pet--mission-egg .practice-pet__egg,
.practice-pet--mission-egg .practice-pet__sleep-z,
.practice-pet--mission-egg .practice-pet__wake-copy,
.practice-pet--mission-egg .practice-pet__wake-meter {
  display: grid;
  opacity: 1;
}

.practice-pet--mission-egg .practice-pet__egg {
  transform: translateY(0) scale(1);
  animation: mission-egg 2.8s ease-in-out infinite;
}

.practice-pet--mission-egg .practice-pet__avatar {
  opacity: 0;
  transform: translateY(0.2rem) scale(0.82);
  filter: none;
}

.practice-pet--mission-egg .practice-pet__status,
.practice-pet--mission-egg .practice-pet__mission-ring {
  display: none;
}

.practice-pet--mission-egg .practice-pet__habitat-meter {
  left: 13.3rem;
  right: auto;
  bottom: 0.95rem;
  opacity: 0.42;
}

.practice-pet--mission-listening .practice-pet__habitat-meter {
  opacity: 0.86;
}

.practice-pet--mission-calm .practice-pet__mission-ring {
  opacity: 1;
}

.practice-pet--mission-calm .practice-pet__habitat-back {
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.14),
    0 1.15rem 2rem rgba(0, 0, 0, 0.2),
    0 0 2.2rem color-mix(in srgb, currentColor 18%, transparent);
}

.practice-pet--ready .practice-pet__habitat,
.practice-pet--listening .practice-pet__habitat {
  opacity: 0.72;
}

.practice-pet--steady .practice-pet__habitat,
.practice-pet--great .practice-pet__habitat {
  opacity: 1;
  transform: translateY(-0.12rem) scale(1.03);
}

.practice-pet--clearer .practice-pet__habitat,
.practice-pet--coach .practice-pet__habitat {
  opacity: 0.88;
  transform: translateX(-0.08rem);
}

.practice-pet--owl .practice-pet__habitat-back {
  background:
    radial-gradient(circle at 50% 0%, rgba(201, 185, 255, 0.2), transparent 56%),
    linear-gradient(135deg, rgba(78, 65, 118, 0.9), rgba(36, 30, 49, 0.7));
}

.practice-pet--owl .practice-pet__habitat-mark--one,
.practice-pet--owl .practice-pet__habitat-mark--two {
  background: rgba(196, 181, 253, 0.52);
  color: rgb(196, 181, 253);
}

.practice-pet--puppy .practice-pet__habitat-back {
  background:
    radial-gradient(circle at 35% 8%, rgba(252, 211, 77, 0.18), transparent 52%),
    linear-gradient(135deg, rgba(80, 55, 35, 0.9), rgba(34, 27, 33, 0.7));
}

.practice-pet--puppy .practice-pet__habitat-mark--one,
.practice-pet--puppy .practice-pet__habitat-mark--two {
  background: rgba(251, 191, 36, 0.52);
  color: rgb(251, 191, 36);
}

.practice-pet--robot .practice-pet__habitat-back {
  background:
    radial-gradient(circle at 50% 10%, rgba(168, 85, 247, 0.24), transparent 50%),
    linear-gradient(135deg, rgba(32, 39, 75, 0.92), rgba(20, 18, 30, 0.72));
}

.practice-pet--robot .practice-pet__habitat-mark--one,
.practice-pet--robot .practice-pet__habitat-mark--two {
  background: rgba(167, 139, 250, 0.54);
  color: rgb(167, 139, 250);
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

.pet-sprite-enter-active,
.pet-sprite-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms ease,
    filter 260ms ease;
}

.pet-sprite-leave-active {
  position: absolute;
}

.pet-sprite-enter-from {
  opacity: 0;
  transform: translateY(0.35rem) scale(0.88);
  filter: blur(2px) brightness(1.18) drop-shadow(0 1rem 1.1rem rgba(0, 0, 0, 0.32));
}

.pet-sprite-leave-to {
  opacity: 0;
  transform: translateY(-0.15rem) scale(1.04);
  filter: blur(2px) brightness(1.18) drop-shadow(0 1rem 1.1rem rgba(0, 0, 0, 0.32));
}

.practice-pet__avatar-wrap::after {
  position: absolute;
  inset: 1.2rem;
  z-index: -1;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 30%, transparent);
  opacity: 0;
  filter: blur(1.3rem);
  content: "";
  transform: scale(0.7);
}

.practice-pet--listening .practice-pet__avatar-wrap::after,
.practice-pet--playing .practice-pet__avatar-wrap::after,
.practice-pet--great .practice-pet__avatar-wrap::after {
  animation: pet-transition-glow 900ms ease-out;
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

@keyframes habitat-meter {
  0%,
  100% {
    transform: scaleY(0.62);
    opacity: 0.55;
  }

  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

@keyframes mission-egg {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-0.18rem) scale(1.025);
  }
}

@keyframes pet-transition-glow {
  0% {
    opacity: 0;
    transform: scale(0.55);
  }

  35% {
    opacity: 0.6;
    transform: scale(1.05);
  }

  100% {
    opacity: 0;
    transform: scale(1.32);
  }
}

@media (max-width: 767px) {
  .practice-pet {
    width: 13.8rem;
    min-height: 7.75rem;
  }

  .practice-pet--mission-egg {
    width: min(22.5rem, calc(100vw - 1.25rem));
    min-height: 8.4rem;
  }

  .practice-pet__avatar-wrap {
    left: 0.25rem;
    width: 7.4rem;
    height: 7.4rem;
  }

  .practice-pet__habitat {
    left: -0.25rem;
    top: 1.05rem;
    width: 8.35rem;
    height: 6.3rem;
  }

  .practice-pet__habitat-back {
    height: 3.9rem;
  }

  .practice-pet__habitat-mark--one {
    left: 0.95rem;
    top: 1.35rem;
  }

  .practice-pet__habitat-mark--two {
    right: 0.8rem;
    top: 1.65rem;
  }

  .practice-pet__habitat-meter {
    right: 0.92rem;
    bottom: 0.88rem;
  }

  .practice-pet__mission-orb {
    left: 1.95rem;
    bottom: 1rem;
    width: 3.35rem;
    height: 3.75rem;
  }

  .practice-pet__egg {
    left: -0.55rem;
    bottom: 0.4rem;
    width: 7.6rem;
    height: 7.6rem;
  }

  .practice-pet__wake-copy {
    left: 7.65rem;
    top: 2.25rem;
    min-width: 6.1rem;
  }

  .practice-pet__wake-copy strong {
    font-size: 0.92rem;
  }

  .practice-pet__wake-copy small {
    font-size: 0.62rem;
  }

  .practice-pet__wake-meter {
    left: 14.05rem;
    right: auto;
    top: 1.68rem;
    width: 4.05rem;
    height: 4.05rem;
  }

  .practice-pet__wake-meter strong {
    font-size: 0.92rem;
  }

  .practice-pet__wake-meter em {
    display: none;
  }

  .practice-pet--mission-egg .practice-pet__habitat {
    width: 13.2rem;
  }

  .practice-pet--mission-egg .practice-pet__habitat-back {
    width: 7.8rem;
    height: 3.15rem;
  }

  .practice-pet__mission-ring {
    left: 0.7rem;
    bottom: 0.58rem;
    width: 6.35rem;
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
