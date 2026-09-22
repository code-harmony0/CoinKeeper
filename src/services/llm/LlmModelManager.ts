import RNFS from 'react-native-fs';
import { MODEL, downloadProgress, isCompleteDownload } from './modelConfig';

export type ModelState = 'absent' | 'downloading' | 'ready';

/** Private app storage, not the cache dir: the OS may evict caches under pressure. */
export const modelPath = (): string => `${RNFS.DocumentDirectoryPath}/${MODEL.fileName}`;

let activeJobId: number | null = null;

export const LlmModelManager = {
  async getState(): Promise<ModelState> {
    if (activeJobId !== null) return 'downloading';

    const path = modelPath();
    if (!(await RNFS.exists(path))) return 'absent';

    const { size } = await RNFS.stat(path);
    if (isCompleteDownload(Number(size))) return 'ready';

    // A half-written file is worse than none: it looks installed and fails at
    // load time. Clear it so the next attempt starts clean.
    await RNFS.unlink(path).catch(() => undefined);
    return 'absent';
  },

  /**
   * Downloads the model, reporting whole-percent progress. Resolves true once
   * the file on disk is the size we expect, false if it is not — a download
   * that "succeeded" at the wrong size is a failure.
   */
  async download(onProgress?: (percent: number) => void): Promise<boolean> {
    if (activeJobId !== null) return false;

    const path = modelPath();
    const { jobId, promise } = RNFS.downloadFile({
      fromUrl: MODEL.url,
      toFile: path,
      background: true,
      discretionary: true,
      progressInterval: 500,
      progress: ({ bytesWritten }) => onProgress?.(downloadProgress(bytesWritten)),
    });

    activeJobId = jobId;
    try {
      const { statusCode } = await promise;
      if (statusCode !== 200) {
        await RNFS.unlink(path).catch(() => undefined);
        return false;
      }

      const { size } = await RNFS.stat(path);
      if (!isCompleteDownload(Number(size))) {
        await RNFS.unlink(path).catch(() => undefined);
        return false;
      }
      return true;
    } catch {
      await RNFS.unlink(path).catch(() => undefined);
      return false;
    } finally {
      activeJobId = null;
    }
  },

  cancel(): void {
    if (activeJobId === null) return;
    RNFS.stopDownload(activeJobId);
    activeJobId = null;
    void RNFS.unlink(modelPath()).catch(() => undefined);
  },

  async remove(): Promise<void> {
    await RNFS.unlink(modelPath()).catch(() => undefined);
  },
};
