/**
 * 动效 JSON DSL 类型定义（基于 Pixi.js 场景图与 GSAP 物理时间轴）。
 */

export interface MotionPosition {
  x?: number;
  y?: number;
}

export interface MotionTransformState {
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  alpha?: number;
  visible?: boolean;
}

export interface MotionKeyframe {
  /** 目标状态变换 */
  to: MotionTransformState;
  /** 持续时间（秒） */
  duration: number;
  /** 延迟时间（秒） */
  delay?: number;
  /** 缓动曲线名，如 "power4.out", "back.out(2)", "elastic.out(1, 0.5)", "none" */
  ease?: string;
  /** GSAP 时间线插入标记，如 "<", ">+=0.2" */
  position?: string | number;
}

export interface MotionLayerInstanceConfig {
  x?: number;
  y?: number;
  angle?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  delay?: number;
  anchor?: MotionPosition;
}

export interface MotionLayerConfig {
  name?: string;
  /** 贴图相对路径，如 "images/emoicon_heart.png" 或贴图 URL */
  texture: string;
  /** 实例数量（多用于径向/粒子），默认 1 */
  count?: number;
  /** 径向角度间隔（度数），例如 3 个分布设置 120 */
  angleStep?: number;
  /** 默认锚点，缺省为中心 { x: 0.5, y: 0.5 } */
  anchor?: MotionPosition;
  /** 轴心偏移（px） */
  pivot?: MotionPosition;
  /** 基础位置（相对表情中心 px） */
  position?: MotionPosition;
  /** 初始状态 */
  initial?: MotionTransformState;
  /** 单独指定每个实例的不同参数（优先级高于 count） */
  instances?: MotionLayerInstanceConfig[];
  /** 关键帧序列 */
  keyframes: MotionKeyframe[];
}

export interface EmotionMotionConfig {
  version?: string;
  id: string;
  /** 总播放时长（秒，可选） */
  duration?: number;
  /** 基础相对头顶偏移比例或 px */
  startOffset?: MotionPosition;
  /** 是否循环播放 */
  loop?: boolean;
  /** 图层列表 */
  layers: MotionLayerConfig[];
}
