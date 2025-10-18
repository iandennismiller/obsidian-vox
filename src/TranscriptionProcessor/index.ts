import { AudioProcessor } from "AudioProcessor";
import { MarkdownProcessor } from "MarkdownProcessor";
import axios, { HttpStatusCode, isAxiosError } from "axios";
import { randomUUID } from "crypto";
import matter from "gray-matter";
import { sha1 } from "hash-wasm";
import shuffle from "lodash/shuffle";
import VoxPlugin from "main";
import { App, Notice, TFile, TFolder, Vault } from "obsidian";
import PQueue from "p-queue";
import {
  FileDetail,
  MarkdownOutput,
  TranscriptionResponse,
  VoxStatusItem,
  VoxStatusItemStatus,
  VoxStatusMap,
} from "types";
import { extractFileDetail } from "utils/format";
import { Logger } from "utils/log";
import {
  CACHE_DIRECTORY,
  OBSIDIAN_API_KEY_HEADER_KEY,
  OBSIDIAN_VAULT_ID_HEADER_KEY,
  PUBLIC_API_ENDPOINT,
} from "../constants";
import { Settings } from "../settings";

type TranscribedItem = {
  originalAudioFileName: string;
  originalAudioFileHash: string;
};

/**
 * A file which is potentially available to be transcribed.
 */
type TranscriptionCandidate = FileDetail & {
  isTranscribed: boolean;
  hash: string;
};

const ONE_MINUTE_IN_MS = 60_000;

export type TranscriptionProcessorState = {
  running: boolean;
  items: VoxStatusMap;
};

type StateSubscriberMap = Record<string, (state: TranscriptionProcessorState) => void>;

/**
 * Process audio files into markdown content.
 */
export class TranscriptionProcessor {
  private markdownProcessor: MarkdownProcessor;
  private audioProcessor: AudioProcessor;
  private queue: PQueue;

  public state: TranscriptionProcessorState;
  private subscribers: StateSubscriberMap = {};

  constructor(
    private readonly app: App,
    private settings: Settings,
    private readonly logger: Logger,
    private readonly plugin: VoxPlugin,
  ) {
    this.markdownProcessor = new MarkdownProcessor(app.vault, settings, logger, this.plugin);
    this.audioProcessor = new AudioProcessor(app.appId, app.vault, settings, logger);

    this.queue = new PQueue({ concurrency: 8 });

    // Feed the queue with more files upon idle.
    this.queue.on("idle", () => this.queueFiles());

    // Set initial state for the processor; which is fed into the StatusView UI.
    this.state = { running: !this.queue.isPaused, items: {} };
  }

  public async queueFile(audioFile: TranscriptionCandidate) {
    this.queue.add(() => this.processFile(audioFile));
    new Notice(`Added a new file to the transcription queue.`);
  }

  public async queueFiles() {
    const unprocessed = await this.getUnprocessedFiles();
    const quantity = unprocessed.length;

    if (quantity === 0) {
      return;
    }

    // Add all the unprocessed files to the visual queue.
    unprocessed.forEach((audio) => this.setCanditateStatus(audio, VoxStatusItemStatus.QUEUED));

    this.queue.addAll(unprocessed.map((audio) => () => this.processFile(audio)));
    new Notice(`Added ${quantity} file${quantity > 1 ? "s" : ""} to the transcription queue.`);
  }

  public pause() {
    this.queue.pause();

    this.state.running = false;
    this.notifySubscribers();
  }

  public resume() {
    this.queue.start();

    this.state.running = true;
    this.notifySubscribers();
  }

  public stop() {
    this.state.running = false;

    this.queue.clear();
    this.notifySubscribers();
  }

  public reset(settings: Settings) {
    this.settings = settings;
    this.queue.clear();

    this.notifySubscribers();
  }

  /**
   * Subscribe to updates on the processor's state.
   */
  public subscribe(callback: (state: TranscriptionProcessorState) => void) {
    const subscriberId = randomUUID();
    this.subscribers[subscriberId] = callback;

    // Return a function to unsubscribe
    return () => this.unsubscribe(subscriberId);
  }

