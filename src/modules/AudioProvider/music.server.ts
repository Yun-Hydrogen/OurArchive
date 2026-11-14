/**
 * 背景音乐索引（`<path>/index/music_info.json`）解析与音频定位。
 */
import fs from 'node:fs';
import path from 'node:path';
import type { PackageMusic, ResourcePackage } from '@/modules/API/types';
import { UNKNOWN_DURATION, parseAudioDuration } from './audioDuration.server';
import {
  AUDIO_EXTENSIONS,
  MUSIC_INDEX_DIR,
  MUSIC_INDEX_FILE,
  asText,
  buildAssetUrl,
  getContent,
  resolveInside,
} from '@/modules/PackageProvider/packageManifest.server';
/**
 * 读取 BackgroundMusic 分类的曲目列表。
 *
 * 约定：`<path>/index/music_info.json` 是曲目索引，音频文件直接放在 `<path>/` 下。
 * 索引里的 `original_filename` 决定播放哪个文件；缺失时退回「同名 + 任意音频后缀」。
 */
export function readPackageMusic(
  packageDir: string,
  pkg: ResourcePackage
): PackageMusic[] {
  const content = getContent(pkg, 'BackgroundMusic');
  if (!content || !content.supported) {
    return [];
  }

  // 落成一个非空常量：下面的 resolveAudio() 是闭包，不会继承外层的 null 收窄
  const audioDirOrNull = resolveInside(packageDir, content.path);
  if (!audioDirOrNull) {
    return [];
  }
  const audioDir = audioDirOrNull;

  const indexFile = resolveInside(audioDir, `${MUSIC_INDEX_DIR}/${MUSIC_INDEX_FILE}`);
  if (!indexFile || !fs.existsSync(indexFile)) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(indexFile, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  // 目录里的音频文件清单，用于「只给了 name_id」时兜底匹配
  let audioFiles: string[] = [];
  try {
    audioFiles = fs
      .readdirSync(audioDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name);
  } catch {
    audioFiles = [];
  }

  /** 在磁盘上找实际音频：优先 original_filename，否则按 name_id 模糊匹配 */
  function resolveAudio(nameId: string, filename: string): string | null {
    const candidates: string[] = [
      filename,
      `${nameId}${path.extname(filename) || '.ogg'}`,
      ...audioFiles.filter(
        (name) => name.toLowerCase() === `${nameId}${path.extname(name)}`.toLowerCase()
      ),
      ...audioFiles.filter(
        (name) => name.toLowerCase().startsWith(`${nameId.toLowerCase()}.`)
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

  const entries: PackageMusic[] = [];

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const nameId = asText(record.name_id);
    if (!nameId) {
      continue;
    }

    const declared = asText(record.original_filename);
    const resolved = resolveAudio(nameId, declared);
    const filename = resolved ?? declared;

    entries.push({
      name_id: nameId,
      filename,
      title: asText(record.title) || nameId,
      artist: asText(record.artist),
      description: asText(record.description),
      url: resolved ? buildAssetUrl(pkg.id, 'music', resolved) : '',
      exists: Boolean(resolved),
      duration: resolved ? parseAudioDuration(path.join(audioDir, resolved)) : UNKNOWN_DURATION,
    });
  }

  return entries;
}

/** 在 BackgroundMusic 目录里定位一个音频文件，越界或不存在返回 null */
export function resolveMusicFile(
  packageDir: string,
  pkg: ResourcePackage,
  filename: string
): string | null {
  const content = getContent(pkg, 'BackgroundMusic');
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
