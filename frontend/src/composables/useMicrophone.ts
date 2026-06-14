import { computed, onBeforeUnmount, ref } from "vue";

export function useMicrophone() {
  const stream = ref<MediaStream | null>(null);
  const analyser = ref<AnalyserNode | null>(null);
  const audioContext = ref<AudioContext | null>(null);
  const pitchStability = ref(0);
  const frequency = ref(0);
  const noteName = ref("");
  const centsOffset = ref(0);
  const level = ref(0);
  const noiseFloor = ref(0);
  const signalThreshold = ref(4);
  const signalActive = ref(false);
  const isCalibrating = ref(false);
  const calibrationProgress = ref(0);
  const calibrationState = ref<"needed" | "calibrating" | "ready">("needed");
  const permissionState = ref<"idle" | "granted" | "denied">("idle");
  const errorMessage = ref("");
  let animationFrame = 0;
  let lastPitchAnalysisAt = 0;
  let lockedMidi: number | null = null;
  let candidateMidi: number | null = null;
  let candidateFrames = 0;
  let silentFrames = 0;
  let lastStabilityMidi: number | null = null;
  let calibrationStartedAt = 0;
  const calibrationLevels: number[] = [];
  const recentFrequencies: number[] = [];
  const recentCents: number[] = [];
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  const isActive = computed(() => permissionState.value === "granted");
  const hasReliablePitch = computed(() =>
    Boolean(noteName.value) &&
    signalActive.value &&
    recentCents.length >= 3
  );

  async function startMicrophone() {
    if (stream.value && audioContext.value) {
      await audioContext.value.resume();
      return;
    }
    permissionState.value = "idle";
    errorMessage.value = "";
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone API is unavailable in this browser.");
      }
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      stream.value = micStream;

      const context = new AudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(micStream);
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 4096;
      analyserNode.smoothingTimeConstant = 0.35;
      source.connect(analyserNode);

      audioContext.value = context;
      analyser.value = analyserNode;
      permissionState.value = "granted";
      monitorLevels();
    } catch (error) {
      permissionState.value = "denied";
      const errorName = error instanceof DOMException ? error.name : "";
      errorMessage.value = errorName === "NotAllowedError"
        ? "Allow microphone access, then press Start Practice to retry."
        : error instanceof Error
          ? error.message
          : "Microphone access is unavailable.";
      if (errorName !== "NotAllowedError") console.error(error);
    }
  }

  function calibrateNoise() {
    return new Promise<boolean>((resolve) => {
      if (permissionState.value !== "granted") {
        resolve(false);
        return;
      }
      calibrationLevels.length = 0;
      calibrationStartedAt = performance.now();
      calibrationProgress.value = 0;
      isCalibrating.value = true;
      calibrationState.value = "calibrating";
      const checkCalibration = window.setInterval(() => {
        if (calibrationState.value === "ready") {
          window.clearInterval(checkCalibration);
          resolve(true);
        } else if (permissionState.value !== "granted") {
          window.clearInterval(checkCalibration);
          resolve(false);
        }
      }, 100);
    });
  }

  function detectFrequency(samples: Float32Array, sampleRate: number) {
    let mean = 0;
    for (const sample of samples) mean += sample;
    mean /= samples.length;

    let energy = 0;
    for (const sample of samples) energy += (sample - mean) * (sample - mean);
    const rms = Math.sqrt(energy / samples.length);
    if (rms < 0.012) return 0;

    const minLag = Math.floor(sampleRate / 1200);
    const maxLag = Math.min(
      Math.floor(sampleRate / 130),
      Math.floor(samples.length / 2)
    );
    const difference = new Float32Array(maxLag + 1);
    for (let lag = 1; lag <= maxLag; lag += 1) {
      let sum = 0;
      for (let index = 0; index < samples.length - lag; index += 2) {
        const delta = (samples[index] - mean) - (samples[index + lag] - mean);
        sum += delta * delta;
      }
      difference[lag] = sum;
    }

    let runningSum = 0;
    let bestLag = minLag;
    let bestValue = Number.POSITIVE_INFINITY;
    for (let lag = 1; lag <= maxLag; lag += 1) {
      runningSum += difference[lag];
      const normalized = runningSum ? (difference[lag] * lag) / runningSum : 1;
      difference[lag] = normalized;
      if (lag < minLag) continue;
      if (normalized < bestValue) {
        bestValue = normalized;
        bestLag = lag;
      }
    }

    let selectedLag = 0;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      const normalized = difference[lag];
      if (
        normalized < 0.16 &&
        lag > minLag &&
        normalized <= difference[lag - 1]
      ) {
        selectedLag = lag;
        while (
          selectedLag + 1 <= maxLag &&
          difference[selectedLag + 1] < difference[selectedLag]
        ) {
          selectedLag += 1;
        }
        break;
      }
    }
    selectedLag ||= bestValue < 0.32 ? bestLag : 0;
    if (!selectedLag) return 0;

    const previous = difference[Math.max(minLag, selectedLag - 1)];
    const current = difference[selectedLag];
    const next = difference[Math.min(maxLag, selectedLag + 1)];
    const denominator = previous - 2 * current + next;
    const refinedLag = denominator
      ? selectedLag + 0.5 * (previous - next) / denominator
      : selectedLag;
    return sampleRate / refinedLag;
  }

  function updateDetectedNote(detectedFrequency: number) {
    if (!detectedFrequency) {
      silentFrames += 1;
      if (silentFrames >= 4) {
        noteName.value = "";
        centsOffset.value = 0;
        lockedMidi = null;
        candidateMidi = null;
        candidateFrames = 0;
        recentCents.length = 0;
      }
      return;
    }

    silentFrames = 0;
    const nearestMidi = Math.round(69 + 12 * Math.log2(detectedFrequency / 440));
    if (nearestMidi === candidateMidi) {
      candidateFrames += 1;
    } else {
      candidateMidi = nearestMidi;
      candidateFrames = 1;
    }

    if (lockedMidi === null || (nearestMidi !== lockedMidi && candidateFrames >= 2)) {
      lockedMidi = nearestMidi;
      recentCents.length = 0;
    }
    if (lockedMidi === null) return;

    const targetFrequency = 440 * Math.pow(2, (lockedMidi - 69) / 12);
    const rawCents = 1200 * Math.log2(detectedFrequency / targetFrequency);
    recentCents.push(rawCents);
    if (recentCents.length > 5) recentCents.shift();
    const sortedCents = [...recentCents].sort((a, b) => a - b);
    const medianCents = sortedCents[Math.floor(sortedCents.length / 2)];
    centsOffset.value = Math.round(Math.max(-50, Math.min(50, medianCents)));
    const pitchClass = ((lockedMidi % 12) + 12) % 12;
    const octave = Math.floor(lockedMidi / 12) - 1;
    noteName.value = `${noteNames[pitchClass]}${octave}`;
  }

  function monitorLevels() {
    const analyserNode = analyser.value;
    const context = audioContext.value;
    if (!analyserNode || !context) return;
    const samples = new Float32Array(analyserNode.fftSize);
    analyserNode.getFloatTimeDomainData(samples);

    let energy = 0;
    for (const sample of samples) energy += sample * sample;
    const rms = Math.sqrt(energy / samples.length);
    level.value = Math.min(100, Math.round(rms * 480));
    const now = performance.now();

    if (isCalibrating.value) {
      calibrationLevels.push(level.value);
      calibrationProgress.value = Math.min(
        100,
        Math.round(((now - calibrationStartedAt) / 1600) * 100)
      );
      if (now - calibrationStartedAt >= 1600) {
        const sorted = [...calibrationLevels].sort((a, b) => a - b);
        const percentileIndex = Math.min(
          sorted.length - 1,
          Math.floor(sorted.length * 0.8)
        );
        noiseFloor.value = sorted[percentileIndex] ?? 0;
        signalThreshold.value = Math.max(4, noiseFloor.value + 3);
        isCalibrating.value = false;
        calibrationProgress.value = 100;
        calibrationState.value = "ready";
      }
    }
    signalActive.value =
      calibrationState.value === "ready" &&
      level.value >= signalThreshold.value;

    if (now - lastPitchAnalysisAt >= 90) {
      lastPitchAnalysisAt = now;
      const detected = detectFrequency(samples, context.sampleRate);
      updateDetectedNote(detected);
      frequency.value = detected ? Math.round(detected) : 0;

      if (detected) {
        if (lockedMidi !== lastStabilityMidi) {
          recentFrequencies.length = 0;
          lastStabilityMidi = lockedMidi;
        }
        recentFrequencies.push(detected);
        if (recentFrequencies.length > 18) recentFrequencies.shift();
        const mean =
          recentFrequencies.reduce((sum, value) => sum + value, 0) /
          recentFrequencies.length;
        const variance =
          recentFrequencies.reduce(
            (sum, value) => sum + Math.pow(1200 * Math.log2(value / mean), 2),
            0
          ) / recentFrequencies.length;
        const centsDeviation = Math.sqrt(variance);
        pitchStability.value = Math.round(
          Math.max(0, Math.min(100, 100 - centsDeviation * 1.4))
        );
      } else {
        recentFrequencies.length = 0;
        pitchStability.value = 0;
      }
    }
    animationFrame = requestAnimationFrame(monitorLevels);
  }

  function stopMicrophone() {
    cancelAnimationFrame(animationFrame);
    stream.value?.getTracks().forEach((track) => track.stop());
    stream.value = null;
    analyser.value = null;
    if (audioContext.value) {
      void audioContext.value.close();
    }
    audioContext.value = null;
    frequency.value = 0;
    noteName.value = "";
    centsOffset.value = 0;
    level.value = 0;
    noiseFloor.value = 0;
    signalThreshold.value = 4;
    signalActive.value = false;
    isCalibrating.value = false;
    calibrationProgress.value = 0;
    calibrationState.value = "needed";
    calibrationLevels.length = 0;
    recentFrequencies.length = 0;
    recentCents.length = 0;
    lockedMidi = null;
    candidateMidi = null;
    candidateFrames = 0;
    silentFrames = 0;
    lastStabilityMidi = null;
  }

  onBeforeUnmount(stopMicrophone);

  return {
    permissionState,
    pitchStability,
    frequency,
    noteName,
    centsOffset,
    level,
    noiseFloor,
    signalThreshold,
    signalActive,
    hasReliablePitch,
    isCalibrating,
    calibrationProgress,
    calibrationState,
    errorMessage,
    isActive,
    startMicrophone,
    calibrateNoise,
    stopMicrophone,
  };
}
