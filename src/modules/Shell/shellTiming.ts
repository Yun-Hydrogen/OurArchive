/**
 * 应用外壳时序（单位：毫秒）。
 *
 * splash → home 不做蒙层、不重载页面：气泡背景与 banner 都是 App 层常驻元素，
 * 靠这里的时长编排「版权飞出 → banner 归位 → 卡片入场」。
 */
export const SHELL_TIMING = {
  /** banner 从窗口中央缩到左下角的时长 */
  bannerMorph: 620,
  /** 动画版 banner 与静态版 banner 的交叉淡入时长 */
  bannerCrossfade: 300,
  /** 停靠后延迟多久开始交叉淡入（等缩放到位） */
  bannerCrossfadeDelay: 340,
  /** 跳转后卡片入场的起始延迟 */
  cardsEnterBase: 120,
  /** 卡片离场动画时长（与入场共用一套缓动） */
  cardsExit: 260,
  /**
   * 离场动画播完后等多久再切路由。
   * 取值要略大于「cardsExit + 最大错峰延迟」，否则最后一张卡会被路由切换截断。
   */
  cardsExitWait: 320,
} as const;
