import * as Tabs from "@kobalte/core/tabs";
import { Show } from "solid-js";
import type { TaskJob } from "../lib/tasks";
import type { TaskTab } from "../lib/transcode";
import { AppButton } from "./AppButton";
import { AddFileIcon, PlayIcon, TrashIcon } from "./AppIcons";
import { QueueTable } from "./QueueTable";

interface TasksViewProps {
  activeJobs: TaskJob[];
  canStartAll: boolean;
  canDeleteSelected: boolean;
  canStartSelected: boolean;
  completedJobs: TaskJob[];
  allVisibleSelected: boolean;
  onChangeContainer: (taskId: string, nextContainer: string) => void;
  onDeleteJob: (taskId: string) => void;
  onDeleteSelectedJobs: () => void;
  onPickFiles: () => void | Promise<void>;
  onRevealJob: (taskId: string) => void | Promise<void>;
  onStartAllJobs: () => void;
  onStartJob: (taskId: string) => void | Promise<void>;
  onStartSelectedJobs: () => void;
  onToggleAllVisibleSelection: (selected: boolean) => void;
  onToggleTaskSelection: (taskId: string, selected: boolean) => void;
  selectedCount: number;
  selectedHasRunning: boolean;
  selectedTaskIds: string[];
  setTaskTab: (tab: TaskTab) => void;
  someVisibleSelected: boolean;
  taskTab: TaskTab;
}

export function TasksView(props: TasksViewProps) {
  return (
    <section class="panel flex h-full min-h-0 flex-col p-6">
      <div class="tasks-toolbar border-b border-white/10 pb-5">
        <div class="tasks-toolbar-heading">
          <h1 class="text-2xl font-semibold tracking-tight text-white">任务</h1>

          <Show when={props.selectedCount > 0}>
            <div class="task-bulk-inline">
              <div class="task-bulk-title">已选 {props.selectedCount} 个任务</div>
              <Show when={props.selectedHasRunning}>
                <div class="task-bulk-note">进行中的任务暂不支持删除</div>
              </Show>
            </div>
          </Show>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <Show when={props.selectedCount > 0 && props.taskTab === "active"}>
            <AppButton
              size="sm"
              variant="primary"
              disabled={!props.canStartSelected}
              onClick={props.onStartSelectedJobs}
            >
              <span class="button-content">
                <PlayIcon class="button-icon" />
                <span>开始所选</span>
              </span>
            </AppButton>
          </Show>

          <Show when={props.selectedCount > 0}>
            <AppButton
              size="sm"
              variant="ghost"
              class="danger-button"
              disabled={!props.canDeleteSelected}
              onClick={props.onDeleteSelectedJobs}
            >
              <span class="button-content">
                <TrashIcon class="button-icon" />
                <span>删除所选</span>
              </span>
            </AppButton>
          </Show>

          <AppButton size="sm" variant="ghost" onClick={props.onPickFiles}>
            <span class="button-content">
              <AddFileIcon class="button-icon" />
              <span>添加文件</span>
            </span>
          </AppButton>
          <AppButton
            size="sm"
            variant="primary"
            disabled={!props.canStartAll}
            onClick={props.onStartAllJobs}
          >
            <span class="button-content">
              <PlayIcon class="button-icon" />
              <span>全部开始转换</span>
            </span>
          </AppButton>
        </div>
      </div>

      <Tabs.Root
        value={props.taskTab}
        onChange={(value) => props.setTaskTab(value as TaskTab)}
        class="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <Tabs.List class="status-tabs w-full sm:w-fit" data-tab={props.taskTab}>
          <Tabs.Trigger class="status-tab" value="active">
            进行中
            <span class="status-count">{props.activeJobs.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger class="status-tab" value="completed">
            已完成
            <span class="status-count">{props.completedJobs.length}</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="active" class="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
          <QueueTable
            allVisibleSelected={props.allVisibleSelected}
            jobs={props.activeJobs}
            onDeleteJob={props.onDeleteJob}
            view="active"
            onChangeContainer={props.onChangeContainer}
            onStartJob={props.onStartJob}
            onToggleAllVisibleSelection={props.onToggleAllVisibleSelection}
            onToggleTaskSelection={props.onToggleTaskSelection}
            selectedTaskIds={props.selectedTaskIds}
            someVisibleSelected={props.someVisibleSelected}
          />
        </Tabs.Content>

        <Tabs.Content value="completed" class="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
          <QueueTable
            allVisibleSelected={props.allVisibleSelected}
            jobs={props.completedJobs}
            onDeleteJob={props.onDeleteJob}
            view="completed"
            onRevealJob={props.onRevealJob}
            onToggleAllVisibleSelection={props.onToggleAllVisibleSelection}
            onToggleTaskSelection={props.onToggleTaskSelection}
            selectedTaskIds={props.selectedTaskIds}
            someVisibleSelected={props.someVisibleSelected}
          />
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
