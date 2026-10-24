import { onBeforeUnmount, onMounted, type Ref } from 'vue';

export interface MouseSparkOptions {
  /** 粒子与波纹主色，RGB 逗号分隔格式，默认 BA 天空蓝 45,175,255 */
  color?: string;
  /** 缩放比例，默认 1.3 */
  scale?: number;
  /** 整体不透明度，默认 1.0 */
  opacity?: number;
  /** 点击波纹与粒子速度，默认 1.0 */
  clickSpeed?: number;
  /** 拖尾动画速度，默认 1.0 */
  trailSpeed?: number;
  /** 是否启用按住拖拽时的光轨拖尾，默认 true */
  enableTrail?: boolean;
}

interface WaveRingSeg {
  off: number;
  len: number;
  rRoundRate: number;
}

interface WaveItem {
  x: number;
  y: number;
  r: number;
  life: number;
  ring: {
    ang: number;
    rs: number;
    segs: WaveRingSeg[];
  };
}

interface SparkItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rs: number;
  s: number;
  a: number;
  f: number;
  fromClick: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

const FILLED_CIRCLE_CFG = {
  rAddRate: 26,
  maxLife: 16,
} as const;

const RINGS_ANIM_CFG = {
  rsList: [0, 0.03, 0.06],
  rRoundRateList: [0, 1, 1.5, 2],
  len: 1.1 * Math.PI,
  maxLife: 23,
  segNum: 10,
  minW: 0.4,
  maxW: 3.3,
  lenStopAddPoint: 0.1,
  lenStartDimPoint: 0.4,
} as const;

const CREATE_CLICK_CFG = {
  sparksCount: 4,
} as const;

function parseRingsEndColor(rgbString: string): [number, number, number] {
  const parts = rgbString.split(',').map(Number);
  return [
    Math.round(((parts[0] ?? 45) + 255 * 2) / 3),
    Math.round(((parts[1] ?? 175) + 255 * 2) / 3),
    Math.round(((parts[2] ?? 255) + 255 * 2) / 3),
  ];
}

/**
 * 封装《蔚蓝档案》风格鼠标点击粒子与光弧动效
 */
