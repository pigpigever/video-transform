import { convertFileSrc } from "@tauri-apps/api/core";

const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 96;

const thumbnailCache = new Map<string, string | null>();
const thumbnailPromiseCache = new Map<string, Promise<string | null>>();

function captureVideoThumbnail(sourcePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }

    const video = document.createElement("video");
    let timeoutId = 0;
    let targetTime = 0;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const finalize = (value: string | null) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    };

    const drawFrame = () => {
      if (!video.videoWidth || !video.videoHeight) {
        finalize(null);
        return;
      }

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        finalize(null);
        return;
      }

      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;

      const sourceRatio = video.videoWidth / video.videoHeight;
      const targetRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
      let sourceWidth = video.videoWidth;
      let sourceHeight = video.videoHeight;
      let sourceX = 0;
      let sourceY = 0;

      if (sourceRatio > targetRatio) {
        sourceWidth = video.videoHeight * targetRatio;
        sourceX = (video.videoWidth - sourceWidth) / 2;
      } else {
        sourceHeight = video.videoWidth / targetRatio;
        sourceY = (video.videoHeight - sourceHeight) / 2;
      }

      try {
        context.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          THUMBNAIL_WIDTH,
          THUMBNAIL_HEIGHT,
        );
        finalize(canvas.toDataURL("image/jpeg", 0.84));
      } catch {
        finalize(null);
      }
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("error", () => finalize(null), { once: true });
    video.addEventListener("abort", () => finalize(null), { once: true });
    video.addEventListener("loadedmetadata", () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      targetTime =
        duration > 0.8
          ? Math.min(Math.max(duration * 0.15, 0.35), Math.max(duration - 0.12, 0))
          : 0;

      if (targetTime > 0) {
        video.currentTime = targetTime;
      }
    });
    video.addEventListener(
      "loadeddata",
      () => {
        if (targetTime <= 0.01) {
          drawFrame();
        }
      },
      { once: true },
    );
    video.addEventListener("seeked", () => drawFrame(), { once: true });

    timeoutId = window.setTimeout(() => finalize(null), 12000);
    video.src = convertFileSrc(sourcePath);
    video.load();
  });
}

export function getVideoThumbnail(sourcePath: string) {
  const cachedThumbnail = thumbnailCache.get(sourcePath);

  if (cachedThumbnail !== undefined) {
    return Promise.resolve(cachedThumbnail);
  }

  const pendingThumbnail = thumbnailPromiseCache.get(sourcePath);

  if (pendingThumbnail) {
    return pendingThumbnail;
  }

  const nextThumbnail = captureVideoThumbnail(sourcePath).then((thumbnail) => {
    thumbnailCache.set(sourcePath, thumbnail);
    thumbnailPromiseCache.delete(sourcePath);
    return thumbnail;
  });

  thumbnailPromiseCache.set(sourcePath, nextThumbnail);
  return nextThumbnail;
}
