import type { TaskJob, TaskStatus } from "../../lib/tasks";
import {
  accelerationModes,
  audioOptions,
  containerOptions,
  defaultMaxConcurrentTasks,
  initialLogs,
  maxConcurrentTaskOptions,
  presetOptions,
  type AccelerationMode,
  type AudioOption,
  type ContainerOption,
  type LogEntry,
  type PresetOption,
} from "../../lib/transcode";

const SETTINGS_STORAGE_KEY = "video-transform-queue-settings";
const JOBS_STORAGE_KEY = "video-transform-queue-jobs";
const LOGS_STORAGE_KEY = "video-transform-queue-logs";
const LEGACY_OUTPUT_DIRECTORY_STORAGE_KEY = "video-transform-output-directory";
const MAX_PERSISTED_LOGS = 50;

export interface StoredTranscodeSettings {
  preset: PresetOption;
  container: ContainerOption;
  audioMode: AudioOption;
  acceleration: AccelerationMode;
  maxConcurrentTasks: number;
  outputDirectory: string | null;
}

const defaultSettings: StoredTranscodeSettings = {
  preset: "H.264 Delivery",
  container: "MP4",
  audioMode: "AAC 192 kbps",
  acceleration: "Auto",
  maxConcurrentTasks: defaultMaxConcurrentTasks,
  outputDirectory: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readJson(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isOption<T extends readonly string[]>(
  options: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && options.includes(value as T[number]);
}

function normalizeOutputDirectory(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeMaxConcurrentTasks(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    const normalized = String(value);

    if (maxConcurrentTaskOptions.includes(normalized as (typeof maxConcurrentTaskOptions)[number])) {
      return value;
    }
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (maxConcurrentTaskOptions.includes(normalized as (typeof maxConcurrentTaskOptions)[number])) {
      return Number.parseInt(normalized, 10);
    }
  }

  return defaultMaxConcurrentTasks;
}

function normalizeTaskStatus(value: unknown): TaskStatus | null {
  if (value === "pending" || value === "running" || value === "completed") {
    return value;
  }

  return null;
}

function normalizeTaskJob(value: unknown): TaskJob | null {
  if (!isRecord(value)) {
    return null;
  }

  const status = normalizeTaskStatus(value.status);

  if (
    typeof value.id !== "string" ||
    typeof value.fileName !== "string" ||
    typeof value.sourcePath !== "string" ||
    typeof value.outputPath !== "string" ||
    typeof value.preset !== "string" ||
    typeof value.container !== "string" ||
    typeof value.audioMode !== "string" ||
    typeof value.acceleration !== "string" ||
    typeof value.outputSize !== "string" ||
    typeof value.duration !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.eta !== "string" ||
    status === null
  ) {
    return null;
  }

  const rawProgress =
    typeof value.progress === "number" && Number.isFinite(value.progress)
      ? value.progress
      : 0;
  const isCompleted = status === "completed";
  const wasRunning = status === "running";
  const nextStatus = status === "running" ? "pending" : status;

  return {
    id: value.id,
    fileName: value.fileName,
    sourcePath: value.sourcePath,
    outputPath: value.outputPath,
    outputDirectory: normalizeOutputDirectory(value.outputDirectory),
    preset: value.preset,
    container: value.container,
    audioMode: value.audioMode,
    acceleration: value.acceleration,
    outputSize: value.outputSize,
    duration: value.duration,
    progress: isCompleted ? 100 : wasRunning ? 0 : Math.max(0, Math.min(99, rawProgress)),
    status: nextStatus,
    eta: isCompleted ? "已完成" : wasRunning ? "等待开始" : value.eta,
    createdAt: value.createdAt,
    completedAt:
      typeof value.completedAt === "string" && value.completedAt
        ? value.completedAt
        : undefined,
  };
}

function normalizeLogEntry(value: unknown): LogEntry | null {
  if (
    !isRecord(value) ||
    typeof value.time !== "string" ||
    typeof value.level !== "string" ||
    typeof value.text !== "string"
  ) {
    return null;
  }

  return {
    time: value.time,
    level: value.level,
    text: value.text,
  };
}

export function getStoredTranscodeSettings(): StoredTranscodeSettings {
  const stored = readJson(SETTINGS_STORAGE_KEY);
  const legacyOutputDirectory =
    typeof window === "undefined"
      ? null
      : normalizeOutputDirectory(
          localStorage.getItem(LEGACY_OUTPUT_DIRECTORY_STORAGE_KEY),
        );

  if (!isRecord(stored)) {
    return {
      ...defaultSettings,
      outputDirectory: legacyOutputDirectory,
    };
  }

  return {
    preset: isOption(presetOptions, stored.preset)
      ? stored.preset
      : defaultSettings.preset,
    container: isOption(containerOptions, stored.container)
      ? stored.container
      : defaultSettings.container,
    audioMode: isOption(audioOptions, stored.audioMode)
      ? stored.audioMode
      : defaultSettings.audioMode,
    acceleration: isOption(accelerationModes, stored.acceleration)
      ? stored.acceleration
      : defaultSettings.acceleration,
    maxConcurrentTasks: normalizeMaxConcurrentTasks(stored.maxConcurrentTasks),
    outputDirectory:
      normalizeOutputDirectory(stored.outputDirectory) ?? legacyOutputDirectory,
  };
}

export function persistTranscodeSettings(settings: StoredTranscodeSettings) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

  if (settings.outputDirectory) {
    localStorage.setItem(
      LEGACY_OUTPUT_DIRECTORY_STORAGE_KEY,
      settings.outputDirectory,
    );
    return;
  }

  localStorage.removeItem(LEGACY_OUTPUT_DIRECTORY_STORAGE_KEY);
}

export function getStoredJobs() {
  const stored = readJson(JOBS_STORAGE_KEY);

  if (!Array.isArray(stored)) {
    return [] as TaskJob[];
  }

  return stored
    .map((entry) => normalizeTaskJob(entry))
    .filter((entry): entry is TaskJob => entry !== null);
}

export function persistJobs(jobs: TaskJob[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

export function getStoredLogs() {
  const stored = readJson(LOGS_STORAGE_KEY);

  if (!Array.isArray(stored)) {
    return initialLogs;
  }

  const normalized = stored
    .map((entry) => normalizeLogEntry(entry))
    .filter((entry): entry is LogEntry => entry !== null)
    .slice(0, MAX_PERSISTED_LOGS);

  return normalized.length > 0 ? normalized : initialLogs;
}

export function persistLogs(logs: LogEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    LOGS_STORAGE_KEY,
    JSON.stringify(logs.slice(0, MAX_PERSISTED_LOGS)),
  );
}
