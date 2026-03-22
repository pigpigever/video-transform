import { open } from "@tauri-apps/plugin-dialog";
import { videoExtensions } from "../../lib/transcode";

export async function pickVideoFiles() {
  const selected = await open({
    title: "选择视频文件",
    multiple: true,
    directory: false,
    filters: [
      {
        name: "Video",
        extensions: [...videoExtensions],
      },
    ],
  });

  if (!selected) {
    return null;
  }

  return Array.isArray(selected) ? selected : [selected];
}

export async function pickOutputDirectory() {
  const selected = await open({
    title: "选择默认输出目录",
    directory: true,
    multiple: false,
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  const nextDirectory = selected.trim();
  return nextDirectory || null;
}
