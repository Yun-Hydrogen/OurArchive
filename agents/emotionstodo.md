# 表情系统：参考实现记录与待办

> 本文记录从第三方故事播放器（<https://res.bluearchive.help/>）抓到的**表情（Emoticon）实现方法**，
> 作为我们 `Emotions` 分类与未来剧情播放器的参考。
>
> 素材来源：`C:\Users\YunHydrogen\Downloads\123\故事_files\index-BszzXD4_.js.download`（2.8 MB，已压缩）。
> 文中 `变量名` 均为压缩后的原名，方便回溯原文；行号不适用，用「搜索关键字符串」定位。

---

## 1. 结论速览

- 表情是**纯 PNG 帧动画**，不是 Spine、不是 GIF/APNG：每张图 `Sprite.from(texture)`，用 GSAP 时间轴逐帧补间，播完 `destroy()`。
- **多图合成**就是同一容器里叠若干 sprite，各自独立缩放 / 旋转 / 位移；「多个表情符号」= 同一张图复制 2–3 份错开摆位。
- 坐标有**固定设计基准 540 × 1012**，与角色实际像素无关；容器挂在角色 Spine 容器上，所以角色移动 / 缩放时表情跟随。
- 每播放一次必然触发一段同名音效：`SFX_Emoticon_Motion_{Name}.wav`。
- 表情与 `action` / `fx` 并列，属于「角色特效」，都是 `async: false`（不阻塞下一句）。

---

## 2. 资源地址与命名

```js
var ta = `https://res.bluearchive.help/image/ba-all-data`;

function aa(kind, t) {
  switch (kind) {
    case `emotionImg`:   return `${ta}/UIs/03_Scenario/03_Emoticon/${t}`;
    case `emotionSound`: return `${ta}/Audio/Sound/${t}.wav`;
  }
}
// 音效名 = `SFX_Emoticon_Motion_${Name}`
```

| 用途 | 路径 |
| :--- | :--- |
| 表情图 | `{base}/UIs/03_Scenario/03_Emoticon/{Name}.png` |
| 表情音效 | `{base}/Audio/Sound/SFX_Emoticon_Motion_{Name}.wav` |

实测 24 张图 + 19 段音效全部可下载；命名前缀有两套：`Emoticon_*`（16 张）与 `Emoji_*`（8 张）。

---

## 3. 表情 → 图片 映射表（`nI` / `emotionResourcesTable`）

```js
var nI = {
  Heart:    [`Emoticon_Balloon_N.png`, `Emoticon_Heart.png`],
  Respond:  [`Emoticon_Action.png`],
  Music:    [`Emoticon_Note.png`],
  Twinkle:  [`Emoticon_Twinkle.png`],
  Upset:    [`Emoticon_Balloon_N.png`, `Emoticon_Anxiety.png`],
  Sweat:    [`Emoticon_Sweat_1.png`, `Emoticon_Sweat_2.png`],
  Dot:      [`Emoticon_Balloon_N.png`, `Emoticon_Idea.png`],
  Exclaim:  [`Emoticon_ExclamationMark.png`],
  Surprise: [`Emoticon_Exclamation.png`, `Emoticon_Question.png`],
  Question: [`Emoticon_QuestionMark.png`],
  Shy:      [`Emoticon_Balloon_N.png`, `Emoticon_Shy.png`],
  Angry:    [`Emoticon_Aggro.png`],
  Chat:     [`Emoticon_Chat.png`],
  Sad:      [`Emoji_Sad.png`],
  Steam:    [`Emoji_Steam.png`],
  Sigh:     [`Emoji_Sigh.png`],
  Bulb:     [`Emoticon_Balloon_N.png`, `Emoji_Bulb_1.png`, `Emoji_Bulb_2.png`],
  Tear:     [`Emoji_Tear_1.png`, `Emoji_Tear_2.png`],
  Zzz:      [`Emoji_Zzz.png`],
};
```

注意 `Respond` / `Twinkle` / `Angry` / `Sad` / `Steam` / `Zzz` 虽然只声明 1 张图，但播放时会**复制**成 2–3 个 sprite（见第 5 节）。

加载时机：`addEmotionResources()` 把所有图 `VY(name, url)` 预载，同时把 `SFX_Emoticon_Motion_{Name}` 塞进加载队列。

---

## 4. 坐标与缩放（三个工具函数）

```js
// 容器定位：挂在角色 Spine 容器上
function Wz(charInstance, cfg, sprite) {
  sprite ||= new Container();
  const r = (cfg.startPositionOffset.x - 0.8) * 540;
  const i = (cfg.startPositionOffset.y - 1.2) * 1012;
  sprite.position.set(r, i);
  sprite.zIndex = 10;
  charInstance.addChild(sprite);
  return { offsetX: r, offsetY: i, container: sprite };
}

