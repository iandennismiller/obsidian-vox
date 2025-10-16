/**
 * Integration tests for whisper.cpp API endpoint
 * Tests the /inference endpoint with the mock server
 */

import axios from "axios";
import { spawn, ChildProcess } from "child_process";
import { TranscriptionResponse } from "../../src/types";

const MOCK_SERVER_PORT = 8084;
const MOCK_SERVER_URL = `http://127.0.0.1:${MOCK_SERVER_PORT}`;

describe("Whisper.cpp API Integration", () => {
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

  describe("POST /inference", () => {
    it("should accept whisper.cpp format request", async () => {
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", Buffer.from("test audio data"), {
        filename: "test.mp3",
        contentType: "audio/mp3",
      });
      formData.append("temperature", "0.0");
      formData.append("temperature_inc", "0.2");
      formData.append("response_format", "json");

      const response = await axios.post(
        `${MOCK_SERVER_URL}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it("should return whisper.cpp format response", async () => {
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

      const data = response.data;

      // Check required fields
      expect(data.text).toBeDefined();
      expect(typeof data.text).toBe("string");
      expect(data.language).toBeDefined();
      expect(typeof data.language).toBe("string");
      expect(Array.isArray(data.segments)).toBe(true);

      // Check optional whisper.cpp fields
      expect(data.task).toBe("transcribe");
      expect(typeof data.duration).toBe("number");
      expect(data.detected_language).toBeDefined();
      expect(typeof data.detected_language_probability).toBe("number");
      expect(data.language_probabilities).toBeDefined();
    });

    it("should return segments in object format", async () => {
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

      const segments = response.data.segments;

      expect(segments.length).toBeGreaterThan(0);

      const firstSegment = segments[0];
      expect(firstSegment).toHaveProperty("id");
      expect(firstSegment).toHaveProperty("text");
      expect(firstSegment).toHaveProperty("start");
      expect(firstSegment).toHaveProperty("end");
      expect(firstSegment).toHaveProperty("tokens");
      expect(firstSegment).toHaveProperty("words");

      // Check that it's an object, not an array
      expect(typeof firstSegment).toBe("object");
      expect(Array.isArray(firstSegment)).toBe(false);
    });

    it("should include word-level timestamps", async () => {
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

      const firstSegment = response.data.segments[0];
      expect(firstSegment.words).toBeDefined();
      expect(Array.isArray(firstSegment.words)).toBe(true);
      expect(firstSegment.words!.length).toBeGreaterThan(0);

      const firstWord = firstSegment.words![0];
      expect(firstWord).toHaveProperty("word");
      expect(firstWord).toHaveProperty("start");
      expect(firstWord).toHaveProperty("end");
      expect(firstWord).toHaveProperty("probability");
    });

    it("should accept different temperature values", async () => {
      const temperatures = ["0.0", "0.5", "1.0"];

      for (const temp of temperatures) {
        const FormData = require("form-data");
        const formData = new FormData();
        formData.append("file", Buffer.from("test audio data"), {
          filename: "test.mp3",
          contentType: "audio/mp3",
        });
        formData.append("temperature", temp);
        formData.append("temperature_inc", "0.2");
        formData.append("response_format", "json");

        const response = await axios.post(
          `${MOCK_SERVER_URL}/inference`,
          formData,
          {
            headers: formData.getHeaders(),
          }
        );

        expect(response.status).toBe(200);
      }
    });

    it("should handle different audio file types", async () => {
      const fileTypes = ["test.mp3", "test.wav", "test.m4a"];

      for (const filename of fileTypes) {
        const FormData = require("form-data");
        const formData = new FormData();
        formData.append("file", Buffer.from("test audio data"), {
          filename,
          contentType: `audio/${filename.split(".")[1]}`,
        });
        formData.append("temperature", "0.0");
        formData.append("temperature_inc", "0.2");
        formData.append("response_format", "json");

        const response = await axios.post(
          `${MOCK_SERVER_URL}/inference`,
          formData,
          {
            headers: formData.getHeaders(),
          }
        );

        expect(response.status).toBe(200);
      }
    });
  });

  describe("Response Structure Validation", () => {
    it("should have all required whisper.cpp fields", async () => {
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

      const data = response.data;

      // Required fields
      expect(data).toHaveProperty("text");
      expect(data).toHaveProperty("language");
      expect(data).toHaveProperty("segments");

      // Optional whisper.cpp fields
      expect(data).toHaveProperty("task");
      expect(data).toHaveProperty("duration");
      expect(data).toHaveProperty("detected_language");
      expect(data).toHaveProperty("detected_language_probability");
      expect(data).toHaveProperty("language_probabilities");
    });

    it("should have valid segment structure", async () => {
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

      const segment = response.data.segments[0];

      expect(segment).toHaveProperty("id");
      expect(segment).toHaveProperty("text");
      expect(segment).toHaveProperty("start");
      expect(segment).toHaveProperty("end");
      expect(segment).toHaveProperty("tokens");
      expect(segment).toHaveProperty("temperature");
      expect(segment).toHaveProperty("avg_logprob");
      expect(segment).toHaveProperty("no_speech_prob");
      expect(segment).toHaveProperty("words");
    });

    it("should have valid language probabilities", async () => {
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

      const langProbs = response.data.language_probabilities;

      expect(langProbs).toBeDefined();
      expect(typeof langProbs).toBe("object");

      // Check that probabilities are numbers
      const values = Object.values(langProbs!);
      values.forEach((prob) => {
        expect(typeof prob).toBe("number");
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });
    });
  });
});
