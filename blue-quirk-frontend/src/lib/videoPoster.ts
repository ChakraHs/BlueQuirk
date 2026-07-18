// Client-side video introspection used by the admin video uploader. Everything
// here runs on a LOCAL File via a blob: URL, so drawing a frame to a canvas is
// same-origin and never taints it — we can export the poster with toBlob(). This
// keeps poster generation off the backend (no ffmpeg) while still giving every
// video a lightweight poster that loads before the heavy MP4.

export type VideoMeta = {
  duration: number; // seconds (0 if unknown)
  width: number;
  height: number;
};

/** Reads duration + intrinsic size from a local video File. */
export function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      const meta: VideoMeta = {
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      cleanup();
      resolve(meta);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video metadata"));
    };
  });
}

/**
 * Captures a single poster frame (default ~0.1s in, to skip a black first frame)
 * from a local video File and returns it as a JPEG Blob. Resolves null if the
 * browser blocks the capture for any reason — the caller then simply proceeds
 * without a generated poster.
 */
export function capturePosterBlob(file: File, atSeconds = 0.1): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    // playsInline avoids iOS trying to go fullscreen while we seek.
    video.setAttribute("playsinline", "");
    video.src = url;

    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    video.onloadeddata = () => {
      // Seek a touch past the start; clamp to the clip length.
      const target = Math.min(atSeconds, (video.duration || 1) - 0.05);
      try {
        video.currentTime = Math.max(0, target);
      } catch {
        finish(null);
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.82);
      } catch {
        finish(null);
      }
    };

    video.onerror = () => finish(null);
    // Safety timeout so we never hang the upload flow.
    setTimeout(() => finish(null), 8000);
  });
}