// 图片基准缩放：目标宽度 = scale × 540
function Gz(sprite, cfg) {
  return cfg.scale * 540 / sprite.width;
}

// 相对父层定位：x、y 都用父层【宽度】换算
function Hz(sprite, offset) {
  return { x: sprite.x + sprite.width * offset.x, y: sprite.y + sprite.width * offset.y };
}

// 相对父层尺寸的比例定位（Upset 用）
function Uz(sprite, parent, pos) {
  sprite.position = { x: pos.x * parent.width, y: pos.y * parent.height };
}

function qz(frames) { return frames / 60; }   // 帧数 → 秒
```

角色自身的定位（用于理解基准）：

```js
var Jte = 550, Yte = 0.34, Xte = 0.49;   // 参考高度 / 缩放系数 / 垂直对齐
function Zz(emotionInstance) {
  const { screenHeight } = nB();
  const scale = screenHeight / Jte * Yte;
  return { scale, y: screenHeight - emotionInstance.height / emotionInstance.scale.y * scale * (1 - Xte) };
}
```

要点：

1. **540 / 1012 是固定设计基准**，不是角色尺寸；`startPositionOffset` 是相对「角色容器原点」的比例。
2. `Hz` / `Uz` 里 y 也用**宽度**换算（不是高度），这是复刻时最容易写错的一处。
3. 容器 `zIndex = 10`，子图 `zIndex = 10/11`，`stage.sortableChildren = true`。

---

## 5. 每个表情的参数与播放逻辑

总入口：

```js
var Jz = { action: Mz, emotion: Vz, fx: Rte };

