export type TaskStatus = "pending" | "running" | "completed";

export interface TaskJob {
  id: string;
  fileName: string;
  sourcePath: string;
  outputPath: string;
  outputDirectory: string | null;
  preset: string;
  container: string;
  audioMode: string;
  acceleration: string;
  outputSize: string;
  duration: string;
  progress: number;
  status: TaskStatus;
  eta: string;
  createdAt: string;
  completedAt?: string;
}

export interface TaskDefaults {
  preset: string;
  container: string;
  audioMode: string;
  acceleration: string;
  outputDirectory?: string | null;
}

const durationPool = ["00:48", "01:16", "02:34", "04:52", "08:21", "12:09"];

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "--";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;

  return `${size.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

export function getFileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

export function getDirectoryPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const lastSlashIndex = normalized.lastIndexOf("/");

  if (lastSlashIndex <= 0) {
    return ".";
  }

  return normalized.slice(0, lastSlashIndex);
}

export function getFileStem(path: string) {
  const fileName = getFileName(path);
  const extensionIndex = fileName.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return fileName;
  }

  return fileName.slice(0, extensionIndex);
}

function joinPath(directoryPath: string, fileName: string) {
  if (!directoryPath || directoryPath === ".") {
    return fileName;
  }

  if (directoryPath.endsWith("/") || directoryPath.endsWith("\\")) {
    return `${directoryPath}${fileName}`;
  }

  if (/^[A-Za-z]:$/.test(directoryPath)) {
    return `${directoryPath}\\${fileName}`;
  }

  const separator = directoryPath.includes("\\") ? "\\" : "/";
  return `${directoryPath}${separator}${fileName}`;
}

export function buildOutputPath(
  sourcePath: string,
  container: string,
  outputDirectory?: string | null,
) {
  const directoryPath = outputDirectory?.trim() || getDirectoryPath(sourcePath);
  const fileStem = getFileStem(sourcePath);

  return joinPath(
    directoryPath,
    `${fileStem}_converted.${container.toLowerCase()}`,
  );
}

export function getTaskStatusLabel(status: TaskStatus) {
  switch (status) {
    case "pending":
      return "待开始";
    case "running":
      return "转换中";
    case "completed":
      return "已完成";
  }
}

export function createTaskFromPath(
  path: string,
  defaults: TaskDefaults,
  seed: number,
  sourceSizeBytes?: number,
): TaskJob {
  const hash = hashString(`${path}-${seed}`);
  const fileName = getFileName(path);

  return {
    id: `task-${Date.now().toString(36)}-${seed.toString(36)}-${hash
      .toString(36)
      .slice(0, 4)}`,
    fileName,
    sourcePath: path,
    outputPath: buildOutputPath(path, defaults.container, defaults.outputDirectory),
    outputDirectory: defaults.outputDirectory?.trim() || null,
    preset: defaults.preset,
    container: defaults.container,
    audioMode: defaults.audioMode,
    acceleration: defaults.acceleration,
    outputSize: formatFileSize(sourceSizeBytes ?? 0),
    duration: durationPool[hash % durationPool.length],
    progress: 0,
    status: "pending",
    eta: "等待开始",
    createdAt: formatClock(),
  };
}
