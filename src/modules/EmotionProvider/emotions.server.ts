/**
 * 表情解析：`index/emotions.yml` → 图片 / 音效 / JS 脚本元数据。
 *
 * 服务端只做路径校验与哈希计算，不读取或执行脚本；脚本由前端在用户确认后动态 import。
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { PackageEmotion, ResourcePackage } from '@/modules/API/types';
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

const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs']);
const MAX_SCRIPT_BYTES = 512 * 1024;

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    const single = asText(value);
    return single ? [single] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => asText(item)).filter(Boolean);
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(asText(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const text = asText(value).toLowerCase();
  if (!text) {
    return fallback;
  }
  return ['true', 'yes', '1', 'on'].includes(text);
}

function normalizeRelative(value: unknown): string {
  return asText(value).replace(/^[/\\]+/, '');
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

  const document = parsed as {
    script?: unknown;
    emotions?: unknown;
  } | null;
  const packageScript = normalizeRelative(document?.script);
  const list = document?.emotions;
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

    const imageCandidates = asStringArray(record.images);

    const images: string[] = [];
    let allImagesExist = imageCandidates.length > 0;
    for (const imageRelative of imageCandidates) {
      const target = resolveInside(root, imageRelative);
      const ext = target ? path.extname(target).toLowerCase() : '';
      if (target && IMAGE_EXTENSIONS.has(ext) && fs.existsSync(target)) {
        images.push(buildAssetUrl(pkg.id, 'emotions', imageRelative));
      } else {
        allImagesExist = false;
      }
    }

    const scriptRelative = normalizeRelative(record.script) || packageScript;
    let scriptUrl = '';
    let scriptValid = true;
    if (scriptRelative) {
      const target = resolveInside(root, scriptRelative);
      const ext = target ? path.extname(target).toLowerCase() : '';
      const stat =
        target && fs.existsSync(target) ? fs.statSync(target) : null;
      const size = stat?.size ?? 0;
      if (target && SCRIPT_EXTENSIONS.has(ext) && size > 0 && size <= MAX_SCRIPT_BYTES) {
        // 脚本由前端动态 import()：浏览器按 URL 缓存模块，
        // 带上 mtime 才能在改动脚本后真正重新加载
        scriptUrl = `${buildAssetUrl(pkg.id, 'emotions', scriptRelative)}?v=${Math.floor(stat?.mtimeMs ?? 0)}`;
      } else {
        scriptValid = false;
      }
    }

    const soundRelative = normalizeRelative(record.sound);
    let soundUrl = '';
    let soundExists = false;
    if (soundRelative) {
      const target = resolveInside(root, soundRelative);
      const ext = target ? path.extname(target).toLowerCase() : '';
      if (target && AUDIO_EXTENSIONS.has(ext) && fs.existsSync(target)) {
        soundUrl = buildAssetUrl(pkg.id, 'emotions', soundRelative);
        soundExists = true;
      }
    }

    emotions.push({
      id,
      name: asText(record.name) || id,
      description: asText(record.description),
      images,
      exists:
        scriptValid &&
        (Boolean(scriptUrl) ||
          (imageCandidates.length > 0 && allImagesExist)),
      soundUrl,
      soundExists,
      duration: asNumber(record.duration, 0),
      loop: asBoolean(record.loop, false),
      scriptUrl,
      hasScript: Boolean(scriptUrl),
      exportName: asText(record.export) || id,
    });
  }

  return emotions;
}

/** 在 Emotions 目录里定位允许下发的图片 / 音频 / 脚本；越界或不存在返回 null */
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
  if (!IMAGE_EXTENSIONS.has(ext) && !AUDIO_EXTENSIONS.has(ext) && !SCRIPT_EXTENSIONS.has(ext)) {
    return null;
  }
  return target;
}
