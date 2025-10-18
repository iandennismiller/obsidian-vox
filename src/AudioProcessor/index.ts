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
   * Converts a voice note to the desired extension, and generates a filesystem
   * friendly filename, prefixed with the recorded date and time.
   *
   * @note
   * We hash the incoming audio file to keep track of where it has been transcribed;
   * ensuring that with filename changes, we can still determine its status.
   * 
   * @note
   * M4A files are always converted to MP3 first to ensure compatibility with whisper.cpp,
   * then converted to the final output format if different from MP3.
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

    // M4A files must be converted to MP3 first for whisper.cpp compatibility
    if (audioFile.extension === ".m4a") {
      this.logger.log(`Converting M4A file to MP3: "${audioFile.filename}"`);
      
      const host = this.settings.isSelfHosted ? this.settings.selfHostedEndpoint : PUBLIC_API_ENDPOINT;
      const url = `${host}/convert/audio`;

      const audioBlob = new Blob([audioBinary], { type: "audio/m4a" });
      const audioBlobFile = new File([audioBlob], audioFile.filename, {
        type: "audio/m4a",
      });

      const response = await axios.postForm<Buffer>(
        url,
        {
          format: "mp3",
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
        const error = "There was an error converting M4A to MP3. Please ensure your transcription service supports audio conversion.";
        new Notice(error);
        throw new Error(error);
      }

      audioBinary = response.data;
      currentExtension = ".mp3";
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
