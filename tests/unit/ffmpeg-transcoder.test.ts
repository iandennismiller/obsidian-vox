import { Logger } from "../../src/utils/log";

// Mock @ffmpeg/ffmpeg and @ffmpeg/util since they're browser-only
jest.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    exec: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@ffmpeg/util", () => ({
  toBlobURL: jest.fn().mockResolvedValue("blob:mock-url"),
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
}));

// Import after mocking
import { FFmpegTranscoder } from "../../src/utils/ffmpegTranscoder";

// Mock the Logger
const mockLogger: Logger = {
  log: jest.fn(),
};

describe("FFmpegTranscoder", () => {
  let transcoder: FFmpegTranscoder;

  beforeEach(() => {
    transcoder = new FFmpegTranscoder(mockLogger);
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should create an FFmpegTranscoder instance", () => {
      expect(transcoder).toBeInstanceOf(FFmpegTranscoder);
    });

    it("should not be loaded initially", () => {
      expect(transcoder.isLoaded()).toBe(false);
    });
  });

  describe("Loading", () => {
    it("should mark as loaded after successful load", async () => {
      await transcoder.load();
      expect(transcoder.isLoaded()).toBe(true);
    });

    it("should only load once", async () => {
      await transcoder.load();
      await transcoder.load(); // Second call should not reload
      expect(transcoder.isLoaded()).toBe(true);
    });

    it("should log successful load", async () => {
      await transcoder.load();
      expect(mockLogger.log).toHaveBeenCalledWith("FFmpeg.wasm loaded successfully");
    });
  });

  describe("Audio Conversion", () => {
    beforeEach(async () => {
      await transcoder.load();
    });

    it("should convert audio to WAV format", async () => {
      const inputBuffer = new ArrayBuffer(1024);
      const result = await transcoder.convertAudio(inputBuffer, "test.mp3", "wav");

      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("should convert audio to MP3 format", async () => {
      const inputBuffer = new ArrayBuffer(1024);
      const result = await transcoder.convertAudio(inputBuffer, "test.wav", "mp3");

      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("should log conversion start", async () => {
      const inputBuffer = new ArrayBuffer(1024);
      await transcoder.convertAudio(inputBuffer, "test.mp3", "wav");

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("Converting test.mp3 to wav format"));
    });

    it("should log conversion success", async () => {
      const inputBuffer = new ArrayBuffer(1024);
      await transcoder.convertAudio(inputBuffer, "test.mp3", "wav");

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("Successfully converted audio to wav"));
    });

    it("should load ffmpeg automatically if not loaded", async () => {
      const newTranscoder = new FFmpegTranscoder(mockLogger);
      expect(newTranscoder.isLoaded()).toBe(false);

      const inputBuffer = new ArrayBuffer(1024);
      await newTranscoder.convertAudio(inputBuffer, "test.mp3", "wav");

      expect(newTranscoder.isLoaded()).toBe(true);
    });
  });

  describe("Unloading", () => {
    it("should unload ffmpeg", async () => {
      await transcoder.load();
      expect(transcoder.isLoaded()).toBe(true);

      await transcoder.unload();
      expect(transcoder.isLoaded()).toBe(false);
    });

    it("should log unload", async () => {
      await transcoder.load();
      await transcoder.unload();

      expect(mockLogger.log).toHaveBeenCalledWith("FFmpeg.wasm unloaded");
    });

    it("should handle unload when not loaded", async () => {
      await transcoder.unload();
      expect(transcoder.isLoaded()).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle conversion errors gracefully", async () => {
      // Create a new transcoder with a mock that throws an error
      const errorTranscoder = new FFmpegTranscoder(mockLogger);
      await errorTranscoder.load();

      // Mock the internal ffmpeg exec to throw an error
      const { FFmpeg } = require("@ffmpeg/ffmpeg");
      FFmpeg.mockImplementationOnce(() => ({
        load: jest.fn().mockResolvedValue(undefined),
        writeFile: jest.fn().mockResolvedValue(undefined),
        readFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        deleteFile: jest.fn().mockResolvedValue(undefined),
        exec: jest.fn().mockRejectedValue(new Error("Conversion failed")),
      }));

      const errorTranscoder2 = new FFmpegTranscoder(mockLogger);
      const inputBuffer = new ArrayBuffer(1024);

      await expect(errorTranscoder2.convertAudio(inputBuffer, "test.mp3", "wav")).rejects.toThrow();
    });
  });
});

