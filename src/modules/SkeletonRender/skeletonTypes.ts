/**
 * 骨骼舞台的统一类型与渲染器契约。
 *
 * 舞台只认 `SkeletonSource`，由 `kind` 决定使用 Spine 还是 DragonBones 渲染器；
 * 渲染器负责解析文件、更新动画、暴露动作/差分与角色根容器。
 */
import type * as PIXI from 'pixi.js';
import type { SkeletonKind } from '@/modules/API/types';

export type { SkeletonKind } from '@/modules/API/types';

/** 带相对路径的本地文件 */
export interface SkeletonFile {
  file: File;
  /** 相对路径（含文件名），无路径信息时就是文件名 */
  path: string;
}

/** 一个可加载的骨骼包（Spine 或 DragonBones） */
export interface SkeletonSource {
  /** 目录名，也就是角色 id */
  id: string;
  kind: SkeletonKind;
  /** Spine：`.skel` / `.json`；DragonBones：`*_ske.json` */
  skeleton: File;
  /** Spine 图集 `.atlas` */
  atlas?: File;
  /** DragonBones 图集描述 `*_tex.json` */
  textureJson?: File;
  /** 图集贴图页 */
  textures: File[];
  /** DragonBones 骨架名；缺省用目录名 */
  armatureName?: string;
}

export interface SkeletonInfo {
  kind: SkeletonKind;
  version: string;
  bones: number;
  slots: number;
  animations: number;
}

export interface SkeletonVariant {
  name: string;
  label: string;
}

export interface SkeletonRenderer {
  readonly kind: SkeletonKind;

  load(source: SkeletonSource, app: PIXI.Application): Promise<void>;

  /** 由舞台 ticker 驱动；只有播放中或脏状态时才会调用 */
  update(deltaSeconds: number): void;

  setAction(name: string): void;
  setVariant(name: string): void;
  setDebug(enabled: boolean): void;

  getInfo(): SkeletonInfo;
  getActions(): string[];
  getVariants(): SkeletonVariant[];

  /** 角色内容在根容器本地坐标系里的包围盒 */
  getBounds(): PIXI.Rectangle;

  /** 角色根容器（Spine 实例 / DragonBones display），供表情挂载 */
  getMountRoot(): PIXI.Container;

  /** 头顶锚点（角色根容器本地坐标） */
  getHeadAnchor(): { x: number; y: number };

  destroy(): void;
}
