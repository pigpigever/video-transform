const OUTPUT_DIRECTORY_STORAGE_KEY = "video-transform-output-directory";

export function getStoredOutputDirectory() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = localStorage.getItem(OUTPUT_DIRECTORY_STORAGE_KEY)?.trim();
  return storedValue ? storedValue : null;
}

export function persistOutputDirectory(outputDirectory: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (outputDirectory) {
    localStorage.setItem(OUTPUT_DIRECTORY_STORAGE_KEY, outputDirectory);
    return;
  }

  localStorage.removeItem(OUTPUT_DIRECTORY_STORAGE_KEY);
}
