import type { Accessor, Setter } from "solid-js";
import {
  buildOutputPath,
  createTaskFromPath,
  formatFileSize,
  formatClock,
  type TaskJob,
} from "../../lib/tasks";
import type {
  AccelerationMode,
  AudioOption,
  ContainerOption,
  PresetOption,
  SidebarSection,
  TaskTab,
  TranscodeRequest,
} from "../../lib/transcode";
import {
  openOutputDirectory,
  probeMediaInfo,
  transcodeVideo,
} from "./api";
import { pickOutputDirectory, pickVideoFiles } from "./dialogs";

interface QueueActionContext {
  acceleration: Accessor<AccelerationMode>;
  appendLog: (level: string, text: string) => void;
  audioMode: Accessor<AudioOption>;
  container: Accessor<ContainerOption>;
  jobs: Accessor<TaskJob[]>;
  outputDirectory: Accessor<string | null>;
  pendingJobs: Accessor<TaskJob[]>;
  preset: Accessor<PresetOption>;
  selectedJobs: Accessor<TaskJob[]>;
  setJobs: Setter<TaskJob[]>;
  setOutputDirectory: Setter<string | null>;
  setSelectedTaskIds: Setter<string[]>;
  setSidebarSection: Setter<SidebarSection>;
  setTaskTab: Setter<TaskTab>;
  updateJob: (taskId: string, updater: (job: TaskJob) => TaskJob) => void;
  visibleJobs: Accessor<TaskJob[]>;
}

async function probeFileSize(path: string) {
  try {
    const sourceInfo = await probeMediaInfo(path);
    return sourceInfo.fileSize;
  } catch {
    return undefined;
  }
}

