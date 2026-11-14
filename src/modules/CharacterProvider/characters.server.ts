/**
 * 角色索引（`hasCharacter` 分类的 `characters.json`）解析。
 *
 * 外载字段 `name_id` / `spine` 原样保留，派生出 `avatarUrl` 与每条立绘的存在性。
 */
import fs from 'node:fs';
import path from 'node:path';
import type { PackageCharacter, ResourcePackage } from '@/modules/API/types';
import {
  DEFAULT_AVATAR_DIR,
  DEFAULT_CHARACTER_INDEX,
  asText,
  buildAssetUrl,
  getContent,
  resolveInside,
} from '@/modules/PackageProvider/packageManifest.server';
/**
 * 角色索引里的一条记录（`characters.json` 的原始字段）。
 *
 * ⚠️ 字段名是**外载格式**：`name_id` 为 snake_case，`spine` 指的是「立绘 id 列表」
 * （目录名，如 `fuuka_spr`），与前端语义「骨骼 / skeleton」等价。
 * 代码里一律用 `skeleton` 表述，仅此处保留外载原名。
 */
export interface PackageCharacterSource {
  name_id: string;
  name: string;
  school: string;
  club: string;
  avatar: string;
  spine: string[];
}

/**
 * 读取资源包的角色索引（`hasCharacter` 分类）。
 *
 * 索引文件名与头像目录名都来自 `package.yml`，缺省回退 `characters.json` / `avatars`。
 */
export function readPackageCharacters(
  packageDir: string,
  pkg: ResourcePackage
): PackageCharacter[] {
  const content = getContent(pkg, 'hasCharacter');
  if (!content || !content.supported) {
    return [];
  }

  const indexDir = resolveInside(packageDir, content.path);
  if (!indexDir) {
    return [];
  }

  const indexFile = resolveInside(
    indexDir,
    asText(content.index) || DEFAULT_CHARACTER_INDEX
  );
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

  const avatarDirName = asText(content.avatar) || DEFAULT_AVATAR_DIR;
  const avatarDir = resolveInside(indexDir, avatarDirName);
  const skeletonContent = getContent(pkg, 'Skeletons');
  const skeletonDir = skeletonContent?.supported
    ? resolveInside(packageDir, skeletonContent.path)
    : null;

  const entries: PackageCharacter[] = [];

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const nameId = asText(record.name_id);
    if (!nameId) {
      continue;
    }

    const avatarFile = asText(record.avatar);
    const avatarPath = avatarDir && avatarFile ? resolveInside(avatarDir, avatarFile) : null;
    const hasAvatar = Boolean(avatarPath && fs.existsSync(avatarPath));

    const spines = (Array.isArray(record.spine) ? record.spine : [])
      .map((item) => asText(item))
      .filter(Boolean)
      .map((id) => {
        const spineDir = skeletonDir ? resolveInside(skeletonDir, id) : null;
        return { id, exists: Boolean(spineDir && fs.existsSync(spineDir)) };
      });

    entries.push({
      name_id: nameId,
      name: asText(record.name),
      school: asText(record.school),
      club: asText(record.club),
      avatar: hasAvatar ? avatarFile : '',
      avatarUrl: hasAvatar ? buildAssetUrl(pkg.id, 'avatar', avatarFile) : '',
      spine: spines.map((item) => item.id),
      spines,
      hasSkeleton: spines.some((item) => item.exists),
    });
  }

  return entries.sort((a, b) => a.name_id.localeCompare(b.name_id));
}
