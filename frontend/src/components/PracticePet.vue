<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  sessionActive: boolean;
  isPlaying: boolean;
  pitchStability: number;
  noteName: string;
  cameraFraming: "good" | "adjust" | "searching";
  startIssue: string;
  microFeedback: string;
}>();

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
    <div class="practice-pet__avatar" :class="`practice-pet__avatar--${petState.face}`">
      <span class="practice-pet__ear practice-pet__ear--left"></span>
      <span class="practice-pet__ear practice-pet__ear--right"></span>
      <span class="practice-pet__face">
        <span class="practice-pet__eye practice-pet__eye--left"></span>
        <span class="practice-pet__eye practice-pet__eye--right"></span>
        <span class="practice-pet__mouth"></span>
      </span>
    </div>
    <div class="min-w-0">
      <p class="practice-pet__label">{{ petState.label }}</p>
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

.practice-pet__avatar {
  position: relative;
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.8), transparent 18%),
    linear-gradient(145deg, #f6d7a7, #c89054);
  box-shadow:
    inset 0 -0.35rem 0 rgba(74, 46, 25, 0.16),
    0 0 0 0.35rem rgba(255, 255, 255, 0.06);
}

.practice-pet__ear {
  position: absolute;
  top: -0.28rem;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 0.35rem 0.8rem 0.35rem 0.8rem;
  background: #c89054;
}

.practice-pet__ear--left {
  left: 0.28rem;
  transform: rotate(-24deg);
}

.practice-pet__ear--right {
  right: 0.28rem;
  transform: scaleX(-1) rotate(-24deg);
}

.practice-pet__face {
  position: relative;
  width: 2.05rem;
  height: 1.65rem;
}

.practice-pet__eye {
  position: absolute;
  top: 0.38rem;
  width: 0.32rem;
  height: 0.38rem;
  border-radius: 999px;
  background: #211824;
  transition: transform 180ms ease;
}

.practice-pet__eye--left {
  left: 0.45rem;
}

.practice-pet__eye--right {
  right: 0.45rem;
}

.practice-pet__mouth {
  position: absolute;
  left: 50%;
  bottom: 0.18rem;
  width: 0.7rem;
  height: 0.34rem;
  transform: translateX(-50%);
  border-bottom: 2px solid #211824;
  border-radius: 0 0 999px 999px;
}

.practice-pet__avatar--concerned .practice-pet__mouth {
  bottom: 0.05rem;
  transform: translateX(-50%) rotate(180deg);
}

.practice-pet__avatar--focused .practice-pet__eye {
  transform: scaleY(0.72);
}

.practice-pet__avatar--happy .practice-pet__mouth {
  width: 0.9rem;
  height: 0.45rem;
  border-bottom-width: 3px;
}

.practice-pet__label {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(221, 208, 255, 0.9);
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

  .practice-pet__avatar {
    width: 2.45rem;
    height: 2.45rem;
  }

  .practice-pet__message {
    font-size: 0.78rem;
  }
}
</style>
