import * as ToggleGroup from "@kobalte/core/toggle-group";
import { For } from "solid-js";
import {
  accelerationModes,
  audioOptions,
  maxConcurrentTaskOptions,
  getContainerOptionsForPreset,
  presetOptions,
  type AccelerationMode,
  type AudioOption,
  type ContainerOption,
  type PresetOption,
} from "../lib/transcode";
import { AppButton } from "./AppButton";
import { FolderOpenIcon } from "./AppIcons";
import { AppSelect } from "./AppSelect";

interface SettingsViewProps {
  acceleration: AccelerationMode;
  audioMode: AudioOption;
  commandPreview: string;
  container: ContainerOption;
  maxConcurrentTasks: number;
  onPickOutputDirectory: () => void | Promise<void>;
  onResetOutputDirectory: () => void;
  outputDirectory: string | null;
  preset: PresetOption;
  setAcceleration: (value: AccelerationMode) => void;
  setAudioMode: (value: AudioOption) => void;
  setContainer: (value: ContainerOption) => void;
  setMaxConcurrentTasks: (value: number) => void;
  setPreset: (value: PresetOption) => void;
}

export function SettingsView(props: SettingsViewProps) {
  return (
    <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="panel p-6">
        <p class="eyebrow">Settings</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          转换设置
        </h1>
        <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
          这里控制新加入任务时默认附带的参数。你在这里修改预设后，再去“任务”
          页面选择文件，新文件会按当前设置写入任务卡片和输出目录。
        </p>

        <div class="mt-6 grid gap-5 xl:grid-cols-2">
          <div class="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <label class="grid gap-2">
              <span class="field-label">预设</span>
              <AppSelect
                ariaLabel="默认视频预设"
                options={presetOptions}
                value={props.preset}
                onChange={(value) => props.setPreset(value as PresetOption)}
              />
            </label>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-2">
                <span class="field-label">容器</span>
                <AppSelect
                  ariaLabel="默认输出容器"
                  options={getContainerOptionsForPreset(props.preset)}
                  value={props.container}
                  onChange={(value) => props.setContainer(value as ContainerOption)}
                />
              </label>

              <label class="grid gap-2">
                <span class="field-label">音频</span>
                <AppSelect
                  ariaLabel="默认音频模式"
                  options={audioOptions}
                  value={props.audioMode}
                  onChange={(value) => props.setAudioMode(value as AudioOption)}
                />
              </label>
            </div>

            <div class="grid gap-2">
              <span class="field-label">默认输出目录</span>
              <div class="field-input settings-output-path min-h-[3.15rem] break-all text-sm font-medium">
                {props.outputDirectory ?? "跟随源文件所在目录"}
              </div>
              <div class="flex flex-wrap gap-3">
                <AppButton
                  size="sm"
                  variant="ghost"
                  onClick={props.onPickOutputDirectory}
                >
                  <span class="button-content">
                    <FolderOpenIcon class="button-icon" />
                    <span>选择目录</span>
                  </span>
                </AppButton>
                <AppButton
                  size="sm"
                  variant="ghost"
                  disabled={!props.outputDirectory}
                  onClick={props.onResetOutputDirectory}
                >
                  <span class="button-content">
                    <span>跟随源文件</span>
                  </span>
                </AppButton>
              </div>
            </div>

            <label class="grid gap-2">
              <span class="field-label">最大并发任务</span>
              <AppSelect
                ariaLabel="最大并发任务数量"
                options={maxConcurrentTaskOptions}
                value={String(props.maxConcurrentTasks)}
                onChange={(value) =>
                  props.setMaxConcurrentTasks(Number.parseInt(value, 10))
                }
              />
            </label>
          </div>

          <div class="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div>
              <span class="field-label">硬件加速</span>
              <ToggleGroup.Root
                class="chip-group mt-3"
                value={props.acceleration}
                onChange={(value) => {
                  if (value) {
                    props.setAcceleration(value as AccelerationMode);
                  }
                }}
              >
                <For each={accelerationModes}>
                  {(option) => (
                    <ToggleGroup.Item class="toggle-chip" value={option}>
                      {option}
                    </ToggleGroup.Item>
                  )}
                </For>
              </ToggleGroup.Root>
            </div>

            <div class="rounded-[24px] border border-white/10 bg-slate-950/40 p-4">
              <div class="text-sm font-medium text-white">默认行为</div>
              <div class="mt-3 space-y-3 text-sm text-slate-400">
                <div>新文件加入后先停留在“进行中 / 待开始”。</div>
                <div>默认输出目录由这里统一决定，可随时切换。</div>
                <div>支持逐个启动，也支持顶部按钮一次性全部启动。</div>
                <div>同时最多运行 {props.maxConcurrentTasks} 个转换任务。</div>
                <div>完成后自动从进行中移动到已完成。</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="flex flex-col gap-5">
        <section class="panel p-6">
          <p class="eyebrow">Command Preview</p>
          <h3 class="mt-2 text-xl font-semibold text-white">FFmpeg 预览</h3>
          <pre class="command-preview mt-5">{props.commandPreview}</pre>
        </section>

        <section class="panel p-6">
          <p class="eyebrow">Workflow</p>
          <h3 class="mt-2 text-xl font-semibold text-white">当前规则</h3>
          <div class="mt-4 space-y-3">
            <div class="summary-row">
              <span>任务入口</span>
              <strong>原生文件选择</strong>
            </div>
            <div class="summary-row">
              <span>任务分组</span>
              <strong>进行中 / 已完成</strong>
            </div>
            <div class="summary-row">
              <span>批量触发</span>
              <strong>顶部按钮一键启动</strong>
            </div>
            <div class="summary-row">
              <span>最大并发</span>
              <strong>{props.maxConcurrentTasks} 个任务</strong>
            </div>
            <div class="summary-row">
              <span>默认输出</span>
              <strong>{props.outputDirectory ? "自定义目录" : "源文件同目录"}</strong>
            </div>
            <div class="summary-row">
              <span>单任务触发</span>
              <strong>列表内单独开始</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
