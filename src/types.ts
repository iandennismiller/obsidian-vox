import { FSWatcher, createReadStream } from "fs";
import { readFile } from "fs/promises";
import VoxPlugin from "main";

/**
 * A chunk of an audio recording measuing the start and stop times as UNIX timestamps.
 */
export type AudioChunk = {
  start: number;
  stop: number;
  blob: BlobPart;
};

export enum VoxStatusItemStatus {
  QUEUED = "QUEUED",
  PROCESSING_AUDIO = "PROCESSING_AUDIO",
  TRANSCRIBING = "TRANSCRIBING",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
}

export type VoxStatusItem = {
  hash: string;
  details: FileDetail;
  status: VoxStatusItemStatus;

  addedAt: Date;
  finalizedAt: Date | null;
};

/**
 * Status of all transcription candidates for this session, indexed by hash.
 */
export type VoxStatusMap = Record<string, VoxStatusItem>;

type ExtendedFsWatcher = {
  resolvedPath: string;
  watcher: FSWatcher;
};

declare module "obsidian" {
  interface App {
    appId: string;
    dom: {
      appContainerEl: HTMLElement;
    };
    plugins: {
      enabledPlugins: Set<string>;
      plugins: {
        vox: VoxPlugin;
      };
    };
  }

  interface Vault {
    getConfig: (key: string) => string;
    exists: (path: string) => Promise<boolean>;
  }

  interface DataAdapter {
    basePath: string;
    fs: {
      createReadStream: typeof createReadStream;
    };
    fsPromises: {
      readFile: typeof readFile;
    };
    watchers: Record<string, ExtendedFsWatcher>;
  }
}

export type RawTranscriptionSegment = [
  number, // id
  number, // seek
  number, // start
  number, // end
  string, // text
  number[], // tokens
  number, // temperature
  number, // avg_logprob
  number, // compression_ratio
  number, // no_speech_prob
];

/**
 * Word-level timestamp information from whisper.cpp
 */
export type TranscriptionWord = {
  word: string;
  start: number;
  end: number;
  t_dtw: number;
  probability: number;
};

export type TranscriptionSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  no_speech_prob: number;

  // Optional fields for backward compatibility
  seek?: number;
  compression_ratio?: number;

  // New optional field from whisper.cpp
  words?: TranscriptionWord[];
};

export type TranscriptionResponse = {
  // Core fields (required)
  text: string;
  language: string;
  segments: TranscriptionSegment[];

  // New optional fields from whisper.cpp
  task?: string;
  duration?: number;
  detected_language?: string;
  detected_language_probability?: number;
  language_probabilities?: Record<string, number>;
};

export type FileDetail = {
  /** The filename without the extension */
  name: string;
  filename: string;
  extension: string;
  directory: string;
  filepath: string;
};

export type MarkdownOutput = {
  title: string;
  content: string;
};

export type VoiceMemoCategorization = {
  importance: 1 | 2 | 3 | 4 | 5;
  category: { key: string; label: string; display: string } | null;
};

export enum AudioOutputExtension {
  "MP3" = "mp3",
  "WAV" = "wav",
}
