import { DataAdapter } from "obsidian";

/**
 * Check if a file has a non-zero size and has stopped changing.
 * This is useful for ensuring a file is fully written before processing it.
 *
 * @param filepath - The path to the file to check
 * @param adapter - The Obsidian vault adapter to read file info
 * @param stabilityDelayMs - How long the file size must remain unchanged (default: 3000ms)
 * @param checkIntervalMs - How often to check the file size (default: 1000ms)
 * @returns Promise that resolves when the file is stable, or rejects if file doesn't exist or becomes invalid
 */
export async function waitForFileStability(
  filepath: string,
  adapter: DataAdapter,
  stabilityDelayMs: number = 3000,
  checkIntervalMs: number = 1000
): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    let lastSize: number | null = null;
    let stableStartTime: number | null = null;
    let checkCount = 0;
    const maxChecks = Math.ceil((stabilityDelayMs * 10) / checkIntervalMs); // Allow up to 10x stability delay worth of checks

    const checkFile = async () => {
      try {
        checkCount++;

        // Check if file exists
        const exists = await adapter.exists(filepath);
        if (!exists) {
          reject(new Error(`File does not exist: ${filepath}`));
          return;
        }

        // Get file stats
        const stat = await adapter.stat(filepath);
        if (!stat) {
          reject(new Error(`Could not get stats for file: ${filepath}`));
          return;
        }

        const currentSize = stat.size;

        // Check if file has non-zero size
        if (currentSize === 0) {
          // File is empty, reset stability tracking and keep checking
          lastSize = null;
          stableStartTime = null;
          setTimeout(checkFile, checkIntervalMs);
          return;
        }

        // Check if size has changed
        if (lastSize === null || currentSize !== lastSize) {
          // Size has changed or this is first time seeing non-zero size
          // Reset the stability timer
          lastSize = currentSize;
          stableStartTime = null;
          setTimeout(checkFile, checkIntervalMs);
          return;
        }

        // Size hasn't changed since last check
        // Start tracking stability time if not already started
        if (stableStartTime === null) {
          stableStartTime = Date.now();
        }

        // Check if enough time has passed since size became stable
        const timeSinceStable = Date.now() - stableStartTime;
        if (timeSinceStable >= stabilityDelayMs) {
          // File is stable!
          resolve();
          return;
        }

        // Not stable yet, check again
        setTimeout(checkFile, checkIntervalMs);
      } catch (error) {
        reject(error);
      }
    };

    // Start checking
    checkFile();
  });
}
