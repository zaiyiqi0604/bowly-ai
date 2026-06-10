import { computed, onBeforeUnmount, ref } from "vue";

export function useMicrophone() {
  const stream = ref<MediaStream | null>(null);
  const analyser = ref<AnalyserNode | null>(null);
  const audioContext = ref<AudioContext | null>(null);
  const pitchStability = ref(0);
  const level = ref(0);
  const permissionState = ref<"idle" | "granted" | "denied">("idle");
  let animationFrame = 0;

  const isActive = computed(() => permissionState.value === "granted");

  async function startMicrophone() {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      stream.value = micStream;
      permissionState.value = "granted";

      const context = new AudioContext();
      const source = context.createMediaStreamSource(micStream);
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 2048;
      source.connect(analyserNode);

      audioContext.value = context;
      analyser.value = analyserNode;
      monitorLevels();
    } catch (error) {
      permissionState.value = "denied";
      console.error(error);
    }
  }

  function monitorLevels() {
    if (!analyser.value) return;
    const buffer = new Uint8Array(analyser.value.frequencyBinCount);
    analyser.value.getByteFrequencyData(buffer);
    const average = buffer.reduce((sum, value) => sum + value, 0) / buffer.length;

    level.value = Math.round((average / 255) * 100);
    pitchStability.value = Math.max(10, Math.min(100, Math.round(100 - Math.abs(45 - level.value) * 1.4)));
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
  }

  onBeforeUnmount(stopMicrophone);

  return {
    permissionState,
    pitchStability,
    level,
    isActive,
    startMicrophone,
    stopMicrophone,
  };
}
