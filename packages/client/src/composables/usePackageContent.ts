import { ref } from 'vue';
import {
  fetchPackageCharacters,
  fetchPackageMusic,
  fetchPackageSkeletons,
  fetchResourcePackage,
} from '@/api/packages';
import { apiErrorMessage } from '@/api/request';
import { readonlyRef } from '@/utils/reactivity';
import type {
  PackageCharacter,
  PackageMusic,
  PackageSkeleton,
  ResourcePackage,
} from '@our-archive/shared';

/** 跨端 DTO 由 `@our-archive/shared` 提供，这里重新导出给视图使用 */
export type {
  PackageCharacter,
  PackageMusic,
  PackageSkeleton,
  PackageSkeletonItem,
} from '@our-archive/shared';

function errorText(err: unknown): string {
  return apiErrorMessage(err, '请求失败');
}

/**
 * 单个资源包的内容：详情 + 角色索引 + 立绘目录。
 *
 * 详情与角色进页面就拉；立绘目录有 600+ 项、体积也大，
 * 等用户真正切到「骨骼」分类时再按需加载。
 * 状态只读暴露，改数据一律走 `load*()`。
 */
export function usePackageContent(packageId: string) {
  const pkg = ref<ResourcePackage | null>(null);
  const characters = ref<PackageCharacter[]>([]);
  const skeletons = ref<PackageSkeleton[]>([]);
  const music = ref<PackageMusic[]>([]);
  const loading = ref(false);
  const error = ref('');

  /** 立绘清单的加载状态，与页面整体 loading 分开 */
  const skeletonsLoading = ref(false);
  const skeletonsError = ref('');
  let skeletonsLoaded = false;

  /** 音乐清单同理 */
  const musicLoading = ref(false);
  const musicError = ref('');
  let musicLoaded = false;

  async function load() {
    loading.value = true;
    error.value = '';

    try {
      pkg.value = (await fetchResourcePackage(packageId)).package;
      characters.value = (await fetchPackageCharacters(packageId)).characters;
    } catch (err) {
      error.value = errorText(err);
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
      skeletons.value = (await fetchPackageSkeletons(packageId)).skeletons;
      skeletonsLoaded = true;
    } catch (err) {
      skeletonsError.value = errorText(err);
      skeletons.value = [];
    } finally {
      skeletonsLoading.value = false;
    }
  }

  /** 拉取背景音乐曲目（读 index/music_info.json），同样按需且只拉一次 */
  async function loadMusic(force = false) {
    if (musicLoading.value) {
      return;
    }
    if (musicLoaded && !force) {
      return;
    }

    musicLoading.value = true;
    musicError.value = '';

    try {
      music.value = (await fetchPackageMusic(packageId)).music;
      musicLoaded = true;
    } catch (err) {
      musicError.value = errorText(err);
      music.value = [];
    } finally {
      musicLoading.value = false;
    }
  }

  return {
    pkg: readonlyRef(pkg),
    characters: readonlyRef(characters),
    skeletons: readonlyRef(skeletons),
    music: readonlyRef(music),
    loading: readonlyRef(loading),
    error: readonlyRef(error),
    skeletonsLoading: readonlyRef(skeletonsLoading),
    skeletonsError: readonlyRef(skeletonsError),
    musicLoading: readonlyRef(musicLoading),
    musicError: readonlyRef(musicError),
    load,
    loadSkeletons,
    loadMusic,
  };
}
