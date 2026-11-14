/**
 * 表情解析：`index/emotions.yml` → 合成图层 + 关键帧。
 *
 * 播放逻辑由前端解释，这里只负责把 yml 翻成结构化数据并把资源路径转成 URL。
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type {
  PackageEmotion,
  ResourcePackage,
  PackageEmotionKeyframe,
  PackageEmotionLayer,
} from '@/modules/API/types';
import {
  AUDIO_EXTENSIONS,
  EMOTION_INDEX_DIR,
  EMOTION_INDEX_FILE,
  IMAGE_EXTENSIONS,
  asText,
  buildAssetUrl,
  getContent,
  resolveInside,
} from '@/modules/PackageProvider/packageManifest.server';
/* ------------------------------ 表情 ------------------------------ */

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(asText(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** `[x, y]` / `{x, y}` / 单个数字 → 二元组 */
function asPair(value: unknown, fallback: [number, number]): [number, number] {
  if (Array.isArray(value) && value.length >= 2) {
    return [asNumber(value[0], fallback[0]), asNumber(value[1], fallback[1])];
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [
      asNumber(record.x, fallback[0]),
      asNumber(record.y, fallback[1]),
    ];
  }
  if (value !== undefined && value !== null && value !== '') {
    const single = asNumber(value, NaN);
    if (Number.isFinite(single)) {
      return [single, single];
    }
  }
  return [...fallback];
}

/** 解析一层的关键帧，自动补 0 起点、排序并去掉非法项 */
function parseEmotionKeyframes(raw: unknown, duration: number): PackageEmotionKeyframe[] {
  if (!Array.isArray(raw)) {
    return [{ at: 0 }, { at: duration }];
  }

  const frames: PackageEmotionKeyframe[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const frame: PackageEmotionKeyframe = { at: asNumber(record.at, NaN) };
    if (!Number.isFinite(frame.at) || frame.at < 0) {
      continue;
    }
    for (const key of ['opacity', 'zoom', 'x', 'y', 'rotate'] as const) {
      const value = record[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      const parsed = asNumber(value, NaN);
      if (Number.isFinite(parsed)) {
        frame[key] = parsed;
      }
    }
    frames.push(frame);
  }

  if (!frames.length) {
    return [{ at: 0 }, { at: duration }];
  }

  frames.sort((a, b) => a.at - b.at);
  if (frames[0].at > 0) {
    frames.unshift({ at: 0 });
  }
  return frames;
}

/** 解析一层图；`parent` 用下标引用同一表情里更早的层 */
function parseEmotionLayer(
  root: string,
  packageId: string,
  raw: unknown,
  index: number
): PackageEmotionLayer | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const relative = asText(record.image || record.file).replace(/^[/\\]+/, '');
  if (!relative) {
    return null;
  }

  const resolved = resolveInside(root, relative);
  const exists = Boolean(resolved && fs.existsSync(resolved));
  const duration = Math.max(0.05, asNumber(record.duration, 1));
  const parent = Math.trunc(asNumber(record.parent, -1));

  return {
    image: buildAssetUrl(packageId, 'emotions', relative),
    exists,
    scale: Math.max(0.0001, asNumber(record.scale, 1)),
    duration,
    ease: asText(record.ease) || 'linear',
    anchor: asPair(record.anchor, [0, 0]),
    position: asPair(record.position, [0, 0]),
    // 只允许引用更早的层，避免成环
    parent: parent >= 0 && parent < index ? parent : -1,
    keyframes: parseEmotionKeyframes(record.keyframes, duration),
  };
}

/**
 * 读取 Emotions 分类的表情清单（`<path>/index/emotions.yml`）。
 *
 * 索引只描述「资源 + 关键帧」，播放逻辑由前端解释，因此换表情只需要改 yml。
 * 图层顺序即叠放顺序；`parent` 引用更早的层，位置按父层宽度换算。
 */
export function readPackageEmotions(
  packageDir: string,
  pkg: ResourcePackage
): PackageEmotion[] {
  const content = getContent(pkg, 'Emotions');
  if (!content || !content.supported) {
    return [];
  }

  const root = resolveInside(packageDir, content.path);
  if (!root) {
    return [];
  }

  const indexFile = resolveInside(root, `${EMOTION_INDEX_DIR}/${EMOTION_INDEX_FILE}`);
  if (!indexFile || !fs.existsSync(indexFile)) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(fs.readFileSync(indexFile, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return [];
  }

  const list = (parsed as { emotions?: unknown } | null)?.emotions;
  if (!Array.isArray(list)) {
    return [];
  }

  const emotions: PackageEmotion[] = [];

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const id = asText(record.id);
    if (!id) {
      continue;
    }

    const layers: PackageEmotionLayer[] = [];
    for (const rawLayer of Array.isArray(record.layers) ? record.layers : []) {
      const layer = parseEmotionLayer(root, pkg.id, rawLayer, layers.length);
      if (layer) {
        layers.push(layer);
      }
    }
    if (!layers.length) {
      continue;
    }

    const soundRelative = asText(record.sound).replace(/^[/\\]+/, '');
    const soundFile = soundRelative ? resolveInside(root, soundRelative) : null;
    const soundExists = Boolean(
      soundFile && fs.existsSync(soundFile) && fs.statSync(soundFile).isFile()
    );

    const duration = Math.max(
      asNumber(record.duration, 0),
      ...layers.map((layer) => layer.duration)
    );

    emotions.push({
      id,
      name: asText(record.name) || id,
      description: asText(record.description),
      offset: asPair(record.offset, [0, 0]),
      duration,
      soundUrl:
        soundRelative && soundExists
          ? buildAssetUrl(pkg.id, 'emotions', soundRelative)
          : '',
      soundExists,
      layers,
    });
  }

  return emotions;
}

/** 在 Emotions 目录里定位一张图片 / 一段音效，越界或不存在返回 null */
export function resolveEmotionFile(
  packageDir: string,
  pkg: ResourcePackage,
  relative: string
): string | null {
  const content = getContent(pkg, 'Emotions');
  if (!content || !content.supported) {
    return null;
  }

  const root = resolveInside(packageDir, content.path);
  if (!root) {
    return null;
  }

  const target = resolveInside(root, relative);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return null;
  }

  const ext = path.extname(target).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext) && !AUDIO_EXTENSIONS.has(ext)) {
    return null;
  }
  return target;
}