export function useMouseSpark(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: MouseSparkOptions = {}
) {
  const color = options.color ?? '45,175,255';
  const scale = options.scale ?? 1.3;
  const opacity = options.opacity ?? 1.0;
  const clickSpeed = options.clickSpeed ?? 1.0;
  const trailSpeed = options.trailSpeed ?? 1.0;
  const enableTrail = options.enableTrail ?? true;

  const ringsStartColor: [number, number, number] = [250, 252, 252];
  const ringsEndColor = parseRingsEndColor(color);

  let ctx: CanvasRenderingContext2D | null = null;
  let dpr = 1;
  let cssWidth = 0;
  let cssHeight = 0;

  const waves: WaveItem[] = [];
  const sparks: SparkItem[] = [];
  const trail: TrailPoint[] = [];

  const wavesPool: WaveItem[] = [];
  const sparksPool: SparkItem[] = [];

  let isPointerDown = false;
  let lastPos: { x: number; y: number } | null = null;
  let animationFrameId: number | null = null;
  let lastFrameTime = performance.now();

  const baseFrameMs = 1000 / 60;
  const maxDeltaMs = 100;

  function resize() {
    const canvas = canvasRef.value;
    if (!canvas) return;

    dpr = window.devicePixelRatio || 1;
    cssWidth = Math.max(1, window.innerWidth);
    cssHeight = Math.max(1, window.innerHeight);

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function createClickEffect(x: number, y: number) {
    const rc = RINGS_ANIM_CFG;
    const wave: WaveItem = wavesPool.pop() ?? {
      x: 0,
      y: 0,
      r: 0,
      life: 0,
      ring: { ang: 0, rs: 0, segs: [] },
    };

    wave.x = x;
    wave.y = y;
    wave.r = 0;
    wave.life = 0;
    wave.ring.ang = Math.random() * Math.PI * 2;
    wave.ring.rs = rc.rsList[Math.floor(Math.random() * rc.rsList.length)] ?? 0.03;
    wave.ring.segs = [
      {
        off: 0,
        len: rc.len,
        rRoundRate: rc.rRoundRateList[Math.floor(Math.random() * rc.rRoundRateList.length)] ?? 1,
      },
      {
        off: (Math.random() * 3 - 1.5) * Math.PI,
        len: rc.len,
        rRoundRate: rc.rRoundRateList[Math.floor(Math.random() * rc.rRoundRateList.length)] ?? 1.5,
      },
    ];

    waves.push(wave);

    const speedAdjust = scale / 1.5;
    for (let i = 0; i < CREATE_CLICK_CFG.sparksCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (4.8 + Math.random() * 2) * speedAdjust;
      const spark: SparkItem = sparksPool.pop() ?? {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        rs: 0,
        s: 0,
        a: 1,
        f: 0.9,
        fromClick: true,
      };

      spark.x = x;
      spark.y = y;
      spark.vx = Math.cos(a) * speed;
      spark.vy = Math.sin(a) * speed;
      spark.rot = Math.random() * Math.PI * 2;
      spark.rs = (Math.random() - 0.5) * 0.28;
      spark.s = (4 + Math.random() * 3) * scale;
      spark.a = 1;
      spark.f = 0.9;
      spark.fromClick = true;

      sparks.push(spark);
    }

    startAnimationLoop();
  }

  function startAnimationLoop() {
    if (animationFrameId !== null) return;
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(renderLoop);
  }

  function renderLoop(now: number) {
    animationFrameId = null;

    if (!ctx || !canvasRef.value) return;

    const hasWork = waves.length > 0 || sparks.length > 0 || trail.length > 0;
    if (!hasWork) {
      // 闲置时清空画布并休眠，保持 0% CPU 占用
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      return;
    }

    const deltaMs = Math.min(now - lastFrameTime, maxDeltaMs);
    lastFrameTime = now;
    const baseScale = deltaMs / baseFrameMs;
    const clickFrameScale = baseScale * clickSpeed;
    const trailFrameScale = baseScale * trailSpeed;

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    ctx.save();
    // 使用 lighter 模式实现星芒与光弧的加色辉光
    ctx.globalCompositeOperation = 'lighter';

    updateTrail(trailFrameScale);
    updateWaves(clickFrameScale);
    updateSparks(clickFrameScale, trailFrameScale);

    ctx.restore();

    animationFrameId = requestAnimationFrame(renderLoop);
  }

  function updateTrail(frameScale: number) {
    if (!ctx || trail.length === 0) return;

    const baseDecay = (isPointerDown ? 0.085 : 0.18) * frameScale;
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      if (!t) continue;
      t.life -= baseDecay;
      if (t.life <= 0) {
        trail.splice(i, 1);
      }
    }

    if (trail.length < 2) return;

    const lastIdx = trail.length - 1;
    const glowPasses = [
      { lineWidth: 9 * (scale / 1.5), alphaMul: 0.05 * opacity },
      { lineWidth: 6 * (scale / 1.5), alphaMul: 0.5 * opacity },
      { lineWidth: 4.5 * (scale / 1.5), alphaMul: 1.0 * opacity },
    ];

    for (const pass of glowPasses) {
      ctx.lineWidth = pass.lineWidth;
      for (let i = 0; i < lastIdx; i++) {
        const a0 = trail[i];
        const a1 = trail[i + 1];
        if (!a0 || !a1) continue;

        const prev = i > 0 ? (trail[i - 1] ?? a0) : a0;
        const next = i < lastIdx - 1 ? (trail[i + 2] ?? a1) : a1;

        // Catmull-Rom 样条平滑插值
        const cp1x = a0.x + (a1.x - prev.x) / 6;
        const cp1y = a0.y + (a1.y - prev.y) / 6;
        const cp2x = a1.x - (next.x - a0.x) / 6;
        const cp2y = a1.y - (next.y - a0.y) / 6;

        const alphaStart = (i / lastIdx) * pass.alphaMul * a0.life;
        const alphaEnd = ((i + 1) / lastIdx) * pass.alphaMul * a1.life;

        const segGrad = ctx.createLinearGradient(a0.x, a0.y, a1.x, a1.y);
        segGrad.addColorStop(0, `rgba(${color},${alphaStart})`);
        segGrad.addColorStop(1, `rgba(${color},${alphaEnd})`);

        ctx.beginPath();
        ctx.moveTo(a0.x, a0.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, a1.x, a1.y);
        ctx.strokeStyle = segGrad;
        ctx.stroke();
      }
    }
  }

  function updateWaves(clickFrameScale: number) {
    if (!ctx) return;

    const filled = FILLED_CIRCLE_CFG;
    const rings = RINGS_ANIM_CFG;

    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      if (!w) continue;

      w.life += clickFrameScale;
      const waveProg = Math.min(w.life / filled.maxLife, 1);
      const ringProg = Math.min(w.life / rings.maxLife, 1);

      // 1. 中心膨胀填充圆
      const ease = 1 - Math.pow(1 - waveProg, 3);
      w.r = filled.rAddRate * scale * ease;
      const waveAlpha = Math.max(0, 1 - waveProg) * opacity;
      if (waveAlpha > 0) {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${waveAlpha})`;
        ctx.fill();
      }

      // 2. 外围旋转光弧
      const r = w.ring;
      r.ang -= r.rs * clickFrameScale;

      const getWeightProp = (t: number) => Math.min(2 - Math.abs(4 * (t - 0.5)), 1);
      const ringRgbAt = (rProg: number): [number, number, number] => {
        const t = Math.min(1.2 * rProg, 1);
        return [
          Math.round(ringsStartColor[0] * (1 - t) + ringsEndColor[0] * t),
          Math.round(ringsStartColor[1] * (1 - t) + ringsEndColor[1] * t),
          Math.round(ringsStartColor[2] * (1 - t) + ringsEndColor[2] * t),
        ];
      };
      const alphaRing = Math.min(1.1 - 0.3 * ringProg, 1) * opacity;
      const [rr, gg, bb] = ringRgbAt(ringProg);

      for (let sIdx = 0; sIdx < 2; sIdx++) {
        const seg = r.segs[sIdx];
        if (!seg) continue;

        const base = r.ang + seg.off;
        let start = 0;
        let end = 0;
        let len = 0;

        if (ringProg <= rings.lenStopAddPoint) {
          len = seg.len * (ringProg / rings.lenStopAddPoint);
          end = base + seg.len;
          start = end - len;
        } else if (ringProg > rings.lenStartDimPoint) {
          len = seg.len * (1 - (ringProg - rings.lenStartDimPoint) / (1 - rings.lenStartDimPoint));
          start = base;
          end = start + len;
        } else {
          len = seg.len;
          start = base;
          end = start + len;
        }

        const lineWidthMul = Math.min(-0.8 * (ringProg - 0.8) + 1, 1);

        // 分段描绘中间粗两端尖的锥形弧光
        for (let k = 0; k < rings.segNum; k++) {
          const t0 = k / rings.segNum;
          const t1 = (k + 1) / rings.segNum;
          const a0 = start + (end - start) * t0;
          const a1 = start + (end - start) * t1;

          if (Math.abs(a1 - a0) < 0.01) continue;

          const wT = getWeightProp(t0);
          const lw = (rings.minW * (1 - wT) + rings.maxW * wT) * lineWidthMul * (scale / 1.5);
          const radius = w.r + seg.rRoundRate * scale;

          ctx.beginPath();
          ctx.arc(w.x, w.y, radius, a0, a1);
          ctx.lineWidth = lw;
          ctx.strokeStyle = `rgba(${rr},${gg},${bb},${alphaRing})`;
          ctx.stroke();
        }
      }

      // 完成后回收至对象池
      if (ringProg >= 1 && waveProg >= 1) {
        wavesPool.push(waves[i]!);
        waves.splice(i, 1);
      }
    }
  }

  function updateSparks(clickFrameScale: number, trailFrameScale: number) {
    if (!ctx) return;

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      if (!s) continue;

      const fs = s.fromClick ? clickFrameScale : trailFrameScale;
      s.x += s.vx * fs;
      s.y += s.vy * fs;
      s.vx *= Math.pow(s.f, fs);
      s.vy *= Math.pow(s.f, fs);
      s.rot += s.rs * fs;
      s.a -= 0.032 * fs;

      if (s.a <= 0) {
        sparksPool.push(sparks[i]!);
        sparks.splice(i, 1);
        continue;
      }

      const sparkAlpha = Math.max(0, s.a * opacity);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      // 菱角微粒子
      ctx.moveTo(0, -s.s);
      ctx.lineTo(s.s * 0.6, s.s * 0.6);
      ctx.lineTo(-s.s * 0.6, s.s * 0.6);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,255,255,${sparkAlpha})`;
      ctx.fill();
      ctx.restore();
    }
  }

  function onPointerDown(e: PointerEvent) {
    isPointerDown = true;
    lastPos = { x: e.clientX, y: e.clientY };
    createClickEffect(e.clientX, e.clientY);
  }

  function onPointerMove(e: PointerEvent) {
    const current = { x: e.clientX, y: e.clientY };

    if (!enableTrail) {
      lastPos = current;
      return;
    }

    if (!isPointerDown) {
      lastPos = current;
      return;
    }

    if (lastPos) {
      const dx = current.x - lastPos.x;
      const dy = current.y - lastPos.y;
      if (Math.hypot(dx, dy) > 2) {
        trail.push({ x: current.x, y: current.y, life: 1 });
        if (trail.length > 20) {
          trail.shift();
        }

        // 移动过程中 30% 概率散出微粒子
        if (Math.random() < 0.3) {
          const a = Math.random() * Math.PI * 2;
          const speedAdjust = scale / 1.5;
          const spark: SparkItem = sparksPool.pop() ?? {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            rot: 0,
            rs: 0,
            s: 0,
            a: 1,
            f: 0.95,
            fromClick: false,
          };

          spark.x = current.x + Math.cos(a) * 10 * scale;
          spark.y = current.y + Math.sin(a) * 10 * scale;
          spark.vx = Math.cos(a) * 1.3 * speedAdjust;
          spark.vy = Math.sin(a) * 1.3 * speedAdjust;
          spark.rot = Math.random() * Math.PI * 2;
          spark.rs = 0.16;
          spark.s = 7 * scale;
          spark.a = 0.7;
          spark.f = 0.95;
          spark.fromClick = false;

          sparks.push(spark);
        }

        startAnimationLoop();
      }
    }

    lastPos = current;
  }

  function onPointerUp() {
    isPointerDown = false;
  }

  onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resize();

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
  });

  onBeforeUnmount(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  });

  return {
    createClickEffect,
  };
}
