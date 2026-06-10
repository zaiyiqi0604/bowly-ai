<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import CameraPanel from "../components/CameraPanel.vue";
import PracticeCoachPanel from "../components/PracticeCoachPanel.vue";
import AudioPitchMeter from "../components/AudioPitchMeter.vue";
import SessionTimeline from "../components/SessionTimeline.vue";
import ChallengeCard from "../components/ChallengeCard.vue";
import { useMicrophone } from "../composables/useMicrophone";
import { usePracticeSession } from "../composables/usePracticeSession";
import { usePracticeStore } from "../stores/practice";

const practiceStore = usePracticeStore();
const {
  level,
  pitchStability,
  startMicrophone,
  stopMicrophone,
} = useMicrophone();
const {
  coachMessage,
  loadingCoach,
  durationSeconds,
  startSession,
  endSession,
  requestCoachMessage,
} = usePracticeSession();

const showGuideOverlay = ref(false);
const enableDynamicTracking = ref(false);
let pulseTimer = 0;

onMounted(async () => {
  await startMicrophone();
});

onBeforeUnmount(() => {
  clearInterval(pulseTimer);
  stopMicrophone();
  if (practiceStore.isSessionActive) {
    endSession();
  }
});

function startPractice() {
  startSession();
  pulseTimer = window.setInterval(async () => {
    practiceStore.setPitchStability(pitchStability.value);
    practiceStore.nudgePostureConfidence(Math.random() > 0.5 ? 1 : -1);
    practiceStore.incrementChallenge();
    if (Math.random() > 0.55) {
      await requestCoachMessage();
    }
  }, 5000);
}

function stopPractice() {
  clearInterval(pulseTimer);
  endSession();
}
</script>

<template>
  <section class="practice-layout">
    <div class="left">
      <section class="card guide-toggle-card">
        <div class="toggle-text">
          <h3 class="section-title">Reference Overlay</h3>
          <p class="muted">Safe Mode uses static guides by default for smooth demos.</p>
        </div>
        <div class="toggle-actions">
          <button class="button secondary" @click="showGuideOverlay = !showGuideOverlay">
            {{ showGuideOverlay ? "Hide Overlay" : "Show Overlay" }}
          </button>
          <button
            class="button"
            :class="{ secondary: !enableDynamicTracking }"
            @click="enableDynamicTracking = !enableDynamicTracking"
          >
            {{ enableDynamicTracking ? "Dynamic Tracking On" : "Enable Dynamic Tracking" }}
          </button>
        </div>
      </section>
      <CameraPanel
        :show-guide-overlay="showGuideOverlay"
        :enable-dynamic-tracking="enableDynamicTracking"
      />
      <AudioPitchMeter
        :pitch-stability="practiceStore.metrics.pitchStability"
        :level="level"
      />
    </div>
    <div class="right">
      <PracticeCoachPanel
        :coach-message="coachMessage"
        :loading-coach="loadingCoach"
      />
      <ChallengeCard :challenge="practiceStore.activeChallenge" />
      <SessionTimeline :events="practiceStore.timeline" />
      <section class="card controls">
        <h3 class="section-title">Session Controls</h3>
        <p class="muted">
          Duration:
          <strong>{{ durationSeconds }}s</strong>
        </p>
        <div class="actions">
          <button class="button" @click="startPractice" :disabled="practiceStore.isSessionActive">
            Start Session
          </button>
          <button class="button secondary" @click="stopPractice" :disabled="!practiceStore.isSessionActive">
            End Session
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.practice-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 12px;
}

.left,
.right {
  display: grid;
  gap: 12px;
}

.controls .actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.guide-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toggle-text {
  max-width: 420px;
}

.toggle-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .practice-layout {
    grid-template-columns: 1fr;
  }

  .guide-toggle-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .toggle-actions {
    justify-content: flex-start;
  }
}
</style>
