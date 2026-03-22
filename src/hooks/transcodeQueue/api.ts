import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { getDirectoryPath } from "../../lib/tasks";
import type { TranscodeRequest } from "../../lib/transcode";

export interface ProbeMediaInfoResult {
  fileSize: number;
}

export function probeMediaInfo(path: string) {
  return invoke<ProbeMediaInfoResult>("probe_media_info", { path });
}

export function transcodeVideo(request: TranscodeRequest) {
  return invoke("transcode_video", { request });
}

export function openOutputDirectory(outputPath: string) {
  return openPath(getDirectoryPath(outputPath));
}

export function revealOutputFile(outputPath: string) {
  return invoke("plugin:opener|reveal_item_in_dir", {
    paths: [outputPath],
  });
}
