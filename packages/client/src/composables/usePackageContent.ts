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

interface SkeletonFilesResponse {
  success: boolean;
  id?: string;
  files?: Array<{ name: string; url: string }>;
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
 * 单个资源包的内容：详情 + 角色索引。
 *
 * 每次调用都重新请求，资源包内容随时可能被开发者改动。
 */
export function usePackageContent(packageId: string) {
  const pkg = ref<ResourcePackage | null>(null);
  const characters = ref<PackageCharacter[]>([]);
  const loading = ref(false);
  const error = ref('');

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

  return { pkg, characters, loading, error, load };
}

/** 从服务端拉取一个立绘目录下的文件，返回 `name → url` */
export async function fetchSkeletonFiles(
  packageId: string,
  skeletonId: string
): Promise<Array<{ name: string; url: string }>> {
  const data = await getJson<SkeletonFilesResponse>(
    `/api/packages/${encodeURIComponent(packageId)}/skeleton/${encodeURIComponent(skeletonId)}`
  );
  return data.files ?? [];
}
