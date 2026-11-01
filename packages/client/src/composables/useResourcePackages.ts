import { ref } from 'vue';

export interface PackageContent {
  /** package.yml 里的键，如 Skeletons */
  key: string;
  /** 展示名，如 骨骼 */
  label: string;
  /** 作者是否声明包含该类资源 */
  supported: boolean;
  /** 相对资源包根目录的路径 */
  path: string;
  /** 索引文件名（hasCharacter 用） */
  index: string;
  /** 图片子目录（hasCharacter 用） */
  avatar: string;
  /** 声明为包含且目录存在 */
  exists: boolean;
  /** 条目数（角色为角色条数，骨骼为立绘目录数） */
  count: number;
}

export interface ResourcePackage {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  updatedAt: string;
  valid: boolean;
  error?: string;
  contents: PackageContent[];
}

interface PackagesResponse {
  success: boolean;
  resourcesDir?: string;
  total?: number;
  packages?: ResourcePackage[];
  error?: string;
}

/**
 * 资源包索引（后端扫描 `<root>/res` 下带 package.yml 的目录）。
 */
export function useResourcePackages() {
  const packages = ref<ResourcePackage[]>([]);
  const resourcesDir = ref('');
  const loading = ref(false);
  const error = ref('');

  async function refresh() {
    loading.value = true;
    error.value = '';

    try {
      const res = await fetch('/api/packages');
      const data = (await res.json().catch(() => null)) as PackagesResponse | null;

      if (!res.ok || !data || !data.success) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      resourcesDir.value = String(data.resourcesDir ?? '');
      packages.value = Array.isArray(data.packages) ? data.packages : [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      packages.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { packages, resourcesDir, loading, error, refresh };
}