processEffect(type, unit) {
  const handler = this.getHandlerFunction(type);       // Vz[EmotionName]
  const { emotionResources, app } = dI();
  const sprites = emotionResources(type).map((texture) => {
    const s = Sprite.from(texture); s.visible = false; app.stage.addChild(s); return s;
  });
  K.emit(`playEmotionAudio`, type);                    // 音效与动画同时开始
  return handler(unit, Bz[type], sprites)?.then(() => sprites.forEach((s) => s.destroy()));
}
```

所有补间用 GSAP（`Wi.timeline()`），`pixi: { x, y, alpha, angle, scale }` 是 GSAP 的 PIXI 插件属性。

### 5.1 参数常量 `Bz`（原文照录）

| 表情 | 参数 |
| :--- | :--- |
| `Heart` | `offset{0.1,-0.1}` `scale .45` `heartImg{scale .4, position{.27,.16}}` `jumpAnimation{first{1.2,1.3}, second{1.1,1.2}, duration .25}` `fadeOut .2` |
| `Respond` | `offset{.6,0}` `scale .13` `fadeOutPre .3` `fadeOut .12` `flash{duration .3, alpha .2}` `perImg[{scale .7, anchor{1.8,0}, angle -10},{1, {1.5,0}, 23},{.7, {1.8,0}, 50}]` |
| `Music` | `offset{.2,0}` `scale .2` `rotateAngle -8` `animation{offset{-1,.1}, duration .8}` `fadeOut .1` |
| `Twinkle` | `offset{.2,0}` `scale .08` `fadeOutPre .2` `fadeOut .2` `starImgs{pos[(0,0),(.7,-.6),(.8,.6)], scale[1,.9,.6]}` `flash{scales[1.2,1.15,.9], duration[.5,.6,.4], total 1}` `fadeIn .2` |
| `Sad` | `offset{.4,0}` `scale .3` `fadeOut .1` `imageGap 30` `moveYDistance 35` `imgInitYPosition[0,30,-30]` |
| `Sweat` | `offset{.4,0}` `scale .12` `smallImg{scale 1, offset{1,-.5}, dropAnimationOffset -2.3}` `dropAnimation{yOffset -1, duration .4}` `fadeOut .1` |
| `Dot` | `offset{0,-.1}` `scale .3` `fadeOutPre .1` `fadeOut .1` `dotContainerPos{.1,.35}` `dotPos[0,2,4]` `show{alpahaDuration .1, showDelay .3}` |
| `Chat` | `offset{.45,.17}` `scale .2` `rotateAngle -25` `rotateTime .5` `rotatePivot{.3,0}` `fadeOut .1` |
| `Exclaim` | `offset{.42,-.1}` `scale .13` `fadeOut .1` `scaleAnimation{scale 1.4, scaleDuration .2, recoverScale 1.2, recoverDuration .1}` `fadeOutWaitTime .3` |
| `Angry` | `offset{.5,.05}` `scale .16` `pivot{.35,-.05}` `animationScale{.9,.2}` `endScale{.2,.1}` `fadeOut .1` |
| `Surprise` | `offset{.35,.06}` `scale .12` `fadeOutPre .4` `imgSetting{angles[-10,15], questionImgPos{1.5,0}}` `fadeOut .1` `scaleAnimation{start .7, questionImgYScale .3, duration .3, anchor{.5,1}}` `jump{xOffset -.1, jumpYOffset .1, duration .3}` |
| `Question` | `offset{.4,.07}` `scale .15` `fadeOut .2` `fadeOutPre .4` `scaleAnimation{scale 1.6, anchor{.5,1}, scaleDuration .2, recoverScale 1.4, recoverDuration .05}` |
| `Shy` | `offset{.5,.06}` `scale .46` `fadeOut .1` `shyImg{anchor{.5,.5}, scale 1, position{-.65,-.5}}` `scaleAnamation{start .8, anchor{1,1}, duration .1}` `shake{angleFrom 13, angleTo -10, duration .4, times 2}` |
| `Upset` | `offset{0,-.1}` `scale .27` `fadeOut .3` `upsetImgPos{.5,.5}` `rotateAnimation{6 → -7, duration .2}` `yScaleAnimation{.8, duration .43}` `animationTotalDuration 1` |
| `Steam` | `offset{.5,.1}` `scale .27` `fadeOut .3` `imgPivot{1.4,1.5}` `imgScaleAnimation[{.1,.7},{.6,.9}]` `imgAngles[-30,0]` |
| `Sigh` | `offset{.4,.15}` `scale .27` `fadeOut .3` `angle 0` `scaleAnimation{.3 → .9}` `anchor{1,-.2}` |
| `Bulb` | `offset{.1,-.1}` `scale .27` `fadeOut .3` `dialogScaleAnimation{.7 → 1}` `bulbYPosition 100` `lightScale 1.13` `lightYPosition 82` |
| `Tear` | `offset{.45,.15}` `scale .27` `fadeOut .3` `positions[(0,30),(0,0)]` `scaleAnimations[.5→1, .6→1]` `anchors[(1,0),(1,0)]` |
| `Zzz` | `offset{.45,.1}` `scale .1` `fadeOut .3` `zImageSettings[{pos(0,0), scale .8, rotate 15},{pos(-80,-30), scale .9, rotate 5},{pos(-190,7), scale 1, rotate -15}]` |

### 5.2 各表情的时间轴（`Vz` 的 19 个 handler）

| 表情 | 做法要点 |
| :--- | :--- |
| `Heart` | 气球 `scale .45`；爱心定位 `(0.27,0.16)×气球宽`、宽 `.4×气球宽`；爱心 `scale ×1.2/1.3 → ×1 → ×1.1/1.2` 各 `.25s`；爱心先淡出 `.2s`，气球用 `<` 对齐再淡出 |
| `Respond` | 同一张 `Action` 复制 3 份，`angle -10/23/50`、`scale .7/1/.7`（换算时 `/0.5`）、`anchor (1.8,0)/(1.5,0)/(1.8,0)`；容器整体 `alpha 1 → .2(.3s) → 1(.12s) → 停(.3s) → 0(.12s)` |
| `Music` | 音符先 `scale .7→1 (.1s)`；`x` 偏移 `-1×宽`、`y` 偏移 `.1×宽`；`angle -8` 摇摆一周期；`fadeOut .1` |
| `Twinkle` | 星图复制 3 份：位置 `(0,0)/(.7,-.6)/(.8,.6)×星宽`、`scale 1/.9/.6`；容器先 `fadeIn .2`；三个 sprite 各自 `scale` 往返循环（`.5/.6/.4s`，`repeat:-1, yoyo`）共 `1s`；最后 `fadeOut .2`（提前 `.2s`） |
| `Upset` | 气球 `scale .27`；焦虑符号 `Uz` 到父层 `(.5,.5)`，`angle 6 ↔ -7` 与 `scaleY .8` 两条 `repeat:-1,yoyo` 循环，共播 `1s`；随后整体淡出 `.3` |
| `Sweat` | 主汗滴 `y -= 1×宽 (.4s)`，小汗滴 `y -= 2.3×宽`，无淡出（结束即销毁） |
| `Dot` | 气球 `scale .3`；容器 `dotContainerPos (.1,.35)`；3 个 `Idea` 点按 `dotPos [0,2,4]×点子宽` 排开，`alpha 0→1` 每个 `.1s`、间隔 `.3s`；父层 `fadeOut .1`（提前 `.1s`） |
| `Chat` | `pivot = (width×(1+.3), height×1)`；`angle -25 → 0` 用 `rotateTime/2` 两段；`fadeOut .1` |
| `Exclaim` | `scale ×1.4 (.2s) → ×1.2 (.1s) → 停 .3s → fadeOut .1` |
| `Angry` | `Aggro` 复制 3 份，各 `angle += i*120`、`anchor (.35,-.05)`；每份 `scale ×.9(.2s) → ×1(.2s) → ×.2(.1s)`，容器整体 `fadeOut .1` |
| `Surprise` | 容器 `x += -0.1×角色宽`、`y` 先 `-= 0.1×宽` 再 `+=`（跳一下 `.3s`）；两图从 `.7` 缩到 `1`（`.3s`）；停 `.4s`；淡出 `.1` |
| `Question` | `anchor (.5,1)`；`scale ×1.6 (.2s) → ×1.4 (.05s) → 停 .4s → fadeOut .2` |
| `Shy` | 气球 `scale .46`（先 `.8×` 再回弹）；害羞符号位于父层 `(-.65,-.5)×宽`、`anchor (.5,.5)`；`angle 13 → -10` 抖 `0.4s ×2 次`；两者同时淡出 `.1` |
| `Sad` | `Sad` 图复制 3 份，`x = 30×i`，初始 `y [0,30,-30]`；每份 `alpha 0→1 (1/15s)`、`scaleY .5→1 (4/15s)`、`y += 35`，起点错开 `i/6s`；整组 `fadeOut (8/60)` |
| `Steam` | 同一张 `Steam` 两份，`angle -30/0`、`anchor (1.4,1.5)`；第一份 `scale .1→.7 (14/60)` 后淡出 `(12/60)`；第二份延后 `(21/60)` 到 `.6→.9` 再淡出 `(8/60)` |
| `Sigh` | `alpha 0→1 (2/60)`；`scale .3→.9 (33/60, easeOut)`；`>+=12/60` 后 `fadeOut (11/60)` |
| `Bulb` | 气球 + 灯泡(`y=100`) + 光圈(`y=82`, `scale 1.13`)；容器 `alpha 0→1 (6/60)`，之后按 `6/60 → 7/60 → 52/60` 交替显隐灯泡/光圈，最后隐藏容器 |
| `Tear` | 泪滴 2 份：`Tear_2` 先 `alpha 0→1 (7/60)`、`scale .6→1 (12/60)`、`>+=13/60` 后淡出 `(15/60)`；`Tear_1` 在 `12/60` 处开始，`scale .5→1 (13/60)`、`>+=32/60` 后淡出 `(4/60)` |
| `Zzz` | 同一张 `Z` 复制 3 份，位置 `(0,0)/(-80,-30)/(-190,7)`、`scale .8/.9/1`、`rotate 15/5/-15`；在 `53/60`、`48/60`、`40/60` 依次 `visible = true` |

### 5.3 公共收尾

```js
function Kz(timeline, sprites) {
  return new Promise((resolve, reject) => {
    timeline.then(() => { resolve(); sprites.forEach((s) => s.destroy()); }).catch(reject);
  });
}
```

即**时间轴结束前 sprite 不销毁**，重复播放会叠新的一份（同一表情连续触发会并存，直到各自结束）。

---

## 6. 触发链路（剧情文本 → 表情）

1. 文本里出现角色特效标记：

   ```js
   characterEffect: {
     reg: /#([1-5]);(((em|fx);([^;\n]+))|\w+);?/,
     fn(e, t, n, r, i) { /* e[1] = 角色位次 1–5 */ }
   }
   ```

   `#2;em;1a2b3c;` 表示「第 2 位角色播放表情，名字是 hash `1a2b3c`」。

