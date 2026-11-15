/**
 * 表情解析：`index/emotions.yml` → 表情元数据与 PNG / SVG / 音频资源。
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type {
  PackageEmotion,
  ResourcePackage,
} from '@/modules/API/types';
import {
  AUDIO_EXTENSIONS,
  EMOTION_INDEX_DIR,
  EMOTION_INDEX_FILE,
  buildAssetUrl,
  getContent,
  resolveInside,
  asText,
} from '@/modules/PackageProvider/packageManifest.server';

const SVG_EXTENSION = '.svg';
const JSON_EXTENSION = '.json';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** 19 种表情对应的 PNG 材质映射表（BA 游戏标准，位于 images/ 目录下） */
const EMOTION_IMAGE_FILES: Record<string, string[]> = {
  heart: ['emoicon_balloon_n.png', 'emoicon_heart.png'],
  respond: ['emoicon_action.png'],
  music: ['emoicon_note.png'],
  twinkle: ['emoicon_twinkle.png'],
  upset: ['emoicon_balloon_n.png', 'emoicon_anxiety.png'],
  sweat: ['emoicon_sweat_1.png', 'emoicon_sweat_2.png'],
  dot: ['emoicon_balloon_n.png', 'emoicon_idea.png'],
  exclaim: ['emoicon_exclamationmark.png'],
  surprise: ['emoicon_exclamation.png', 'emoicon_question.png'],
  question: ['emoicon_questionmark.png'],
  shy: ['emoicon_balloon_n.png', 'emoicon_shy.png'],
  angry: ['emoicon_aggro.png'],
  chat: ['emoicon_chat.png'],
  sad: ['emoji_sad.png'],
  steam: ['emoji_steam.png'],
  sigh: ['emoji_sigh.png'],
  bulb: ['emoicon_balloon_n.png', 'emoji_bulb_1.png', 'emoji_bulb_2.png'],
  tear: ['emoji_tear_1.png', 'emoji_tear_2.png'],
  zzz: ['emoji_zzz.png'],
};

const SVG_TAG_RE = /<svg\b[^>]*>/i;

function readAttr(tag: string, name: string): string {
  const regex = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const match = regex.exec(tag);
  return match ? String(match[2] ?? match[3] ?? '') : '';
}

