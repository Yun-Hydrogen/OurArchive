/**
 * Spine 渲染器：负责 Spine 运行时的加载、图集绑定、骨骼解析、
 * 差分/动作切换与资源释放。
 */
import * as PIXI from 'pixi.js';
import { loadSpinePixiRuntime } from '@/modules/SkeletonRuntimeProvider/runtime';
import type {
  SpineAnimation,
  SpineAnimationState,
  SpineAttachmentTimeline,
  SpineBounds,
  SpineInstance,
  SpinePixiRuntime,
  SpineSkeletonData,
  SpineTimeline,
} from '@/modules/SkeletonRuntimeProvider/spineTypes';
import { matchTexture } from './skeletonPackage';
import type {
  SkeletonInfo,
  SkeletonRenderer,
  SkeletonSource,
  SkeletonVariant,
} from './skeletonTypes';

const EXPRESSION_LABELS: Record<string, string> = {
  default: '默认',
  normal: '普通',
  respond: '回应',
  smile: '微笑',
  embarassed: '害羞',
  embarrassed: '害羞',
  serious: '认真',
  angry: '生气',
  sad: '难过',
  cry: '哭泣',
  surprise: '惊讶',
  wink: '眨眼',
  close: '闭眼',
  shy: '害羞',
};

interface SpineLayer {
  slotIndex: number;
  attachmentName: string | null;
}

interface SpineVariant extends SkeletonVariant {
  layers: SpineLayer[];
}

function describeAttachment(name: string | null): string {
  if (!name) {
    return '';
  }
  const clean = name.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
  const tokens = clean.toLowerCase().split(/[^a-z0-9]+/);
  for (const token of tokens) {
    if (EXPRESSION_LABELS[token]) {
      return EXPRESSION_LABELS[token];
    }
  }
  return '';
}

function isAttachmentTimeline(
  timeline: SpineTimeline,
  timelineClass: unknown
): timeline is SpineAttachmentTimeline {
  return (
    typeof timelineClass === 'function' &&
    timeline instanceof (timelineClass as new (...args: unknown[]) => SpineTimeline)
  );
}

function extractSpineVariants(
  data: SpineSkeletonData,
  runtime: SpinePixiRuntime
): SpineVariant[] {
  const noise = new Set<string>();
  for (const token of String(data.name ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!token) continue;
    noise.add(token);
    noise.add(token.replace(/\d+$/, ''));
  }

  const seen = new Set<string>();
  const variants: SpineVariant[] = [];

  for (const animation of data.animations) {
    if (!/^\d+$/.test(animation.name)) {
      continue;
    }
    const layers: SpineLayer[] = [];
    for (const timeline of animation.timelines) {
      if (!isAttachmentTimeline(timeline, runtime.AttachmentTimeline)) {
        continue;
      }
      const names = timeline.attachmentNames ?? [];
      layers.push({ slotIndex: timeline.slotIndex, attachmentName: names[0] ?? null });
    }
    if (!layers.length) {
      continue;
    }
    const signature = layers
      .map((layer) => `${layer.slotIndex}:${layer.attachmentName ?? ''}`)
      .sort()
      .join('|');
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);

    const described =
      layers
        .map((layer) => describeAttachment(layer.attachmentName))
        .find(
          (text): text is string =>
            Boolean(text) && !noise.has(text!.replace(/\s/g, '').toLowerCase())
        ) ?? null;
    variants.push({
      name: animation.name,
      label: described ? `${animation.name} · ${described}` : animation.name,
      layers,
    });
  }

  return variants.sort((a, b) => Number(a.name) - Number(b.name));
}

function extractSpineActions(data: SpineSkeletonData): string[] {
  return data.animations
    .filter((animation) => !/^\d+$/.test(animation.name))
    .map((animation) => animation.name);
}

export class SpineRenderer implements SkeletonRenderer {
  readonly kind = 'spine' as const;

  private app: PIXI.Application | null = null;
  private runtime: SpinePixiRuntime | null = null;
  private instance: SpineInstance | null = null;
  private skeletonData: SpineSkeletonData | null = null;
  private bounds: SpineBounds = { x: 0, y: 0, width: 1, height: 1 };
  private variants: SpineVariant[] = [];
  private actions: string[] = [];
  private activeVariant = '';
  private activeAction = '';
  private createdTextures: PIXI.BaseTexture[] = [];

  private get state(): SpineAnimationState | null {
    return this.instance?.state ?? null;
  }

