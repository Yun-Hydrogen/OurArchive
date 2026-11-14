/**
 * 音频时长解析（WAV / Ogg）。
 *
 * 只做「够前端显示时长」的头部解析，不做完整解码；算不出返回 `UNKNOWN_DURATION`。
 */
import fs from 'node:fs';
/** 音频时长的轻量解析结果（秒，整数）；解析失败为 -1 */
export const UNKNOWN_DURATION = -1;

/**
 * 从文件内容算音频时长（秒，保留整数）。
 *
 * 只覆盖 `packages.ts` 里 `AUDIO_EXTENSIONS` 常见的几种：
 * - WAV（PCM / WAVE_FORMAT_EXTENSIBLE）：解析 RIFF 的 `fmt ` 块拿采样率 / 位深 / 通道数，
 *   `data` 块给出字节数，时长 = 字节数 / (采样率 × 通道数 × 位深/8)。
 * - Ogg / Opus：按 Ogg 容器 + OpusHead（本包实际的格式）解析；非 Opus 直接回 -1，
 *   这里是「前端能显示时长」，不是要完整解码。
 *
 * 返回 -1 表示「现在算不出」，前端只会显示「时长未知」，不影响播放。
 */
export function parseAudioDuration(filePath: string): number {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return UNKNOWN_DURATION;
  }

  // WAV
  if (buffer.length > 44 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    return parseWavDuration(buffer);
  }

  // Ogg / Opus
  if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === 'OggS') {
    return parseOggDuration(buffer);
  }

  // 其余格式回「未知」，前端不显示而不是 0
  return UNKNOWN_DURATION;
}

/**
 * 扫描 WAV 的 RIFF 块，算时长（秒，整数）。
 * fmt 块在前、data 块在后（有些文件还带 fact 块，这里按 8 字节头逐块走）。
 */
function parseWavDuration(buffer: Buffer): number {
  let offset = 12;
  let fmt: Buffer | null = null;
  let dataBytes = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === 'fmt ') {
      fmt = buffer.subarray(chunkDataStart, chunkDataStart + Math.min(chunkSize, 64));
    } else if (chunkId === 'data') {
      dataBytes = chunkSize;
      break;
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!fmt || fmt.length < 16 || dataBytes <= 0) {
    return UNKNOWN_DURATION;
  }

  const channels = fmt.readUInt16LE(2);
  const sampleRate = fmt.readUInt32LE(4);
  const byteRate = fmt.readUInt32LE(8);
  const blockAlign = fmt.readUInt16LE(12);
  const bitsPerSample = fmt.readUInt16LE(14) || 16;

  // 有些 mono WAV 把通道数写成了 0，按单通道兜底，不让时长误判回 -1。
  const safeChannels = channels > 0 && channels <= 64 ? channels : 1;
  const safeBits = bitsPerSample > 0 && bitsPerSample <= 64 ? bitsPerSample : 16;

  if (sampleRate <= 0) {
    return UNKNOWN_DURATION;
  }

  // 优先用 ByteRate（fmt 块写死的每秒字节数，最准）；没有时用
  // SampleRate * BlockAlign，BlockAlign = Channels * bitsPerSample / 8
  const bytesPerSecond =
    byteRate > 0
      ? byteRate
      : blockAlign > 0
        ? sampleRate * blockAlign
        : sampleRate * safeChannels * (safeBits / 8);

  if (bytesPerSecond <= 0) {
    return UNKNOWN_DURATION;
  }

  const seconds = dataBytes / bytesPerSecond;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return UNKNOWN_DURATION;
  }

  // 小数秒要保留一位小数的前端展示（0.6s 这种别塌成 0）
  return Math.max(0, Math.floor(seconds * 10) / 10);
}

/** OpusHead 路径：按 Ogg 容器 + OpusHead 解析时长（只覆盖 Opus，非 Opus 回 -1） */
function parseOggDuration(buffer: Buffer): number {
  // OpusHead 前 5 字节: "OpusHe" (0xOpusHead)
  const opusHeadIdx = buffer.indexOf(Buffer.from('OpusHead'));
  if (opusHeadIdx === -1) {
    return UNKNOWN_DURATION;
  }

  // 找 GranulePosition 在页面头
  const granuleOffset = opusHeadIdx > 22 ? 22 : 0;
  const granule = buffer.readBigUInt64LE(granuleOffset);
  const sampleRate = buffer.readUInt32LE(opusHeadIdx + 8);
  if (sampleRate <= 0) {
    return UNKNOWN_DURATION;
  }

  // 一页 granule 单位采样数，换算秒时会向上取补齐
  const seconds = Number(granule) / sampleRate;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return UNKNOWN_DURATION;
  }

  return Math.max(0, Math.floor(seconds));
}