function toNumber(value: string): number {
  const cleaned = String(value).replace(/[^0-9.+-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseViewBox(value: string): [number, number, number, number] | null {
  const parts = String(value).trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

export function readSvgCanvas(svgText: string): { width: number; height: number } {
  const tagMatch = SVG_TAG_RE.exec(svgText);
  if (!tagMatch) {
    return { width: 0, height: 0 };
  }
  const tag = tagMatch[0];
  const width = toNumber(readAttr(tag, 'width'));
  const height = toNumber(readAttr(tag, 'height'));
  if (width > 0 && height > 0) {
    return { width, height };
  }
  const viewBox = parseViewBox(readAttr(tag, 'viewBox'));
  if (viewBox) {
    return { width: Math.max(0, viewBox[2]), height: Math.max(0, viewBox[3]) };
  }
  return { width: Math.max(0, width), height: Math.max(0, height) };
}

function readSvgAnchor(svgText: string, width: number, height: number): [number, number] {
  const meta = /<metadata[^>]*data-anchor\s*=\s*"([^"]*)"/i.exec(svgText);
  if (meta) {
    const parts = String(meta[1]).split(/[\s,]+/).map(Number);
    if (parts.length >= 2 && parts.every(Number.isFinite)) {
      return [parts[0], parts[1]];
    }
  }
  if (width > 0 && height > 0) {
    return [width / 2, Math.max(0, height * 0.1)];
  }
  return [0, 0];
}

function asNonNegativeNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(asText(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const text = asText(value).trim().toLowerCase();
  if (!text) {
    return fallback;
  }
  return ['true', 'yes', '1', 'on'].includes(text);
}

function parsePair(value: unknown, fallback: [number, number]): [number, number] {
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    return [Number.isFinite(x) ? x : fallback[0], Number.isFinite(y) ? y : fallback[1]];
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const x = Number(record.x);
    const y = Number(record.y);
    return [Number.isFinite(x) ? x : fallback[0], Number.isFinite(y) ? y : fallback[1]];
  }
  return [...fallback];
}

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

    const normalizedId = id.toLowerCase();
    const mappedFiles = EMOTION_IMAGE_FILES[normalizedId] ?? [];
    const imageUrls: string[] = [];
    let allImagesExist = mappedFiles.length > 0;

    for (const imgName of mappedFiles) {
      const candidate = resolveInside(root, `images/${imgName}`);
      if (candidate && fs.existsSync(candidate)) {
        imageUrls.push(buildAssetUrl(pkg.id, 'emotions', `images/${imgName}`));
      } else {
        allImagesExist = false;
      }
    }

    const motionRelativeCandidate =
      asText(record.motion).replace(/^[/\\]+/, '') || `motions/${id}.json`;
    const motionFile = motionRelativeCandidate
      ? resolveInside(root, motionRelativeCandidate)
      : null;
    let motionUrl = '';
    let motionDuration = 0;
    if (motionFile && fs.existsSync(motionFile) && fs.statSync(motionFile).isFile()) {
      motionUrl = buildAssetUrl(pkg.id, 'emotions', motionRelativeCandidate);
      try {
        const motionJson = JSON.parse(fs.readFileSync(motionFile, 'utf-8'));
        if (typeof motionJson.duration === 'number') {
          motionDuration = motionJson.duration;
        }
        if (Array.isArray(motionJson.layers)) {
          for (const layer of motionJson.layers) {
            if (layer && typeof layer.texture === 'string') {
              const texRel = layer.texture.replace(/^[/\\]+/, '');
              const texCandidate = resolveInside(root, texRel);
              if (texCandidate && fs.existsSync(texCandidate)) {
                const texUrl = buildAssetUrl(pkg.id, 'emotions', texRel);
                if (!imageUrls.includes(texUrl)) {
                  imageUrls.push(texUrl);
                }
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const entryRelative = asText(record.entry).replace(/^[/\\]+/, '');
    const entryIsSvg = entryRelative.toLowerCase().endsWith(SVG_EXTENSION);
    const entryFile = entryIsSvg ? resolveInside(root, entryRelative) : null;
    let svgText = '';
    if (entryFile && fs.existsSync(entryFile)) {
      try {
        svgText = fs.readFileSync(entryFile, 'utf-8');
      } catch {
        svgText = '';
      }
    }
    const exists = allImagesExist || Boolean(svgText) || Boolean(motionUrl);
    const canvas = svgText ? readSvgCanvas(svgText) : { width: 240, height: 240 };
    const metaAnchor = svgText ? readSvgAnchor(svgText, canvas.width, canvas.height) : [canvas.width / 2, canvas.height / 3];
    const anchor = parsePair(record.anchor, metaAnchor as [number, number]);

    const soundRelative = asText(record.sound).replace(/^[/\\]+/, '');
    const soundFile = soundRelative ? resolveInside(root, soundRelative) : null;
    const soundExists = Boolean(
      soundFile && fs.existsSync(soundFile) && fs.statSync(soundFile).isFile()
    );

    emotions.push({
      id,
      name: asText(record.name) || id,
      description: asText(record.description),
      entry: entryFile && exists ? buildAssetUrl(pkg.id, 'emotions', entryRelative) : '',
      exists,
      width: canvas.width,
      height: canvas.height,
      anchor,
      duration: asNonNegativeNumber(record.duration, motionDuration),
      loop: asBoolean(record.loop, false),
      soundUrl:
        soundRelative && soundExists
          ? buildAssetUrl(pkg.id, 'emotions', soundRelative)
          : '',
      soundExists,
      imageUrls,
      motionUrl: motionUrl || undefined,
    });
  }

  return emotions;
}

/** 在 Emotions 目录里定位允许下发的 `.svg` / 图片 / 音频文件；越界或不存在返回 null */
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
  if (
    ext !== SVG_EXTENSION &&
    ext !== JSON_EXTENSION &&
    !AUDIO_EXTENSIONS.has(ext) &&
    !IMAGE_EXTENSIONS.has(ext)
  ) {
    return null;
  }
  return target;
}
