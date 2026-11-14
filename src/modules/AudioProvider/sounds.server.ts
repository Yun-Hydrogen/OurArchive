/**
 * 音效索引（`<path>/index/sound_info.json` + `categories.json`）解析与音频定位。
 */
import fs from 'node:fs';
import path from 'node:path';
import type { PackageSound, PackageSoundCategory, ResourcePackage } from '@/modules/API/types';
import { UNKNOWN_DURATION, parseAudioDuration } from './audioDuration.server';
import {
  AUDIO_EXTENSIONS,
  SOUND_CATEGORIES_FILE,
  SOUND_INDEX_DIR,
  SOUND_INFO_FILE,
  asText,
  buildAssetUrl,
  getContent,
  resolveInside,
} from '@/modules/PackageProvider/packageManifest.server';
/**
 * 读取 Sounds 分类的音效列表与类别映射。
 *
 * 约定：`<path>/index/sound_info.json` 是音效索引，`<path>/index/categories.json`
 * 是类别键 → 中文名映射；音频文件直接放在 `<path>/` 下。
 * 索引里的 `original_filename` 决定播放哪个文件；缺失时退回「同名 + 任意音频后缀」。
 * 类别在索引里不存在时，`categoryLabel` 回退为类别键本身（前端只分类不丢条目）。
 */
export function readPackageSounds(
  packageDir: string,
  pkg: ResourcePackage
): { sounds: PackageSound[]; categories: PackageSoundCategory[] } {
  const content = getContent(pkg, 'Sounds');
  if (!content || !content.supported) {
    return { sounds: [], categories: [] };
  }

  // 落成一个非空常量：下面的 resolveAudio() 是闭包，不会继承外层的 null 收窄
  const audioDirOrNull = resolveInside(packageDir, content.path);
  if (!audioDirOrNull) {
    return { sounds: [], categories: [] };
  }
  const audioDir = audioDirOrNull;

  const indexFile = resolveInside(audioDir, `${SOUND_INDEX_DIR}/${SOUND_INFO_FILE}`);
  if (!indexFile || !fs.existsSync(indexFile)) {
    return { sounds: [], categories: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(indexFile, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return { sounds: [], categories: [] };
  }
  if (!Array.isArray(parsed)) {
    return { sounds: [], categories: [] };
  }

  // 类别映射：key 是索引里的 category，value 是展示名
  const categoryLabels = new Map<string, string>();
  const categoriesFile = resolveInside(audioDir, `${SOUND_INDEX_DIR}/${SOUND_CATEGORIES_FILE}`);
  if (categoriesFile && fs.existsSync(categoriesFile)) {
    try {
      const rawCategories = JSON.parse(
        fs.readFileSync(categoriesFile, 'utf-8').replace(/^\uFEFF/, '')
      );
      if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) {
        for (const [key, value] of Object.entries(rawCategories)) {
          const label = asText(value);
          if (key && label) {
            categoryLabels.set(key, label);
          }
        }
      }
    } catch {
      // 映射坏了就只回退类别键本身，不阻断列表
    }
  }

  // 目录里的音频文件清单，用于「只给了 id_name」时兜底匹配
  let audioFiles: string[] = [];
  try {
    audioFiles = fs
      .readdirSync(audioDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name);
  } catch {
    audioFiles = [];
  }

  /** 在磁盘上找实际音频：优先 original_filename，否则按 id_name 模糊匹配 */
  function resolveAudio(idName: string, filename: string): string | null {
    const candidates: string[] = [
      filename,
      `${idName}${path.extname(filename) || '.ogg'}`,
      ...audioFiles.filter(
        (name) => name.toLowerCase() === `${idName}${path.extname(name)}`.toLowerCase()
      ),
      ...audioFiles.filter(
        (name) => name.toLowerCase().startsWith(`${idName.toLowerCase()}.`)
      ),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const full = resolveInside(audioDir, candidate);
      if (full && fs.existsSync(full)) {
        return candidate;
      }
    }
    return null;
  }

  const sounds: PackageSound[] = [];
  const categoryCounts = new Map<string, number>();
  const categoryDurations = new Map<string, number>();

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const idName = asText(record.id_name);
    if (!idName) {
      continue;
    }

    const category = asText(record.category);
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    const declared = asText(record.original_filename);
    const resolved = resolveAudio(idName, declared);
    const duration = resolved ? parseAudioDuration(path.join(audioDir, resolved)) : UNKNOWN_DURATION;
    if (duration !== UNKNOWN_DURATION) {
      const key = category || 'Other';
      categoryDurations.set(key, (categoryDurations.get(key) ?? 0) + duration);
    }

    sounds.push({
      id_name: idName,
      original_filename: resolved ?? declared,
      description: asText(record.description),
      category: category || 'Other',
      categoryLabel: categoryLabels.get(category) ?? (category || 'Other'),
      url: resolved ? buildAssetUrl(pkg.id, 'sounds', resolved) : '',
      exists: Boolean(resolved),
      duration,
    });
  }

  // 只有被引用的类别才下发；排序与前端分类标签一致（按 label 排，键作平局）
  const categories: PackageSoundCategory[] = [...categoryCounts.entries()]
    .map(([id, count]) => ({
      id,
      label: categoryLabels.get(id) ?? id,
      count,
      duration: categoryDurations.get(id) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN') || a.id.localeCompare(b.id));

  return { sounds, categories };
}

/** 在 Sounds 目录里定位一个音频文件，越界或不存在返回 null */
export function resolveSoundFile(
  packageDir: string,
  pkg: ResourcePackage,
  filename: string
): string | null {
  const content = getContent(pkg, 'Sounds');
  if (!content || !content.supported) {
    return null;
  }

  const audioDir = resolveInside(packageDir, content.path);
  if (!audioDir) {
    return null;
  }

  const target = resolveInside(audioDir, filename);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return null;
  }
  if (!AUDIO_EXTENSIONS.has(path.extname(target).toLowerCase())) {
    return null;
  }
  return target;
}
