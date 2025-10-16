/**
 * Unit tests for type definitions
 */

import {
  TranscriptionWord,
  TranscriptionSegment,
  TranscriptionResponse,
  RawTranscriptionSegment,
} from "../../src/types";

describe("Type Definitions", () => {
  describe("TranscriptionWord", () => {
    it("should have correct structure", () => {
      const word: TranscriptionWord = {
        word: "test",
        start: 0.0,
        end: 1.0,
        t_dtw: -1,
        probability: 0.95,
      };

      expect(word.word).toBe("test");
      expect(word.start).toBe(0.0);
      expect(word.end).toBe(1.0);
      expect(word.t_dtw).toBe(-1);
      expect(word.probability).toBe(0.95);
    });
  });

  describe("TranscriptionSegment", () => {
    it("should support object format from whisper.cpp", () => {
      const segment: TranscriptionSegment = {
        id: 0,
        start: 0.0,
        end: 4.5,
        text: "This is a test.",
        tokens: [314, 761, 284],
        temperature: 0,
        avg_logprob: -0.229,
        no_speech_prob: 0.015,
      };

      expect(segment.id).toBe(0);
      expect(segment.text).toBe("This is a test.");
      expect(segment.tokens).toEqual([314, 761, 284]);
    });

    it("should support optional legacy fields", () => {
      const segment: TranscriptionSegment = {
        id: 0,
        start: 0.0,
        end: 4.5,
        text: "This is a test.",
        tokens: [314, 761, 284],
        temperature: 0,
        avg_logprob: -0.229,
        no_speech_prob: 0.015,
        seek: 0,
        compression_ratio: 1.5,
      };

      expect(segment.seek).toBe(0);
      expect(segment.compression_ratio).toBe(1.5);
    });

    it("should support optional words field", () => {
      const segment: TranscriptionSegment = {
        id: 0,
        start: 0.0,
        end: 4.5,
        text: "This is a test.",
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
      };

      expect(segment.words).toHaveLength(1);
      expect(segment.words![0].word).toBe("This");
    });
  });

  describe("RawTranscriptionSegment", () => {
    it("should be array format", () => {
      const rawSegment: RawTranscriptionSegment = [
        0, // id
        0, // seek
        0.0, // start
        4.5, // end
        "This is a test.", // text
        [314, 761, 284], // tokens
        0, // temperature
        -0.229, // avg_logprob
        1.5, // compression_ratio
        0.015, // no_speech_prob
      ];

      expect(rawSegment[0]).toBe(0); // id
      expect(rawSegment[4]).toBe("This is a test."); // text
      expect(rawSegment[5]).toEqual([314, 761, 284]); // tokens
    });
  });

  describe("TranscriptionResponse", () => {
    it("should support whisper.cpp format", () => {
      const response: TranscriptionResponse = {
        text: "Full transcription text",
        language: "english",
        segments: [
          {
            id: 0,
            start: 0.0,
            end: 4.5,
            text: "Segment text",
            tokens: [314, 761, 284],
            temperature: 0,
            avg_logprob: -0.229,
            no_speech_prob: 0.015,
          },
        ],
        task: "transcribe",
        duration: 19.93,
        detected_language: "english",
        detected_language_probability: 0.98,
        language_probabilities: {
          en: 0.98,
          es: 0.01,
        },
      };

      expect(response.text).toBe("Full transcription text");
      expect(response.language).toBe("english");
      expect(response.segments).toHaveLength(1);
      expect(response.task).toBe("transcribe");
      expect(response.duration).toBe(19.93);
      expect(response.detected_language).toBe("english");
      expect(response.language_probabilities?.en).toBe(0.98);
    });

    it("should support minimal response without optional fields", () => {
      const response: TranscriptionResponse = {
        text: "Full transcription text",
        language: "english",
        segments: [],
      };

      expect(response.text).toBe("Full transcription text");
      expect(response.language).toBe("english");
      expect(response.segments).toEqual([]);
      expect(response.task).toBeUndefined();
      expect(response.duration).toBeUndefined();
    });
  });
});
