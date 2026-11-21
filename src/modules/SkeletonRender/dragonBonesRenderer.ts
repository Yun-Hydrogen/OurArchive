/**
 * DragonBones 渲染器：按需加载 `pixi-dragonbones-runtime`（MIT），
 * 解析 `*_ske.json` + `*_tex.json` + 贴图并驱动骨架动画。
 */
import * as PIXI from 'pixi.js';
import type { PixiArmatureDisplay, PixiFactory } from 'pixi-dragonbones-runtime';
import type {
  SkeletonInfo,
  SkeletonRenderer,
  SkeletonSource,
  SkeletonVariant,
} from './skeletonTypes';

type DragonBonesModule = typeof import('pixi-dragonbones-runtime');

let modulePromise: Promise<DragonBonesModule> | null = null;

function loadDragonBonesRuntime(): Promise<DragonBonesModule> {
  if (!modulePromise) {
    modulePromise = import('pixi-dragonbones-runtime').catch((error) => {
      modulePromise = null;
      throw error;
    });
  }
  return modulePromise;
}

export class DragonBonesRenderer implements SkeletonRenderer {
  readonly kind = 'dragonbones' as const;

  private app: PIXI.Application | null = null;
  private factory: PixiFactory | null = null;
  private advance: ((deltaSeconds: number) => void) | null = null;
  private display: PixiArmatureDisplay | null = null;
  private baseTexture: PIXI.BaseTexture | null = null;
  private cacheName = '';
  private actions: string[] = [];
  private activeAction = '';

  async load(source: SkeletonSource, app: PIXI.Application): Promise<void> {
    if (!source.textureJson) {
      throw new Error('DragonBones 立绘缺少 *_tex.json 图集描述。');
    }
    if (source.skeleton.name.toLowerCase().endsWith('.dbbin')) {
      throw new Error('暂不支持 DragonBones 二进制骨骼（.dbbin），请导出为 *_ske.json。');
    }

    const { PixiFactory: Factory } = await loadDragonBonesRuntime();
    this.app = app;
    this.advance = (deltaSeconds) => Factory.advanceTime(deltaSeconds);
    // 不使用共享 ticker：由舞台统一调用 advanceTime
    this.factory = new Factory(null, false);

    const skeletonJson = JSON.parse(await source.skeleton.text()) as {
      armature?: Array<{ name?: string }>;
      [key: string]: unknown;
    };
    const armatureName =
      source.armatureName || skeletonJson.armature?.[0]?.name || source.id;

    const textureJson = JSON.parse(await source.textureJson.text()) as Record<string, unknown>;
    const cacheName = `${source.id}-${Date.now()}`;
    this.cacheName = cacheName;

    const textureFile = source.textures[0];
    if (!textureFile) {
      throw new Error('DragonBones 立绘缺少贴图文件。');
    }
    const bitmap = await createImageBitmap(textureFile);
    const baseTexture = new PIXI.BaseTexture(bitmap, {
      alphaMode: PIXI.ALPHA_MODES.PMA,
    });
    this.baseTexture = baseTexture;
    const texture = new PIXI.Texture(baseTexture);

    this.factory.parseDragonBonesData(skeletonJson, cacheName);
    this.factory.parseTextureAtlasData(textureJson, texture, cacheName);

    const display = this.factory.buildArmatureDisplay(armatureName, cacheName);
    if (!display) {
      throw new Error(`DragonBones 找不到骨架：${armatureName}`);
    }

    this.display = display;
    app.stage.addChild(display);

    this.actions = [...display.animation.animationNames];
    const idle = this.actions.find((name) => /idle/i.test(name)) ?? this.actions[0] ?? '';
    this.setAction(idle);
  }

  update(deltaSeconds: number): void {
    this.advance?.(deltaSeconds);
  }

  setAction(name: string): void {
    const display = this.display;
    if (!display) {
      return;
    }
    this.activeAction = name;
    if (name) {
      display.animation.play(name, -1);
    } else {
      display.animation.stop();
    }
  }

  setVariant(_name: string): void {
    // DragonBones 的插槽差分留到后续版本；当前只暴露动作。
  }

  setDebug(enabled: boolean): void {
    if (this.display) {
      this.display.debugDraw = enabled;
    }
  }

  getInfo(): SkeletonInfo {
    const data = this.display?.armature.armatureData;
    return {
      kind: 'dragonbones',
      version: 'DragonBones',
      bones: data?.sortedBones.length ?? 0,
      slots: data?.sortedSlots.length ?? 0,
      animations: data?.animationNames.length ?? this.actions.length,
    };
  }

  getActions(): string[] {
    return [...this.actions];
  }

  getVariants(): SkeletonVariant[] {
    return [];
  }

  getBounds(): PIXI.Rectangle {
    if (!this.display) {
      return new PIXI.Rectangle(0, 0, 1, 1);
    }
    // getBounds() 是舞台全局坐标；舞台需要角色根容器本地坐标系
    return this.display.getLocalBounds();
  }

  getMountRoot(): PIXI.Container {
    if (!this.display) {
      throw new Error('DragonBones 渲染器尚未加载。');
    }
    return this.display;
  }

  getHeadAnchor(): { x: number; y: number } {
    const bone =
      this.display?.armature.getBone('Head') ??
      this.display?.armature.getBone('head') ??
      this.display?.armature.getBone('Halo') ??
      this.display?.armature.getBone('halo') ??
      null;
    if (bone) {
      bone.updateGlobalTransform();
      return { x: bone.global.x, y: bone.global.y };
    }
    const bounds = this.getBounds();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * 0.08 };
  }

  destroy(): void {
    if (this.display) {
      try {
        this.app?.stage.removeChild(this.display);
        this.display.dispose();
      } catch {
        // 忽略卸载异常
      }
      this.display = null;
    }
    if (this.factory && this.cacheName) {
      try {
        this.factory.removeDragonBonesData(this.cacheName, true);
        this.factory.removeTextureAtlasData(this.cacheName, true);
      } catch {
        // 忽略缓存清理异常
      }
    }
    if (this.baseTexture) {
      try {
        this.baseTexture.destroy();
      } catch {
        // 忽略纹理卸载异常
      }
      this.baseTexture = null;
    }
    this.factory = null;
    this.advance = null;
    this.actions = [];
    this.activeAction = '';
    this.cacheName = '';
  }
}