  private unsubscribe(subscriberId: string) {
    delete this.subscribers[subscriberId];
  }

  /**
   * Run the callback for all of our current subscribers; updating them on our new state.
   */
  private notifySubscribers() {
    Object.values(this.subscribers).forEach((fn) => fn?.(this.state));
  }

  private async processFile(audioFile: TranscriptionCandidate) {
    try {
      this.setCanditateStatus(audioFile, VoxStatusItemStatus.PROCESSING_AUDIO);
      const processedAudio = await this.audioProcessor.transformAudio(audioFile);

      this.setCanditateStatus(audioFile, VoxStatusItemStatus.TRANSCRIBING);
      const transcribed = await this.transcribe(processedAudio);

      if (transcribed && transcribed.segments) {
        const markdown = await this.markdownProcessor.generate(audioFile, processedAudio, audioFile.hash, transcribed);

        await this.consolidateFiles(audioFile, processedAudio, markdown);

        const notice = `Transcription complete: ${markdown.title}`;
        this.setCanditateStatus(audioFile, VoxStatusItemStatus.COMPLETE);

        this.logger.log(notice);
        new Notice(notice);
      } else {
        // No valid transcription data - treat as error
        throw new Error("No valid transcription data received");
      }
    } catch (error: unknown) {
      this.handleTranscriptionError(audioFile, error);
    }
  }

  private async transcribe(audioFile: FileDetail): Promise<TranscriptionResponse | null> {
    const host = this.settings.isSelfHosted ? this.settings.selfHostedEndpoint : PUBLIC_API_ENDPOINT;

    const url = `${host}/inference`;

    const mimetype = `audio/${audioFile.extension.replace(".", "")}`;

    const audioBinary = await this.app.vault.adapter.readBinary(audioFile.filepath);
    const audioBlob = new Blob([audioBinary], { type: mimetype });
    const audioBlobFile = new File([audioBlob], audioFile.filename, {
      type: mimetype,
    });

    const formData = {
      file: audioBlobFile,
      temperature: this.settings.temperature ?? "0.0",
      temperature_inc: this.settings.temperatureInc ?? "0.2",
      response_format: "json",
    };

    const headers: Record<string, string> = {
      "Content-Type": "multipart/form-data",
    };

    // Only add API keys if using the public endpoint
    if (!this.settings.isSelfHosted) {
      headers[OBSIDIAN_VAULT_ID_HEADER_KEY] = this.app.appId;
      headers[OBSIDIAN_API_KEY_HEADER_KEY] = this.settings.apiKey;
    }

    const response = await axios.postForm<TranscriptionResponse>(url, formData, {
      headers,
      timeout: 20 * ONE_MINUTE_IN_MS,
      responseType: "json",
    });

    if (!response.data || response.status !== 200) {
      console.warn("Could not transcribe audio:", response);
      throw new Error(`Invalid response status: ${response.status}`);
    }

    // Validate response has required fields
    if (!response.data.text || !response.data.segments || !Array.isArray(response.data.segments)) {
      console.warn("Invalid transcription response structure:", response.data);
      throw new Error("Invalid transcription response: missing required fields");
    }

    // Validate segments array is not empty
    if (response.data.segments.length === 0) {
      console.warn("Transcription returned no segments:", response.data);
      throw new Error("Transcription returned empty segments array");
    }

    return response.data;
  }

