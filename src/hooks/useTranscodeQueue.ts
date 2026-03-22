import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { formatClock, type TaskJob } from "../lib/tasks";
import {
  buildCommandPreview,
  estimateEta,
  getContainerOptionsForPreset,
  initialLogs,
  type AccelerationMode,
  type AudioOption,
  type ContainerOption,
  type PresetOption,
  type SidebarSection,
  type TaskTab,
  type TranscodeProgressPayload,
} from "../lib/transcode";
import { createQueueActions } from "./transcodeQueue/actions";
import {
  getStoredOutputDirectory,
  persistOutputDirectory,
} from "./transcodeQueue/storage";

export function useTranscodeQueue() {
  const appWindow = getCurrentWindow();
  const [sidebarSection, setSidebarSection] =
    createSignal<SidebarSection>("tasks");
  const [taskTab, setTaskTab] = createSignal<TaskTab>("active");
  const [preset, setPreset] = createSignal<PresetOption>("H.264 Delivery");
  const [container, setContainer] = createSignal<ContainerOption>("MP4");
  const [audioMode, setAudioMode] = createSignal<AudioOption>("AAC 192 kbps");
  const [acceleration, setAcceleration] = createSignal<AccelerationMode>("Auto");
  const [outputDirectory, setOutputDirectory] = createSignal<string | null>(
    getStoredOutputDirectory(),
  );
  const [jobs, setJobs] = createSignal<TaskJob[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = createSignal<string[]>([]);
  const [, setLogs] = createSignal(initialLogs);

  const pendingJobs = createMemo(() =>
    jobs().filter((job) => job.status === "pending"),
  );
  const completedJobs = createMemo(() =>
    jobs().filter((job) => job.status === "completed"),
  );
  const activeJobs = createMemo(() =>
    jobs().filter((job) => job.status !== "completed"),
  );
  const visibleJobs = createMemo(() =>
    taskTab() === "active" ? activeJobs() : completedJobs(),
  );
  const selectedIdSet = createMemo(() => new Set(selectedTaskIds()));
  const selectedJobs = createMemo(() =>
    visibleJobs().filter((job) => selectedIdSet().has(job.id)),
  );

  const canStartAll = createMemo(() => pendingJobs().length > 0);
  const canDeleteSelected = createMemo(() =>
    selectedJobs().some((job) => job.status !== "running"),
  );
  const canStartSelected = createMemo(() =>
    selectedJobs().some((job) => job.status === "pending"),
  );
  const selectedCount = createMemo(() => selectedJobs().length);
  const selectedHasRunning = createMemo(() =>
    selectedJobs().some((job) => job.status === "running"),
  );
  const allVisibleSelected = createMemo(() =>
    visibleJobs().length > 0 &&
    visibleJobs().every((job) => selectedIdSet().has(job.id)),
  );
  const someVisibleSelected = createMemo(
    () => selectedCount() > 0 && !allVisibleSelected(),
  );
  const commandPreview = createMemo(() =>
    buildCommandPreview({
      preset: preset(),
      container: container(),
      audioMode: audioMode(),
      acceleration: acceleration(),
    }),
  );

  createEffect(() => {
    const supportedContainers = getContainerOptionsForPreset(preset());

    if (!supportedContainers.includes(container())) {
      setContainer(supportedContainers[0]);
    }
  });

  createEffect(() => {
    const visibleIdSet = new Set(visibleJobs().map((job) => job.id));
    const currentSelection = selectedTaskIds();
    const nextSelection = currentSelection.filter((id) => visibleIdSet.has(id));

    if (
      nextSelection.length !== currentSelection.length ||
      nextSelection.some((id, index) => id !== currentSelection[index])
    ) {
      setSelectedTaskIds(nextSelection);
    }
  });

  createEffect(() => {
    persistOutputDirectory(outputDirectory());
  });

  function appendLog(level: string, text: string) {
    setLogs((current) =>
      [{ time: formatClock(), level, text }, ...current].slice(0, 8),
    );
  }

  function updateJob(taskId: string, updater: (job: TaskJob) => TaskJob) {
    setJobs((current) =>
      current.map((job) => (job.id === taskId ? updater(job) : job)),
    );
  }

  const actions = createQueueActions({
    acceleration,
    appendLog,
    audioMode,
    container,
    jobs,
    outputDirectory,
    pendingJobs,
    preset,
    selectedJobs,
    setJobs,
    setOutputDirectory,
    setSelectedTaskIds,
    setSidebarSection,
    setTaskTab,
    updateJob,
    visibleJobs,
  });

  let unlistenProgress: (() => void) | undefined;

  onMount(async () => {
    unlistenProgress = await appWindow.listen<TranscodeProgressPayload>(
      "transcode-progress",
      (event) => {
        const { taskId, progress } = event.payload;

        updateJob(taskId, (job) => {
          if (job.status === "completed") {
            return job;
          }

          return {
            ...job,
            progress,
            eta: progress >= 100 ? "已完成" : estimateEta(progress),
          };
        });
      },
    );
  });

  onCleanup(() => {
    unlistenProgress?.();
  });

  return {
    activeJobs,
    allVisibleSelected,
    audioMode,
    canDeleteSelected,
    canStartAll,
    canStartSelected,
    commandPreview,
    completedJobs,
    acceleration,
    container,
    outputDirectory,
    preset,
    selectedCount,
    selectedHasRunning,
    selectedTaskIds,
    sidebarSection,
    someVisibleSelected,
    taskTab,
    visibleJobs,
    setAcceleration,
    setAudioMode,
    setContainer,
    setPreset,
    setSidebarSection,
    setTaskTab,
    ...actions,
  };
}
