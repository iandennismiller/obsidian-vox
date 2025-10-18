import { spawn } from "child_process";
import * as path from "path";
import { Logger } from "./log";

// @ts-ignore - ffmpeg-static is a CommonJS module
import ffmpegPath from "ffmpeg-static";

/**
 * FFmpegTranscoder handles local audio transcoding using ffmpeg-static
 * This eliminates the need for server-side audio conversion.
 * 
 * Uses the native ffmpeg binary bundled with ffmpeg-static, which works
 * reliably in Electron/Obsidian environments.
 */
export class FFmpegTranscoder {
  private logger: Logger;
  private ffmpegBinary: string;

  constructor(logger: Logger) {
    this.logger = logger;
    // ffmpeg-static provides the path to the bundled ffmpeg binary
    this.ffmpegBinary = ffmpegPath || "ffmpeg";
  }

  /**
   * Convert audio from one format to another using ffmpeg-static
   * @param inputBuffer - The input audio file as ArrayBuffer
   * @param inputFilename - The name of the input file (with extension)
   * @param outputExtension - The desired output extension (e.g., "wav", "mp3")
   * @returns The converted audio as ArrayBuffer
   */
  async convertAudio(
    inputBuffer: ArrayBuffer,
    inputFilename: string,
    outputExtension: string
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        // Configure conversion parameters based on output format
        let ffmpegArgs: string[];

        if (outputExtension === "wav") {
          // Convert to WAV format required by whisper.cpp
          // Use 16-bit PCM, 16kHz sample rate (whisper.cpp recommendation)
          ffmpegArgs = [
            "-i", "pipe:0",      // Read from stdin
            "-ar", "16000",      // Sample rate: 16kHz
            "-ac", "1",          // Mono audio
            "-c:a", "pcm_s16le", // 16-bit PCM
            "-f", "wav",         // Force WAV format
            "pipe:1"             // Write to stdout
          ];
        } else if (outputExtension === "mp3") {
          // Convert to MP3
          ffmpegArgs = [
            "-i", "pipe:0",
            "-codec:a", "libmp3lame",
            "-qscale:a", "2",
            "-f", "mp3",
            "pipe:1"
          ];
        } else {
          // Generic conversion for other formats
          ffmpegArgs = [
            "-i", "pipe:0",
            "-f", outputExtension,
            "pipe:1"
          ];
        }

        this.logger.log(`Converting ${inputFilename} to ${outputExtension} format using ffmpeg-static`);

        // Spawn ffmpeg process
        const ffmpeg = spawn(this.ffmpegBinary, ffmpegArgs, {
          stdio: ["pipe", "pipe", "pipe"]
        });

        const outputChunks: Buffer[] = [];
        const errorChunks: Buffer[] = [];

        // Collect output data
        ffmpeg.stdout.on("data", (chunk: Buffer) => {
          outputChunks.push(chunk);
        });

        // Collect error output for debugging
        ffmpeg.stderr.on("data", (chunk: Buffer) => {
          errorChunks.push(chunk);
        });

        // Handle process completion
        ffmpeg.on("close", (code: number) => {
          if (code === 0) {
            const outputBuffer = Buffer.concat(outputChunks);
            this.logger.log(`Successfully converted audio to ${outputExtension} (${outputBuffer.length} bytes)`);
            resolve(outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength));
          } else {
            const errorMessage = Buffer.concat(errorChunks).toString();
            this.logger.log(`FFmpeg conversion failed with code ${code}: ${errorMessage}`);
            reject(new Error(`FFmpeg conversion failed with code ${code}`));
          }
        });

        // Handle process errors
        ffmpeg.on("error", (error: Error) => {
          this.logger.log(`FFmpeg process error: ${error.message}`);
          reject(new Error(`FFmpeg process error: ${error.message}`));
        });

        // Write input data to stdin
        const inputBuffer8 = new Uint8Array(inputBuffer);
        ffmpeg.stdin.write(Buffer.from(inputBuffer8));
        ffmpeg.stdin.end();

      } catch (error) {
        this.logger.log(`Audio conversion failed: ${error instanceof Error ? error.message : String(error)}`);
        reject(new Error(`Audio conversion failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Check if ffmpeg is available
   */
  isAvailable(): boolean {
    return !!this.ffmpegBinary;
  }
}
