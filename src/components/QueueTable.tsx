import * as Progress from "@kobalte/core/progress";
import {
  type ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
  untrack,
} from "solid-js";
import {
  getTaskStatusLabel,
  type TaskJob,
  type TaskStatus,
} from "../lib/tasks";
import { getContainerOptionsForPreset } from "../lib/transcode";
import { getVideoThumbnail } from "../lib/videoThumbnail";
import { AppButton } from "./AppButton";
import { FolderOpenIcon, PlayIcon, TrashIcon } from "./AppIcons";
import { AppSelect } from "./AppSelect";

export type TaskListView = "active" | "completed";

const statusStyles: Record<TaskStatus, string> = {
  pending: "bg-slate-400/10 text-slate-200 ring-slate-200/10",
  running: "bg-amber-400/10 text-amber-100 ring-amber-200/20",
  completed: "bg-emerald-400/10 text-emerald-100 ring-emerald-200/20",
};

interface QueueTableProps {
  allVisibleSelected: boolean;
  jobs: TaskJob[];
  onDeleteJob?: (id: string) => void;
  view: TaskListView;
  onStartJob?: (id: string) => void;
  onRevealJob?: (id: string) => void;
  onChangeContainer?: (id: string, container: string) => void;
  onToggleAllVisibleSelection: (selected: boolean) => void;
  onToggleTaskSelection: (id: string, selected: boolean) => void;
  selectedTaskIds: string[];
  someVisibleSelected: boolean;
}

function TaskProgressBar(props: { progress: number }) {
  const [displayProgress, setDisplayProgress] = createSignal(props.progress);
  let frameId = 0;

  createEffect(
    on(
      () => props.progress,
      (nextProgress) => {
        cancelAnimationFrame(frameId);

        const target = Math.min(100, Math.max(0, nextProgress));
        const startValue = untrack(displayProgress);
        const delta = target - startValue;

        if (Math.abs(delta) < 0.1) {
          setDisplayProgress(target);
          return;
        }

        const duration = Math.min(560, Math.max(180, Math.abs(delta) * 22));
        const startAt = performance.now();

        const animate = (now: number) => {
          const elapsed = now - startAt;
          const progress = Math.min(1, elapsed / duration);
          const eased = 1 - Math.pow(1 - progress, 3);

          setDisplayProgress(startValue + delta * eased);

          if (progress < 1) {
            frameId = requestAnimationFrame(animate);
          }
        };

        frameId = requestAnimationFrame(animate);
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    cancelAnimationFrame(frameId);
  });

  return (
    <Progress.Root
      value={displayProgress()}
      getValueLabel={({ value }) => `${Math.round(value)}%`}
    >
      <div class="flex min-w-[8.5rem] items-center gap-2.5">
        <Progress.Track class="task-progress-track h-2.5 flex-1">
          <Progress.Fill class="task-progress-fill h-full" />
        </Progress.Track>
        <Progress.ValueLabel class="w-9 text-right text-xs font-medium text-slate-300 tabular-nums" />
      </div>
    </Progress.Root>
  );
}

function TableCheckbox(props: {
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  onChange: (selected: boolean) => void;
}) {
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (inputRef) {
      inputRef.indeterminate = Boolean(props.indeterminate) && !props.checked;
    }
  });

  return (
    <input
      ref={inputRef}
      aria-label={props.ariaLabel}
      class="table-checkbox"
      checked={props.checked}
      disabled={props.disabled}
      type="checkbox"
      onChange={(event) => props.onChange(event.currentTarget.checked)}
    />
  );
}

function QueueFileCell(props: { fileName: string; sourcePath: string }) {
  const [thumbnail] = createResource(
    () => props.sourcePath,
    getVideoThumbnail,
  );

  const fileBadge = () =>
    props.fileName.split(".").pop()?.slice(0, 3).toUpperCase() || "VID";

  return (
    <div class="queue-file-cell">
      <div class="queue-file-thumbnail" aria-hidden="true">
        <Show
          when={thumbnail()}
          fallback={
            <Show
              when={thumbnail.loading}
              fallback={
                <div class="queue-file-thumbnail-fallback">{fileBadge()}</div>
              }
            >
              <div class="queue-file-thumbnail-loading">
                <span aria-hidden="true" class="loading-spinner" />
              </div>
            </Show>
          }
        >
          {(thumbnailUrl) => (
            <img
              alt=""
              class="queue-file-thumbnail-image"
              loading="lazy"
              src={thumbnailUrl()}
            />
          )}
        </Show>
      </div>

      <div class="queue-file-meta">
        <div class="queue-file-name-wrap" data-tooltip={props.fileName}>
          <div class="queue-file-name">{props.fileName}</div>
        </div>
        <div class="truncate text-xs text-slate-500" title={props.sourcePath}>
          {props.sourcePath}
        </div>
      </div>
    </div>
  );
}

