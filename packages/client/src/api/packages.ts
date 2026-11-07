/**
 * 资源包相关的 HTTP 请求。
 *
 * 只负责「发请求 + 校验包络」，不持有任何状态；状态与编排在 composable 里。
 * 返回值直接是响应体（已校验 `success`），字段见 `@our-archive/shared`。
 */
import { apiGet } from './request';
import type {
  PackageCharacter,
  PackageMusic,
  PackageSkeleton,
  PackageSkeletonItem,
  ResourcePackage,
} from '@our-archive/shared';

/** 列表类响应都带 `total` */
interface PackagesResponse {
  success: boolean;
  resourcesDir: string;
  total: number;
  packages: ResourcePackage[];
}

interface PackageResponse {
  success: boolean;
  package: ResourcePackage | null;
}

interface CharactersResponse {
  success: boolean;
  total: number;
  characters: PackageCharacter[];
}

interface SkeletonsResponse {
  success: boolean;
  total: number;
  skeletons: PackageSkeleton[];
}

interface MusicResponse {
  success: boolean;
  total: number;
  music: PackageMusic[];
}

interface SkeletonFilesResponse {
  success: boolean;
  id: string;
  files: PackageSkeletonItem[];
}

/** 资源包根目录下的全部资源包 */
export function fetchResourcePackages(): Promise<PackagesResponse> {
  return apiGet<PackagesResponse>('/api/packages');
}

/** 单个资源包的详情（`package_info` + `package_content`） */
export function fetchResourcePackage(packageId: string): Promise<PackageResponse> {
  return apiGet<PackageResponse>(`/api/packages/${encodeURIComponent(packageId)}`);
}

/** 角色索引（已补齐 `avatarUrl` 与立绘存在性） */
export function fetchPackageCharacters(packageId: string): Promise<CharactersResponse> {
  return apiGet<CharactersResponse>(
    `/api/packages/${encodeURIComponent(packageId)}/characters`
  );
}

/** 全部立绘目录与文件清单（631 项左右，按需调用） */
export function fetchPackageSkeletons(packageId: string): Promise<SkeletonsResponse> {
  return apiGet<SkeletonsResponse>(
    `/api/packages/${encodeURIComponent(packageId)}/skeletons`
  );
}

/** 背景音乐曲目（读 `index/music_info.json`） */
export function fetchPackageMusic(packageId: string): Promise<MusicResponse> {
  return apiGet<MusicResponse>(`/api/packages/${encodeURIComponent(packageId)}/music`);
}

/** 单个立绘目录下的文件清单 */
export function fetchSkeletonFiles(
  packageId: string,
  skeletonId: string
): Promise<PackageSkeletonItem[]> {
  return apiGet<SkeletonFilesResponse>(
    `/api/packages/${encodeURIComponent(packageId)}/skeleton/${encodeURIComponent(skeletonId)}`
  ).then((data) => data.files ?? []);
}