export function createQueueActions(context: QueueActionContext) {
  function updateJobContainer(taskId: string, nextContainer: string) {
    context.updateJob(taskId, (job) => {
      if (job.status !== "pending") {
        return job;
      }

      return {
        ...job,
        container: nextContainer,
        outputPath: buildOutputPath(
          job.sourcePath,
          nextContainer,
          job.outputDirectory,
        ),
      };
    });
  }

  function toggleTaskSelection(taskId: string, selected?: boolean) {
    context.setSelectedTaskIds((current) => {
      const exists = current.includes(taskId);
      const shouldSelect = selected ?? !exists;

      if (exists === shouldSelect) {
        return current;
      }

      if (shouldSelect) {
        return [...current, taskId];
      }

      return current.filter((id) => id !== taskId);
    });
  }

  function toggleAllVisibleSelection(selected: boolean) {
    if (!selected) {
      context.setSelectedTaskIds([]);
      return;
    }

    context.setSelectedTaskIds(context.visibleJobs().map((job) => job.id));
  }

  function markJobCompleted(taskId: string, outputSize?: string) {
    let completedFile = "";

    context.updateJob(taskId, (job) => {
      completedFile = job.fileName;

      return {
        ...job,
        progress: 100,
        status: "completed",
        eta: "已完成",
        outputSize: outputSize ?? job.outputSize,
        completedAt: formatClock(),
      };
    });

    context.appendLog("DONE", `${completedFile} 转换完成，已归档到“已完成”列表。`);
  }

  async function startJob(taskId: string) {
    const target = context.jobs().find((job) => job.id === taskId);

    if (!target || target.status !== "pending") {
      return;
    }

    context.updateJob(taskId, (job) => ({
      ...job,
      status: "running",
      progress: 0,
      eta: "转换中",
    }));

    context.appendLog(
      "QUEUE",
      `${target.fileName} 已开始转换，输出格式 ${target.container}。`,
    );

    const request: TranscodeRequest = {
      taskId: target.id,
      sourcePath: target.sourcePath,
      outputPath: target.outputPath,
      preset: target.preset,
      container: target.container,
      audioMode: target.audioMode,
      acceleration: target.acceleration,
    };

    try {
      await transcodeVideo(request);
      const outputSize = await probeFileSize(target.outputPath);

      markJobCompleted(
        taskId,
        outputSize ? formatFileSize(outputSize) : undefined,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ffmpeg 转换失败。";

      context.updateJob(taskId, (job) => ({
        ...job,
        status: "pending",
        progress: 0,
        eta: "转换失败",
      }));

      context.appendLog("ERROR", `${target.fileName} 转换失败：${message}`);
    }
  }

  function startSelectedJobs() {
    const jobsToStart = context.selectedJobs().filter(
      (job) => job.status === "pending",
    );

    jobsToStart.forEach((job) => {
      void startJob(job.id);
    });

    if (jobsToStart.length > 0) {
      context.setSelectedTaskIds([]);
      context.appendLog(
        "QUEUE",
        `已提交 ${jobsToStart.length} 个选中任务开始转换。`,
      );
    }
  }

  function startAllJobs() {
    const jobsToStart = context.pendingJobs();

    jobsToStart.forEach((job) => {
      void startJob(job.id);
    });

    if (jobsToStart.length > 0) {
      context.appendLog("QUEUE", "全部待开始任务已提交，开始并行转换。");
    }
  }

  function deleteJobs(taskIds: string[]) {
    const targetIdSet = new Set(taskIds);
    const targets = context.jobs().filter((job) => targetIdSet.has(job.id));
    const deletableTargets = targets.filter((job) => job.status !== "running");
    const blockedTargets = targets.filter((job) => job.status === "running");

    if (deletableTargets.length === 0) {
      if (blockedTargets.length > 0) {
        context.appendLog(
          "WARN",
          "进行中的任务暂不支持删除，请等待转换完成后再删除。",
        );
      }
      return;
    }

    const deletableIdSet = new Set(deletableTargets.map((job) => job.id));

    context.setJobs((current) =>
      current.filter((job) => !deletableIdSet.has(job.id)),
    );
    context.setSelectedTaskIds((current) =>
      current.filter((taskId) => !deletableIdSet.has(taskId)),
    );

    if (deletableTargets.length === 1) {
      context.appendLog(
        "REMOVE",
        `${deletableTargets[0].fileName} 已从任务列表移除。`,
      );
    } else {
      context.appendLog(
        "REMOVE",
        `已从任务列表移除 ${deletableTargets.length} 个任务。`,
      );
    }

    if (blockedTargets.length > 0) {
      context.appendLog(
        "WARN",
        `已跳过 ${blockedTargets.length} 个进行中的任务，当前暂不支持删除运行中任务。`,
      );
    }
  }

  function deleteJob(taskId: string) {
    deleteJobs([taskId]);
  }

  async function handlePickFiles() {
    try {
      const selectedPaths = await pickVideoFiles();

      if (!selectedPaths) {
        return;
      }

      const selectedPathSet = new Set<string>();
      const seedBase = context.jobs().length;
      const nextPaths = selectedPaths.filter((path) => {
        if (selectedPathSet.has(path)) {
          return false;
        }

        selectedPathSet.add(path);
        return true;
      });

      const nextJobs = await Promise.all(
        nextPaths.map(async (path, index) =>
          createTaskFromPath(
            path,
            {
              preset: context.preset(),
              container: context.container(),
              audioMode: context.audioMode(),
              acceleration: context.acceleration(),
              outputDirectory: context.outputDirectory(),
            },
            seedBase + index,
            await probeFileSize(path),
          ),
        ),
      );

      if (!nextJobs.length) {
        context.appendLog("PICK", "本次没有新增可加入的文件。");
        return;
      }

      context.setJobs((current) => [...nextJobs, ...current]);
      context.setSidebarSection("tasks");
      context.setTaskTab("active");
      context.appendLog("PICK", `已加入 ${nextJobs.length} 个文件到进行中列表。`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "未知错误，请检查对话框权限。";
      context.appendLog("ERROR", `文件选择失败：${message}`);
    }
  }

  async function handlePickOutputDirectory() {
    try {
      const nextDirectory = await pickOutputDirectory();

      if (!nextDirectory) {
        return;
      }

      context.setOutputDirectory(nextDirectory);
      context.appendLog("SET", `默认输出目录已更新为：${nextDirectory}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法选择默认输出目录。";
      context.appendLog("ERROR", `默认输出目录设置失败：${message}`);
    }
  }

  function resetOutputDirectory() {
    context.setOutputDirectory(null);
    context.appendLog("SET", "默认输出目录已恢复为跟随源文件目录。");
  }

  async function handleRevealJob(taskId: string) {
    const target = context.jobs().find((job) => job.id === taskId);

    if (!target || target.status !== "completed") {
      return;
    }

    try {
      await openOutputDirectory(target.outputPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法打开输出目录。";
      console.error('[openOutputDirector] error', error)
      context.appendLog("ERROR", `${target.fileName} 打开目录失败：${message}`);
    }
  }

  return {
    deleteJob,
    deleteJobs,
    handlePickFiles,
    handlePickOutputDirectory,
    handleRevealJob,
    resetOutputDirectory,
    startAllJobs,
    startJob,
    startSelectedJobs,
    toggleAllVisibleSelection,
    toggleTaskSelection,
    updateJobContainer,
  };
}
