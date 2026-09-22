import {
  MODEL,
  isCompleteDownload,
  downloadProgress,
} from '../../src/services/llm/modelConfig';

describe('MODEL config', () => {
  it('points at an ungated GGUF that needs no token', () => {
    expect(MODEL.url).toMatch(/^https:\/\/huggingface\.co\//);
    expect(MODEL.url).toMatch(/\.gguf$/);
  });

  it('knows the exact size it expects', () => {
    expect(MODEL.bytes).toBe(291546144);
  });
});

describe('isCompleteDownload', () => {
  it('accepts a file of exactly the expected size', () => {
    expect(isCompleteDownload(MODEL.bytes)).toBe(true);
  });

  it('rejects a truncated file, which is what an interrupted download leaves', () => {
    expect(isCompleteDownload(MODEL.bytes - 1)).toBe(false);
  });

  it('rejects a zero-byte file', () => {
    expect(isCompleteDownload(0)).toBe(false);
  });

  it('rejects an HTML error page saved under the model name', () => {
    expect(isCompleteDownload(4096)).toBe(false);
  });
});

describe('downloadProgress', () => {
  it('reports nothing at the start', () => {
    expect(downloadProgress(0)).toBe(0);
  });

  it('reports completion at the full size', () => {
    expect(downloadProgress(MODEL.bytes)).toBe(100);
  });

  it('rounds to a whole percent', () => {
    expect(Number.isInteger(downloadProgress(MODEL.bytes / 3))).toBe(true);
  });

  it('never exceeds 100 even if the server sends more than expected', () => {
    expect(downloadProgress(MODEL.bytes * 2)).toBe(100);
  });
});
