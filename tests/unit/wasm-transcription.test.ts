import { WasmTranscriber } from "../../src/TranscriptionProcessor/WasmTranscriber";
import { Logger } from "../../src/utils/log";
import { FileDetail, TranscriptionResponse } from "../../src/types";

// Mock the @transcribe/shout and @transcribe/transcriber modules
jest.mock("@transcribe/shout", () => {
  return jest.fn(() => ({
    // Mock createModule function
  }));
});

jest.mock("@transcribe/transcriber", () => {
  return {
    FileTranscriber: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue(undefined),
      transcribe: jest.fn().mockResolvedValue({
        text: "This is a test transcription",
        language: "en",
        segments: [
          {
            id: 0,
            start: 0,
            end: 5,
            text: "This is a test transcription",
            tokens: [1, 2, 3],
            temperature: 0.0,
            avg_logprob: -0.5,
            no_speech_prob: 0.1,
          },
        ],
      }),
    })),
  };
});

describe("WasmTranscriber", () => {
  let mockApp: any;
  let settings: any;
  let logger: Logger;
  let wasmTranscriber: WasmTranscriber;

  beforeEach(() => {
    // Create mock app
    mockApp = {
      vault: {
        adapter: {
          exists: jest.fn().mockResolvedValue(true),
          readBinary: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        },
      },
    };

    // Create settings with WASM enabled
    settings = {
      useWasmTranscription: true,
      wasmModelPath: ".obsidian/models/ggml-base.en.bin",
      wasmModelSize: "base",
      temperature: "0.0",
      temperatureInc: "0.2",
    };

    // Create logger
    logger = new Logger({ id: "test", name: "Test", version: "1.0.0" });

    wasmTranscriber = new WasmTranscriber(mockApp, settings, logger);
  });

  describe("initialization", () => {
    it("should initialize successfully with valid model path", async () => {
      await wasmTranscriber.init();
      expect(wasmTranscriber.isReady()).toBe(true);
    });

    it("should throw error when model path is not configured", async () => {
      settings.wasmModelPath = "";
      wasmTranscriber = new WasmTranscriber(mockApp, settings, logger);

      await expect(wasmTranscriber.init()).rejects.toThrow(
        "WASM model path is not configured"
      );
    });

    it("should throw error when model file does not exist", async () => {
      mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(false);

      await expect(wasmTranscriber.init()).rejects.toThrow(
        "WASM model file not found"
      );
    });

    it("should not re-initialize if already initialized", async () => {
      await wasmTranscriber.init();
      expect(wasmTranscriber.isReady()).toBe(true);

      // Call init again - it should return early without error
      await expect(wasmTranscriber.init()).resolves.not.toThrow();
      expect(wasmTranscriber.isReady()).toBe(true);
    });
  });

  describe("transcription", () => {
    beforeEach(async () => {
      await wasmTranscriber.init();
    });

    it("should transcribe audio file successfully", async () => {
      const audioFile: FileDetail = {
        name: "test-audio",
        filename: "test-audio.wav",
        extension: ".wav",
        directory: "/path/to",
        filepath: "/path/to/test-audio.wav",
      };

      const result = await wasmTranscriber.transcribe(audioFile);

      expect(result).toBeDefined();
      expect(result.text).toBe("This is a test transcription");
      expect(result.language).toBe("en");
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].text).toBe("This is a test transcription");
    });

    it("should throw error when transcribing without initialization", async () => {
      const uninitializedTranscriber = new WasmTranscriber(
        mockApp,
        settings,
        logger
      );

      const audioFile: FileDetail = {
        name: "test-audio",
        filename: "test-audio.wav",
        extension: ".wav",
        directory: "/path/to",
        filepath: "/path/to/test-audio.wav",
      };

      await expect(uninitializedTranscriber.transcribe(audioFile)).rejects.toThrow(
        "WASM transcriber is not initialized"
      );
    });

    it("should create segment from text if segments missing", async () => {
      const { FileTranscriber } = require("@transcribe/transcriber");
      FileTranscriber.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        transcribe: jest.fn().mockResolvedValue({
          text: "Text without segments",
          language: "en",
          // No segments field
        }),
      }));

      wasmTranscriber = new WasmTranscriber(mockApp, settings, logger);
      await wasmTranscriber.init();

      const audioFile: FileDetail = {
        name: "test-audio",
        filename: "test-audio.wav",
        extension: ".wav",
        directory: "/path/to",
        filepath: "/path/to/test-audio.wav",
      };

      const result = await wasmTranscriber.transcribe(audioFile);

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].text).toBe("Text without segments");
    });
  });

  describe("disposal", () => {
    it("should dispose transcriber properly", async () => {
      await wasmTranscriber.init();
      expect(wasmTranscriber.isReady()).toBe(true);

      await wasmTranscriber.dispose();
      expect(wasmTranscriber.isReady()).toBe(false);
    });

    it("should handle disposal when not initialized", async () => {
      await expect(wasmTranscriber.dispose()).resolves.not.toThrow();
      expect(wasmTranscriber.isReady()).toBe(false);
    });
  });

  describe("isReady", () => {
    it("should return false when not initialized", () => {
      expect(wasmTranscriber.isReady()).toBe(false);
    });

    it("should return true when initialized", async () => {
      await wasmTranscriber.init();
      expect(wasmTranscriber.isReady()).toBe(true);
    });

    it("should return false after disposal", async () => {
      await wasmTranscriber.init();
      await wasmTranscriber.dispose();
      expect(wasmTranscriber.isReady()).toBe(false);
    });
  });
});