  /**
   * Handle transcription errors with retry logic and geometric backoff.
   */
  private handleTranscriptionError(audioFile: TranscriptionCandidate, error: unknown) {
    const statusItem = this.state.items[audioFile.hash];
    const currentRetryCount = statusItem?.retryCount ?? 0;

    // Increment retry count first
    this.incrementRetryCount(audioFile);
    
    // Get the new retry count after incrementing
    const newRetryCount = currentRetryCount + 1;

    console.warn(`Transcription error (attempt ${newRetryCount}/${this.settings.maxRetries}):`, error);

    if (isAxiosError(error)) {
      if (error.response?.status === HttpStatusCode.TooManyRequests) {
        new Notice("You've reached your transcription limit for today.");
        this.setCanditateStatus(audioFile, VoxStatusItemStatus.FAILED);
        this.queue.pause();
        return;
      } else {
        new Notice("Error connecting to transcription host. Please check your settings.");
      }
    }

    // Check if we've exceeded max retries (using the NEW count after incrementing)
    if (newRetryCount >= this.settings.maxRetries) {
      this.setCanditateStatus(audioFile, VoxStatusItemStatus.FAILED);
      new Notice(`Failed to transcribe "${audioFile.filename}" after ${this.settings.maxRetries} attempts.`);
      // Don't pause the queue - let it continue with other files
      return;
    }

    // Calculate backoff delay using geometric progression: base * 2^retry_count
    // Use currentRetryCount (before increment) for delay calculation to start with base delay
    const delay = this.calculateBackoffDelay(currentRetryCount);
    
    this.logger.log(`Will retry "${audioFile.filename}" in ${Math.round(delay / 1000)} seconds...`);
    
    // Set status back to QUEUED to indicate it will be retried
    this.setCanditateStatus(audioFile, VoxStatusItemStatus.QUEUED);

    // Schedule retry after backoff delay
    setTimeout(() => {
      this.queue.add(() => this.processFile(audioFile));
    }, delay);
  }

  /**
   * Calculate geometric backoff delay: min(base * 2^retry_count, max_delay)
   */
  private calculateBackoffDelay(retryCount: number): number {
    const geometricDelay = this.settings.retryBaseDelayMs * Math.pow(2, retryCount);
    return Math.min(geometricDelay, this.settings.retryMaxDelayMs);
  }

  /**
   * Increment the retry count for a file.
   */
  private incrementRetryCount(candidate: TranscriptionCandidate) {
    if (this.state.items[candidate.hash]) {
      this.state.items[candidate.hash].retryCount += 1;
      this.state.items[candidate.hash].lastRetryAt = new Date();
    }
    this.notifySubscribers();
  }

  /**
   * Move the generated markdown content and the processed audio to their output location.
   */
  private async consolidateFiles(originalFile: FileDetail, processedAudio: FileDetail, markdown: MarkdownOutput) {
    const subdirectory = originalFile.directory
      // eslint-disable-next-line no-useless-escape
      .replace(new RegExp(`^${this.settings.watchDirectory}\/`), "")
      .replace(/\/$/, "");

    const finalMarkdownLocation = subdirectory.length
      ? `${this.settings.outputDirectory}/${subdirectory}`
      : this.settings.outputDirectory;

    const finalMarkdownFilepath = `${finalMarkdownLocation}/${markdown.title}.md`;
    const finalAudioLocation = `${finalMarkdownLocation}/audio`;
    const finalAudioFilepath = `${finalAudioLocation}/${processedAudio.filename}`;

    await this.app.vault.adapter.mkdir(finalMarkdownLocation);
    await this.app.vault.adapter.mkdir(finalAudioLocation);

    // Remove the resultant audio file if it already exists; this could occur if
    // the user has deleted a transcription note then re-transcribes the same audio.
    const finalAudioFileExists = await this.app.vault.adapter.exists(finalAudioFilepath);
    if (finalAudioFileExists) {
      await this.app.vault.adapter.remove(finalAudioFilepath);
    }

    // Move the audio file we placed into the cache in the AudioProcessor step.
    const cachedTransformedAudioFile = `${CACHE_DIRECTORY}/${processedAudio.filename}`;
    await this.app.vault.adapter.rename(cachedTransformedAudioFile, finalAudioFilepath);

    // Write the markdown content to the final location.
    await this.app.vault.adapter.write(finalMarkdownFilepath, markdown.content);

    // Remove original file if the user desires
    if (this.settings.shouldDeleteOriginal) {
      await this.app.vault.adapter.remove(originalFile.filepath);
    }

    return {
      audioFile: finalAudioFilepath,
      markdownFile: finalMarkdownFilepath,
    };
  }

