import AudioRecorder from "AudioRecorder";
import TemplaterPlugin from "main";
import { PluginSettingTab, Setting, TextComponent, getIcon } from "obsidian";
import { AudioOutputExtension } from "types";
import { VALID_HOST_REGEX } from "../constants";
import { FolderSuggest } from "./suggesters/FolderSuggester";

const TAG_SETTINGS_CLASS = "st-tag-setting";
const CATEGORIZATION_SETTINGS_CLASS = "st-cate-setting";
const SELF_HOSTING_CLASS = "self-host-setting";
const HIDDEN_CLASS = "st-hidden";

export interface Settings {
  apiKey: string;

  isSelfHosted: boolean;
  selfHostedEndpoint: string;

  recordingDeviceId: string | null;

  watchDirectory: string;
  outputDirectory: string;

  audioOutputExtension: AudioOutputExtension;
  shouldDeleteOriginal: boolean;

  shouldCommitChanges: boolean;
  commitMessageTemplate: string;

  /** Map filename prefixes to certain categoriess */
  shouldUseCategoryMaps: boolean;
  categoryMap: Record<string, string>;

  shouldExtractTags: boolean;
  /** Custom tags to match */
  tags: Array<string>;
  tagLimit: number;
  // tagSource: TagMatchSource;

  // Whisper.cpp specific settings
  temperature: string;
  temperatureInc: string;

  // Retry settings
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;

  // File watching debounce settings
  fileStabilityDelayMs: number;
  fileStabilityCheckIntervalMs: number;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",

  isSelfHosted: false,
  selfHostedEndpoint: "",

  recordingDeviceId: null,

  audioOutputExtension: AudioOutputExtension.WAV, // Fixed to WAV for whisper.cpp
  outputDirectory: "Voice",
  watchDirectory: "Voice/unprocessed",
  commitMessageTemplate: "🤖 {datetime} Transcribed {amount} File(s)",

  shouldDeleteOriginal: false,
  shouldUseCategoryMaps: false,
  shouldCommitChanges: true,
  shouldExtractTags: true,

  tags: [],
  tagLimit: 5,
  // tagSource: TagMatchSource.VAULT,

  categoryMap: {
    LN: "Life Note",
    IN: "Insight",
    DR: "Dream",
    RM: "Ramble",
  },

  // Whisper.cpp defaults
  temperature: "0.0",
  temperatureInc: "0.2",

  // Retry defaults
  maxRetries: 3,
  retryBaseDelayMs: 5000, // 5 seconds
  retryMaxDelayMs: 300000, // 5 minutes

  // File watching debounce defaults
  fileStabilityDelayMs: 3000, // 3 seconds - wait time after last file size change
  fileStabilityCheckIntervalMs: 1000, // 1 second - how often to check file size
};

export class VoxSettingTab extends PluginSettingTab {
  constructor(private plugin: TemplaterPlugin) {
    super(app, plugin);
  }

  async display(): Promise<void> {
    this.containerEl.empty();

    this.addCategoryHeading("Recording Settings");
    await this.addRecordingDevice();

    this.addCategoryHeading("Transcription Settings");

    this.addWatchDirectory();
    this.addTranscriptionsDirectory();

    this.addAudioExtension();
    this.addDeleteOriginalFile();

    // Ready for Version 2
    // this.addShouldCommitGit();

    this.addTags();
    this.addCategorisation();

    this.addCategoryHeading("Whisper Settings");
    this.addWhisperSettings();

    this.addCategoryHeading("File Watching Settings");
    this.addFileWatchingSettings();

    this.addSelfHostToggle();
  }

  addCategoryHeading(category: string, margin = false): void {
    const headingEl = this.containerEl.createEl("h2", { text: category });

    if (margin) {
      headingEl.style.marginTop = "1.5rem";
    }
  }