2. hash 通过 Excel 表查名字：

   ```js
   function wW(hex) { return dI().EmotionExcelTable.get(h32(hex, 0).toNumber()); }
   // 表来源：{base}/Excel/ScenarioCharacterEmotionExcel.json
   // 加载后：EmotionExcelTable.set(row.Name, row.EmoticonName)
   ```

   即 `Name`（数值 hash 对应的 key）→ `EmoticonName`（`Heart` / `Sad` …）。

3. 写入角色特效列表：

   ```js
   t.characters[a].effects.push({ type: `emotion`, effect: name, async: false });
   ```

4. 演出时遍历 `effects`，`Kte(type)` 取到 `Vz`，`processEffect(name, characterUnit)`。

5. 音效独立走事件总线：

   ```js
   K.on(`playEmotionAudio`, (name) => {
     previousSound?.stop();
     previousSound = play(dI().emotionSoundUrl(name));   // SFX_Emoticon_Motion_{name}.wav
     previousSound.volume(s(`sfxVolume`));
     previousSound.play();
   });
   ```

   **同一时刻只保留一段表情音效**（新的会先 `stop()` 旧的），音量取自全局 `sfxVolume`。

---

## 7. 与 Our Archive 现状的差异

我们已实现的部分（`packages/client/src/components/tools/OAEmotionPlayer.vue` + `emotions.yml`）：

