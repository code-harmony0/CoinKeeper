/**
 * The on-device model.
 *
 * Gemma 3 270M instruction-tuned, Q8_0. Google built this size specifically
 * for entity extraction and structured output rather than conversation, which
 * is exactly the job here.
 *
 * Q8_0 over the usual mobile default of Q4_K_M on purpose: at 270M parameters
 * (170M of them embeddings) 4-bit quantisation costs real accuracy, and the
 * difference on disk is only ~37MB. Licence is Gemma Terms of Use; the weights
 * are ungated on this mirror, so the download needs no token or account.
 */
export const MODEL = {
  id: 'gemma-3-270m-it-Q8_0',
  name: 'Gemma 3 270M',
  fileName: 'gemma-3-270m-it-Q8_0.gguf',
  url: 'https://huggingface.co/unsloth/gemma-3-270m-it-GGUF/resolve/main/gemma-3-270m-it-Q8_0.gguf',
  /** Exact content-length, used to tell a finished download from a truncated one. */
  bytes: 291546144,
} as const;

export const MODEL_SIZE_LABEL = '278 MB';

/**
 * A partial download leaves a valid-looking file behind, and llama.cpp fails
 * obscurely on one. Size is the cheap check that catches both truncation and
 * an error page saved under the model's name.
 */
export const isCompleteDownload = (bytesOnDisk: number): boolean =>
  bytesOnDisk === MODEL.bytes;

export const downloadProgress = (bytesWritten: number): number =>
  Math.min(100, Math.round((bytesWritten / MODEL.bytes) * 100));
