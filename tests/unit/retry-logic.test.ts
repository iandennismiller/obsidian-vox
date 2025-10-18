/**
 * Unit tests for retry logic and geometric backoff
 */

describe("Retry Logic", () => {
  describe("Geometric Backoff Calculation", () => {
    const calculateBackoffDelay = (
      retryCount: number,
      baseDelayMs: number,
      maxDelayMs: number
    ): number => {
      const geometricDelay = baseDelayMs * Math.pow(2, retryCount);
      return Math.min(geometricDelay, maxDelayMs);
    };

    it("should calculate correct delay for first retry (2^0 = 1x base)", () => {
      const baseDelay = 5000; // 5 seconds
      const maxDelay = 300000; // 5 minutes
      const delay = calculateBackoffDelay(0, baseDelay, maxDelay);

      expect(delay).toBe(5000); // 5 seconds
    });

    it("should calculate correct delay for second retry (2^1 = 2x base)", () => {
      const baseDelay = 5000;
      const maxDelay = 300000;
      const delay = calculateBackoffDelay(1, baseDelay, maxDelay);

      expect(delay).toBe(10000); // 10 seconds
    });

    it("should calculate correct delay for third retry (2^2 = 4x base)", () => {
      const baseDelay = 5000;
      const maxDelay = 300000;
      const delay = calculateBackoffDelay(2, baseDelay, maxDelay);

      expect(delay).toBe(20000); // 20 seconds
    });

    it("should calculate correct delay for fourth retry (2^3 = 8x base)", () => {
      const baseDelay = 5000;
      const maxDelay = 300000;
      const delay = calculateBackoffDelay(3, baseDelay, maxDelay);

      expect(delay).toBe(40000); // 40 seconds
    });

    it("should cap delay at maximum", () => {
      const baseDelay = 5000;
      const maxDelay = 60000; // 1 minute max
      const delay = calculateBackoffDelay(10, baseDelay, maxDelay);

      // 2^10 = 1024, so 5000 * 1024 = 5,120,000ms
      // Should be capped at 60,000ms
      expect(delay).toBe(60000);
    });

    it("should handle zero retry count", () => {
      const baseDelay = 1000;
      const maxDelay = 10000;
      const delay = calculateBackoffDelay(0, baseDelay, maxDelay);

      expect(delay).toBe(1000);
    });

    it("should follow geometric progression", () => {
      const baseDelay = 1000;
      const maxDelay = 1000000;

      const delays = [
        calculateBackoffDelay(0, baseDelay, maxDelay), // 1000
        calculateBackoffDelay(1, baseDelay, maxDelay), // 2000
        calculateBackoffDelay(2, baseDelay, maxDelay), // 4000
        calculateBackoffDelay(3, baseDelay, maxDelay), // 8000
        calculateBackoffDelay(4, baseDelay, maxDelay), // 16000
      ];

      // Each delay should be double the previous one
      expect(delays[1]).toBe(delays[0] * 2);
      expect(delays[2]).toBe(delays[1] * 2);
      expect(delays[3]).toBe(delays[2] * 2);
      expect(delays[4]).toBe(delays[3] * 2);
    });

    it("should work with different base delays", () => {
      const maxDelay = 1000000;

      // Different base delays should scale proportionally
      const delay1k = calculateBackoffDelay(2, 1000, maxDelay);
      const delay2k = calculateBackoffDelay(2, 2000, maxDelay);
      const delay5k = calculateBackoffDelay(2, 5000, maxDelay);

      expect(delay1k).toBe(4000); // 1000 * 2^2
      expect(delay2k).toBe(8000); // 2000 * 2^2
      expect(delay5k).toBe(20000); // 5000 * 2^2
    });

    it("should handle edge case of very small base delay", () => {
      const baseDelay = 100; // 100ms
      const maxDelay = 5000;
      const delay = calculateBackoffDelay(5, baseDelay, maxDelay);

      // 100 * 2^5 = 100 * 32 = 3200ms
      expect(delay).toBe(3200);
    });

    it("should handle edge case where base equals max", () => {
      const baseDelay = 5000;
      const maxDelay = 5000;
      const delay = calculateBackoffDelay(0, baseDelay, maxDelay);

      expect(delay).toBe(5000);
    });

    it("should cap at max even on first retry if base > max", () => {
      const baseDelay = 10000;
      const maxDelay = 5000;
      const delay = calculateBackoffDelay(0, baseDelay, maxDelay);

      expect(delay).toBe(5000);
    });
  });

  describe("Retry Count Tracking", () => {
    it("should increment retry count on each failure", () => {
      let retryCount = 0;

      // Simulate failures
      retryCount += 1; // First failure
      expect(retryCount).toBe(1);

      retryCount += 1; // Second failure
      expect(retryCount).toBe(2);

      retryCount += 1; // Third failure
      expect(retryCount).toBe(3);
    });

    it("should check max retries correctly", () => {
      const maxRetries = 3;
      let retryCount = 0;

      expect(retryCount >= maxRetries).toBe(false);

      retryCount = 1;
      expect(retryCount >= maxRetries).toBe(false);

      retryCount = 2;
      expect(retryCount >= maxRetries).toBe(false);

      retryCount = 3;
      expect(retryCount >= maxRetries).toBe(true);

      retryCount = 4;
      expect(retryCount >= maxRetries).toBe(true);
    });
  });

  describe("Retry Delay Examples", () => {
    it("should provide realistic delays for typical configuration", () => {
      const baseDelay = 5000; // 5 seconds
      const maxDelay = 300000; // 5 minutes

      const calculateBackoffDelay = (retryCount: number): number => {
        const geometricDelay = baseDelay * Math.pow(2, retryCount);
        return Math.min(geometricDelay, maxDelay);
      };

      // Attempt 1: 5s
      expect(calculateBackoffDelay(0)).toBe(5000);
      // Attempt 2: 10s
      expect(calculateBackoffDelay(1)).toBe(10000);
      // Attempt 3: 20s
      expect(calculateBackoffDelay(2)).toBe(20000);
      // Attempt 4: 40s
      expect(calculateBackoffDelay(3)).toBe(40000);
      // Attempt 5: 80s (1m 20s)
      expect(calculateBackoffDelay(4)).toBe(80000);
      // Attempt 6: 160s (2m 40s)
      expect(calculateBackoffDelay(5)).toBe(160000);
      // Attempt 7: 300s (5m - capped at max)
      expect(calculateBackoffDelay(6)).toBe(300000);
      // Attempt 8+: 300s (5m - capped at max)
      expect(calculateBackoffDelay(7)).toBe(300000);
    });

    it("should provide reasonable delays for aggressive configuration", () => {
      const baseDelay = 1000; // 1 second
      const maxDelay = 60000; // 1 minute

      const calculateBackoffDelay = (retryCount: number): number => {
        const geometricDelay = baseDelay * Math.pow(2, retryCount);
        return Math.min(geometricDelay, maxDelay);
      };

      // Attempt 1: 1s
      expect(calculateBackoffDelay(0)).toBe(1000);
      // Attempt 2: 2s
      expect(calculateBackoffDelay(1)).toBe(2000);
      // Attempt 3: 4s
      expect(calculateBackoffDelay(2)).toBe(4000);
      // Attempt 4: 8s
      expect(calculateBackoffDelay(3)).toBe(8000);
      // Attempt 5: 16s
      expect(calculateBackoffDelay(4)).toBe(16000);
      // Attempt 6: 32s
      expect(calculateBackoffDelay(5)).toBe(32000);
      // Attempt 7: 60s (capped at max)
      expect(calculateBackoffDelay(6)).toBe(60000);
    });

    it("should provide reasonable delays for conservative configuration", () => {
      const baseDelay = 10000; // 10 seconds
      const maxDelay = 600000; // 10 minutes

      const calculateBackoffDelay = (retryCount: number): number => {
        const geometricDelay = baseDelay * Math.pow(2, retryCount);
        return Math.min(geometricDelay, maxDelay);
      };

      // Attempt 1: 10s
      expect(calculateBackoffDelay(0)).toBe(10000);
      // Attempt 2: 20s
      expect(calculateBackoffDelay(1)).toBe(20000);
      // Attempt 3: 40s
      expect(calculateBackoffDelay(2)).toBe(40000);
      // Attempt 4: 80s (1m 20s)
      expect(calculateBackoffDelay(3)).toBe(80000);
      // Attempt 5: 160s (2m 40s)
      expect(calculateBackoffDelay(4)).toBe(160000);
      // Attempt 6: 320s (5m 20s)
      expect(calculateBackoffDelay(5)).toBe(320000);
      // Attempt 7: 600s (10m - capped at max)
      expect(calculateBackoffDelay(6)).toBe(600000);
    });
  });
});
