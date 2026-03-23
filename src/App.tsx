import { Match, Switch } from "solid-js";
import "./App.css";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { TasksView } from "./components/TasksView";
import { useThemeMode } from "./hooks/useThemeMode";
import { useTranscodeQueue } from "./hooks/useTranscodeQueue";

function App() {
  const queue = useTranscodeQueue();
  const theme = useThemeMode();

  return (
    <main class="app-frame text-slate-50">
      <div class="app-shell grid h-full w-full min-h-0 grid-cols-[92px_minmax(0,1fr)] gap-4 max-[720px]:grid-cols-1">
        <Sidebar
          onCycleThemeMode={theme.cycleThemeMode}
          section={queue.sidebarSection()}
          onSelectSection={queue.setSidebarSection}
          themeMode={theme.themeMode()}
        />

        <div class="app-content-scroll">
          <Switch>
            <Match when={queue.sidebarSection() === "tasks"}>
              <TasksView
                activeJobs={queue.activeJobs()}
                allVisibleSelected={queue.allVisibleSelected()}
                canStartAll={queue.canStartAll()}
                canDeleteSelected={queue.canDeleteSelected()}
                canStartSelected={queue.canStartSelected()}
                completedJobs={queue.completedJobs()}
                onChangeContainer={queue.updateJobContainer}
                onDeleteJob={queue.deleteJob}
                onDeleteSelectedJobs={() =>
                  queue.deleteJobs(queue.selectedTaskIds())
                }
                onPickFiles={queue.handlePickFiles}
                onRevealJob={queue.handleRevealJob}
                onStartAllJobs={queue.startAllJobs}
                onStartJob={queue.startJob}
                onStartSelectedJobs={queue.startSelectedJobs}
                onToggleAllVisibleSelection={queue.toggleAllVisibleSelection}
                onToggleTaskSelection={queue.toggleTaskSelection}
                selectedCount={queue.selectedCount()}
                selectedHasRunning={queue.selectedHasRunning()}
                selectedTaskIds={queue.selectedTaskIds()}
                setTaskTab={queue.setTaskTab}
                someVisibleSelected={queue.someVisibleSelected()}
                taskTab={queue.taskTab()}
              />
            </Match>

            <Match when={queue.sidebarSection() === "settings"}>
              <div class="view-scroll">
                <SettingsView
                  acceleration={queue.acceleration()}
                  audioMode={queue.audioMode()}
                  commandPreview={queue.commandPreview()}
                  container={queue.container()}
                  maxConcurrentTasks={queue.maxConcurrentTasks()}
                  onPickOutputDirectory={queue.handlePickOutputDirectory}
                  onResetOutputDirectory={queue.resetOutputDirectory}
                  outputDirectory={queue.outputDirectory()}
                  preset={queue.preset()}
                  setAcceleration={queue.setAcceleration}
                  setAudioMode={queue.setAudioMode}
                  setContainer={queue.setContainer}
                  setMaxConcurrentTasks={queue.setMaxConcurrentTasks}
                  setPreset={queue.setPreset}
                />
              </div>
            </Match>
          </Switch>
        </div>
      </div>
    </main>
  );
}

export default App;
