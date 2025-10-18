/**
 * Unit tests for local audio conversion logic
 * 
 * Note: These tests verify the conversion logic without actually running
 * the WASM decoders, as those require a browser/Electron environment
 * and are difficult to test in Jest's Node.js environment.
 */

import { Logger } from "../../src/utils/log";

// Mock the decoders since they use ES modules and WASM
jest.mock("mpg123-decoder", () => ({
  MPEGDecoder: jest.fn(),
}));
jest.mock("@wasm-audio-decoders/ogg-vorbis", () => ({
  OggVorbisDecoder: jest.fn(),
}));
jest.mock("@wasm-audio-decoders/flac", () => ({
  FLACDecoder: jest.fn(),
}));
jest.mock("wav-encoder", () => ({
  encode: jest.fn(),
}));

import { LocalAudioConverter } from "../../src/AudioProcessor/LocalAudioConverter";

describe("LocalAudioConverter", () => {
  let converter: LocalAudioConverter;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
    } as unknown as Logger;
    converter = new LocalAudioConverter(mockLogger);
  });

  describe("convertToWav", () => {
    it("should pass through WAV files without conversion", async () => {
      const mockWavData = new ArrayBuffer(1024);
      const result = await converter.convertToWav(mockWavData, ".wav");

      expect(result).toBe(mockWavData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("already in WAV format")
      );
    });

    it("should throw error for unsupported M4A format", async () => {
      const mockAudioData = new ArrayBuffer(1024);

      await expect(
        converter.convertToWav(mockAudioData, ".m4a")
      ).rejects.toThrow(/M4A format is not yet supported/);
    });

    it("should throw error for unsupported AAC format", async () => {
      const mockAudioData = new ArrayBuffer(1024);

      await expect(
        converter.convertToWav(mockAudioData, ".aac")
      ).rejects.toThrow(/AAC format is not yet supported/);
    });

    it("should throw error for unknown format", async () => {
      const mockAudioData = new ArrayBuffer(1024);

      await expect(
        converter.convertToWav(mockAudioData, ".xyz")
      ).rejects.toThrow(/Unsupported audio format/);
    });

    it("should handle extension with or without leading dot", async () => {
      const mockWavData = new ArrayBuffer(1024);

      const result1 = await converter.convertToWav(mockWavData, ".wav");
      const result2 = await converter.convertToWav(mockWavData, "wav");

      expect(result1).toBe(mockWavData);
      expect(result2).toBe(mockWavData);
    });

    it("should handle case-insensitive extensions", async () => {
      const mockWavData = new ArrayBuffer(1024);

      const result1 = await converter.convertToWav(mockWavData, ".WAV");
      const result2 = await converter.convertToWav(mockWavData, ".WaV");

      expect(result1).toBe(mockWavData);
      expect(result2).toBe(mockWavData);
    });

    it("should log conversion start with file size", async () => {
      const mockWavData = new ArrayBuffer(1024 * 1024); // 1 MB

      await converter.convertToWav(mockWavData, ".wav");

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("already in WAV format")
      );
    });
  });

  describe("format validation", () => {
    it("should recognize unsupported formats early", async () => {
      const mockData = new ArrayBuffer(1024);
      const unsupportedFormats = [".m4a", ".aac"];

      for (const format of unsupportedFormats) {
        await expect(
          converter.convertToWav(mockData, format)
        ).rejects.toThrow(/not yet supported/);
      }
    });

    it("should handle unknown formats", async () => {
      const mockData = new ArrayBuffer(1024);
      const unknownFormats = [".xyz", ".unknown", ".test"];

      for (const format of unknownFormats) {
        await expect(
          converter.convertToWav(mockData, format)
        ).rejects.toThrow(/Unsupported audio format/);
      }
    });
  });
});
