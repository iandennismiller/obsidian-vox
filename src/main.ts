import AudioRecorder from "AudioRecorder";
import { Plugin, TAbstractFile, WorkspaceLeaf, debounce, Notice } from "obsidian";
import { DEFAULT_SETTINGS, Settings, VoxSettingTab } from "settings";
import { Logger } from "utils/log";
import { waitForFileStability } from "utils/fileStability";
import { VOX_RECORDER_VIEW, VoxRecorderViewRenderer } from "view/VoxRecorderViewRenderer";
import { VOX_STATUS_VIEW, VoxStatusViewRenderer } from "view/VoxStatusViewRenderer";
import { TranscriptionProcessor } from "./TranscriptionProcessor";

const WATCHER_DELAY_MS = 10_000;

export default class VoxPlugin extends Plugin {
  public settings: Settings;

  private processor: TranscriptionProcessor;
  private recorder: AudioRecorder;
  private logger: Logger;

  // The sidebar leaf UI to view the current status
  private leaf: WorkspaceLeaf | null = null;

  async onload(): Promise<void> {
    // If settings change quickly, we don't want to spam `queueUnprocessedFiles`; wait a few seconds before reseting our processor.
    this.queueUnprocessedFiles = debounce(this.queueUnprocessedFiles, WATCHER_DELAY_MS);

    await this.loadSettings();
    this.addSettingTab(new VoxSettingTab(this));

    this.logger = new Logger(this.manifest);
    this.processor = new TranscriptionProcessor(this.app, this.settings, this.logger, this);
    this.recorder = new AudioRecorder();

    // Give the app time to load in plugins and run its index check.
    this.app.workspace.onLayoutReady(() => {
      this.queueUnprocessedFiles();

      // Then watch for any changes...
      const queueFromWatcher = async (file: TAbstractFile) => {
        if (file.path.includes(this.settings.watchDirectory)) {
          try {
            // Wait for the file to be stable (non-zero size and not growing)
            await waitForFileStability(
              file.path,
              this.app.vault.adapter,
              this.settings.fileStabilityDelayMs,
              this.settings.fileStabilityCheckIntervalMs
            );

            const transcribedFilesInfo = await this.processor.getTranscribedFiles();
            const candidate = await this.processor.getTranscribedStatus(file.path, transcribedFilesInfo);

            if (!candidate.isTranscribed) {
              this.processor.queueFile(candidate);
            }
          } catch (error) {
            console.warn(`[VOX] File stability check failed for ${file.path}:`, error);
            // Don't queue the file if stability check failed
          }
        }
      };

      this.registerEvent(this.app.vault.on("create", queueFromWatcher));
      this.registerEvent(this.app.vault.on("rename", queueFromWatcher));
    });

    // Register the status view.
    this.registerView(VOX_STATUS_VIEW, (leaf) => new VoxStatusViewRenderer(leaf, this.processor));

    // Register the recorder view.
    this.registerView(
      VOX_RECORDER_VIEW,
      (leaf) => new VoxRecorderViewRenderer(leaf, this.processor, this.recorder, this)
    );

    this.addRibbonIcon("file-audio", "View VOX Status", () => this.activateView(VOX_STATUS_VIEW));
    this.addRibbonIcon("mic", "Record with VOX", () => this.activateView(VOX_RECORDER_VIEW));
  }

  async onunload(): Promise<void> {
    this.processor.stop();
  }

  async saveSettings(): Promise<void> {
    this.queueUnprocessedFiles();
    return this.saveData(this.settings);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async activateView(type: string) {
    const { workspace } = this.app;

    const leaves = workspace.getLeavesOfType(type);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      this.leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      this.leaf = workspace.getRightLeaf(false);

      await this.leaf.setViewState({ type, active: true });
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    workspace.revealLeaf(this.leaf);
  }

  private queueUnprocessedFiles() {
    // Reset the queue and re-collect files.
    this.processor.reset(this.settings);
    this.logger.log("Adding files to transcription queue.");

    // Queue a reasonable subset the files that have yet to be processed.
    this.processor.queueFiles();
  }
}
