export const presetOptions = [
  "H.264 Delivery",
  "H.265 Archive",
  "Apple ProRes 422",
] as const;

export const containerOptions = ["MP4", "MOV", "MKV", "M4V", "TS", "AVI", "MXF"] as const;
export const audioOptions = ["AAC 192 kbps", "Copy Source", "Opus 160 kbps"] as const;
export const accelerationModes = ["Auto", "VideoToolbox", "CPU Only"] as const;

export const videoExtensions = [
  "mp4",
  "mov",
  "mxf",
  "mkv",
  "avi",
  "webm",
  "flv",
  "mpg",
  "mpeg",
] as const;

export const initialLogs = [
  {
    time: "14:08",
    level: "READY",
    text: "任务系统已就绪，等待添加视频文件。",
  },
  {
    time: "14:07",
    level: "UI",
    text: "任务页和设置页已经拆开，侧边栏可以在两者之间切换。",
  },
];

export type PresetOption = (typeof presetOptions)[number];
export type ContainerOption = (typeof containerOptions)[number];
export type AudioOption = (typeof audioOptions)[number];
export type AccelerationMode = (typeof accelerationModes)[number];
export type SidebarSection = "tasks" | "settings";
export type TaskTab = "active" | "completed";

export interface TranscodeProgressPayload {
  taskId: string;
  progress: number;
}

export interface TranscodeRequest {
  taskId: string;
  sourcePath: string;
  outputPath: string;
  preset: string;
  container: string;
  audioMode: string;
  acceleration: string;
}

export interface CommandPreviewOptions {
  preset: PresetOption;
  container: ContainerOption;
  audioMode: AudioOption;
  acceleration: AccelerationMode;
}

const containerOptionsByPreset: Record<PresetOption, readonly ContainerOption[]> = {
  "H.264 Delivery": ["MP4", "MOV", "MKV", "M4V", "TS", "AVI"],
  "H.265 Archive": ["MP4", "MOV", "MKV", "M4V", "TS", "AVI"],
  "Apple ProRes 422": ["MOV", "MKV", "AVI", "MXF"],
};

export function getContainerOptionsForPreset(preset: string) {
  return containerOptionsByPreset[preset as PresetOption] ??
    containerOptionsByPreset["H.264 Delivery"];
}

export function estimateEta(progress: number) {
  if (progress >= 100) {
    return "已完成";
  }

  const seconds = Math.max(16, Math.round((100 - progress) * 1.7));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(
    2,
    "0",
  )}`;
}

export function buildCommandPreview(options: CommandPreviewOptions) {
  const codecFlags = {
    "H.264 Delivery": ["-c:v libx264", "-preset medium", "-crf 21"],
    "H.265 Archive": ["-c:v libx265", "-preset slow", "-crf 23"],
    "Apple ProRes 422": ["-c:v prores_ks", "-profile:v 2"],
  } satisfies Record<PresetOption, string[]>;

  const audioFlags = {
    "AAC 192 kbps": ["-c:a aac", "-b:a 192k"],
    "Copy Source": ["-c:a copy"],
    "Opus 160 kbps": ["-c:a libopus", "-b:a 160k"],
  } satisfies Record<AudioOption, string[]>;

  const containerFlags = {
    MP4: ["-movflags +faststart"],
    MOV: ["-movflags use_metadata_tags"],
    M4V: ["-movflags +faststart"],
    MKV: [],
    TS: [],
    AVI: [],
    MXF: [],
  } satisfies Record<ContainerOption, string[]>;

  const accelerationFlags = {
    Auto: "-hwaccel auto",
    VideoToolbox: "-hwaccel videotoolbox",
    "CPU Only": "",
  } satisfies Record<AccelerationMode, string>;

  return [
    "ffmpeg",
    "-hide_banner",
    accelerationFlags[options.acceleration],
    '-i "$INPUT"',
    ...codecFlags[options.preset],
    ...audioFlags[options.audioMode],
    ...containerFlags[options.container],
    '"$OUTPUT"',
  ]
    .filter(Boolean)
    .join(" ");
}