  async load(source: SkeletonSource, app: PIXI.Application): Promise<void> {
    if (!source.atlas) {
      throw new Error('Spine 立绘缺少 .atlas 图集文件。');
    }

    this.app = app;
    this.runtime = await loadSpinePixiRuntime();
    const runtime = this.runtime;

    const atlas = new runtime.TextureAtlas(await source.atlas.text());
    for (const page of atlas.pages) {
      if (!matchTexture(source.textures, page.name)) {
        throw new Error(`图集页 ${page.name} 缺少对应贴图。`);
      }
    }

    for (const page of atlas.pages) {
      const file = matchTexture(source.textures, page.name);
      if (!file) {
        continue;
      }
      const bitmap = await createImageBitmap(file, { premultiplyAlpha: 'premultiply' });
      const baseTexture = new PIXI.BaseTexture(bitmap, {
        alphaMode: PIXI.ALPHA_MODES.PMA,
        mipmap: PIXI.MIPMAP_MODES.POW2,
      });
      // SpineTexture 读取 image.resource.source，必须保证 resource/source 存在
      if (!baseTexture.resource) {
        (baseTexture as any).resource = { source: bitmap };
      } else if (!(baseTexture.resource as any).source) {
        (baseTexture.resource as any).source = bitmap;
      }
      this.createdTextures.push(baseTexture);
      page.setTexture(runtime.SpineTexture.from(baseTexture));
    }

    const loader = new runtime.AtlasAttachmentLoader(atlas);
    let parsedData: SpineSkeletonData;
    if (source.skeleton.name.toLowerCase().endsWith('.json')) {
      const json = JSON.parse(await source.skeleton.text());
      parsedData = new runtime.SkeletonJson(loader).readSkeletonData(json);
    } else {
      const bytes = new Uint8Array(await source.skeleton.arrayBuffer());
      parsedData = new runtime.SkeletonBinary(loader).readSkeletonData(bytes);
    }

    this.skeletonData = parsedData;
    const instance = new runtime.Spine({ skeletonData: parsedData });
    this.instance = instance;
    app.stage.addChild(instance);

    instance.skeleton.setToSetupPose();
    instance.skeleton.updateWorldTransform(runtime.Physics?.update);
    this.bounds = instance.skeleton.getBoundsRect();

    this.variants = extractSpineVariants(parsedData, runtime);
    this.actions = extractSpineActions(parsedData);
    this.activeVariant = this.variants[0]?.name ?? '';

    const nextAction = this.actions.find((name) => /idle/i.test(name)) ?? '';
    this.setAction(nextAction);
  }

  update(deltaSeconds: number): void {
    const instance = this.instance;
    const state = this.state;
    if (!instance || !state || !this.activeAction) {
      return;
    }
    state.update(deltaSeconds);
    instance.skeleton.updateWorldTransform(this.runtime?.Physics?.update);
  }

  setAction(name: string): void {
    const instance = this.instance;
    const state = this.state;
    if (!instance || !state) {
      return;
    }
    this.activeAction = name;
    state.clearTracks();
    if (name) {
      state.setAnimation(0, name, true);
      instance.autoUpdate = false;
    } else {
      instance.autoUpdate = false;
      instance.skeleton.setToSetupPose();
      this.applyVariantLayers();
    }
  }

  setVariant(name: string): void {
    this.activeVariant = name;
    this.applyVariantLayers();
  }

  setDebug(enabled: boolean): void {
    const instance = this.instance;
    if (!instance || !this.runtime) {
      return;
    }
    instance.debug = enabled ? new this.runtime.SpineDebugRenderer(instance) : null;
  }

  getInfo(): SkeletonInfo {
    const data = this.skeletonData;
    return {
      kind: 'spine',
      version: data?.version ?? 'unknown',
      bones: data?.bones.length ?? 0,
      slots: data?.slots.length ?? 0,
      animations: data?.animations.length ?? 0,
    };
  }

  getActions(): string[] {
    return [...this.actions];
  }

  getVariants(): SkeletonVariant[] {
    return this.variants.map(({ name, label }) => ({ name, label }));
  }

  getBounds(): PIXI.Rectangle {
    const instance = this.instance;
    if (instance) {
      try {
        instance.skeleton.updateWorldTransform(this.runtime?.Physics?.update);
        this.bounds = instance.skeleton.getBoundsRect();
      } catch {
        // 包围盒只用于适配视口，计算失败时沿用上一次结果
      }
    }

    return new PIXI.Rectangle(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );
  }

  getMountRoot(): PIXI.Container {
    if (!this.instance) {
      throw new Error('Spine 渲染器尚未加载。');
    }
    return this.instance;
  }

  getHeadAnchor(): { x: number; y: number } {
    const skeleton = this.instance?.skeleton;
    const head =
      skeleton?.findBone?.('Head') ??
      skeleton?.findBone?.('head') ??
      skeleton?.findBone?.('Halo') ??
      skeleton?.findBone?.('halo') ??
      null;
    if (head) {
      return { x: head.worldX, y: head.worldY };
    }
    return {
      x: this.bounds.x + this.bounds.width / 2,
      y: this.bounds.y + this.bounds.height * 0.08,
    };
  }

  destroy(): void {
    if (this.instance) {
      try {
        this.app?.stage.removeChild(this.instance);
        this.instance.destroy({ children: true });
      } catch {
        // 忽略卸载异常
      }
      this.instance = null;
    }
    for (const texture of this.createdTextures) {
      try {
        texture.destroy();
      } catch {
        // 忽略纹理卸载异常
      }
    }
    this.createdTextures = [];
    this.runtime = null;
    this.skeletonData = null;
    this.variants = [];
    this.actions = [];
    this.activeAction = '';
    this.activeVariant = '';
  }

  private applyVariantLayers(): void {
    const instance = this.instance;
    if (!instance) {
      return;
    }
    const variant = this.variants.find((item) => item.name === this.activeVariant);
    if (!variant) {
      return;
    }
    const skin = instance.skeleton.skin ?? this.skeletonData?.defaultSkin ?? null;
    for (const layer of variant.layers) {
      const slot = instance.skeleton.slots[layer.slotIndex];
      if (!slot) continue;
      const attachment =
        layer.attachmentName && skin
          ? skin.getAttachment(layer.slotIndex, layer.attachmentName)
          : null;
      slot.setAttachment(attachment);
    }
  }
}
