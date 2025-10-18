import { waitForFileStability } from "../../src/utils/fileStability";
import { DataAdapter } from "obsidian";

describe("File Stability Checker", () => {
  let mockAdapter: jest.Mocked<DataAdapter>;

  beforeEach(() => {
    mockAdapter = {
      exists: jest.fn(),
      stat: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("waitForFileStability", () => {
    it("should resolve immediately when file has non-zero stable size", async () => {
      const filepath = "test/file.mp3";
      const fileSize = 1024;

      mockAdapter.exists.mockResolvedValue(true);
      mockAdapter.stat.mockResolvedValue({ size: fileSize } as any);

      const startTime = Date.now();
      await waitForFileStability(filepath, mockAdapter, 1000, 500);
      const duration = Date.now() - startTime;

      // Should complete within stability delay + check interval
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThan(2000);
      expect(mockAdapter.exists).toHaveBeenCalled();
      expect(mockAdapter.stat).toHaveBeenCalled();
    });

    it("should wait for file size to stop changing", async () => {
      const filepath = "test/file.mp3";
      let callCount = 0;
      const sizes = [0, 512, 1024, 1536, 2048, 2048, 2048];

      mockAdapter.exists.mockResolvedValue(true);
      mockAdapter.stat.mockImplementation(async () => {
        const size = sizes[Math.min(callCount, sizes.length - 1)];
        callCount++;
        return { size } as any;
      });

      const startTime = Date.now();
      await waitForFileStability(filepath, mockAdapter, 1000, 500);
      const duration = Date.now() - startTime;

      // Should wait for file to stabilize (multiple checks while size is changing)
      expect(callCount).toBeGreaterThan(5);
      expect(duration).toBeGreaterThanOrEqual(1000);
    });

    it("should wait for file to have non-zero size", async () => {
      const filepath = "test/file.mp3";
      let callCount = 0;
      const sizes = [0, 0, 0, 1024, 1024, 1024];

      mockAdapter.exists.mockResolvedValue(true);
      mockAdapter.stat.mockImplementation(async () => {
        const size = sizes[Math.min(callCount, sizes.length - 1)];
        callCount++;
        return { size } as any;
      });

      await waitForFileStability(filepath, mockAdapter, 1000, 500);

      // Should keep checking until file has non-zero size
      expect(callCount).toBeGreaterThanOrEqual(4);
    });

    it("should reject when file does not exist", async () => {
      const filepath = "test/nonexistent.mp3";

      mockAdapter.exists.mockResolvedValue(false);

      await expect(waitForFileStability(filepath, mockAdapter, 1000, 500)).rejects.toThrow(
        "File does not exist"
      );
    });

    it("should reject when stat fails", async () => {
      const filepath = "test/file.mp3";

      mockAdapter.exists.mockResolvedValue(true);
      mockAdapter.stat.mockResolvedValue(null as any);

      await expect(waitForFileStability(filepath, mockAdapter, 1000, 500)).rejects.toThrow(
        "Could not get stats"
      );
    });

    it("should use custom stability delay and check interval", async () => {
      const filepath = "test/file.mp3";
      const fileSize = 1024;
      const customDelay = 2000;
      const customInterval = 500;

      mockAdapter.exists.mockResolvedValue(true);
      mockAdapter.stat.mockResolvedValue({ size: fileSize } as any);

      const startTime = Date.now();
      await waitForFileStability(filepath, mockAdapter, customDelay, customInterval);
      const duration = Date.now() - startTime;

      // Should respect custom delay
      expect(duration).toBeGreaterThanOrEqual(customDelay);
      expect(duration).toBeLessThan(customDelay + 1000);
    });

    it("should handle file that grows then stabilizes", async () => {
      const filepath = "test/growing-file.mp3";
      let callCount = 0;
      // Simulate a file being written: 0 -> growing -> stable at 5MB
      const sizes = [0, 1024000, 2048000, 3072000, 4096000, 5242880, 5242880, 5242880];

      mockAdapter.exists.mockResolvedValue(true);
      mockAdapter.stat.mockImplementation(async () => {
        const size = sizes[Math.min(callCount, sizes.length - 1)];
        callCount++;
        return { size } as any;
      });

      const startTime = Date.now();
      await waitForFileStability(filepath, mockAdapter, 1500, 500);
      const duration = Date.now() - startTime;

      // Should wait for multiple checks while growing, then stability delay
      expect(callCount).toBeGreaterThan(6);
      expect(duration).toBeGreaterThanOrEqual(1500);
    });

    it("should handle rapid successive size changes", async () => {
      const filepath = "test/file.mp3";
      let callCount = 0;
      // Simulate rapid writes with small increments
      const sizes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1000, 1000];

      mockAdapter.exists.mockResolvedValue(true);
      mockAdapter.stat.mockImplementation(async () => {
        const size = sizes[Math.min(callCount, sizes.length - 1)];
        callCount++;
        return { size } as any;
      });

      await waitForFileStability(filepath, mockAdapter, 1000, 300);

      // Should keep checking through all the size changes
      expect(callCount).toBeGreaterThanOrEqual(10);
    });
  });
});