  async addRecordingDevice() {
    const recorder = new AudioRecorder();
    const devices = await recorder.getInputDevices();
    const existing = devices.find((device) => device.deviceId === this.plugin.settings.recordingDeviceId);

    const setting = new Setting(this.containerEl)
      .setName("Recording Device")
      .setDesc("Set your default recording device.")
      .addDropdown((cb) => {
        devices.map((device) => {
          cb.addOption(device.deviceId, device.label);
        });

        cb.setValue(existing?.deviceId ?? "default");
        cb.onChange((deviceId: string) => {
          this.plugin.settings.recordingDeviceId = deviceId;
          this.plugin.saveSettings();
        });
      });

    const settingItems = Array.from(setting.controlEl.children) as HTMLElement[];
    settingItems.forEach((item) => (item.style.maxWidth = "200px"));

    console.log("index ➡️ setting.controlEl.children:", setting.controlEl.children);
  }

  addWatchDirectory(): void {
    new Setting(this.containerEl)
      .setName("Watch Location")
      .setDesc(
        "The plugin will watch this location for voice-memos to process and automatically trascribe any new audio files.",
      )
      .addSearch((cb) => {
        new FolderSuggest(cb.inputEl);
        cb.setPlaceholder("Example: folder1/folder2")
          .setValue(this.plugin.settings.watchDirectory)
          .onChange((newFolder) => {
            this.plugin.settings.watchDirectory = newFolder;
            this.plugin.saveSettings();
          });
      });
  }

  addTranscriptionsDirectory(): void {
    new Setting(this.containerEl)
      .setName("Transcriptions Output Location")
      .setDesc("Your completed transcriptions will be placed in this folder")
      .addSearch((cb) => {
        new FolderSuggest(cb.inputEl);
        cb.setPlaceholder("Example: folder1/folder2")
          .setValue(this.plugin.settings.outputDirectory)
          .onChange((newFolder) => {
            this.plugin.settings.outputDirectory = newFolder;
            this.plugin.saveSettings();
          });
      });
  }

  addAudioExtension(): void {
    const description = document.createDocumentFragment();
    description.append(
      "Audio files are automatically converted to WAV format for whisper.cpp transcription.",
      description.createEl("br"),
      "The WAV format is required by the whisper.cpp server and ensures optimal transcription quality."
    );

    new Setting(this.containerEl)
      .setName("Audio Output Format")
      .setDesc(description)
      .addDropdown((cb) => {
        cb.addOption(AudioOutputExtension.WAV, AudioOutputExtension.WAV.toUpperCase());
        cb.setValue(AudioOutputExtension.WAV);
        cb.setDisabled(true); // WAV is required for whisper.cpp
      });
  }

