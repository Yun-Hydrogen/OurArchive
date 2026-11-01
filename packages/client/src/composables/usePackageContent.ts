import { ref } from 'vue';
import type { ResourcePackage } from '@/composables/useResourcePackages';

/** 角色条目：后端在 characters.json 之上补了资源 URL 与骨骼存在性 */
export interface PackageCharacter {
  name_id: string;
  name: string;
  school: string;
  club: string;
  /** 头像文件名；缺头像时为空串 */
  avatar: string;
  /** 头像可访问 URL */
  avatarUrl: string;
  /** 绑定的立绘 id（与 characters.json 一致） */
  spine: string[];
  /** 每条立绘在 skeletons/ 下是否存在 */
  spines: Array<{ id: string; exists: boolean }>;
  /** 是否至少有一条立绘可用 */
  hasSkeleton: boolean;
}

/** 立绘目录里的单个文件 */
export interface PackageSkeletonFile {
  name: string;
  /** 小写扩展名，含点 */
  ext: string;
  size: number;
  url: string;
}

/** 一个立绘目录（`skeletons/<id>/`） */
export interface PackageSkeleton {
  id: string;
  files: PackageSkeletonFile[];
  totalSize: number;
  /** 骨骼 + 图集 + 贴图齐全，可直接预览 */
  complete: boolean;
}

interface PackageResponse {
  success: boolean;
  package?: ResourcePackage;
  error?: string;
}

interface CharactersResponse {
  success: boolean;
  total?: number;
  characters?: PackageCharacter[];
  error?: string;
}

interface SkeletonsResponse {
  success: boolean;
  total?: number;
  skeletons?: PackageSkeleton[];
  error?: string;
}

interface SkeletonFilesResponse {
  success: boolean;
  id?: string;
  files?: PackageSkeletonFile[];
  error?: string;
}

async function getJson<T extends { success: boolean; error?: string }>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = (await res.json().catch(() => null)) as T | null;

  if (!res.ok || !data || !data.success) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return data;
}

/**
 * 单个资源包的内容：详情 + 角色索引 + 立绘目录。
 *
 * 详情与角色进页面就拉；立绘目录有 600+ 项、体积也大，
 * 等用户真正切到「骨骼」分类时再按需加载。
 */
export function usePackageContent(packageId: string) {
  const pkg = ref<ResourcePackage | null>(null);
  const characters = ref<PackageCharacter[]>([]);
  const skeletons = ref<PackageSkeleton[]>([]);
  const loading = ref(false);
  const error = ref('');

  /** 立绘清单的加载状态，与页面整体 loading 分开 */
  const skeletonsLoading = ref(false);
  const skeletonsError = ref('');
  let skeletonsLoaded = false;

  async function load() {
    loading.value = true;
    error.value = '';

    try {
      pkg.value = (await getJson<PackageResponse>(`/api/packages/${encodeURIComponent(packageId)}`)).package ?? null;
      const chars = await getJson<CharactersResponse>(
        `/api/packages/${encodeURIComponent(packageId)}/characters`
      );
      characters.value = chars.characters ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      pkg.value = null;
      characters.value = [];
    } finally {
      loading.value = false;
    }
  }

  /** 拉取全部立绘目录；成功后不再重复请求（同一个页面实例内） */
  async function loadSkeletons(force = false) {
    if (skeletonsLoading.value) {
      return;
    }
    if (skeletonsLoaded && !force) {
      return;
    }

    skeletonsLoading.value = true;
    skeletonsError.value = '';

    try {
      const data = await getJson<SkeletonsResponse>(
        `/api/packages/${encodeURIComponent(packageId)}/skeletons`
      );
      skeletons.value = data.skeletons ?? [];
      skeletonsLoaded = true;
    } catch (err) {
      skeletonsError.value = err instanceof Error ? err.message : String(err);
      skeletons.value = [];
    } finally {
      skeletonsLoading.value = false;
    }
  }

  return {
    pkg,
    characters,
    skeletons,
    loading,
    error,
    skeletonsLoading,
    skeletonsError,
    load,
    loadSkeletons,
  };
}

/** 从服务端拉取一个立绘目录下的文件 */
export async function fetchSkeletonFiles(
  packageId: string,
  skeletonId: string
): Promise<PackageSkeletonFile[]> {
  const data = await getJson<SkeletonFilesResponse>(
    `/api/packages/${encodeURIComponent(packageId)}/skeleton/${encodeURIComponent(skeletonId)}`
  );
  return data.files ?? [];
}
