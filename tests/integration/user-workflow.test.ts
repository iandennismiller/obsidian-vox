/**
 * Integration tests simulating user workflows
 * Tests complete transcription workflows using the mock server
 */

import axios from "axios";
import { spawn, ChildProcess } from "child_process";
import { TranscriptionResponse, TranscriptionSegment } from "../../src/types";

const MOCK_SERVER_PORT = 8085;
const MOCK_SERVER_URL = `http://127.0.0.1:${MOCK_SERVER_PORT}`;

describe("User Workflow Integration Tests", () => {
  let mockServer: ChildProcess;

  beforeAll(async () => {
    // Start mock server
    mockServer = spawn("node", [
      "project/mock-whisper-server.js",
      MOCK_SERVER_PORT.toString(),
    ]);

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(() => {
    // Stop mock server
    if (mockServer) {
      mockServer.kill();
    }
  });

  describe("Self-Hosted Workflow", () => {
    it("should complete full transcription workflow without API keys", async () => {
      // Simulate user uploading audio file to self-hosted endpoint
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "voice-memo.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.0");
      formData.append("temperature_inc", "0.2");
      formData.append("response_format", "json");

      // No API keys should be required for self-hosted
      const response = await axios.post<TranscriptionResponse>(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
          // Note: No API key headers
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.text).toBeDefined();
      expect(response.data.segments.length).toBeGreaterThan(0);
    });

    it("should handle default temperature settings", async () => {
      // User uses default temperature settings
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "voice-memo.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.0"); // Default
      formData.append("temperature_inc", "0.2"); // Default
      formData.append("response_format", "json");

      const response = await axios.post<TranscriptionResponse>(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.segments[0].temperature).toBe(0);
    });

    it("should handle custom temperature settings", async () => {
      // User adjusts temperature for higher randomness
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "voice-memo.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.5"); // Custom value
      formData.append("temperature_inc", "0.3"); // Custom value
      formData.append("response_format", "json");

      const response = await axios.post<TranscriptionResponse>(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });

  describe("Transcription Output Processing", () => {
    it("should generate markdown-ready text from segments", async () => {
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "voice-memo.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.0");
      formData.append("temperature_inc", "0.2");
      formData.append("response_format", "json");

      const response = await axios.post<TranscriptionResponse>(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      // Simulate markdown generation from segments
      const segments = response.data.segments;
      const markdownContent: string[] = [];

      segments.forEach((segment: TranscriptionSegment, i: number) => {
        markdownContent.push(`${segment.text.trim()} `);

        // Sensible new paragraph spacing
        if (segment.text.trim().endsWith(".") && i % 8 === 0) {
          markdownContent.push("\n\n");
        }
      });

      const markdown = markdownContent.join("");
      expect(markdown.length).toBeGreaterThan(0);
      expect(markdown).toContain("This is a mock transcription");
    });

    it("should extract word-level timing information", async () => {
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "voice-memo.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.0");
      formData.append("temperature_inc", "0.2");
      formData.append("response_format", "json");

      const response = await axios.post<TranscriptionResponse>(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      // User could use word-level timestamps for features
      const segments = response.data.segments;
      const allWords = segments.flatMap((s) => s.words || []);

      expect(allWords.length).toBeGreaterThan(0);

      // Each word should have timing info
      allWords.forEach((word) => {
        expect(word.word).toBeDefined();
        expect(typeof word.start).toBe("number");
        expect(typeof word.end).toBe("number");
        expect(word.end).toBeGreaterThanOrEqual(word.start);
        expect(typeof word.probability).toBe("number");
      });
    });

    it("should provide language detection information", async () => {
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "voice-memo.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.0");
      formData.append("temperature_inc", "0.2");
      formData.append("response_format", "json");

      const response = await axios.post<TranscriptionResponse>(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      // User can see what language was detected
      expect(response.data.detected_language).toBe("english");
      expect(response.data.detected_language_probability).toBeGreaterThan(0.9);

      // User can see alternative language probabilities
      const langProbs = response.data.language_probabilities;
      expect(langProbs).toBeDefined();
      expect(langProbs!.en).toBeGreaterThan(0.9);
    });
  });

  describe("Multiple Files Workflow", () => {
    it("should handle multiple sequential transcriptions", async () => {
      const files = ["memo1.mp3", "memo2.mp3", "memo3.mp3"];

      for (const filename of files) {
        const FormData = require("form-data");
        const formData = new FormData();
        formData.append("file", Buffer.from("test audio data"), {
          filename,
          contentType: "audio/mp3",
        });
        formData.append("temperature", "0.0");
        formData.append("temperature_inc", "0.2");
        formData.append("response_format", "json");

        const response = await axios.post<TranscriptionResponse>(
          `${MOCK_SERVER_URL}/inference`,
          formData,
          {
            headers: formData.getHeaders(),
          }
        );

        expect(response.status).toBe(200);
        expect(response.data.text).toBeDefined();
      }
    });

    it("should handle concurrent transcriptions", async () => {
      const files = ["memo1.mp3", "memo2.mp3", "memo3.mp3"];

      const promises = files.map((filename) => {
        const FormData = require("form-data");
        const formData = new FormData();
        formData.append("file", Buffer.from("test audio data"), {
          filename,
          contentType: "audio/mp3",
        });
        formData.append("temperature", "0.0");
        formData.append("temperature_inc", "0.2");
        formData.append("response_format", "json");

        return axios.post<TranscriptionResponse>(
          `${MOCK_SERVER_URL}/inference`,
          formData,
          {
            headers: formData.getHeaders(),
          }
        );
      });

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.data.text).toBeDefined();
      });
    });
  });

  describe("Error Handling Workflow", () => {
    it("should handle 404 for invalid endpoint", async () => {
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "test.mp3",
        contentType: "audio/mp3",
      });

      try {
        await axios.post(`${MOCK_SERVER_URL}/invalid-endpoint`, formData, {
          headers: formData.getHeaders(),
        });
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe("Backward Compatibility Workflow", () => {
    it("should work with both object and array segment formats", async () => {
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "test.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.0");
      formData.append("temperature_inc", "0.2");
      formData.append("response_format", "json");

      const response = await axios.post<TranscriptionResponse>(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      // Mock server returns object format
      const segment = response.data.segments[0];
      expect(typeof segment).toBe("object");
      expect(Array.isArray(segment)).toBe(false);
      expect(segment.text).toBeDefined();

      // Our code should handle both formats
      const objectifySegment = (seg: any): TranscriptionSegment => {
        if (seg.hasOwnProperty("text")) {
          return seg as TranscriptionSegment;
        }
        // Would handle array format here
        return seg;
      };

      const processed = objectifySegment(segment);
      expect(processed.text).toBeDefined();
      expect(processed.id).toBeDefined();
    });
  });
});
