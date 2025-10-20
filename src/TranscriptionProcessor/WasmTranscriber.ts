import createModule from "@transcribe/shout";
import { FileTranscriber } from "@transcribe/transcriber";
import { App } from "obsidian";
import { Settings } from "settings";
import { FileDetail, TranscriptionResponse, TranscriptionSegment } from "types";
import { Logger } from "utils/log";

/**
 * Handles WASM-based transcription using whisper.cpp compiled to WASM.
 * This allows for fully local, offline transcription without any network requests.
 */
export class WasmTranscriber {
  private transcriber: FileTranscriber | null = null;
  private isInitialized = false;

  constructor(
    private readonly app: App,
    private settings: Settings,
    private readonly logger: Logger,
  ) {}

  /**
   * Initialize the WASM transcriber with the specified model.
   * This must be called before transcription can begin.
   */
  async init(): Promise<void> {
    if (this.isInitialized && this.transcriber) {
      this.logger.log("WASM transcriber already initialized");
      return;
    }

    if (!this.settings.wasmModelPath) {
      throw new Error("WASM model path is not configured. Please set the model path in settings.");
    }

    // Check if model file exists
    const modelExists = await this.app.vault.adapter.exists(this.settings.wasmModelPath);
    if (!modelExists) {
      throw new Error(
        `WASM model file not found at: ${this.settings.wasmModelPath}. Please download a model file and update the path in settings.`,
      );
    }

    this.logger.log(`Initializing WASM transcriber with model: ${this.settings.wasmModelPath}`);

    try {
      this.transcriber = new FileTranscriber({
        createModule,
        model: this.settings.wasmModelPath,
      });

      await this.transcriber.init();
      this.isInitialized = true;
      this.logger.log("WASM transcriber initialized successfully");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.log(`Failed to initialize WASM transcriber: ${errorMsg}`);
      throw new Error(`Failed to initialize WASM transcriber: ${errorMsg}`);
    }
  }

  /**
   * Transcribe an audio file using the WASM transcriber.
   * Returns a TranscriptionResponse compatible with the existing system.
   */
  async transcribe(audioFile: FileDetail): Promise<TranscriptionResponse> {
    if (!this.isInitialized || !this.transcriber) {
      throw new Error("WASM transcriber is not initialized. Call init() first.");
    }

    this.logger.log(`Starting WASM transcription for: ${audioFile.filename}`);

    try {
      // Read the audio file
      const audioBinary = await this.app.vault.adapter.readBinary(audioFile.filepath);

      // Create a blob from the binary data
      const mimetype = `audio/${audioFile.extension.replace(".", "")}`;
      const audioBlob = new Blob([audioBinary], { type: mimetype });

      // Convert to File object for the transcriber
      const audioFileObj = new File([audioBlob], audioFile.filename, {
        type: mimetype,
      });

      // Transcribe using WASM
      const result = await this.transcriber.transcribe(audioFileObj);

      this.logger.log(`WASM transcription complete for: ${audioFile.filename}`);
      this.logger.log(`Transcribed text length: ${result.text?.length || 0} characters`);

      // Convert the result to our TranscriptionResponse format
      return this.convertToTranscriptionResponse(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.log(`WASM transcription failed for ${audioFile.filename}: ${errorMsg}`);
      throw new Error(`WASM transcription failed: ${errorMsg}`);
    }
  }

  /**
   * Convert the WASM transcriber result to our TranscriptionResponse format.
   * The @transcribe/transcriber library returns a result with segments that may
   * have a different structure, so we normalize it here.
   */
  private convertToTranscriptionResponse(result: any): TranscriptionResponse {
    // Extract segments and convert them to our format
    const segments: TranscriptionSegment[] = [];

    if (result.segments && Array.isArray(result.segments)) {
      result.segments.forEach((segment: any, index: number) => {
        segments.push({
          id: segment.id ?? index,
          start: segment.start ?? 0,
          end: segment.end ?? 0,
          text: segment.text ?? "",
          tokens: segment.tokens ?? [],
          temperature: segment.temperature ?? 0,
          avg_logprob: segment.avg_logprob ?? 0,
          no_speech_prob: segment.no_speech_prob ?? 0,
          seek: segment.seek,
          compression_ratio: segment.compression_ratio,
          words: segment.words,
        });
      });
    } else if (result.text) {
      // If no segments, create a single segment from the text
      segments.push({
        id: 0,
        start: 0,
        end: 0,
        text: result.text,
        tokens: [],
        temperature: 0,
        avg_logprob: 0,
        no_speech_prob: 0,
      });
    }

    return {
      text: result.text ?? "",
      language: result.language ?? "en",
      segments,
      task: result.task,
      duration: result.duration,
      detected_language: result.detected_language,
      detected_language_probability: result.detected_language_probability,
      language_probabilities: result.language_probabilities,
    };
  }

  /**
   * Clean up resources when done.
   */
  async dispose(): Promise<void> {
    if (this.transcriber) {
      this.logger.log("Disposing WASM transcriber");
      // Note: The FileTranscriber may not have a dispose method,
      // but we set it to null to allow garbage collection
      this.transcriber = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if the transcriber is ready to use.
   */
  isReady(): boolean {
    return this.isInitialized && this.transcriber !== null;
  }
}
