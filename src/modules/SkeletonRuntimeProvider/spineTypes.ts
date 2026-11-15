/**
 * Spine 运行时的最小结构类型（基于 spine-pixi-v7 与 spine-core 4.2）。
 *
 * 运行时由 `/plugins/spine/spine-pixi.js` 在浏览器里动态加载，构建期没有官方类型可用，
 * 这里声明本项目实际用到的 API，构建期不把 Spine 运行时直接打进产物。
 */
import type { Container } from 'pixi.js';

export interface SpineBone {
  name: string;
  worldX: number;
  worldY: number;
}

export interface SpineBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpineTimeline {}

export interface SpineAttachmentTimeline extends SpineTimeline {
  slotIndex: number;
  attachmentNames: Array<string | null>;
}

export interface SpineAnimation {
  name: string;
  timelines: SpineTimeline[];
}

export interface SpineSkin {
  getAttachment(slotIndex: number, name: string): unknown | null;
}

export interface SpineAttachment {
  name: string | null;
}

export interface SpineSlot {
  setAttachment(attachment: unknown | null): void;
  attachment?: SpineAttachment | null;
  getAttachment?(): SpineAttachment | null;
  bone?: SpineBone | null;
  data?: { name?: string | null } | null;
}

export interface SpineSkeletonData {
  name?: string | null;
  version?: string | null;
  animations: SpineAnimation[];
  bones: unknown[];
  slots: unknown[];
  defaultSkin?: SpineSkin | null;
}

export interface SpineSkeleton {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  skin: SpineSkin | null;
  slots: SpineSlot[];
  bones?: SpineBone[];
  findBone?(name: string): SpineBone | null;
  setToSetupPose(): void;
  updateWorldTransform(physics?: unknown): void;
  getBoundsRect(): SpineBounds;
}

export interface SpineAnimationState {
  clearTracks(): void;
  setAnimation(trackIndex: number, animationName: string, loop: boolean): unknown;
  update(delta: number): void;
  apply(skeleton: SpineSkeleton): void;
}

export interface SpineTextureAtlasPage {
  name: string;
  setTexture(texture: unknown): void;
}

export interface SpineTextureAtlas {
  pages: SpineTextureAtlasPage[];
}

export interface SpineInstance extends Container {
  skeleton: SpineSkeleton;
  state: SpineAnimationState;
  autoUpdate: boolean;
  debug?: unknown;
  boundsProvider?: unknown;
  update(delta: number): void;
  destroy(options?: unknown): void;
}

export interface SpinePixiRuntime {
  Spine: {
    new (options: { skeletonData: SpineSkeletonData; [key: string]: unknown }): SpineInstance;
    from(options: unknown): SpineInstance;
  };
  SpineTexture: {
    from(texture: unknown): unknown;
  };
  SpineDebugRenderer: new (spine: SpineInstance) => unknown;
  TextureAtlas: new (atlasText: string) => SpineTextureAtlas;
  AtlasAttachmentLoader: new (atlas: SpineTextureAtlas) => unknown;
  SkeletonJson: new (loader: unknown) => {
    readSkeletonData(json: unknown): SpineSkeletonData;
  };
  SkeletonBinary: new (loader: unknown) => {
    readSkeletonData(bytes: Uint8Array): SpineSkeletonData;
  };
  Skeleton: new (data: SpineSkeletonData) => SpineSkeleton;
  AnimationStateData: new (data: SpineSkeletonData) => { defaultMix: number };
  AnimationState: new (data: unknown) => SpineAnimationState;
  Physics: { update: unknown };
  AttachmentTimeline: new (...args: unknown[]) => SpineTimeline;
}
