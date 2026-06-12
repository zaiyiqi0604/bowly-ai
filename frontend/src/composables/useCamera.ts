import { onBeforeUnmount, ref } from "vue";

export function useCamera() {
  const stream = ref<MediaStream | null>(null);
  const permissionState = ref<"idle" | "granted" | "denied">("idle");
  const errorMessage = ref<string | null>(null);

  async function startCamera() {
    permissionState.value = "idle";
    errorMessage.value = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is unavailable in this browser.");
      }
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 15, max: 20 },
          facingMode: "user",
        },
        audio: false,
      });
      permissionState.value = "granted";
      errorMessage.value = null;
    } catch (error) {
      permissionState.value = "denied";
      const errorName = error instanceof DOMException ? error.name : "";
      errorMessage.value = errorName === "NotAllowedError"
        ? "Camera permission is blocked. Allow camera access for 127.0.0.1, then retry."
        : error instanceof Error
          ? error.message
          : "Camera access is needed for posture observation.";
      if (errorName !== "NotAllowedError") console.error(error);
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
