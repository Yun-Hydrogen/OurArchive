/**
 * Spine 运行时的最小结构类型。
 *
 * 运行时由 `/plugins/spine/*.mjs` 在浏览器里动态加载，构建期没有官方类型可用，
 * 所以这里只声明本项目实际用到的 API：不复制运行时源码，也不把运行时打进产物。
 * 升级运行时大版本时，先对照这些接口确认 API 仍然存在。
 */

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

export interface SpineSlot {
  setAttachment(attachment: unknown | null): void;
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
  setToSetupPose(): void;
  updateWorldTransform(physics: unknown): void;
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

/** WebGL / Canvas 两个 ESM 包都重新导出了同一套 core API */
export interface SpineCoreRuntime {
  Physics: { update: unknown };
  AttachmentTimeline: new (...args: unknown[]) => SpineTimeline;
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
}

export interface SpineGlContext {
  readonly gl: WebGLRenderingContext | null;
  dispose(): void;
}

export interface SpineShader {
  bind(): void;
  setUniform4x4f(uniform: unknown, values: ArrayLike<number>): void;
  setUniformi(uniform: unknown, value: number): void;
  dispose(): void;
}

export interface SpineShaderClass {
  readonly MVP_MATRIX: unknown;
  readonly SAMPLER: unknown;
  newColoredTextured(context: SpineGlContext): SpineShader;
  newColored(context: SpineGlContext): SpineShader;
}

export interface SpinePolygonBatcher {
  begin(shader: SpineShader): void;
  end(): void;
  dispose(): void;
}

export interface SpineWebglSkeletonRenderer {
  premultipliedAlpha: boolean;
  draw(batcher: SpinePolygonBatcher, skeleton: SpineSkeleton): void;
}

export interface SpineShapeRenderer {
  begin(shader: SpineShader): void;
  end(): void;
  dispose(): void;
}

export interface SpineSkeletonDebugRenderer {
  drawBones: boolean;
  drawRegionAttachments: boolean;
  drawMeshTriangles: boolean;
  drawBoundingBoxes: boolean;
  drawMeshHull: boolean;
  drawPaths: boolean;
  drawClipping: boolean;
  drawSkeletonXY: boolean;
  draw(shapes: SpineShapeRenderer, skeleton: SpineSkeleton): void;
  dispose(): void;
}

export interface SpineGlTexture {
  dispose(): void;
}

export interface SpineGlTextureClass {
  DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL: boolean;
  new (context: SpineGlContext, image: ImageBitmap, mipmaps?: boolean): SpineGlTexture;
}

export interface SpineMatrix4 {
  readonly values: Float32Array;
  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): void;
}

export interface SpineWebglRuntime extends SpineCoreRuntime {
  ManagedWebGLRenderingContext: new (
    canvas: HTMLCanvasElement,
    config: {
      alpha?: boolean;
      premultipliedAlpha?: boolean;
      antialias?: boolean;
      depth?: boolean;
      stencil?: boolean;
    }
  ) => SpineGlContext;
  Shader: SpineShaderClass;
  PolygonBatcher: new (context: SpineGlContext, twoColorTint?: boolean) => SpinePolygonBatcher;
  SkeletonRenderer: new (
    context: SpineGlContext,
    twoColorTint?: boolean
  ) => SpineWebglSkeletonRenderer;
  ShapeRenderer: new (context: SpineGlContext) => SpineShapeRenderer;
  SkeletonDebugRenderer: new (context: SpineGlContext) => SpineSkeletonDebugRenderer;
  GLTexture: SpineGlTextureClass;
  Matrix4: new () => SpineMatrix4;
}

export interface SpineCanvasTexture {}

export interface SpineCanvasSkeletonRenderer {
  triangleRendering: boolean;
  debugRendering: boolean;
  draw(skeleton: SpineSkeleton): void;
}

export interface SpineCanvasRuntime extends SpineCoreRuntime {
  CanvasTexture: new (image: ImageBitmap) => SpineCanvasTexture;
  SkeletonRenderer: new (context: CanvasRenderingContext2D) => SpineCanvasSkeletonRenderer;
}
