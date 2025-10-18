import axios from "axios";
import { Notice, Vault } from "obsidian";
import path from "path";
import { Settings } from "settings";
import { FileDetail } from "types";
import { extractFileDetail, getFileCreationDateTime } from "utils/format";
import { Logger } from "utils/log";
import {
  CACHE_DIRECTORY,
  CATEGORY_REGEX_LEGACY,
  FILENAME_DATE_FORMAT,
  OBSIDIAN_API_KEY_HEADER_KEY,
  OBSIDIAN_VAULT_ID_HEADER_KEY,
  PUBLIC_API_ENDPOINT,
  generateCategoryRegex,
} from "../constants";

export class AudioProcessor {
  constructor(
    private readonly appId: string,
    private readonly vault: Vault,
    private settings: Settings,
    private readonly logger: Logger
  ) {}

  /**
   * Converts a voice note to WAV format for whisper.cpp transcription, and generates a filesystem
   * friendly filename, prefixed with the recorded date and time.
   *
   * @note
   * We hash the incoming audio file to keep track of where it has been transcribed;
   * ensuring that with filename changes, we can still determine its status.
   * 
   * @note
   * Whisper.cpp requires WAV format. All audio files are converted to WAV for transcription,
   * then converted to the final output format based on user settings.
   */
  public async transformAudio(audioFile: FileDetail): Promise<FileDetail> {
    // Is this actually an audio file?
    const validInputExtensions = [".wav", ".mp3", ".m4a", ".aac", ".ogg"];
    const desiredExtension = `.${this.settings.audioOutputExtension}`;

    if (!audioFile.extension || !validInputExtensions.includes(audioFile.extension)) {
      throw new Error("Error: Not an audio file or unacceptable format");
    }

    // Move file into the processing directory.
    const outputName = await this.cleanAudioFilename(audioFile);
    const outputFilename = `${outputName}${desiredExtension}`;
    const outputCachedFileDetail = extractFileDetail(path.join(CACHE_DIRECTORY, outputFilename));

    let audioBinary = await this.vault.adapter.readBinary(audioFile.filepath);
    let currentExtension = audioFile.extension;

    // All non-WAV files must be converted to WAV for whisper.cpp compatibility
    if (audioFile.extension !== ".wav") {
      this.logger.log(`Converting ${audioFile.extension} file to WAV for transcription: "${audioFile.filename}"`);
      
      const host = this.settings.isSelfHosted ? this.settings.selfHostedEndpoint : PUBLIC_API_ENDPOINT;
      const url = `${host}/convert/audio`;

      const audioBlob = new Blob([audioBinary], { type: `audio/${audioFile.extension.replace(".", "")}` });
      const audioBlobFile = new File([audioBlob], audioFile.filename, {
        type: `audio/${audioFile.extension.replace(".", "")}`,
      });

      const response = await axios.postForm<Buffer>(
        url,
        {
          format: "wav",
          audio_file: audioBlobFile,
        },
        {
          headers: {
            "Content-Type": "multipart/form-data",
            [OBSIDIAN_VAULT_ID_HEADER_KEY]: this.appId,
            [OBSIDIAN_API_KEY_HEADER_KEY]: this.settings.apiKey,
          },
          responseType: "arraybuffer",
        }
      );

      if (!response.data || response.status !== 200) {
        const error = `There was an error converting ${audioFile.extension} to WAV. Please ensure your transcription service supports audio conversion.`;
        new Notice(error);
        throw new Error(error);
      }

      audioBinary = response.data;
      currentExtension = ".wav";
    }

    // Convert the file to the final output extension if needed
    const shouldConvertFile = currentExtension !== desiredExtension;

    if (shouldConvertFile) {
      this.logger.log(`Converting audio file to ${desiredExtension}: "${audioFile.filename}"`);

      const host = this.settings.isSelfHosted ? this.settings.selfHostedEndpoint : PUBLIC_API_ENDPOINT;
      const url = `${host}/convert/audio`;
      const mimetype = `audio/${this.settings.audioOutputExtension}`;

      const audioBlob = new Blob([audioBinary], { type: `audio/${currentExtension.replace(".", "")}` });
      const audioBlobFile = new File([audioBlob], audioFile.filename, {
        type: mimetype,
      });

      const response = await axios.postForm<Buffer>(
        url,
        {
          format: this.settings.audioOutputExtension,
          audio_file: audioBlobFile,
        },
        {
          headers: {
            "Content-Type": "multipart/form-data",
            [OBSIDIAN_VAULT_ID_HEADER_KEY]: this.appId,
            [OBSIDIAN_API_KEY_HEADER_KEY]: this.settings.apiKey,
          },
          responseType: "arraybuffer",
        }
      );

      if (!response.data || response.status !== 200) {
        const error = "There was an error converting audio during transcription.";

        new Notice(error);
        throw new Error(error);
      }

      await this.vault.adapter.mkdir(outputCachedFileDetail.directory);
      await this.vault.adapter.writeBinary(outputCachedFileDetail.filepath, response.data);
    } else {
      await this.vault.adapter.mkdir(outputCachedFileDetail.directory);
      await this.vault.adapter.writeBinary(outputCachedFileDetail.filepath, audioBinary);
    }

    return outputCachedFileDetail;
  }

  /**
   * Formats an audio file name to a standardized format.
   * @example "AAAA i caught a BIG fish.m4a" -> "20210715-02:02-i-caught-a-big-fish.m4a"
   */
  private cleanAudioFilename = async (file: FileDetail) => {
    const fileBirthTime = await getFileCreationDateTime(file, this.vault.adapter);

    const datetimePrefix = fileBirthTime.toFormat(FILENAME_DATE_FORMAT);

    const categoryRegex = generateCategoryRegex(this.settings);

    // The order here is important; do not re-order.
    const cleanFilename = file.name
      .replace(categoryRegex, "")
      .replace(CATEGORY_REGEX_LEGACY, "")
      .replace(/[\s,]/g, "-")
      .replace(/[-]{3}/gm, "-")
      .trim()
      .toLowerCase();

    return `${datetimePrefix}-${cleanFilename}`;
  };
}
