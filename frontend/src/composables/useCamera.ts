import { onBeforeUnmount, ref } from "vue";

export function useCamera() {
  const stream = ref<MediaStream | null>(null);
  const permissionState = ref<"idle" | "granted" | "denied">("idle");
  const errorMessage = ref<string | null>(null);

  async function startCamera() {
    try {
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      permissionState.value = "granted";
      errorMessage.value = null;
    } catch (error) {
      permissionState.value = "denied";
      errorMessage.value = "Camera access is needed for posture observation.";
      console.error(error);
    }
  }

  function stopCamera() {
    stream.value?.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }

  onBeforeUnmount(stopCamera);

  return {
    stream,
    permissionState,
    errorMessage,
    startCamera,
    stopCamera,
  };
}