  /**
   * Get a limited number of files that have not already been processed, searching first by filename and then by hash.
   * A reasonable limit here is necessary to avoid smashing the CPU with hash computation or overloading our PQueue
   * with thousands of promises.
   *
   * @note
   * Searching by hash as a fallback ensures that even as our filename transformation functions change or evolve,
   * we can always determine which file was transcribed.
   */
  private async getUnprocessedFiles() {
    const FILE_CHUNK_LIMIT = 24;

    const folder = this.app.vault.getAbstractFileByPath(this.settings.watchDirectory);
    const validUnprocessedCandidates: TranscriptionCandidate[] = [];
    const potentialCandidates: string[] = [];

    if (folder instanceof TFolder) {
      Vault.recurseChildren(folder, (file) => {
        if (file instanceof TFile) {
          potentialCandidates.push(file.path);
        }
      });
    }

    // Shuffle them to avoid hitting the same file repeatedly, if it fails.
    const shuffledCandidates = shuffle(potentialCandidates);
    const transcribedFiles = await this.getTranscribedFiles();

    for (const filepath of shuffledCandidates) {
      if (validUnprocessedCandidates.length < FILE_CHUNK_LIMIT) {
        const candidate = await this.getTranscribedStatus(filepath, transcribedFiles);

        if (!candidate.isTranscribed && !this.hasExceededMaxRetries(candidate)) {
          validUnprocessedCandidates.push(candidate);
        }
      }
    }

    return validUnprocessedCandidates;
  }

  /**
   * Check if a candidate has exceeded the maximum number of retries.
   */
  private hasExceededMaxRetries(candidate: TranscriptionCandidate): boolean {
    const statusItem = this.state.items[candidate.hash];
    if (!statusItem) {
      return false;
    }
    return statusItem.retryCount >= this.settings.maxRetries && statusItem.status === VoxStatusItemStatus.FAILED;
  }

  public async getTranscribedFiles() {
    const transcribedFiles = this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith(this.settings.outputDirectory));

    const transcribedFilesInfo: TranscribedItem[] = await Promise.all(
      transcribedFiles.map(async (tfile) => {
        const cachedFile = await this.app.vault.cachedRead(tfile);
        const frontmatter = matter(cachedFile);

        const filename = frontmatter.data["original_file_name"];
        const hash = frontmatter.data["original_file_hash"];

        return {
          originalAudioFileName: (filename as string) ?? "",
          originalAudioFileHash: (hash as string) ?? "",
        };
      }),
    );

    return transcribedFilesInfo;
  }

  public async getTranscribedStatus(
    filepath: string,
    transcribedItems: TranscribedItem[],
  ): Promise<TranscriptionCandidate> {
    const detail = extractFileDetail(filepath);

    // First look for a filename match in our transcribed items.
    const transcribedFoundByName = transcribedItems.find((item) => detail.filename === item.originalAudioFileName);

    if (transcribedFoundByName) {
      return {
        ...detail,
        isTranscribed: true,
        hash: transcribedFoundByName.originalAudioFileHash,
      };
    }

    // Counldn't find it by filename, so let's try by hash.
    // Calculating the hash here serves two purposes:
    //   - Checking if the file has already been transcribed
    //   - If already transcribed, we'll pass the hash to the MD processor to save to the frontmatter
    const audioBinary = await this.app.vault.adapter.readBinary(detail.filepath);
    const int8Buffer = new Uint8Array(audioBinary);
    const hash = await sha1(int8Buffer);

    const transcribedFoundByHash = transcribedItems.some((item) => hash === item.originalAudioFileHash);

    return { ...detail, isTranscribed: transcribedFoundByHash, hash };
  }

  private setCanditateStatus(candidate: TranscriptionCandidate, status: VoxStatusItem["status"]) {
    this.state.running = !this.queue.isPaused;

    const finalized = status === "COMPLETE" || status === "FAILED";
    const finalizedAt = finalized ? new Date() : null;

    if (this.state.items[candidate.hash]) {
      this.state.items[candidate.hash] = {
        ...this.state.items[candidate.hash],
        finalizedAt,
        status,
      };
    } else {
      this.state.items[candidate.hash] = {
        hash: candidate.hash,
        details: candidate,
        addedAt: new Date(),
        finalizedAt,
        status,
        retryCount: 0,
        lastRetryAt: null,
      };
    }

    this.notifySubscribers();
  }
}
