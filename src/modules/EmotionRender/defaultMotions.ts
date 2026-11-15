/**
 * 蔚蓝档案 19 种官方标准表情的 JSON 动效定义（默认回退预设与外载范例）。
 */
import type { EmotionMotionConfig } from './motionTypes';

export const DEFAULT_MOTIONS: Record<string, EmotionMotionConfig> = {
  heart: {
    id: 'heart',
    duration: 1.35,
    layers: [
      {
        name: 'balloon',
        texture: 'images/emoicon_balloon_n.png',
        anchor: { x: 0.5, y: 1.0 },
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.15, alpha: 1 }, duration: 0.25, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.15 },
          { to: { scale: 0.8, alpha: 0 }, duration: 0.2, delay: 0.6 },
        ],
      },
      {
        name: 'heart',
        texture: 'images/emoicon_heart.png',
        anchor: { x: 0.5, y: 0.5 },
        position: { x: 0, y: -45 },
        initial: { scale: 0, alpha: 0 },
        keyframes: [
          { to: { scale: 1.25, alpha: 1 }, duration: 0.28, ease: 'elastic.out(1, 0.45)', delay: 0.08 },
          { to: { scale: 1.0 }, duration: 0.15 },
          { to: { scale: 1.15 }, duration: 0.2, delay: 0.2, ease: 'power2.out' },
          { to: { scale: 1.0 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.18, delay: 0.3 },
        ],
      },
    ],
  },

  respond: {
    id: 'respond',
    duration: 0.84,
    layers: [
      {
        name: 'action_lines',
        texture: 'images/emoicon_action.png',
        instances: [
          { scale: 0.7, anchor: { x: 1.8, y: 0 }, angle: -10 },
          { scale: 1.0, anchor: { x: 1.5, y: 0 }, angle: 23 },
          { scale: 0.7, anchor: { x: 1.8, y: 0 }, angle: 50 },
        ],
        initial: { alpha: 0, scale: 0.4 },
        keyframes: [
          { to: { alpha: 1, scale: 1.0 }, duration: 0.15, ease: 'back.out(2)' },
          { to: { alpha: 0.2 }, duration: 0.15, delay: 0.1 },
          { to: { alpha: 1 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.15, delay: 0.15 },
        ],
      },
    ],
  },

  music: {
    id: 'music',
    duration: 1.1,
    layers: [
      {
        name: 'note',
        texture: 'images/emoicon_note.png',
        anchor: { x: 0.5, y: 0.5 },
        initial: { scale: 0, angle: -15, alpha: 0 },
        keyframes: [
          { to: { scale: 1.2, angle: 10, alpha: 1 }, duration: 0.25, ease: 'back.out(1.8)' },
          { to: { scale: 1.0, angle: -8, y: -25 }, duration: 0.35, ease: 'power1.out' },
          { to: { angle: 5, y: -45 }, duration: 0.3, ease: 'power1.inOut' },
          { to: { alpha: 0, y: -65 }, duration: 0.2, ease: 'power2.in' },
        ],
      },
    ],
  },

  twinkle: {
    id: 'twinkle',
    duration: 1.4,
    layers: [
      {
        name: 'stars',
        texture: 'images/emoicon_twinkle.png',
        instances: [
          { x: 0, y: 0, scale: 1.0, delay: 0 },
          { x: 35, y: -25, scale: 0.9, delay: 0.12 },
          { x: 40, y: 25, scale: 0.65, delay: 0.24 },
        ],
        initial: { scale: 0, alpha: 0, angle: -30 },
        keyframes: [
          { to: { scale: 1.25, alpha: 1, angle: 45 }, duration: 0.25, ease: 'back.out(2)' },
          { to: { scale: 0.85, angle: 90 }, duration: 0.25 },
          { to: { scale: 1.15, angle: 140 }, duration: 0.25 },
          { to: { scale: 0, alpha: 0, angle: 180 }, duration: 0.25, ease: 'power2.in' },
        ],
      },
    ],
  },

  upset: {
    id: 'upset',
    duration: 1.3,
    layers: [
      {
        name: 'balloon',
        texture: 'images/emoicon_balloon_n.png',
        anchor: { x: 0.5, y: 1.0 },
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.1, alpha: 1 }, duration: 0.2, ease: 'back.out(1.5)' },
          { to: { scale: 1.0 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.7 },
        ],
      },
      {
        name: 'anxiety',
        texture: 'images/emoicon_anxiety.png',
        anchor: { x: 0.5, y: 0.5 },
        position: { x: 0, y: -45 },
        initial: { scale: 0, angle: -10, alpha: 0 },
        keyframes: [
          { to: { scale: 1.0, alpha: 1, angle: 10 }, duration: 0.2, delay: 0.1 },
          { to: { angle: -10 }, duration: 0.15 },
          { to: { angle: 10 }, duration: 0.15 },
          { to: { angle: -10 }, duration: 0.15 },
          { to: { angle: 0 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.1 },
        ],
      },
    ],
  },

  sweat: {
    id: 'sweat',
    duration: 0.45,
    layers: [
      {
        name: 'sweat_drops',
        texture: 'images/emoicon_sweat_1.png',
        instances: [
          { x: 0, y: -10, scale: 1.0, delay: 0 },
          { x: 30, y: -20, scale: 0.8, delay: 0.08 },
        ],
        initial: { alpha: 0, scale: 0.3 },
        keyframes: [
          { to: { alpha: 1, scale: 1.1 }, duration: 0.12, ease: 'power2.out' },
          { to: { y: 25, scale: 0.95 }, duration: 0.22, ease: 'power1.in' },
          { to: { alpha: 0, y: 35 }, duration: 0.1 },
        ],
      },
    ],
  },

  dot: {
    id: 'dot',
    duration: 1.15,
    layers: [
      {
        name: 'balloon',
        texture: 'images/emoicon_balloon_n.png',
        anchor: { x: 0.5, y: 1.0 },
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.15, alpha: 1 }, duration: 0.2, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.6 },
        ],
      },
      {
        name: 'dots',
        texture: 'images/emoicon_idea.png',
        anchor: { x: 0.5, y: 0.5 },
        position: { x: 0, y: -45 },
        initial: { scale: 0, alpha: 0 },
        keyframes: [
          { to: { scale: 1.1, alpha: 1 }, duration: 0.2, delay: 0.15, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.1 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.45 },
        ],
      },
    ],
  },

  exclaim: {
    id: 'exclaim',
    duration: 0.8,
    layers: [
      {
        name: 'exclamation',
        texture: 'images/emoicon_exclamationmark.png',
        anchor: { x: 0.5, y: 0.9 },
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.3, alpha: 1 }, duration: 0.18, ease: 'back.out(2.5)' },
          { to: { scale: 1.0 }, duration: 0.12 },
          { to: { scale: 0.8, alpha: 0 }, duration: 0.2, delay: 0.25 },
        ],
      },
    ],
  },

  surprise: {
    id: 'surprise',
    duration: 1.0,
    layers: [
      {
        name: 'exclamation',
        texture: 'images/emoicon_exclamation.png',
        anchor: { x: 0.5, y: 0.85 },
        position: { x: -18, y: 0 },
        initial: { scale: 0, alpha: 0, angle: -12 },
        keyframes: [
          { to: { scale: 1.25, alpha: 1 }, duration: 0.2, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.1 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.45 },
        ],
      },
      {
        name: 'question',
        texture: 'images/emoicon_question.png',
        anchor: { x: 0.5, y: 0.85 },
        position: { x: 18, y: 0 },
        initial: { scale: 0, alpha: 0, angle: 12 },
        keyframes: [
          { to: { scale: 1.25, alpha: 1 }, duration: 0.22, delay: 0.06, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.1 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.45 },
        ],
      },
    ],
  },

  question: {
    id: 'question',
    duration: 0.85,
    layers: [
      {
        name: 'question',
        texture: 'images/emoicon_questionmark.png',
        anchor: { x: 0.5, y: 0.9 },
        initial: { scale: 0.2, alpha: 0, angle: -8 },
        keyframes: [
          { to: { scale: 1.25, alpha: 1, angle: 8 }, duration: 0.2, ease: 'back.out(2)' },
          { to: { scale: 1.0, angle: 0 }, duration: 0.12 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.3 },
        ],
      },
    ],
  },

  shy: {
    id: 'shy',
    duration: 1.2,
    layers: [
      {
        name: 'balloon',
        texture: 'images/emoicon_balloon_n.png',
        anchor: { x: 0.5, y: 1.0 },
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.15, alpha: 1 }, duration: 0.22, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.12 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.6 },
        ],
      },
      {
        name: 'shy_face',
        texture: 'images/emoicon_shy.png',
        anchor: { x: 0.5, y: 0.5 },
        position: { x: 0, y: -45 },
        initial: { scale: 0, alpha: 0 },
        keyframes: [
          { to: { scale: 1.15, alpha: 1 }, duration: 0.22, delay: 0.1, ease: 'back.out(2)' },
          { to: { angle: 8 }, duration: 0.1 },
          { to: { angle: -8 }, duration: 0.1 },
          { to: { angle: 6 }, duration: 0.1 },
          { to: { angle: 0 }, duration: 0.1 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.15 },
        ],
      },
    ],
  },

  angry: {
    id: 'angry',
    duration: 0.8,
    layers: [
      {
        name: 'aggro_veins',
        texture: 'images/emoicon_aggro.png',
        count: 3,
        angleStep: 120,
        anchor: { x: 0.35, y: -0.05 },
        initial: { scale: 0.3, alpha: 0 },
        keyframes: [
          { to: { scale: 1.25, alpha: 1 }, duration: 0.15, ease: 'back.out(2.5)' },
          { to: { scale: 1.0 }, duration: 0.12 },
          { to: { scale: 1.18 }, duration: 0.15, ease: 'power2.out' },
          { to: { scale: 0, alpha: 0 }, duration: 0.18, delay: 0.05 },
        ],
      },
    ],
  },

  chat: {
    id: 'chat',
    duration: 0.9,
    layers: [
      {
        name: 'chat_bubble',
        texture: 'images/emoicon_chat.png',
        anchor: { x: 0.5, y: 0.85 },
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.2, alpha: 1, angle: -8 }, duration: 0.2, ease: 'back.out(2)' },
          { to: { scale: 1.0, angle: 0 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.35 },
        ],
      },
    ],
  },

  sad: {
    id: 'sad',
    duration: 1.1,
    layers: [
      {
        name: 'sad_lines',
        texture: 'images/emoji_sad.png',
        instances: [
          { x: -30, y: -20, delay: 0 },
          { x: 0, y: -10, delay: 0.08 },
          { x: 30, y: -20, delay: 0.16 },
        ],
        initial: { scale: 0.6, alpha: 0 },
        keyframes: [
          { to: { alpha: 1, scale: 1.0, y: 10 }, duration: 0.25, ease: 'power2.out' },
          { to: { y: 35 }, duration: 0.3, ease: 'power1.in' },
          { to: { alpha: 0, y: 45 }, duration: 0.2 },
        ],
      },
    ],
  },

  steam: {
    id: 'steam',
    duration: 0.7,
    layers: [
      {
        name: 'steam_clouds',
        texture: 'images/emoji_steam.png',
        instances: [
          { x: -35, y: 0, angle: -25, delay: 0 },
          { x: 35, y: 0, angle: 25, delay: 0.05 },
        ],
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.25, alpha: 1 }, duration: 0.2, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.12 },
          { to: { scale: 1.15, alpha: 0 }, duration: 0.22, delay: 0.1 },
        ],
      },
    ],
  },

  sigh: {
    id: 'sigh',
    duration: 0.8,
    layers: [
      {
        name: 'sigh_cloud',
        texture: 'images/emoji_sigh.png',
        anchor: { x: 0.5, y: 0.5 },
        initial: { scale: 0.3, alpha: 0, angle: -10 },
        keyframes: [
          { to: { scale: 1.2, alpha: 1, x: 20, y: -10 }, duration: 0.25, ease: 'power2.out' },
          { to: { scale: 1.35, alpha: 0, x: 45, y: -20 }, duration: 0.35, delay: 0.1, ease: 'power1.in' },
        ],
      },
    ],
  },

  bulb: {
    id: 'bulb',
    duration: 1.2,
    layers: [
      {
        name: 'balloon',
        texture: 'images/emoicon_balloon_n.png',
        anchor: { x: 0.5, y: 1.0 },
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.15, alpha: 1 }, duration: 0.2, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.12 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.65 },
        ],
      },
      {
        name: 'bulb_glow',
        texture: 'images/emoji_bulb_2.png',
        anchor: { x: 0.5, y: 0.5 },
        position: { x: 0, y: -45 },
        initial: { scale: 0, alpha: 0 },
        keyframes: [
          { to: { scale: 1.35, alpha: 1 }, duration: 0.25, delay: 0.15, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.4 },
        ],
      },
      {
        name: 'bulb_core',
        texture: 'images/emoji_bulb_1.png',
        anchor: { x: 0.5, y: 0.5 },
        position: { x: 0, y: -45 },
        initial: { scale: 0, alpha: 0 },
        keyframes: [
          { to: { scale: 1.2, alpha: 1 }, duration: 0.22, delay: 0.15, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.15 },
          { to: { alpha: 0 }, duration: 0.2, delay: 0.4 },
        ],
      },
    ],
  },

  tear: {
    id: 'tear',
    duration: 0.8,
    layers: [
      {
        name: 'tear_spurt',
        texture: 'images/emoji_tear_1.png',
        instances: [
          { x: -30, y: 0, angle: -20, delay: 0 },
          { x: 30, y: 0, angle: 20, delay: 0.05 },
        ],
        initial: { scale: 0.2, alpha: 0 },
        keyframes: [
          { to: { scale: 1.3, alpha: 1 }, duration: 0.18, ease: 'back.out(2)' },
          { to: { scale: 1.0 }, duration: 0.12 },
          { to: { scale: 0.8, alpha: 0, y: 20 }, duration: 0.25, delay: 0.15 },
        ],
      },
    ],
  },

  zzz: {
    id: 'zzz',
    duration: 1.4,
    layers: [
      {
        name: 'z_letters',
        texture: 'images/emoji_zzz.png',
        instances: [
          { x: -15, y: 0, scale: 0.7, delay: 0 },
          { x: 5, y: -25, scale: 0.9, delay: 0.25 },
          { x: 25, y: -55, scale: 1.15, delay: 0.5 },
        ],
        initial: { scale: 0, alpha: 0, angle: -10 },
        keyframes: [
          { to: { scale: 1.0, alpha: 1, angle: 5 }, duration: 0.25, ease: 'back.out(1.8)' },
          { to: { y: -15, angle: -5 }, duration: 0.3 },
          { to: { alpha: 0, y: -30 }, duration: 0.25, delay: 0.15 },
        ],
      },
    ],
  },
};
