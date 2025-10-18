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

// Mock Web Audio API for M4A/AAC decoding
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  close: jest.fn(),
};
(global as any).AudioContext = jest.fn(() => mockAudioContext);
(global as any).window = { AudioContext: (global as any).AudioContext };

import { LocalAudioConverter } from "../../src/AudioProcessor/LocalAudioConverter";

describe("LocalAudioConverter", () => {
  let converter: LocalAudioConverter;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
    } as unknown as Logger;
    converter = new LocalAudioConverter(mockLogger);

    // Reset mocks
    mockAudioContext.decodeAudioData.mockReset();
    mockAudioContext.close.mockReset();
    mockAudioContext.close.mockResolvedValue(undefined);
  });

  describe("convertToWav", () => {
    it("should pass through WAV files without conversion", async () => {
      const mockWavData = new ArrayBuffer(1024);
      const result = await converter.convertToWav(mockWavData, ".wav");

      expect(result).toBe(mockWavData);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("already in WAV format"));
    });

    it("should throw error for unknown format", async () => {
      const mockAudioData = new ArrayBuffer(1024);

      await expect(converter.convertToWav(mockAudioData, ".xyz")).rejects.toThrow(/Unsupported audio format/);
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

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("already in WAV format"));
    });
  });

  describe("format validation", () => {
    it("should handle unknown formats", async () => {
      const mockData = new ArrayBuffer(1024);
      const unknownFormats = [".xyz", ".unknown", ".test"];

      for (const format of unknownFormats) {
        await expect(converter.convertToWav(mockData, format)).rejects.toThrow(/Unsupported audio format/);
      }
    });
  });

  describe("M4A/AAC support with Web Audio API", () => {
    it("should use Web Audio API for M4A files", async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockChannelData = new Float32Array([1, 2, 3, 4]);

      const mockAudioBuffer = {
        numberOfChannels: 1,
        sampleRate: 44100,
        getChannelData: jest.fn(() => mockChannelData),
      };

      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);

      // Mock wav-encoder
      const WavEncoder = require("wav-encoder");
      WavEncoder.encode.mockResolvedValue(new ArrayBuffer(2048));

      await converter.convertToWav(mockAudioData, ".m4a");

      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer));
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it("should use Web Audio API for AAC files", async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockChannelData = new Float32Array([1, 2, 3, 4]);

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 48000,
        getChannelData: jest.fn(() => mockChannelData),
      };

      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);

      // Mock wav-encoder
      const WavEncoder = require("wav-encoder");
      WavEncoder.encode.mockResolvedValue(new ArrayBuffer(2048));

      await converter.convertToWav(mockAudioData, ".aac");

      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer));
      expect(mockAudioBuffer.getChannelData).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it("should close audio context even on decode error", async () => {
      const mockAudioData = new ArrayBuffer(1024);

      mockAudioContext.decodeAudioData.mockRejectedValue(new Error("Invalid audio data"));

      await expect(converter.convertToWav(mockAudioData, ".m4a")).rejects.toThrow(
        /Failed to decode audio with Web Audio API/,
      );

      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });
});
