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
  generateCategoryRegex,
} from "../constants";
import { LocalAudioConverter } from "./LocalAudioConverter";

export class AudioProcessor {
  private localConverter: LocalAudioConverter;

  constructor(
    private readonly appId: string,
    private readonly vault: Vault,
    private settings: Settings,
    private readonly logger: Logger
  ) {
    this.localConverter = new LocalAudioConverter(logger);
  }

  /**
   * Converts a voice note to WAV format for whisper.cpp transcription,
   * and generates a filesystem friendly filename, prefixed with the recorded date and time.
   *
   * @note
   * We hash the incoming audio file to keep track of where it has been transcribed;
   * ensuring that with filename changes, we can still determine its status.
   * 
   * Audio conversion is now handled locally using WASM decoders for privacy and performance.
   */
  public async transformAudio(audioFile: FileDetail): Promise<FileDetail> {
    // Is this actually an audio file?
    const validInputExtensions = [".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac"];
    
    // For whisper.cpp, we always need WAV format
    const desiredExtension = ".wav";

    if (!audioFile.extension || !validInputExtensions.includes(audioFile.extension)) {
      throw new Error("Error: Not an audio file or unacceptable format");
    }

    // Move file into the processing directory.
    const outputName = await this.cleanAudioFilename(audioFile);
    const outputFilename = `${outputName}${desiredExtension}`;
    const outputCachedFileDetail = extractFileDetail(path.join(CACHE_DIRECTORY, outputFilename));

    // Check if already processed
    const exists = await this.vault.exists(outputCachedFileDetail.filepath);
    if (exists) {
      this.logger.log(`Using cached converted audio file: "${outputFilename}"`);
      return outputCachedFileDetail;
    }

    const audioBinary = await this.vault.adapter.readBinary(audioFile.filepath);

    // Convert the file to WAV format using local WASM decoders
    const shouldConvertFile = audioFile.extension !== desiredExtension;

    if (shouldConvertFile) {
      this.logger.log(`Converting audio file locally: "${audioFile.filename}" to WAV`);

      try {
        const convertedAudio = await this.localConverter.convertToWav(audioBinary, audioFile.extension);

        await this.vault.adapter.mkdir(outputCachedFileDetail.directory);
        await this.vault.adapter.writeBinary(outputCachedFileDetail.filepath, convertedAudio);
        
        this.logger.log(`Successfully converted "${audioFile.filename}" to WAV`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const userError = `Failed to convert audio file: ${errorMsg}`;
        
        this.logger.log(userError);
        new Notice(userError);
        throw new Error(userError);
      }
    } else {
      // Already WAV, just copy it
      await this.vault.adapter.mkdir(outputCachedFileDetail.directory);
      await this.vault.adapter.copy(audioFile.filepath, outputCachedFileDetail.filepath);
      this.logger.log(`Audio already in WAV format, copied to cache`);
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