  addDeleteOriginalFile(): void {
    const description = document.createDocumentFragment();
    description.append(
      "When enabled, remove the original file from the watch directory.",
      description.createEl("br"),
      "Note - the audio file will always be copied into the processed directory and linked to your markdown automatically.",
    );

    new Setting(this.containerEl)
      .setName("Remove Original Audio File")
      .setDesc(description)
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.shouldDeleteOriginal);
        cb.onChange((shouldDelete) => {
          this.plugin.settings.shouldDeleteOriginal = shouldDelete;
          this.plugin.saveSettings();
        });
      });
  }

  toggleSettingsVisibility(className: string, on: boolean) {
    const items = document.getElementsByClassName(className);

    Array.from(items).forEach((item) => {
      item[on ? "removeClass" : "addClass"](HIDDEN_CLASS);
    });
  }

  addTags(): void {
    this.addCategoryHeading("Tag Extraction", true);

    new Setting(this.containerEl)
      .setName("Enable Tag Extraction")
      .setDesc("Intelligently pull out tags from your transcript which match those in your vault.")
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.shouldExtractTags);
        cb.onChange((value) => {
          this.plugin.settings.shouldExtractTags = value;
          this.plugin.saveSettings();

          // Should we display further tag settings?
          this.toggleSettingsVisibility(TAG_SETTINGS_CLASS, value);
        });
      });

    (this.addTagLimit(), this.addTagsList());
    this.toggleSettingsVisibility(TAG_SETTINGS_CLASS, this.plugin.settings.shouldExtractTags);
  }

  addTagLimit(): Setting {
    return new Setting(this.containerEl)
      .setName("Tag Limit")
      .setClass(TAG_SETTINGS_CLASS)
      .setDesc("Limit the number of generated tags in the output file")
      .addText((cb) => {
        const tagAmountLimit = 100;

        cb.inputEl.setAttrs({
          type: "number",
          max: tagAmountLimit,
          min: 0,
          step: 1,
        });

        cb.setValue(this.plugin.settings.tagLimit.toString());
        cb.onChange((value) => {
          const newTagLimit = Math.ceil(Number(value));

          if (isNaN(newTagLimit)) {
            return;
          }

          if (newTagLimit < 0) {
            this.plugin.settings.tagLimit = 0;
            this.plugin.saveSettings();
            return;
          }

          if (newTagLimit > tagAmountLimit) {
            this.plugin.settings.tagLimit = tagAmountLimit;
            this.plugin.saveSettings();
            return;
          }

          this.plugin.settings.tagLimit = Number(newTagLimit);
          this.plugin.saveSettings();
        });
      });
  }

  addTagsList(): Setting {
    return new Setting(this.containerEl)
      .setName("Custom Tags")
      .setClass(TAG_SETTINGS_CLASS)
      .setDesc(
        "Transcripts which include references to these tags will inclue them in the generated markdown file. Separate tags with commas.",
      )
      .addTextArea((cb) => {
        cb.inputEl.style.minWidth = "4rem";
        cb.inputEl.style.maxWidth = "20rem";
        cb.inputEl.rows = 3;

        cb.setPlaceholder("#dream, #philosophy, #relationships");
        cb.setValue(this.plugin.settings.tags.join(", "));

        // Validate format before we let them save

        const hasError = false;
        if (hasError) {
          cb.inputEl.style.borderColor = "red";
        }

        cb.onChange((value) => {
          this.plugin.settings.tags = value.split(", ");

          // if ("false" == 0) {
          //   hasError = true;
          // }
        });
      });
  }

  addCategorisation() {
    this.addCategoryHeading("Filename Categorisation", true);

    new Setting(this.containerEl)
      .setName("Enable Filename Categorisation")
      .setDesc(
        "Categorise your transcriptions depending on the audio's filename prefix. Please see the plugin homepage for more information.",
      )
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.shouldUseCategoryMaps);
        cb.onChange((shouldEnable) => {
          this.plugin.settings.shouldUseCategoryMaps = shouldEnable;
          this.plugin.saveSettings();

          // Should we display further category map settings?
          this.toggleSettingsVisibility(CATEGORIZATION_SETTINGS_CLASS, shouldEnable);
        });
      });

    this.addCategoryMapExample();
    this.addCategoryMap();

    this.toggleSettingsVisibility(CATEGORIZATION_SETTINGS_CLASS, this.plugin.settings.shouldUseCategoryMaps);
  }

  addCategoryMapExample() {
    // Add an example for the filename mapping
    const exampleContainerEl = createEl("div", {
      cls: [CATEGORIZATION_SETTINGS_CLASS, "st-cate-example"],
    });

    const exampleTextEl = exampleContainerEl.createEl("p", {
      text: "For example, when we map LN to 'Life Note', the filename",
    });

    exampleTextEl.createEl("code", {
      text: "R3LN My Day At the Zoo.mp3",
      cls: "st-inline-code",
    });

    exampleTextEl.append("would produce the following frontmatter:");

    const blockCodeEl = exampleContainerEl.createEl("div", {
      cls: "st-block-code",
    });

    blockCodeEl.createEl("code", { text: "rating: 3" });
    blockCodeEl.createEl("code", { text: "transcription_category: Life Note" });

    this.containerEl.append(exampleContainerEl);
  }

  addCategoryMapRow(categoryKey: string, categoryValue: string, index: number) {
    let rowSettingTextComponent: TextComponent | undefined;

    const editButtonID = `st-cate-row-edit-${index}`;
    const checkButtonID = `st-cate-check-edit-${index}`;
    const crossButtonID = `st-cate-cross-edit-${index}`;
    const trashButtonID = `st-cate-trash-edit-${index}`;

    const enterEditingMode = () => {
      // Enter editing mode for the row
      document.getElementById(editButtonID)?.addClass(HIDDEN_CLASS);
      document.getElementById(trashButtonID)?.addClass(HIDDEN_CLASS);
      document.getElementById(checkButtonID)?.removeClass(HIDDEN_CLASS);
      document.getElementById(crossButtonID)?.removeClass(HIDDEN_CLASS);

      if (rowSettingTextComponent) {
        rowSettingTextComponent.inputEl.style.pointerEvents = "unset";
        rowSettingTextComponent.setDisabled(false);
        rowSettingTextComponent.inputEl.focus();
      }
    };

    const exitEditingMode = () => {
      document.getElementById(checkButtonID)?.addClass(HIDDEN_CLASS);
      document.getElementById(crossButtonID)?.addClass(HIDDEN_CLASS);
      document.getElementById(editButtonID)?.removeClass(HIDDEN_CLASS);
      document.getElementById(trashButtonID)?.removeClass(HIDDEN_CLASS);

      if (rowSettingTextComponent) {
        rowSettingTextComponent.inputEl.style.pointerEvents = "none";
        rowSettingTextComponent.setDisabled(true);
      }
    };

    const rowSetting = new Setting(this.containerEl).setClass(CATEGORIZATION_SETTINGS_CLASS).addText((cb) => {
      rowSettingTextComponent = cb;
      cb.setValue(categoryValue);
      cb.setDisabled(true);
      cb.inputEl.style.pointerEvents = "none";

      cb.onChange((value) => {
        if (value !== categoryValue) {
          null;
        }
      });
    });

    // Clicking on thie EDIT icon enters editing mode
    rowSetting.addExtraButton((cb) => {
      cb.extraSettingsEl.addClass("st-cate-row-check");
      cb.extraSettingsEl.id = editButtonID;
      cb.setIcon("edit");
      cb.onClick(enterEditingMode);
    });

    // Clicking on this CHECK icon confirms the edit.
    rowSetting.addExtraButton((cb) => {
      cb.extraSettingsEl.addClasses([HIDDEN_CLASS, "st-cate-row-check"]);
      cb.extraSettingsEl.id = checkButtonID;
      cb.setIcon("check");

      cb.onClick(() => {
        const value = rowSettingTextComponent?.inputEl.value;
        if (value?.length && value !== categoryValue) {
          this.plugin.settings.categoryMap[categoryKey] = value;
          this.plugin.saveSettings();
        }

        exitEditingMode();
      });
    });

    // Clicking on this CROSS icon cancels the edit.
    rowSetting.addExtraButton((cb) => {
      cb.extraSettingsEl.addClasses([HIDDEN_CLASS, "st-cate-row-check"]);
      cb.extraSettingsEl.id = crossButtonID;
      cb.setIcon("cross");

      cb.onClick(() => {
        if (rowSettingTextComponent) {
          const originalValue = this.plugin.settings.categoryMap[categoryKey];
          rowSettingTextComponent.inputEl.value = originalValue;
          exitEditingMode();
        }
      });
    });

    // Clicking on this TRASH icon removes the row
    rowSetting.addExtraButton((cb) => {
      cb.extraSettingsEl.addClass("st-cate-row-check");
      cb.extraSettingsEl.id = trashButtonID;

      cb.setIcon("trash");
      cb.onClick(() => {
        delete this.plugin.settings.categoryMap[categoryKey];
        this.plugin.saveSettings();
        this.display();
      });
    });

    if (index > 0) {
      rowSetting.settingEl.style.borderTop = "unset";
    }

    const keyElement = createEl("span", { text: categoryKey });
    const arrowIcon = getIcon("right-chevron-glyph");
    keyElement.style.fontFamily = "monospace";
    if (arrowIcon) {
      rowSetting.controlEl.prepend(keyElement, arrowIcon);
    }
  }

  addCategoryMap(): void {
    Object.entries(this.plugin.settings.categoryMap).forEach((entry, index) => {
      this.addCategoryMapRow(entry[0], entry[1], index);
    });

    let newMapItemInputKey: HTMLInputElement | undefined;
    let newMapItemInputValue: HTMLInputElement | undefined;

    const categoryMapSetting = new Setting(this.containerEl)
      .setClass(CATEGORIZATION_SETTINGS_CLASS)
      .addText((cb) => {
        newMapItemInputKey = cb.inputEl;

        cb.inputEl.style.maxWidth = "8rem";
        cb.setPlaceholder("Filename Prefix");
        cb.inputEl.type = "text";
      })
      .addText((cb) => {
        newMapItemInputValue = cb.inputEl;
        cb.setPlaceholder("Frontmatter Value");
      })
      .addButton((cb) => {
        cb.setButtonText("Add");
        cb.setCta();
        cb.buttonEl.style.minWidth = "61px";

        cb.onClick(() => {
          if (newMapItemInputKey && newMapItemInputValue) {
            this.plugin.settings.categoryMap[newMapItemInputKey.value] = newMapItemInputValue.value;

            newMapItemInputKey.value = "";
            newMapItemInputValue.value = "";
            this.plugin.saveSettings();
            this.display();
          }
        });
      });

    categoryMapSetting.settingEl.style.borderTop = "unset";
    categoryMapSetting.infoEl.remove();
    categoryMapSetting.descEl.remove();
    categoryMapSetting.nameEl.remove();

    const arrowIcon = getIcon("right-chevron-glyph");

    if (arrowIcon) {
      categoryMapSetting.controlEl.insertBefore(arrowIcon, categoryMapSetting.controlEl.children[1]);
    }

    categoryMapSetting.infoEl.remove();
  }

  addSelfHostToggle(): void {
    new Setting(this.containerEl).setName("Use Self-Hosted Backend").addToggle((cb) => {
      cb.setValue(this.plugin.settings.isSelfHosted);
      cb.onChange((selfHosted) => {
        this.plugin.settings.isSelfHosted = selfHosted;
        this.plugin.saveSettings();

        this.toggleSettingsVisibility(SELF_HOSTING_CLASS, selfHosted);
      });
    });

    this.addSelfHostLocation();

    this.toggleSettingsVisibility(SELF_HOSTING_CLASS, this.plugin.settings.isSelfHosted);
  }

  addWhisperSettings(): void {
    new Setting(this.containerEl)
      .setName("Temperature")
      .setDesc("Controls randomness in transcription. 0.0 is deterministic, higher values increase randomness.")
      .addText((cb) => {
        cb.inputEl.setAttrs({
          type: "number",
          min: "0.0",
          max: "1.0",
          step: "0.1",
        });
        cb.inputEl.style.maxWidth = "8rem";
        cb.setValue(this.plugin.settings.temperature);
        cb.onChange((value) => {
          this.plugin.settings.temperature = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(this.containerEl)
      .setName("Temperature Increment")
      .setDesc("Temperature increment for fallback when transcription fails. Used to retry with higher randomness.")
      .addText((cb) => {
        cb.inputEl.setAttrs({
          type: "number",
          min: "0.0",
          max: "1.0",
          step: "0.1",
        });
        cb.inputEl.style.maxWidth = "8rem";
        cb.setValue(this.plugin.settings.temperatureInc);
        cb.onChange((value) => {
          this.plugin.settings.temperatureInc = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(this.containerEl)
      .setName("Maximum Retry Attempts")
      .setDesc("Number of times to retry a failed transcription before giving up.")
      .addText((cb) => {
        cb.inputEl.setAttrs({
          type: "number",
          min: "0",
          max: "10",
          step: "1",
        });
        cb.inputEl.style.maxWidth = "8rem";
        cb.setValue(String(this.plugin.settings.maxRetries));
        cb.onChange((value) => {
          this.plugin.settings.maxRetries = parseInt(value) || 3;
          this.plugin.saveSettings();
        });
      });

    new Setting(this.containerEl)
      .setName("Retry Base Delay (ms)")
      .setDesc("Initial delay before first retry. Each retry doubles this delay (geometric backoff).")
      .addText((cb) => {
        cb.inputEl.setAttrs({
          type: "number",
          min: "1000",
          max: "60000",
          step: "1000",
        });
        cb.inputEl.style.maxWidth = "8rem";
        cb.setValue(String(this.plugin.settings.retryBaseDelayMs));
        cb.onChange((value) => {
          this.plugin.settings.retryBaseDelayMs = parseInt(value) || 5000;
          this.plugin.saveSettings();
        });
      });

    new Setting(this.containerEl)
      .setName("Retry Maximum Delay (ms)")
      .setDesc("Maximum delay between retries. Caps the geometric backoff.")
      .addText((cb) => {
        cb.inputEl.setAttrs({
          type: "number",
          min: "10000",
          max: "600000",
          step: "10000",
        });
        cb.inputEl.style.maxWidth = "8rem";
        cb.setValue(String(this.plugin.settings.retryMaxDelayMs));
        cb.onChange((value) => {
          this.plugin.settings.retryMaxDelayMs = parseInt(value) || 300000;
          this.plugin.saveSettings();
        });
      });
  }

  addFileWatchingSettings(): void {
    new Setting(this.containerEl)
      .setName("File Stability Delay (ms)")
      .setDesc("Wait this long after file size stops changing before processing. Ensures file is fully written.")
      .addText((cb) => {
        cb.inputEl.setAttrs({
          type: "number",
          min: "1000",
          max: "30000",
          step: "1000",
        });
        cb.inputEl.style.maxWidth = "8rem";
        cb.setValue(String(this.plugin.settings.fileStabilityDelayMs));
        cb.onChange((value) => {
          this.plugin.settings.fileStabilityDelayMs = parseInt(value) || 3000;
          this.plugin.saveSettings();
        });
      });

    new Setting(this.containerEl)
      .setName("File Stability Check Interval (ms)")
      .setDesc("How often to check if file size has changed. Lower values detect changes faster but use more resources.")
      .addText((cb) => {
        cb.inputEl.setAttrs({
          type: "number",
          min: "500",
          max: "5000",
          step: "500",
        });
        cb.inputEl.style.maxWidth = "8rem";
        cb.setValue(String(this.plugin.settings.fileStabilityCheckIntervalMs));
        cb.onChange((value) => {
          this.plugin.settings.fileStabilityCheckIntervalMs = parseInt(value) || 1000;
          this.plugin.saveSettings();
        });
      });
  }

  addSelfHostLocation(): void {
    const description = document.createDocumentFragment();
    description.append(
      "The location of your self-hosted back-end; supports IP addresses and hostnames.",
      description.createEl("br"),
      "Please remember to inclued your protocol; ",
      description.createEl("code", { text: "https://", cls: "st-inline-code" }),
      "or",
      description.createEl("code", { text: "https://", cls: "st-inline-code" }),
      " and port; ",
      description.createEl("code", { text: "1337", cls: "st-inline-code" }),
      ".",
    );

    const containerEl = this.containerEl.createEl("div", {
      cls: [SELF_HOSTING_CLASS],
    });

    new Setting(containerEl)
      .setName("Self Hosted Backend Location")
      .setDesc(description)
      .addText((cb) => {
        if (!this.plugin.settings.selfHostedEndpoint.match(VALID_HOST_REGEX)) {
          cb.inputEl.style.borderColor = "red";
        }

        cb.setPlaceholder("http://10.0.0.1:1337");
        cb.setValue(this.plugin.settings.selfHostedEndpoint);
        cb.onChange((newHost) => {
          if (newHost.match(VALID_HOST_REGEX)) {
            cb.inputEl.style.borderColor = "unset";

            this.plugin.settings.selfHostedEndpoint = newHost;
            this.plugin.saveSettings();
          } else {
            cb.inputEl.style.borderColor = "red";
          }
        });
      });
  }
}
