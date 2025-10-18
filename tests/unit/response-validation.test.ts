/**
 * Unit tests for transcription response validation
 */

import { TranscriptionResponse } from "../../src/types";

describe("Transcription Response Validation", () => {
  describe("Valid Response Structure", () => {
    it("should accept valid whisper.cpp response", () => {
      const response: TranscriptionResponse = {
        text: "This is a test transcription.",
        language: "english",
        segments: [
          {
            id: 0,
            text: "This is a test transcription.",
            start: 0.0,
            end: 2.5,
            tokens: [314, 761, 284],
            temperature: 0,
            avg_logprob: -0.229,
            no_speech_prob: 0.015,
          },
        ],
      };

      expect(response.text).toBeDefined();
      expect(response.language).toBeDefined();
      expect(Array.isArray(response.segments)).toBe(true);
      expect(response.segments.length).toBeGreaterThan(0);
    });

    it("should accept response with optional whisper.cpp fields", () => {
      const response: TranscriptionResponse = {
        text: "This is a test transcription.",
        language: "english",
        task: "transcribe",
        duration: 19.93,
        detected_language: "english",
        detected_language_probability: 0.98,
        language_probabilities: {
          en: 0.98,
          es: 0.01,
        },
        segments: [
          {
            id: 0,
            text: "This is a test transcription.",
            start: 0.0,
            end: 2.5,
            tokens: [314, 761, 284],
            temperature: 0,
            avg_logprob: -0.229,
            no_speech_prob: 0.015,
            words: [
              {
                word: "This",
                start: 0.0,
                end: 0.5,
                t_dtw: -1,
                probability: 0.95,
              },
            ],
          },
        ],
      };

      expect(response.text).toBeDefined();
      expect(response.task).toBe("transcribe");
      expect(response.duration).toBeDefined();
      expect(response.detected_language).toBe("english");
      expect(response.language_probabilities).toBeDefined();
      expect(response.segments[0].words).toBeDefined();
    });

    it("should accept response with multiple segments", () => {
      const response: TranscriptionResponse = {
        text: "First sentence. Second sentence.",
        language: "english",
        segments: [
          {
            id: 0,
            text: "First sentence.",
            start: 0.0,
            end: 2.0,
            tokens: [314, 761],
            temperature: 0,
            avg_logprob: -0.229,
            no_speech_prob: 0.015,
          },
          {
            id: 1,
            text: "Second sentence.",
            start: 2.0,
            end: 4.0,
            tokens: [284, 651],
            temperature: 0,
            avg_logprob: -0.189,
            no_speech_prob: 0.012,
          },
        ],
      };

      expect(response.segments.length).toBe(2);
      expect(response.segments[0].id).toBe(0);
      expect(response.segments[1].id).toBe(1);
    });
  });

  describe("Invalid Response Detection", () => {
    it("should detect missing text field", () => {
      const response = {
        language: "english",
        segments: [
          {
            id: 0,
            text: "Test",
            start: 0,
            end: 1,
            tokens: [],
            temperature: 0,
            avg_logprob: -0.2,
            no_speech_prob: 0.01,
          },
        ],
      };

      expect(response.text).toBeUndefined();
    });

    it("should detect missing segments field", () => {
      const response = {
        text: "Test transcription",
        language: "english",
      };

      expect(response.segments).toBeUndefined();
    });

    it("should detect empty segments array", () => {
      const response: TranscriptionResponse = {
        text: "Test transcription",
        language: "english",
        segments: [],
      };

      expect(response.segments.length).toBe(0);
    });

    it("should detect non-array segments", () => {
      const response = {
        text: "Test transcription",
        language: "english",
        segments: "not an array",
      };

      expect(Array.isArray(response.segments)).toBe(false);
    });
  });

  describe("Response Validation Logic", () => {
    const isValidResponse = (data: any): boolean => {
      if (!data) return false;
      if (!data.text) return false;
      if (!data.segments) return false;
      if (!Array.isArray(data.segments)) return false;
      if (data.segments.length === 0) return false;
      return true;
    };

    it("should validate correct response", () => {
      const response: TranscriptionResponse = {
        text: "Test",
        language: "english",
        segments: [
          {
            id: 0,
            text: "Test",
            start: 0,
            end: 1,
            tokens: [],
            temperature: 0,
            avg_logprob: -0.2,
            no_speech_prob: 0.01,
          },
        ],
      };

      expect(isValidResponse(response)).toBe(true);
    });

    it("should reject response with missing text", () => {
      const response = {
        language: "english",
        segments: [{ id: 0, text: "Test" }],
      };

      expect(isValidResponse(response)).toBe(false);
    });

    it("should reject response with missing segments", () => {
      const response = {
        text: "Test",
        language: "english",
      };

      expect(isValidResponse(response)).toBe(false);
    });

    it("should reject response with empty segments", () => {
      const response = {
        text: "Test",
        language: "english",
        segments: [],
      };

      expect(isValidResponse(response)).toBe(false);
    });

    it("should reject response with non-array segments", () => {
      const response = {
        text: "Test",
        language: "english",
        segments: "not an array",
      };

      expect(isValidResponse(response)).toBe(false);
    });

    it("should reject null response", () => {
      expect(isValidResponse(null)).toBe(false);
    });

    it("should reject undefined response", () => {
      expect(isValidResponse(undefined)).toBe(false);
    });
  });

  describe("Segment Validation", () => {
    it("should accept segment with required fields", () => {
      const segment = {
        id: 0,
        text: "Test",
        start: 0.0,
        end: 1.0,
        tokens: [314],
        temperature: 0,
        avg_logprob: -0.2,
        no_speech_prob: 0.01,
      };

      expect(segment.id).toBeDefined();
      expect(segment.text).toBeDefined();
      expect(segment.start).toBeDefined();
      expect(segment.end).toBeDefined();
      expect(segment.tokens).toBeDefined();
      expect(segment.temperature).toBeDefined();
      expect(segment.avg_logprob).toBeDefined();
      expect(segment.no_speech_prob).toBeDefined();
    });

    it("should accept segment with optional fields", () => {
      const segment = {
        id: 0,
        text: "Test",
        start: 0.0,
        end: 1.0,
        tokens: [314],
        temperature: 0,
        avg_logprob: -0.2,
        no_speech_prob: 0.01,
        seek: 0,
        compression_ratio: 1.5,
        words: [
          {
            word: "Test",
            start: 0.0,
            end: 1.0,
            t_dtw: -1,
            probability: 0.95,
          },
        ],
      };

      expect(segment.seek).toBe(0);
      expect(segment.compression_ratio).toBe(1.5);
      expect(segment.words).toBeDefined();
      expect(segment.words!.length).toBe(1);
    });
  });
});
