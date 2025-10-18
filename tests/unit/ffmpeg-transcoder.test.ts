import { Logger } from "../../src/utils/log";

// Mock child_process since we're testing in Node environment
jest.mock("child_process", () => ({
  spawn: jest.fn().mockImplementation(() => {
    const EventEmitter = require("events");
    const stream = require("stream");
    
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new stream.Readable({
      read() {
        this.push(Buffer.from([1, 2, 3, 4]));
        this.push(null);
      }
    });
    mockProcess.stderr = new stream.Readable({ read() {} });
    mockProcess.stdin = new stream.Writable({
      write(chunk: any, encoding: any, callback: any) {
        if (callback) callback();
      }
    });
    mockProcess.stdin.end = jest.fn();
    
    // Simulate successful completion
    setTimeout(() => {
      mockProcess.emit("close", 0);
    }, 10);
    
    return mockProcess;
  }),
}));

// Mock ffmpeg-static to return a dummy path
jest.mock("ffmpeg-static", () => "/usr/bin/ffmpeg", { virtual: true });

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

    it("should be available with ffmpeg binary", () => {
      expect(transcoder.isAvailable()).toBe(true);
    });
  });

  describe("Audio Conversion", () => {
    it("should convert audio to WAV format", async () => {
      const inputBuffer = new ArrayBuffer(1024);
      const result = await transcoder.convertAudio(inputBuffer, "test.mp3", "wav");

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("Converting test.mp3 to wav format"));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("Successfully converted audio to wav"));
    });

    it("should convert audio to MP3 format", async () => {
      const inputBuffer = new ArrayBuffer(1024);
      const result = await transcoder.convertAudio(inputBuffer, "test.wav", "mp3");

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("Converting test.wav to mp3 format"));
    });

    it("should handle generic format conversions", async () => {
      const inputBuffer = new ArrayBuffer(1024);
      const result = await transcoder.convertAudio(inputBuffer, "test.mp3", "ogg");

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe("Error Handling", () => {
    it("should handle conversion errors gracefully", async () => {
      const { spawn } = require("child_process");
      
      // Mock spawn to simulate failure
      spawn.mockImplementationOnce(() => {
        const EventEmitter = require("events");
        const stream = require("stream");
        
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new stream.Readable({ read() {} });
        mockProcess.stderr = new stream.Readable({
          read() {
            this.push(Buffer.from("Error: Invalid format"));
            this.push(null);
          }
        });
        mockProcess.stdin = new stream.Writable({
          write(chunk: any, encoding: any, callback: any) {
            if (callback) callback();
          }
        });
        mockProcess.stdin.end = jest.fn();
        
        setTimeout(() => {
          mockProcess.emit("close", 1); // Non-zero exit code
        }, 10);
        
        return mockProcess;
      });

      const inputBuffer = new ArrayBuffer(1024);
      await expect(transcoder.convertAudio(inputBuffer, "test.mp3", "wav")).rejects.toThrow("FFmpeg conversion failed");
    });

    it("should handle process errors", async () => {
      const { spawn } = require("child_process");
      
      spawn.mockImplementationOnce(() => {
        const EventEmitter = require("events");
        const stream = require("stream");
        
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new stream.Readable({ read() {} });
        mockProcess.stderr = new stream.Readable({ read() {} });
        mockProcess.stdin = new stream.Writable({
          write(chunk: any, encoding: any, callback: any) {
            if (callback) callback();
          }
        });
        mockProcess.stdin.end = jest.fn();
        
        setTimeout(() => {
          mockProcess.emit("error", new Error("Process spawn error"));
        }, 10);
        
        return mockProcess;
      });

      const inputBuffer = new ArrayBuffer(1024);
      await expect(transcoder.convertAudio(inputBuffer, "test.mp3", "wav")).rejects.toThrow("FFmpeg process error");
    });
  });
});