| 参考实现 | 我们的做法 | 是否等价 |
| :--- | :--- | :--- |
| Pixi Sprite + GSAP timeline | DOM 图层 + Web Animations | ✅ 视觉等价 |
| 540 × 1012 设计基准、`scale × 540` | 同（`unit = 角色屏幕高 / 1012`） | ✅ |
| 子层位置按父层**宽度**换算（x、y 同乘宽） | 同 | ✅ |
| 容器挂在角色 Spine 容器上 | 挂在画布上的绝对定位层，锚点取包围盒上沿 | 近似（不随骨骼动画抖动） |
| 单图弹一下 / 多图合成 / 同图复制 | 同（`layers[]` + `parent`） | ✅ |
| `repeat:-1, yoyo` 循环（Twinkle、Upset） | 用关键帧写了有限往返 | 近似 |
| 容器级整体位移 / 闪烁（Respond、Surprise） | 只能逐层写 | 近似 |
| GSAP `pivot`（Chat 的 `width×(1+0.3)`） | 用 `anchor` 表达 | 近似 |
| `async: false` 与其它特效并行 | 预览器一次只播一个 | 待做（剧情播放器时） |

---

## 8. TODO

### 8.1 表情本身

- [ ] DSL 增加**容器级**动画：`group.keyframes`（整体 `opacity` / `x` / `y`），用于 `Respond` 的闪动与 `Surprise` 的跳跃。
- [ ] DSL 增加 `repeat` / `yoyo` / `alternate` 字段，替换现在用有限关键帧凑出来的 `Twinkle` / `Upset` 循环。
- [ ] DSL 支持 `pivot`（相对宽/高的比例），把 `Chat` 的 `rotatePivot` 原样搬过来。
- [ ] `ease` 支持 GSAP 风格别名（`easeOut` / `back.out` 等）到 CSS 的映射表。
- [ ] 音效「新的打断旧的」：目前是一个 `Audio` 实例，但播放器换表情时直接 `pause()`，需要确认与 `stop()` 行为一致。
- [ ] 表情资源缺失时给出可点击的「跳转到第三方分发处」提示（目前只有虚线边框 + 计数）。

### 8.2 剧情播放器（表情的最终宿主）

- [ ] 实现 `action` 特效（`a` / `al` / `ar` / `dl` / `dr` / `hop hop` / `greeting` / `shake` / `m1–m5` / `stiff` / `closeup` / `jump` / `falldownR` / `falldownL` / `hide`）——参数见原文 `Az` 常量。
- [ ] 实现 `fx` 特效（目前只有 `shot`：三张 `fire*.png` 依次闪过 + 红/蓝通道变化）。
- [ ] 表情按「角色位次 1–5」绑定到具体角色，容器跟随该角色的 Spine 容器。
- [ ] 文本解析：`#<1-5>;em;<hash>;` 与 `#<1-5>;<action>;`，`effects` 按 `async` 分组并行。
- [ ] `ScenarioCharacterEmotionExcel.json` 的 hash → `EmoticonName` 映射（我方资源包目前直接用 `id`，无需 hash，但要支持导入既有剧本）。

### 8.3 资源

- [x] 24 张表情图 + 19 段音效已落盘到 `res/DefaultPackage/emtions/`（`images/`、`sounds/`）。
- [x] `index/emotions.yml` 已按 19 个表情写好关键帧（`docs/configs_doc/emotions.md` 有格式说明）。
- [ ] `BlueArchiveGameSound` 包里没有表情；若以后要「仅表情包」，把 `Emotions.path` 指向独立目录即可。
