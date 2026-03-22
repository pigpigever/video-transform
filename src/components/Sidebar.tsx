import * as ToggleGroup from "@kobalte/core/toggle-group";
import { For } from "solid-js";
import type { SidebarSection } from "../lib/transcode";
import type { ThemeMode } from "../hooks/useThemeMode";
import { AppButton } from "./AppButton";

interface SidebarProps {
  onCycleThemeMode: () => void;
  section: SidebarSection;
  onSelectSection: (section: SidebarSection) => void;
  themeMode: ThemeMode;
}

function TasksIcon() {
  return (
    <svg
      aria-hidden="true"
      class="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      class="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10.2 3.4a1 1 0 0 1 1.6 0l.92 1.2a1 1 0 0 0 1.06.36l1.47-.42a1 1 0 0 1 1.28.95l.06 1.5a1 1 0 0 0 .63.92l1.38.56a1 1 0 0 1 .49 1.52l-.82 1.26a1 1 0 0 0 0 1.1l.82 1.26a1 1 0 0 1-.49 1.52l-1.38.56a1 1 0 0 0-.63.92l-.06 1.5a1 1 0 0 1-1.28.95l-1.47-.42a1 1 0 0 0-1.06.36l-.92 1.2a1 1 0 0 1-1.6 0l-.92-1.2a1 1 0 0 0-1.06-.36l-1.47.42a1 1 0 0 1-1.28-.95l-.06-1.5a1 1 0 0 0-.63-.92l-1.38-.56a1 1 0 0 1-.49-1.52l.82-1.26a1 1 0 0 0 0-1.1L4.11 9.99a1 1 0 0 1 .49-1.52l1.38-.56a1 1 0 0 0 .63-.92l.06-1.5a1 1 0 0 1 1.28-.95l1.47.42a1 1 0 0 0 1.06-.36z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function LightThemeIcon() {
  return (
    <svg
      aria-hidden="true"
      class="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="M4.93 4.93l1.77 1.77" />
      <path d="M17.3 17.3l1.77 1.77" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="M4.93 19.07 6.7 17.3" />
      <path d="M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function DarkThemeIcon() {
  return (
    <svg
      aria-hidden="true"
      class="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function Sidebar(props: SidebarProps) {
  const sections = [
    { icon: TasksIcon, label: "任务", value: "tasks" },
    { icon: SettingsIcon, label: "设置", value: "settings" },
  ] as const;

  const themeModeLabel = () => (props.themeMode === "light" ? "浅色" : "深色");

  return (
    <aside class="app-sidebar panel flex flex-col gap-3 p-3">
      <div>
        <div class="sidebar-badge">TM</div>
        <ToggleGroup.Root
          class="sidebar-nav mt-6"
          orientation="vertical"
          value={props.section}
          onChange={(value) => {
            if (value === "tasks" || value === "settings") {
              props.onSelectSection(value);
            }
          }}
        >
          <For each={sections}>
            {(section) => (
              <ToggleGroup.Item class="sidebar-item" value={section.value}>
                <section.icon />
                <span>{section.label}</span>
              </ToggleGroup.Item>
            )}
          </For>
        </ToggleGroup.Root>
      </div>

      <AppButton
        variant="icon"
        title={`主题：${themeModeLabel()}，点击切换`}
        aria-label={`主题：${themeModeLabel()}，点击切换`}
        onClick={props.onCycleThemeMode}
      >
        {props.themeMode === "light" ? <LightThemeIcon /> : <DarkThemeIcon />}
      </AppButton>
    </aside>
  );
}
