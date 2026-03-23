import { extractVideoThumbnail } from "../hooks/transcodeQueue/api";

const thumbnailCache = new Map<string, string | null>();
const thumbnailPromiseCache = new Map<string, Promise<string | null>>();

function captureVideoThumbnail(sourcePath: string): Promise<string | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return extractVideoThumbnail(sourcePath).catch(() => null);
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
