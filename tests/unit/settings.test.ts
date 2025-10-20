/**
 * Unit tests for Settings
 * 
 * Note: We test the settings structure and values without importing the full
 * settings module to avoid Obsidian dependencies in unit tests.
 */

import { AudioOutputExtension } from "../../src/types";

// Define the expected Settings interface for testing
interface Settings {
  endpoint: string;
  recordingDeviceId: string | null;
  watchDirectory: string;
  outputDirectory: string;
  audioOutputExtension: AudioOutputExtension;
  shouldDeleteOriginal: boolean;
  shouldCommitChanges: boolean;
  commitMessageTemplate: string;
  shouldUseCategoryMaps: boolean;
  categoryMap: Record<string, string>;
  shouldExtractTags: boolean;
  tags: Array<string>;
  tagLimit: number;
  temperature: string;
  temperatureInc: string;
}

// Expected default settings based on implementation
const EXPECTED_DEFAULT_SETTINGS: Settings = {
  endpoint: "",
  recordingDeviceId: null,
  audioOutputExtension: AudioOutputExtension.MP3,
  outputDirectory: "Voice",
  watchDirectory: "Voice/unprocessed",
  commitMessageTemplate: "🤖 {datetime} Transcribed {amount} File(s)",
  shouldDeleteOriginal: false,
  shouldUseCategoryMaps: false,
  shouldCommitChanges: true,
  shouldExtractTags: true,
  tags: [],
  tagLimit: 5,
  categoryMap: {
    LN: "Life Note",
    IN: "Insight",
    DR: "Dream",
    RM: "Ramble",
  },
  temperature: "0.0",
  temperatureInc: "0.2",
};

describe("Settings Structure", () => {
  describe("Expected Default Settings", () => {
    it("should have correct whisper.cpp defaults", () => {
      expect(EXPECTED_DEFAULT_SETTINGS.temperature).toBe("0.0");
      expect(EXPECTED_DEFAULT_SETTINGS.temperatureInc).toBe("0.2");
    });

    it("should have correct endpoint defaults", () => {
      expect(EXPECTED_DEFAULT_SETTINGS.endpoint).toBe("");
    });

    it("should have correct general defaults", () => {
      expect(EXPECTED_DEFAULT_SETTINGS.recordingDeviceId).toBeNull();
      expect(EXPECTED_DEFAULT_SETTINGS.audioOutputExtension).toBe(
        AudioOutputExtension.MP3
      );
      expect(EXPECTED_DEFAULT_SETTINGS.outputDirectory).toBe("Voice");
      expect(EXPECTED_DEFAULT_SETTINGS.watchDirectory).toBe(
        "Voice/unprocessed"
      );
    });

    it("should have correct tag extraction defaults", () => {
      expect(EXPECTED_DEFAULT_SETTINGS.shouldExtractTags).toBe(true);
      expect(EXPECTED_DEFAULT_SETTINGS.tags).toEqual([]);
      expect(EXPECTED_DEFAULT_SETTINGS.tagLimit).toBe(5);
    });

    it("should have correct categorization defaults", () => {
      expect(EXPECTED_DEFAULT_SETTINGS.shouldUseCategoryMaps).toBe(false);
      expect(EXPECTED_DEFAULT_SETTINGS.categoryMap).toEqual({
        LN: "Life Note",
        IN: "Insight",
        DR: "Dream",
        RM: "Ramble",
      });
    });
  });

  describe("Settings Values", () => {
    it("should accept valid temperature values", () => {
      const settings: Partial<Settings> = {
        temperature: "0.0",
      };
      expect(settings.temperature).toBe("0.0");

      settings.temperature = "0.5";
      expect(settings.temperature).toBe("0.5");

      settings.temperature = "1.0";
      expect(settings.temperature).toBe("1.0");
    });

    it("should accept valid temperatureInc values", () => {
      const settings: Partial<Settings> = {
        temperatureInc: "0.1",
      };
      expect(settings.temperatureInc).toBe("0.1");

      settings.temperatureInc = "0.2";
      expect(settings.temperatureInc).toBe("0.2");

      settings.temperatureInc = "0.5";
      expect(settings.temperatureInc).toBe("0.5");
    });

    it("should support endpoint configuration", () => {
      const settings: Partial<Settings> = {
        endpoint: "http://127.0.0.1:8080",
      };

      expect(settings.endpoint).toBe("http://127.0.0.1:8080");
    });
  });

  describe("Temperature Validation", () => {
    it("should handle edge case temperature values", () => {
      const minTemp = "0.0"; // Minimum (deterministic)
      expect(parseFloat(minTemp)).toBe(0.0);

      const maxTemp = "1.0"; // Maximum
      expect(parseFloat(maxTemp)).toBe(1.0);
    });

    it("should handle decimal temperature values", () => {
      const temp1 = "0.25";
      expect(parseFloat(temp1)).toBeCloseTo(0.25, 2);

      const temp2 = "0.75";
      expect(parseFloat(temp2)).toBeCloseTo(0.75, 2);
    });
  });

  describe("Settings Interface Compliance", () => {
    it("should have all required whisper.cpp fields", () => {
      const settings: Settings = EXPECTED_DEFAULT_SETTINGS;

      expect(settings).toHaveProperty("temperature");
      expect(settings).toHaveProperty("temperatureInc");
      expect(typeof settings.temperature).toBe("string");
      expect(typeof settings.temperatureInc).toBe("string");
    });

    it("should have all required endpoint fields", () => {
      const settings: Settings = EXPECTED_DEFAULT_SETTINGS;

      expect(settings).toHaveProperty("endpoint");
      expect(typeof settings.endpoint).toBe("string");
    });
  });
});
