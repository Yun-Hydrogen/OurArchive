import { ref } from 'vue';
import { fetchResourcePackages } from '@/api/packages';
import { apiErrorMessage } from '@/api/request';
import { readonlyRef } from '@/utils/reactivity';
import type { ResourcePackage } from '@our-archive/shared';

/** 跨端 DTO 由 `@our-archive/shared` 提供，这里重新导出给视图使用 */
export type { PackageContent, ResourcePackage } from '@our-archive/shared';

/**
 * 资源包索引（后端扫描 `<root>/res` 下带 package.yml 的目录）。
 *
 * 状态只读暴露：视图通过 `refresh()` 触发重扫，不直接改写。
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
      const data = await fetchResourcePackages();
      resourcesDir.value = data.resourcesDir;
      packages.value = data.packages;
    } catch (err) {
      error.value = apiErrorMessage(err, '请求失败');
      packages.value = [];
    } finally {
      loading.value = false;
    }
  }

  return {
    packages: readonlyRef(packages),
    resourcesDir: readonlyRef(resourcesDir),
    loading: readonlyRef(loading),
    error: readonlyRef(error),
    refresh,
  };
}
