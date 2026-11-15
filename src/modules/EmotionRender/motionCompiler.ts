/**
 * 动效编译器：将 EmotionMotionConfig（JSON 动效定义）编译为 GSAP Timeline 并挂载在 Pixi.js 容器。
 */
import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import type {
  EmotionMotionConfig,
  MotionKeyframe,
  MotionLayerConfig,
  MotionLayerInstanceConfig,
} from './motionTypes';

export interface PlayMotionOptions {
  target: PIXI.Container;
  config: EmotionMotionConfig;
  textures: Map<string, PIXI.Texture> | ((texPath: string) => PIXI.Texture | undefined);
  scale?: number;
  loop?: boolean;
}

export interface MotionInstance {
  promise: Promise<void>;
  stop: () => void;
  timeline: gsap.core.Timeline;
  container: PIXI.Container;
}

export function compileMotionTimeline(
  container: PIXI.Container,
  config: EmotionMotionConfig,
  getTexture: (path: string) => PIXI.Texture | undefined,
  baseScale: number = 1
): { timeline: gsap.core.Timeline; sprites: PIXI.Sprite[] } {
  const tl = gsap.timeline();
  const createdSprites: PIXI.Sprite[] = [];

  for (const layer of config.layers) {
    const tex = getTexture(layer.texture);
    if (!tex) {
      console.warn(`[motionCompiler] Missing texture for layer: ${layer.texture}`);
      continue;
    }

    const instances: MotionLayerInstanceConfig[] =
      layer.instances && layer.instances.length > 0
        ? layer.instances
        : Array.from({ length: Math.max(1, layer.count ?? 1) }, (_, i) => ({
            angle: layer.angleStep ? i * layer.angleStep : 0,
          }));

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const sprite = new PIXI.Sprite(tex);
      createdSprites.push(sprite);

      const anchorX = inst.anchor?.x ?? layer.anchor?.x ?? 0.5;
      const anchorY = inst.anchor?.y ?? layer.anchor?.y ?? 0.5;
      sprite.anchor.set(anchorX, anchorY);

      if (layer.pivot) {
        sprite.pivot.set(layer.pivot.x ?? 0, layer.pivot.y ?? 0);
      }

      // 初始位移
      const initX = (layer.position?.x ?? 0) + (inst.x ?? 0);
      const initY = (layer.position?.y ?? 0) + (inst.y ?? 0);
      sprite.position.set(initX, initY);

      // 初始缩放
      const instScale = inst.scale ?? layer.initial?.scale ?? 1;
      const instScaleX = (inst.scaleX ?? layer.initial?.scaleX ?? 1) * instScale * baseScale;
      const instScaleY = (inst.scaleY ?? layer.initial?.scaleY ?? 1) * instScale * baseScale;
      sprite.scale.set(instScaleX, instScaleY);

      // 初始旋转、透明度与可见性
      sprite.angle = (layer.initial?.angle ?? 0) + (inst.angle ?? 0);
      sprite.alpha = inst.alpha ?? layer.initial?.alpha ?? 1;
      sprite.visible = layer.initial?.visible ?? true;
      sprite.zIndex = 10 + i;

      container.addChild(sprite);

      // 依次装配关键帧
      const instanceDelay = inst.delay ?? 0;
      for (const kf of layer.keyframes) {
        const delay = (kf.delay ?? 0) + instanceDelay;
        const ease = kf.ease ?? 'none';

        // 缩放补间
        if (kf.to.scale !== undefined || kf.to.scaleX !== undefined || kf.to.scaleY !== undefined) {
          const targetScaleX = (kf.to.scaleX ?? kf.to.scale ?? 1) * baseScale;
          const targetScaleY = (kf.to.scaleY ?? kf.to.scale ?? 1) * baseScale;
          tl.to(
            sprite.scale,
            {
              x: targetScaleX,
              y: targetScaleY,
              duration: kf.duration,
              ease,
              delay,
            },
            kf.position
          );
        }

        // 其它属性补间（x, y, alpha, angle, visible）
        const spriteVars: gsap.TweenVars = {
          duration: kf.duration,
          ease,
          delay,
        };
        let hasSpriteVars = false;

        if (kf.to.x !== undefined) {
          spriteVars.x = kf.to.x;
          hasSpriteVars = true;
        }
        if (kf.to.y !== undefined) {
          spriteVars.y = kf.to.y;
          hasSpriteVars = true;
        }
        if (kf.to.alpha !== undefined) {
          spriteVars.alpha = kf.to.alpha;
          hasSpriteVars = true;
        }
        if (kf.to.angle !== undefined) {
          spriteVars.angle = kf.to.angle;
          hasSpriteVars = true;
        }
        if (kf.to.visible !== undefined) {
          spriteVars.visible = kf.to.visible;
          hasSpriteVars = true;
        }

        if (hasSpriteVars) {
          tl.to(sprite, spriteVars, kf.position);
        }
      }
    }
  }

  return { timeline: tl, sprites: createdSprites };
}

export function playMotion(options: PlayMotionOptions): MotionInstance {
  const { target, config, textures, scale = 1, loop = false } = options;

  const container = new PIXI.Container();
  if (config.startOffset) {
    container.position.set(config.startOffset.x ?? 0, config.startOffset.y ?? 0);
  }
  container.zIndex = 20;
  target.addChild(container);

  const getTexture =
    typeof textures === 'function'
      ? textures
      : (p: string) => {
          const clean = p.replace(/^[/\\]+/, '');
          return (
            textures.get(p) ??
            textures.get(clean) ??
            textures.get(clean.replace(/^images[/\\]/, ''))
          );
        };

  const { timeline, sprites } = compileMotionTimeline(container, config, getTexture, scale);

  if (loop || config.loop) {
    timeline.repeat(-1);
  }

  let cleanupDone = false;
  const cleanup = () => {
    if (cleanupDone) return;
    cleanupDone = true;
    try {
      timeline.kill();
    } catch {
      // ignore
    }
    for (const sp of sprites) {
      try {
        sp.destroy();
      } catch {
        // ignore
      }
    }
    try {
      container.destroy({ children: true });
    } catch {
      // ignore
    }
  };

  const promise = new Promise<void>((resolve) => {
    timeline.eventCallback('onComplete', () => {
      cleanup();
      resolve();
    });
  });

  return {
    promise,
    stop: cleanup,
    timeline,
    container,
  };
}
