use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use tauri::Emitter;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscodeRequest {
    task_id: String,
    source_path: String,
    output_path: String,
    preset: String,
    container: String,
    audio_mode: String,
    acceleration: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TranscodeProgress {
    task_id: String,
    progress: u8,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProbeMediaInfoResult {
    file_size: u64,
}

fn build_thumbnail_args(source_path: &str, seek_seconds: f64) -> Vec<String> {
    vec![
        "-v".to_string(),
        "error".to_string(),
        "-i".to_string(),
        source_path.to_string(),
        "-ss".to_string(),
        format!("{seek_seconds:.3}"),
        "-frames:v".to_string(),
        "1".to_string(),
        "-vf".to_string(),
        "scale=320:180:force_original_aspect_ratio=increase,crop=320:180".to_string(),
        "-f".to_string(),
        "image2pipe".to_string(),
        "-vcodec".to_string(),
        "mjpeg".to_string(),
        "pipe:1".to_string(),
    ]
}

fn probe_duration_ms(source_path: &str) -> Option<u64> {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            source_path,
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let seconds = stdout.trim().parse::<f64>().ok()?;

    Some((seconds * 1000.0).round() as u64)
}

fn extract_video_thumbnail_blocking(source_path: String) -> Result<String, String> {
    let duration_ms = probe_duration_ms(&source_path).unwrap_or(0);
    let seek_seconds = if duration_ms > 800 {
        ((duration_ms as f64) * 0.15 / 1000.0).min((duration_ms as f64 / 1000.0) - 0.12)
    } else {
        0.0
    };
    let output = Command::new("ffmpeg")
        .args(build_thumbnail_args(&source_path, seek_seconds))
        .output()
        .map_err(|err| err.to_string())?;

    if !output.status.success() || output.stdout.is_empty() {
        let stderr_output = String::from_utf8_lossy(&output.stderr);
        let message = stderr_output
            .lines()
            .rev()
            .find(|line| !line.trim().is_empty())
            .unwrap_or("无法生成视频缩略图。")
            .to_string();

        return Err(message);
    }

    Ok(format!(
        "data:image/jpeg;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(output.stdout)
    ))
}

fn build_ffmpeg_args(request: &TranscodeRequest) -> Vec<String> {
    let mut args = vec!["-y".to_string(), "-hide_banner".to_string(), "-v".to_string(), "error".to_string()];

    match request.acceleration.as_str() {
        "Auto" => {
            args.push("-hwaccel".to_string());
            args.push("auto".to_string());
        }
        "VideoToolbox" => {
            args.push("-hwaccel".to_string());
            args.push("videotoolbox".to_string());
        }
        _ => {}
    }

    args.push("-i".to_string());
    args.push(request.source_path.clone());

    match request.preset.as_str() {
        "H.265 Archive" => {
            args.extend([
                "-c:v".to_string(),
                "libx265".to_string(),
                "-preset".to_string(),
                "medium".to_string(),
                "-crf".to_string(),
                "24".to_string(),
            ]);

            if request.container == "MP4"
                || request.container == "MOV"
                || request.container == "M4V"
            {
                args.extend(["-tag:v".to_string(), "hvc1".to_string()]);
            }
        }
        "Apple ProRes 422" => {
            args.extend([
                "-c:v".to_string(),
                "prores_ks".to_string(),
                "-profile:v".to_string(),
                "2".to_string(),
                "-pix_fmt".to_string(),
                "yuv422p10le".to_string(),
            ]);
        }
        _ => {
            args.extend([
                "-c:v".to_string(),
                "libx264".to_string(),
                "-preset".to_string(),
                "medium".to_string(),
                "-crf".to_string(),
                "21".to_string(),
                "-pix_fmt".to_string(),
                "yuv420p".to_string(),
            ]);
        }
    }

    match request.audio_mode.as_str() {
        "Copy Source" => {
            args.extend(["-c:a".to_string(), "copy".to_string()]);
        }
        "Opus 160 kbps" => {
            args.extend([
                "-c:a".to_string(),
                "libopus".to_string(),
                "-b:a".to_string(),
                "160k".to_string(),
            ]);
        }
        _ => {
            args.extend([
                "-c:a".to_string(),
                "aac".to_string(),
                "-b:a".to_string(),
                "192k".to_string(),
            ]);
        }
    }

    if request.container == "MP4" || request.container == "M4V" {
        args.extend(["-movflags".to_string(), "+faststart".to_string()]);
    }

    if request.container == "MOV" {
        args.extend(["-movflags".to_string(), "use_metadata_tags".to_string()]);
    }

    args.extend([
        "-progress".to_string(),
        "pipe:1".to_string(),
        "-nostats".to_string(),
        request.output_path.clone(),
    ]);

    args
}

fn transcode_video_blocking(
    request: TranscodeRequest,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let output_path = std::path::PathBuf::from(&request.output_path);

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let duration_ms = probe_duration_ms(&request.source_path).unwrap_or(0);
    let args = build_ffmpeg_args(&request);

    let mut child = Command::new("ffmpeg")
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| err.to_string())?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取 ffmpeg 进度输出。".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "无法读取 ffmpeg 错误输出。".to_string())?;

    let stderr_handle = std::thread::spawn(move || {
        let mut stderr_reader = BufReader::new(stderr);
        let mut stderr_text = String::new();
        let _ = stderr_reader.read_to_string(&mut stderr_text);
        stderr_text
    });

    let reader = BufReader::new(stdout);
    let mut last_progress = 0u8;

    for line in reader.lines() {
        let line = line.map_err(|err| err.to_string())?;

        if let Some(raw) = line.strip_prefix("out_time_ms=") {
            if duration_ms > 0 {
                let current_ms = raw.trim().parse::<u64>().unwrap_or(0) / 1000;
                let progress = ((current_ms.saturating_mul(100)) / duration_ms).min(99) as u8;

                if progress > last_progress {
                    last_progress = progress;
                    let _ = app_handle.emit_to(
                        "main",
                        "transcode-progress",
                        TranscodeProgress {
                            task_id: request.task_id.clone(),
                            progress,
                        },
                    );
                }
            }
        }
    }

    let status = child.wait().map_err(|err| err.to_string())?;
    let stderr_output = stderr_handle
        .join()
        .unwrap_or_else(|_| "ffmpeg 输出读取失败。".to_string());

    if !status.success() {
        let message = stderr_output
            .lines()
            .rev()
            .find(|line| !line.trim().is_empty())
            .unwrap_or("ffmpeg 执行失败。")
            .to_string();

        return Err(message);
    }

    let _ = app_handle.emit_to(
        "main",
        "transcode-progress",
        TranscodeProgress {
            task_id: request.task_id,
            progress: 100,
        },
    );

    Ok(())
}

#[tauri::command]
fn probe_media_info(path: String) -> Result<ProbeMediaInfoResult, String> {
    let metadata = fs::metadata(path).map_err(|err| err.to_string())?;

    Ok(ProbeMediaInfoResult {
        file_size: metadata.len(),
    })
}

#[tauri::command]
async fn extract_video_thumbnail(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || extract_video_thumbnail_blocking(path))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
async fn transcode_video(
    request: TranscodeRequest,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || transcode_video_blocking(request, app_handle))
        .await
        .map_err(|err| err.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            probe_media_info,
            extract_video_thumbnail,
            transcode_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
