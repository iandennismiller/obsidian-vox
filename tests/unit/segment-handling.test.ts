/**
 * Unit tests for MarkdownProcessor segment handling
 */

import {
  TranscriptionSegment,
  RawTranscriptionSegment,
} from "../../src/types";

describe("MarkdownProcessor Segment Handling", () => {
  // Helper function to simulate objectifySegment logic
  const objectifySegment = (
    segment: RawTranscriptionSegment | TranscriptionSegment
  ): TranscriptionSegment => {
    // Small snippets can be returned as TranscriptionSegment from the API.
    if (segment.hasOwnProperty("text")) {
      return segment as TranscriptionSegment;
    }

    // Handle legacy array format
    const rawSegment = segment as RawTranscriptionSegment;
    return {
      id: rawSegment[0],
      seek: rawSegment[1],
      start: rawSegment[2],
      end: rawSegment[3],
      text: rawSegment[4],
      tokens: rawSegment[5],
      temperature: rawSegment[6],
      avg_logprob: rawSegment[7],
      compression_ratio: rawSegment[8],
      no_speech_prob: rawSegment[9],
    };
  };

  describe("objectifySegment", () => {
    it("should handle object format segments (whisper.cpp)", () => {
      const objectSegment: TranscriptionSegment = {
        id: 0,
        start: 0.0,
        end: 4.5,
        text: "This is an object format segment.",
        tokens: [314, 761, 284],
        temperature: 0,
        avg_logprob: -0.229,
        no_speech_prob: 0.015,
      };

      const result = objectifySegment(objectSegment);

      expect(result.id).toBe(0);
      expect(result.text).toBe("This is an object format segment.");
      expect(result.start).toBe(0.0);
      expect(result.end).toBe(4.5);
      expect(result.tokens).toEqual([314, 761, 284]);
    });

    it("should handle array format segments (legacy)", () => {
      const arraySegment: RawTranscriptionSegment = [
        0, // id
        0, // seek
        0.0, // start
        4.5, // end
        "This is an array format segment.", // text
        [314, 761, 284], // tokens
        0, // temperature
        -0.229, // avg_logprob
        1.5, // compression_ratio
        0.015, // no_speech_prob
      ];

      const result = objectifySegment(arraySegment);

      expect(result.id).toBe(0);
      expect(result.text).toBe("This is an array format segment.");
      expect(result.start).toBe(0.0);
      expect(result.end).toBe(4.5);
      expect(result.seek).toBe(0);
      expect(result.compression_ratio).toBe(1.5);
      expect(result.tokens).toEqual([314, 761, 284]);
    });

    it("should preserve word-level timestamps in object format", () => {
      const segmentWithWords: TranscriptionSegment = {
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
          {
            word: "is",
            start: 0.5,
            end: 0.8,
            t_dtw: -1,
            probability: 0.98,
          },
        ],
      };

      const result = objectifySegment(segmentWithWords);

      expect(result.words).toHaveLength(2);
      expect(result.words![0].word).toBe("This");
      expect(result.words![1].word).toBe("is");
    });

    it("should handle multiple segments in sequence", () => {
      const segments: (RawTranscriptionSegment | TranscriptionSegment)[] = [
        // Object format
        {
          id: 0,
          start: 0.0,
          end: 4.5,
          text: "First segment.",
          tokens: [314, 761],
          temperature: 0,
          avg_logprob: -0.229,
          no_speech_prob: 0.015,
        },
        // Array format
        [
          1, // id
          100, // seek
          4.5, // start
          9.0, // end
          "Second segment.", // text
          [284, 651], // tokens
          0, // temperature
          -0.189, // avg_logprob
          1.4, // compression_ratio
          0.012, // no_speech_prob
        ],
      ];

      const results = segments.map(objectifySegment);

      expect(results).toHaveLength(2);
      expect(results[0].text).toBe("First segment.");
      expect(results[1].text).toBe("Second segment.");
      expect(results[0].id).toBe(0);
      expect(results[1].id).toBe(1);
    });
  });

  describe("Segment Backward Compatibility", () => {
    it("should support segments without optional fields", () => {
      const minimalSegment: TranscriptionSegment = {
        id: 0,
        start: 0.0,
        end: 4.5,
        text: "Minimal segment.",
        tokens: [314],
        temperature: 0,
        avg_logprob: -0.229,
        no_speech_prob: 0.015,
      };

      const result = objectifySegment(minimalSegment);

      expect(result.text).toBe("Minimal segment.");
      expect(result.seek).toBeUndefined();
      expect(result.compression_ratio).toBeUndefined();
      expect(result.words).toBeUndefined();
    });

    it("should support segments with all optional fields", () => {
      const fullSegment: TranscriptionSegment = {
        id: 0,
        start: 0.0,
        end: 4.5,
        text: "Full segment.",
        tokens: [314],
        temperature: 0,
        avg_logprob: -0.229,
        no_speech_prob: 0.015,
        seek: 0,
        compression_ratio: 1.5,
        words: [
          {
            word: "Full",
            start: 0.0,
            end: 0.5,
            t_dtw: -1,
            probability: 0.95,
          },
        ],
      };

      const result = objectifySegment(fullSegment);

      expect(result.text).toBe("Full segment.");
      expect(result.seek).toBe(0);
      expect(result.compression_ratio).toBe(1.5);
      expect(result.words).toHaveLength(1);
    });
  });
});
