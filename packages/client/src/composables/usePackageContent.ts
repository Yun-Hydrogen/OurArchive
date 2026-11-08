import { ref } from 'vue';
import {
  fetchPackageBackgrounds,
  fetchPackageCharacters,
  fetchPackageMusic,
  fetchPackageSkeletons,
  fetchPackageSounds,
  fetchResourcePackage,
} from '@/api/packages';
import { apiErrorMessage } from '@/api/request';
import { readonlyRef } from '@/utils/reactivity';
import type {
  PackageBackgroundCategory,
  PackageCharacter,
  PackageMusic,
  PackageSkeleton,
  PackageSound,
  PackageSoundCategory,
  ResourcePackage,
} from '@our-archive/shared';

/** 跨端 DTO 由 `@our-archive/shared` 提供，这里重新导出给视图使用 */
export type {
  PackageBackground,
  PackageBackgroundCategory,
  PackageCharacter,
  PackageMusic,
  PackageSkeleton,
  PackageSkeletonItem,
  PackageSound,
  PackageSoundCategory,
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
  const sounds = ref<PackageSound[]>([]);
  const soundCategories = ref<PackageSoundCategory[]>([]);
  const backgrounds = ref<PackageBackgroundCategory[]>([]);
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

  /** 音效清单与类别映射同理（3000+ 条，按需且只拉一次） */
  const soundsLoading = ref(false);
  const soundsError = ref('');
  let soundsLoaded = false;

  /** 背景图与分类同理（数量取决于外载资源，按需且只拉一次） */
  const backgroundsLoading = ref(false);
  const backgroundsError = ref('');
  let backgroundsLoaded = false;

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

  /** 拉取音效列表与类别映射（读 index/sound_info.json + categories.json），同样按需且只拉一次 */
  async function loadSounds(force = false) {
    if (soundsLoading.value) {
      return;
    }
    if (soundsLoaded && !force) {
      return;
    }

    soundsLoading.value = true;
    soundsError.value = '';

    try {
      const data = await fetchPackageSounds(packageId);
      sounds.value = data.sounds;
      soundCategories.value = data.categories;
      soundsLoaded = true;
    } catch (err) {
      soundsError.value = errorText(err);
      sounds.value = [];
      soundCategories.value = [];
    } finally {
      soundsLoading.value = false;
    }
  }

  /** 拉取背景图与分类（读 index/category.yml，缺省只读根下一层），同样按需且只拉一次 */
  async function loadBackgrounds(force = false) {
    if (backgroundsLoading.value) {
      return;
    }
    if (backgroundsLoaded && !force) {
      return;
    }

    backgroundsLoading.value = true;
    backgroundsError.value = '';

    try {
      backgrounds.value = (await fetchPackageBackgrounds(packageId)).categories;
      backgroundsLoaded = true;
    } catch (err) {
      backgroundsError.value = errorText(err);
      backgrounds.value = [];
    } finally {
      backgroundsLoading.value = false;
    }
  }

  return {
    pkg: readonlyRef(pkg),
    characters: readonlyRef(characters),
    skeletons: readonlyRef(skeletons),
    music: readonlyRef(music),
    sounds: readonlyRef(sounds),
    soundCategories: readonlyRef(soundCategories),
    backgrounds: readonlyRef(backgrounds),
    loading: readonlyRef(loading),
    error: readonlyRef(error),
    skeletonsLoading: readonlyRef(skeletonsLoading),
    skeletonsError: readonlyRef(skeletonsError),
    musicLoading: readonlyRef(musicLoading),
    musicError: readonlyRef(musicError),
    soundsLoading: readonlyRef(soundsLoading),
    soundsError: readonlyRef(soundsError),
    backgroundsLoading: readonlyRef(backgroundsLoading),
    backgroundsError: readonlyRef(backgroundsError),
    load,
    loadSkeletons,
    loadMusic,
    loadSounds,
    loadBackgrounds,
  };
}
