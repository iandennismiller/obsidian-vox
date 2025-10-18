import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { Logger } from "./log";

/**
 * FFmpegTranscoder handles local audio transcoding using ffmpeg.wasm
 * This eliminates the need for server-side audio conversion.
 */
export class FFmpegTranscoder {
  private ffmpeg: FFmpeg;
  private loaded = false;
  private logger: Logger;

  constructor(logger: Logger) {
    this.ffmpeg = new FFmpeg();
    this.logger = logger;
  }

  /**
   * Load the ffmpeg.wasm core and prepare for transcoding
   */
  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

      // Load ffmpeg core
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      this.loaded = true;
      this.logger.log("FFmpeg.wasm loaded successfully");
    } catch (error) {
      this.logger.log("Failed to load FFmpeg.wasm");
      throw new Error(`Failed to load FFmpeg.wasm: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert audio from one format to another
   * @param inputBuffer - The input audio file as ArrayBuffer
   * @param inputFilename - The name of the input file (with extension)
   * @param outputExtension - The desired output extension (e.g., "wav", "mp3")
   * @returns The converted audio as Uint8Array
   */
  async convertAudio(
    inputBuffer: ArrayBuffer,
    inputFilename: string,
    outputExtension: string
  ): Promise<Uint8Array> {
    if (!this.loaded) {
      await this.load();
    }

    const outputFilename = `output.${outputExtension}`;

    try {
      // Write input file to ffmpeg's virtual filesystem
      await this.ffmpeg.writeFile(inputFilename, await fetchFile(new Blob([inputBuffer])));

      // Configure conversion parameters based on output format
      let ffmpegArgs: string[];
      
      if (outputExtension === "wav") {
        // Convert to WAV format required by whisper.cpp
        // Use 16-bit PCM, 16kHz sample rate (whisper.cpp recommendation)
        ffmpegArgs = [
          "-i", inputFilename,
          "-ar", "16000",     // Sample rate: 16kHz
          "-ac", "1",         // Mono audio
          "-c:a", "pcm_s16le", // 16-bit PCM
          outputFilename
        ];
      } else if (outputExtension === "mp3") {
        // Convert to MP3
        ffmpegArgs = [
          "-i", inputFilename,
          "-codec:a", "libmp3lame",
          "-qscale:a", "2",
          outputFilename
        ];
      } else {
        // Generic conversion for other formats
        ffmpegArgs = [
          "-i", inputFilename,
          outputFilename
        ];
      }

      this.logger.log(`Converting ${inputFilename} to ${outputExtension} format`);

      // Execute conversion
      await this.ffmpeg.exec(ffmpegArgs);

      // Read the converted file
      const data = await this.ffmpeg.readFile(outputFilename);

      // Cleanup - remove files from virtual filesystem
      await this.ffmpeg.deleteFile(inputFilename);
      await this.ffmpeg.deleteFile(outputFilename);

      this.logger.log(`Successfully converted audio to ${outputExtension}`);

      return data as Uint8Array;
    } catch (error) {
      this.logger.log(`Audio conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if ffmpeg is loaded and ready
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Unload ffmpeg and free resources
   */
  async unload(): Promise<void> {
    if (this.loaded) {
      // FFmpeg.wasm doesn't have an explicit unload method
      // but we can reset the loaded flag
      this.loaded = false;
      this.logger.log("FFmpeg.wasm unloaded");
    }
  }
}
