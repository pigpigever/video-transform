import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { formatClock, type TaskJob } from "../lib/tasks";
import {
  buildCommandPreview,
  estimateEta,
  getContainerOptionsForPreset,
  type LogEntry,
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
  getStoredJobs,
  getStoredLogs,
  getStoredTranscodeSettings,
  persistJobs,
  persistLogs,
  persistTranscodeSettings,
} from "./transcodeQueue/storage";

export function useTranscodeQueue() {
  const storedSettings = getStoredTranscodeSettings();
  const appWindow = getCurrentWindow();
  const [sidebarSection, setSidebarSection] =
    createSignal<SidebarSection>("tasks");
  const [taskTab, setTaskTab] = createSignal<TaskTab>("active");
  const [preset, setPreset] = createSignal<PresetOption>(storedSettings.preset);
  const [container, setContainer] = createSignal<ContainerOption>(
    storedSettings.container,
  );
  const [audioMode, setAudioMode] = createSignal<AudioOption>(
    storedSettings.audioMode,
  );
  const [acceleration, setAcceleration] = createSignal<AccelerationMode>(
    storedSettings.acceleration,
  );
  const [maxConcurrentTasks, setMaxConcurrentTasks] = createSignal<number>(
    storedSettings.maxConcurrentTasks,
  );
  const [outputDirectory, setOutputDirectory] = createSignal<string | null>(
    storedSettings.outputDirectory,
  );
  const [jobs, setJobs] = createSignal<TaskJob[]>(getStoredJobs());
  const [selectedTaskIds, setSelectedTaskIds] = createSignal<string[]>([]);
  const [queuedTaskIds, setQueuedTaskIds] = createSignal<string[]>([]);
  const [logs, setLogs] = createSignal<LogEntry[]>(getStoredLogs());

  const pendingJobs = createMemo(() =>
    jobs().filter((job) => job.status === "pending"),
  );
  const completedJobs = createMemo(() =>
    jobs().filter((job) => job.status === "completed"),
  );
  const runningJobs = createMemo(() =>
    jobs().filter((job) => job.status === "running"),
  );
  const activeJobs = createMemo(() =>
    jobs().filter((job) => job.status !== "completed"),
  );
  const visibleJobs = createMemo(() =>
    taskTab() === "active" ? activeJobs() : completedJobs(),
  );
  const queuedTaskIdSet = createMemo(() => new Set(queuedTaskIds()));
  const selectedIdSet = createMemo(() => new Set(selectedTaskIds()));
  const selectedJobs = createMemo(() =>
    visibleJobs().filter((job) => selectedIdSet().has(job.id)),
  );

  const canStartAll = createMemo(() =>
    pendingJobs().some((job) => !queuedTaskIdSet().has(job.id)),
  );
  const canDeleteSelected = createMemo(() =>
    selectedJobs().some((job) => job.status !== "running"),
  );
  const canStartSelected = createMemo(() =>
    selectedJobs().some(
      (job) => job.status === "pending" && !queuedTaskIdSet().has(job.id),
    ),
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
    persistTranscodeSettings({
      preset: preset(),
      container: container(),
      audioMode: audioMode(),
      acceleration: acceleration(),
      maxConcurrentTasks: maxConcurrentTasks(),
      outputDirectory: outputDirectory(),
    });
  });

  createEffect(() => {
    persistJobs(jobs());
  });

  createEffect(() => {
    persistLogs(logs());
  });

  function appendLog(level: string, text: string) {
    setLogs((current) =>
      [{ time: formatClock(), level, text }, ...current].slice(0, 50),
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
    maxConcurrentTasks,
    outputDirectory,
    pendingJobs,
    preset,
    queuedTaskIds,
    runningJobs,
    selectedJobs,
    setJobs,
    setOutputDirectory,
    setQueuedTaskIds,
    setSelectedTaskIds,
    setSidebarSection,
    setTaskTab,
    updateJob,
    visibleJobs,
  });

  createEffect(
    on(
      () => maxConcurrentTasks(),
      () => {
        void actions.pumpStartQueue();
      },
      { defer: true },
    ),
  );

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
    maxConcurrentTasks,
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
    setMaxConcurrentTasks,
    setPreset,
    setSidebarSection,
    setTaskTab,
    ...actions,
  };
}
