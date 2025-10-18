import createModule from "@transcribe/shout";
import { FileTranscriber } from "@transcribe/transcriber";
import { Notice } from "obsidian";
import { FileDetail, TranscriptionResponse } from "types";
import { Logger } from "utils/log";

/**
 * Local whisper.cpp transcription using WASM.
 * This runs entirely in the browser without sending data to any server.
 */
export class LocalWhisperTranscriber {
  private transcriber: FileTranscriber | null = null;
  private isInitialized = false;

  constructor(
    private modelPath: string,
    private logger: Logger,
  ) {}

  /**
   * Check if the transcriber is initialized and ready to use.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Initialize the WASM transcriber.
   * This needs to be called before transcribing.
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.modelPath) {
      throw new Error("Model path is required for local transcription");
    }

    try {
      this.logger.log("Initializing local whisper.cpp transcriber...");

      // Check if model file is accessible
      // In Obsidian/Electron, we need to handle file paths carefully
      let modelData: File | string = this.modelPath;

      // Try to fetch the model if it's a file:// URL or absolute path
      if (this.modelPath.startsWith("file://") || this.modelPath.startsWith("/")) {
        try {
          // For electron, we can use fetch with file:// protocol
          const modelUrl = this.modelPath.startsWith("file://") ? this.modelPath : `file://${this.modelPath}`;
          const response = await fetch(modelUrl);
          if (!response.ok) {
            throw new Error(`Failed to load model: ${response.statusText}`);
          }
          const blob = await response.blob();
          modelData = new File([blob], "model.bin", { type: "application/octet-stream" });
        } catch (error) {
          console.warn("Could not fetch model file, will try using path directly:", error);
          // Fall back to using the path directly
          modelData = this.modelPath;
        }
      }

      this.transcriber = new FileTranscriber({
        createModule,
        model: modelData,
        print: (message: string) => {
          console.debug("[Whisper WASM]", message);
        },
        printErr: (message: string) => {
          console.error("[Whisper WASM Error]", message);
        },
        onReady: () => {
          this.logger.log("Local whisper.cpp transcriber ready");
        },
        onProgress: (progress: number) => {
          console.debug(`[Whisper WASM] Progress: ${progress}%`);
        },
      });

      await this.transcriber.init();
      this.isInitialized = true;

      new Notice("Local whisper.cpp transcriber initialized successfully");
      this.logger.log("Local whisper.cpp transcriber initialized successfully");
    } catch (error) {
      this.isInitialized = false;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.log(`Failed to initialize local transcriber: ${errorMsg}`);
      console.error("[LocalWhisperTranscriber] Initialization failed:", error);
      throw new Error(`Failed to initialize local transcriber: ${errorMsg}`);
    }
  }

  /**
   * Transcribe an audio file using the local WASM transcriber.
   */
  async transcribe(audioFile: FileDetail, audioData: ArrayBuffer): Promise<TranscriptionResponse> {
    if (!this.isInitialized || !this.transcriber) {
      throw new Error("Transcriber not initialized. Call init() first.");
    }

    try {
      console.debug(`[LocalWhisperTranscriber] Starting transcription for: ${audioFile.filename}`);

      // Convert ArrayBuffer to File object for the transcriber
      const blob = new Blob([audioData], { type: `audio/${audioFile.extension.replace(".", "")}` });
      const file = new File([blob], audioFile.filename, { type: blob.type });

      // Transcribe using the FileTranscriber
      const result = await this.transcriber.transcribe(file);

      console.debug(`[LocalWhisperTranscriber] Transcription complete`);
      console.debug(`[LocalWhisperTranscriber] Language: ${result.result.language}`);
      console.debug(`[LocalWhisperTranscriber] Segments: ${result.transcription.length}`);

      // Convert the transcribe.js result format to our TranscriptionResponse format
      const transcriptionResponse: TranscriptionResponse = {
        text: result.transcription.map((seg) => seg.text).join(""),
        language: result.result.language,
        segments: result.transcription.map((seg, index) => ({
          id: index,
          start: seg.offsets.from / 1000, // Convert ms to seconds
          end: seg.offsets.to / 1000,
          text: seg.text,
          tokens: seg.tokens.map((t) => t.id),
          temperature: 0,
          avg_logprob: seg.tokens.reduce((sum, t) => sum + Math.log(t.p), 0) / seg.tokens.length,
          no_speech_prob: 0,
          words: seg.tokens.map((t) => ({
            word: t.text,
            start: (t.offsets?.from ?? 0) / 1000,
            end: (t.offsets?.to ?? 0) / 1000,
            t_dtw: t.dtw?.offset ?? 0,
            probability: t.p,
          })),
        })),
      };

      return transcriptionResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[LocalWhisperTranscriber] Transcription failed:", error);
      throw new Error(`Local transcription failed: ${errorMsg}`);
    }
  }

  /**
   * Clean up resources when done.
   */
  async cleanup(): Promise<void> {
    // The FileTranscriber doesn't provide a cleanup method in the current version
    // but we should reset our state
    this.transcriber = null;
    this.isInitialized = false;
  }
}