export function QueueTable(props: QueueTableProps) {
  const selectedIdSet = createMemo(() => new Set(props.selectedTaskIds));

  const columns = createMemo<ColumnDef<TaskJob>[]>(() => [
    {
      id: "selection",
      header: () => (
        <div class="table-checkbox-cell">
          <TableCheckbox
            ariaLabel="全选当前列表任务"
            checked={props.allVisibleSelected}
            disabled={props.jobs.length === 0}
            indeterminate={props.someVisibleSelected}
            onChange={props.onToggleAllVisibleSelection}
          />
        </div>
      ),
      cell: (info) => {
        const job = info.row.original;

        return (
          <div class="table-checkbox-cell">
            <TableCheckbox
              ariaLabel={`选择任务 ${job.fileName}`}
              checked={selectedIdSet().has(job.id)}
              onChange={(selected) => props.onToggleTaskSelection(job.id, selected)}
            />
          </div>
        );
      },
    },
    {
      accessorKey: "fileName",
      header: "文件",
      cell: (info) => {
        const job = info.row.original;

        return <QueueFileCell fileName={job.fileName} sourcePath={job.sourcePath} />;
      },
    },
    {
      id: "format",
      header: "格式",
      cell: (info) => {
        const job = info.row.original;

        if (props.view === "active" && job.status === "pending") {
          return (
            <div class="row-select-wrap">
              <AppSelect
                ariaLabel={`${job.fileName} 输出格式`}
                options={getContainerOptionsForPreset(job.preset)}
                value={job.container}
                variant="compact"
                onChange={(value) => props.onChangeContainer?.(job.id, value)}
              />
            </div>
          );
        }

        return (
          <div>
            <div class="font-medium text-slate-100">{job.container}</div>
            <div class="text-xs text-slate-500">{job.outputSize}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "progress",
      header: "进度",
      cell: (info) => {
        const progress = info.getValue<number>();

        return <TaskProgressBar progress={progress} />;
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: (info) => {
        const status = info.getValue<TaskStatus>();

        return (
          <span class={`table-pill ${statusStyles[status]}`}>
            {getTaskStatusLabel(status)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: (info) => {
        const job = info.row.original;

        if (job.status === "pending") {
          return (
            <div class="table-action-group">
              <AppButton
                size="sm"
                variant="table"
                onClick={() => props.onStartJob?.(job.id)}
              >
                <span class="button-content">
                  <PlayIcon class="button-icon" />
                  <span>开始转换</span>
                </span>
              </AppButton>

              <AppButton
                size="sm"
                variant="table"
                class="table-action-danger table-action-icon"
                title={`删除 ${job.fileName}`}
                aria-label={`删除 ${job.fileName}`}
                onClick={() => props.onDeleteJob?.(job.id)}
              >
                <TrashIcon class="button-icon" />
              </AppButton>
            </div>
          );
        }

        if (job.status === "running") {
          return (
            <div class="table-action-group">
              <AppButton size="sm" variant="table" disabled>
                <span class="button-content">
                  <span aria-hidden="true" class="loading-spinner" />
                  <span>转换中</span>
                </span>
              </AppButton>

              <AppButton
                size="sm"
                variant="table"
                class="table-action-danger table-action-icon"
                title="进行中的任务暂不支持删除"
                aria-label="进行中的任务暂不支持删除"
                disabled
              >
                <TrashIcon class="button-icon" />
              </AppButton>
            </div>
          );
        }

        return (
          <div class="table-action-group">
            <AppButton
              size="sm"
              variant="table"
              onClick={() => props.onRevealJob?.(job.id)}
            >
              <span class="button-content">
                <FolderOpenIcon class="button-icon" />
                <span>打开目录</span>
              </span>
            </AppButton>

            <AppButton
              size="sm"
              variant="table"
              class="table-action-danger table-action-icon"
              title={`删除 ${job.fileName}`}
              aria-label={`删除 ${job.fileName}`}
              onClick={() => props.onDeleteJob?.(job.id)}
            >
              <TrashIcon class="button-icon" />
            </AppButton>
          </div>
        );
      },
    },
  ]);

  const table = createSolidTable({
    get data() {
      return props.jobs;
    },
    get columns() {
      return columns();
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Show
      when={table.getRowModel().rows.length > 0}
      fallback={
        <div class="empty-state h-full">
          <div class="text-lg font-semibold text-white">
            {props.view === "active" ? "还没有进行中的任务" : "还没有已完成任务"}
          </div>
          <p class="mt-2 max-w-md text-sm leading-6 text-slate-400">
            {props.view === "active"
              ? "先点击“添加文件”把视频加入任务列表。新文件会先进入进行中列表，之后可以单独开始，也可以一键全部开始。"
              : "任务完成后会自动移动到这里，方便你回看输出记录。"}
          </p>
        </div>
      }
    >
      <div class="queue-table-shell">
        <div class="queue-table-scroll">
          <table class="queue-table">
            <thead>
              <For each={table.getHeaderGroups()}>
                {(headerGroup) => (
                  <tr>
                    <For each={headerGroup.headers}>
                      {(header) => (
                        <th data-column-id={header.column.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </thead>
            <tbody>
              <For each={table.getRowModel().rows}>
                {(row) => (
                  <tr>
                    <For each={row.getVisibleCells()}>
                      {(cell) => (
                        <td data-column-id={cell.column.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </Show>
  );
}
