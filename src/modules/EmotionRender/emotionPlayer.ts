/**
 * 表情渲染播放器（移植自 BA-Story 原版，由 GSAP 驱动 Pixi.js 渲染树）
 */
import * as PIXI from 'pixi.js';
import gsap, { Power4 } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';
import {
  emotionOptions,
  type EmotionOptionsMap,
  type EmotionWord,
  type PositionOffset,
} from './emotionOptions';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(PixiPlugin);
  PixiPlugin.registerPIXI(PIXI);
}

function calcRelativePosition(standard: PIXI.Sprite, relativeValue: PositionOffset) {
  return {
    x: standard.x + standard.width * relativeValue.x,
    y: standard.y + standard.width * relativeValue.y,
  };
}

function setRelativePosition(
  childImg: PIXI.Sprite,
  containerImg: PIXI.Sprite,
  relativeValue: PositionOffset
) {
  childImg.position.set(
    relativeValue.x * containerImg.width,
    relativeValue.y * containerImg.height
  );
}

function getRelativeScale(img: PIXI.Sprite, options: { scale: number }) {
  const width = img.width > 0 ? img.width : 100;
  return (options.scale * 540) / width;
}

function prepareEmotionContainer(
  target: PIXI.Container,
  options: { startPositionOffset: PositionOffset },
  container?: PIXI.Container | PIXI.Sprite
) {
  if (!container) {
    container = new PIXI.Container();
  }
  const offsetX = (options.startPositionOffset.x - 0.8) * 540;
  const offsetY = (options.startPositionOffset.y - 1.2) * 1012;
  container.position.set(offsetX, offsetY);
  container.zIndex = 10;
  target.addChild(container);
  return {
    offsetX,
    offsetY,
    container,
  };
}

function timelinePromise(
  timeLine: gsap.core.Timeline,
  destroyImgs: PIXI.Sprite[],
  rootContainer?: PIXI.Container
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    timeLine
      .then(() => {
        resolve();
        for (const img of destroyImgs) {
          try {
            img.destroy();
          } catch {
            // ignore
          }
        }
        if (rootContainer) {
          try {
            rootContainer.destroy({ children: true });
          } catch {
            // ignore
          }
        }
      })
      .catch((reason) => {
        reject(reason);
      });
  });
}

function frameToS(frameNumber: number) {
  return frameNumber / 60;
}

type EmotionHandler<K extends EmotionWord> = (
  target: PIXI.Container,
  options: EmotionOptionsMap[K],
  sprites: PIXI.Sprite[]
) => Promise<void>;

const EmotionHandlers = {
  Heart(target, options, sprites) {
    const dialogImg = sprites[0];
    const heartImg = sprites[1];
    const dialogScale = getRelativeScale(dialogImg, options);
    const { container } = prepareEmotionContainer(target, options);

    dialogImg.scale.set(dialogScale);
    heartImg.x = dialogImg.width * options.heartImg.position.x;
    heartImg.y = dialogImg.width * options.heartImg.position.y;
    const heartScale = (options.heartImg.scale * dialogImg.width) / (heartImg.width || 1);
    heartImg.scale.set(heartScale);
    dialogImg.zIndex = 10;
    heartImg.zIndex = 11;
    dialogImg.visible = heartImg.visible = true;
    container.addChild(dialogImg);
    container.addChild(heartImg);

    const tl = gsap.timeline();
    const firstScale = {
      x: options.jumpAnimation.firstScale.x * heartScale,
      y: options.jumpAnimation.firstScale.y * heartScale,
    };
    const secondScale = {
      x: options.jumpAnimation.secondScale.x * heartScale,
      y: options.jumpAnimation.secondScale.y * heartScale,
    };
    tl.to(heartImg.scale, {
      x: firstScale.x,
      y: firstScale.y,
      duration: options.jumpAnimation.duration,
    })
      .to(heartImg.scale, {
        x: heartScale,
        y: heartScale,
        duration: options.jumpAnimation.duration,
      })
      .to(heartImg.scale, {
        x: secondScale.x,
        y: secondScale.y,
        duration: options.jumpAnimation.duration,
      })
      .to(heartImg, { alpha: 0, duration: options.fadeOutDuration })
      .add('fadeOut', '<')
      .to(dialogImg, { alpha: 0, duration: options.fadeOutDuration }, 'fadeOut');

    return timelinePromise(tl, [heartImg, dialogImg], container);
  },

  Respond(target, options, sprites) {
    const { container } = prepareEmotionContainer(target, options);
    const scale = getRelativeScale(sprites[0], options);
    const respondImgs: PIXI.Sprite[] = [];

    for (let i = 0; i < 3; ++i) {
      const respondImg = new PIXI.Sprite(sprites[0].texture);
      respondImgs.push(respondImg);
      respondImg.angle = options.perImgSetting[i].angle;
      respondImg.anchor.set(
        options.perImgSetting[i].anchor.x,
        options.perImgSetting[i].anchor.y
      );
      respondImg.scale.set((scale * options.perImgSetting[i].scale) / 0.5);
      container.addChild(respondImg);
    }
    container.zIndex = 10;
    container.alpha = 1;
    container.visible = true;
    const tl = gsap.timeline();
    tl.to(container, {
      alpha: options.flashAnimation.alpha,
      duration: options.flashAnimation.duration,
    })
      .to(container, { alpha: 1, duration: options.fadeOutDuration })
      .to(container, { duration: options.fadeOutPreDuration })
      .to(container, { alpha: 0, duration: options.fadeOutDuration });

    return timelinePromise(tl, respondImgs, container);
  },

  Music(target, options, sprites) {
    const note = sprites[0];
    const scale = getRelativeScale(note, options);
    const { container } = prepareEmotionContainer(target, options);
    note.scale.set(scale * 0.7);
    note.visible = true;
    container.addChild(note);

    const tl = gsap.timeline();
    tl.to(note.scale, { x: scale, y: scale, duration: 0.1 })
      .to(note, {
        x: note.width * options.animation.offset.x,
        duration: options.animation.duration,
      })
      .add('start', '<')
      .to(
        note,
        {
          y: note.width * options.animation.offset.y,
          angle: options.rotateAngle,
          duration: options.animation.duration * 0.3,
        },
        'start'
      )
      .to(note, { y: 0, angle: 0, duration: options.animation.duration * 0.3 }, '>')
      .to(
        note,
        {
          y: note.width * options.animation.offset.y,
          angle: options.rotateAngle,
          duration: options.animation.duration * 0.4,
        },
        '>'
      )
      .to(note, { y: 0, angle: 0, duration: options.animation.duration * 0.4 }, '>')
      .to(note, { alpha: 0, duration: options.fadeOutDuration }, '>');

    return timelinePromise(tl, [note], container);
  },

  Twinkle(target, options, sprites) {
    const { container } = prepareEmotionContainer(target, options);
    const scale = getRelativeScale(sprites[0], options) / 0.5;
    const starImgs: PIXI.Sprite[] = [];
    const starImgScales: number[] = [];
    for (let i = 0; i < 3; ++i) {
      starImgScales.push(scale * options.starImgs.scale[i]);
    }
    for (let i = 0; i < 3; ++i) {
      const starImg = new PIXI.Sprite(sprites[0].texture);
      starImgs.push(starImg);
      starImg.anchor.set(0.5);
      starImg.scale.set(starImgScales[i]);
      starImg.position = calcRelativePosition(starImgs[0], options.starImgs.pos[i]);
      container.addChild(starImg);
    }
    container.alpha = 0;

    const flashTlMaster = gsap.timeline({ paused: true });
    for (let i = 0; i < 3; ++i) {
      const flashTl = gsap.timeline();
      flashTl.to(
        starImgs[i].scale,
        {
          x: options.flashAnimation.scales[i] * starImgScales[i],
          y: options.flashAnimation.scales[i] * starImgScales[i],
          duration: options.flashAnimation.duration[i] / 2,
          repeat: -1,
          yoyo: true,
        },
        0
      );
      flashTlMaster.add(flashTl, 0);
    }

    const tl = gsap.timeline();
    tl.to(container, { alpha: 1, duration: options.fadeInDuration })
      .add(flashTlMaster.tweenFromTo(0, options.flashAnimation.totalDuration))
      .to(
        container,
        { alpha: 0, duration: options.fadeOutDuration },
        `>-=${options.fadeOutPreDuration}`
      );

    return timelinePromise(tl, starImgs, container);
  },

  Sad(target, options, sprites) {
    const { container } = prepareEmotionContainer(target, options);
    const tl = gsap.timeline();
    const sadLineImages: PIXI.Sprite[] = [];
    for (let i = 0; i < 3; ++i) {
      const sadLineImage = new PIXI.Sprite(sprites[0].texture);
      sadLineImages.push(sadLineImage);
      sadLineImage.alpha = 0;
      sadLineImage.scale.y = 0.5;
      sadLineImage.position.x = options.imageGap * i;
      sadLineImage.position.y = options.imgInitYPosition[i];
      container.addChild(sadLineImage);
      tl.to(sadLineImage, { alpha: 1, duration: 1 / 15 }, i / 6)
        .to(sadLineImage.scale, { y: 1, duration: 4 / 15 }, '>')
        .to(sadLineImage, { y: `+=${options.moveYDistance}`, duration: 4 / 15 }, '<')
        .to(sadLineImage, { duration: 26 / 60 }, '>');
    }
    tl.to(container, { alpha: 0, duration: 8 / 60 });

    return timelinePromise(tl, sadLineImages, container);
  },

  Sweat(target, options, sprites) {
    const dropImg = sprites[0];
    const smallDropImg = sprites[1];
    const { container } = prepareEmotionContainer(target, options);
    const scale = getRelativeScale(dropImg, options);
    dropImg.scale.set(scale);
    smallDropImg.scale.set(scale);
    const smallPosition = calcRelativePosition(dropImg, options.smallImg.offset);
    smallDropImg.x = smallPosition.x;
    smallDropImg.y = smallPosition.y;
    dropImg.zIndex = 10;
    smallDropImg.zIndex = 10;
    smallDropImg.visible = dropImg.visible = true;
    container.addChild(dropImg, smallDropImg);

    const tl = gsap.timeline();
    tl.to(dropImg, {
      y: dropImg.y - dropImg.width * options.dropAnimation.yOffset,
      duration: options.dropAnimation.duration,
    }).to(
      smallDropImg,
      {
        y: smallDropImg.y - options.smallImg.dropAnimationOffset * smallDropImg.width,
        duration: options.dropAnimation.duration,
      },
      '<'
    );

    return timelinePromise(tl, [dropImg, smallDropImg], container);
  },

  Dot(target, options, sprites) {
    const dialogImg = new PIXI.Sprite(sprites[0].texture);
    prepareEmotionContainer(target, options, dialogImg);
    const dotContainer = new PIXI.Container();
    const showTl = gsap.timeline();
    const dotSprites: PIXI.Sprite[] = [];
    for (let i = 0; i < 3; ++i) {
      const dotImg = new PIXI.Sprite(sprites[1].texture);
      dotSprites.push(dotImg);
      dotImg.alpha = 0;
      dotImg.position = calcRelativePosition(dotImg, {
        x: options.dotPos[i],
        y: 0,
      });
      showTl.to(dotImg, {
        alpha: 1,
        duration: options.showAnimation.alpahaDuration,
        delay: options.showAnimation.showDelay,
      });
      dotContainer.addChild(dotImg);
    }
    dialogImg.addChild(dotContainer);
    dotContainer.position.set(
      options.dotContainerPos.x * dialogImg.width,
      options.dotContainerPos.y * dialogImg.height
    );
    showTl.to(dialogImg, {
      alpha: 0,
      duration: options.fadeOutDuration,
      delay: options.fadeOutPreDuration,
    });
    return timelinePromise(showTl, [dialogImg, ...dotSprites]);
  },

  Chat(target, options, sprites) {
    const chatImage = sprites[0];
    prepareEmotionContainer(target, options, chatImage);
    chatImage.scale.set(getRelativeScale(chatImage, options));
    chatImage.visible = true;
    chatImage.pivot.x = chatImage.width * (1 + options.rotatePivot.x);
    chatImage.pivot.y = chatImage.height * (1 + options.rotatePivot.y);
    chatImage.zIndex = 10;
    const tl = gsap.timeline();
    tl.to(chatImage, {
      angle: options.rotateAngle,
      duration: options.rotateTime / 2,
    })
      .to(chatImage, { angle: 0, duration: options.rotateTime / 2 })
      .to(chatImage, { alpha: 0, duration: options.fadeOutDuration });

    return timelinePromise(tl, [chatImage]);
  },

  Exclaim(target, options, sprites) {
    const surpriseImg = sprites[0];
    prepareEmotionContainer(target, options, surpriseImg);
    const scale = getRelativeScale(surpriseImg, options);
    surpriseImg.visible = true;
    const tl = gsap.timeline();
    const animationScale = scale * options.scaleAnimation.scale;
    const recoverScale = scale * options.scaleAnimation.recoverScale;
    tl.to(surpriseImg.scale, {
      x: animationScale,
      y: animationScale,
      duration: options.scaleAnimation.scaleDuration,
    })
      .to(surpriseImg.scale, {
        x: recoverScale,
        y: recoverScale,
        duration: options.scaleAnimation.recoverDuration,
      })
      .to(surpriseImg, { duration: options.fadeOutWaitTime })
      .to(surpriseImg, { alpha: 0, duration: options.fadeOutDuration });

    return timelinePromise(tl, [surpriseImg]);
  },

  Angry(target, options, sprites) {
    const angryImgUnit = sprites[0];
    const scale = getRelativeScale(angryImgUnit, options);
    const { container } = prepareEmotionContainer(target, options);
    let waitTimeLine = gsap.timeline();
    const destroyImg: PIXI.Sprite[] = [];
    for (let i = 0; i < 3; ++i) {
      const uImgUnit = new PIXI.Sprite(angryImgUnit.texture);
      destroyImg.push(uImgUnit);
      uImgUnit.scale.set(scale);
      uImgUnit.anchor.set(0.35, -0.05);
      uImgUnit.angle += i * 120;
      uImgUnit.zIndex = 10;
      container.addChild(uImgUnit);
      const tl = gsap.timeline();
      waitTimeLine = tl;
      tl.to(uImgUnit.scale, {
        x: scale * options.animationScale.scale,
        duration: options.animationScale.duration,
      })
        .to(uImgUnit.scale, {
          x: scale,
          duration: options.animationScale.duration,
        })
        .to(uImgUnit.scale, {
          x: scale * options.endScale.scale,
          y: scale * options.endScale.scale,
          duration: options.endScale.duration,
        });
    }

    return timelinePromise(waitTimeLine, destroyImg, container);
  },

  Surprise(target, options, sprites) {
    const exclaimImg = new PIXI.Sprite(sprites[0].texture);
    const surpriseImg = new PIXI.Sprite(sprites[1].texture);
    const scale = getRelativeScale(exclaimImg, options);
    const startScale = scale * options.scaleAnimation.startScale;

    exclaimImg.scale.set(startScale);
    exclaimImg.anchor.set(
      options.scaleAnimation.anchor.x,
      options.scaleAnimation.anchor.y
    );
    surpriseImg.scale.set(
      startScale,
      startScale * options.scaleAnimation.questionImgYScale
    );
    surpriseImg.position = calcRelativePosition(
      exclaimImg,
      options.imgSetting.questionImgPos
    );
    surpriseImg.anchor.set(
      options.scaleAnimation.anchor.x,
      options.scaleAnimation.anchor.y
    );
    const { container } = prepareEmotionContainer(target, options);
    container.addChild(exclaimImg, surpriseImg);
    container.zIndex = 10;

    const tl = gsap.timeline();
    const targetWidth = target.width > 0 ? target.width : 540;
    const xOffset = options.jumpAnimation.xOffset * targetWidth;
    const jumpYOffset = options.jumpAnimation.jumpYOffset * targetWidth;

    tl.to(container, {
      x: `+=${xOffset}`,
      duration: options.jumpAnimation.duration,
    })
      .to(
        container,
        {
          y: `-=${jumpYOffset}`,
          duration: options.jumpAnimation.duration / 2,
        },
        0
      )
      .to(
        container,
        {
          y: `+=${jumpYOffset}`,
          duration: options.jumpAnimation.duration / 2,
        },
        '>'
      )
      .add('jumpEnd')
      .to(
        exclaimImg.scale,
        { x: scale, y: scale, duration: options.scaleAnimation.duration },
        0
      )
      .to(
        surpriseImg.scale,
        { x: scale, y: scale, duration: options.scaleAnimation.duration },
        0
      )
      .to(container, { duration: options.fadeOutPreDuration }, 'jumpEnd')
      .to(container, { alpha: 0, duration: options.fadeOutDuration }, '>');

    return timelinePromise(tl, [surpriseImg, exclaimImg], container);
  },

  Question(target, options, sprites) {
    const questionImg = sprites[0];
    questionImg.visible = true;
    questionImg.zIndex = 10;
    const scale = getRelativeScale(questionImg, options);
    prepareEmotionContainer(target, options, questionImg);

    questionImg.scale.set(scale);
    questionImg.anchor.set(
      options.scaleAnimation.anchor.x,
      options.scaleAnimation.anchor.y
    );
    const tl = gsap.timeline();
    const animationScale = scale * options.scaleAnimation.scale;
    const recoverScale = scale * options.scaleAnimation.recoverScale;
    tl.to(questionImg.scale, {
      x: animationScale,
      y: animationScale,
      duration: options.scaleAnimation.scaleDuration,
    })
      .to(questionImg.scale, {
        x: recoverScale,
        y: recoverScale,
        duration: options.scaleAnimation.recoverDuration,
      })
      .to(questionImg, { duration: options.fadeOutPreDuration ?? 0.4 })
      .to(questionImg, { alpha: 0, duration: options.fadeOutDuration });

    return timelinePromise(tl, [questionImg]);
  },

  Shy(target, options, sprites) {
    const dialogImg = sprites[0];
    const shyImg = sprites[1];
    const { container } = prepareEmotionContainer(target, options);
    const scale = getRelativeScale(dialogImg, options);
    dialogImg.scale.set(scale * options.scaleAnamation.startScale);
    dialogImg.anchor.set(
      options.scaleAnamation.anchor.x,
      options.scaleAnamation.anchor.y
    );
    const shyImgPos = calcRelativePosition(dialogImg, options.shyImg.position);
    shyImg.scale.set(
      scale * options.shyImg.scale * options.scaleAnamation.startScale
    );
    shyImg.position.set(shyImgPos.x, shyImgPos.y);
    dialogImg.zIndex = 10;
    shyImg.zIndex = 11;
    const shyImgAnchor = options.shyImg.anchor;
    shyImg.anchor.set(shyImgAnchor.x, shyImgAnchor.y);
    shyImg.visible = dialogImg.visible = true;
    container.addChild(dialogImg, shyImg);

    const shakeTl = gsap.timeline({ paused: true });
    shakeTl
      .add('start')
      .to(shyImg, {
        angle: options.shakeAnimation.angleFrom,
        duration: options.shakeAnimation.duration / 2,
      })
      .to(shyImg, {
        angle: options.shakeAnimation.angleTo,
        duration: options.shakeAnimation.duration / 2,
      })
      .add('end');

    const tl = gsap.timeline();
    tl.to(shyImg.scale, {
      x: scale,
      y: scale,
      duration: options.scaleAnamation.duration,
    })
      .to(
        dialogImg.scale,
        { x: scale, y: scale, duration: options.scaleAnamation.duration },
        '<'
      )
      .add(
        shakeTl.tweenFromTo('start', 'end', {
          repeat: options.shakeAnimation.times - 1,
        })
      )
      .to(shyImg, { alpha: 0, duration: options.fadeOutDuration })
      .to(dialogImg, { alpha: 0, duration: options.fadeOutDuration }, '<');

    return timelinePromise(tl, [shyImg, dialogImg], container);
  },

  Upset(target, options, sprites) {
    const dialogImg = sprites[0];
    const upsetImg = new PIXI.Sprite(sprites[1].texture);
    prepareEmotionContainer(target, options, dialogImg);
    upsetImg.anchor.set(0.5, 0.5);
    dialogImg.addChild(upsetImg);
    dialogImg.visible = true;
    setRelativePosition(upsetImg, dialogImg, options.upsetImgPos);

    const animationTl = gsap.timeline({ paused: true });
    animationTl
      .fromTo(
        upsetImg,
        { angle: options.rotateAnimation.angleFrom },
        {
          angle: options.rotateAnimation.angleTo,
          duration: options.rotateAnimation.duration,
          repeat: -1,
          yoyo: true,
        }
      )
      .to(upsetImg.scale, {
        y: options.yScaleAnimation.scale,
        duration: options.yScaleAnimation.duration,
        repeat: -1,
        yoyo: true,
      });

    const tl = gsap.timeline();
    tl.add(animationTl.tweenFromTo(0, options.animationTotalDuration)).to(
      dialogImg,
      {
        alpha: 0,
        duration: options.fadeOutDuration,
      }
    );

    return timelinePromise(tl, [upsetImg, dialogImg]);
  },

  Steam(target, options, sprites) {
    const { container } = prepareEmotionContainer(target, options);
    const steamImage1 = new PIXI.Sprite(sprites[0].texture);
    steamImage1.angle = options.imgAngles[0];
    steamImage1.anchor.set(options.imgPivot.x, options.imgPivot.y);
    steamImage1.scale.set(options.imgScaleAnimation[0].start);

    const steamImage2 = new PIXI.Sprite(sprites[0].texture);
    steamImage2.angle = options.imgAngles[1];
    steamImage2.anchor.set(options.imgPivot.x, options.imgPivot.y);
    steamImage2.scale.set(options.imgScaleAnimation[1].start);
    steamImage2.visible = false;
    container.addChild(steamImage2);
    container.addChild(steamImage1);

    const tl = gsap.timeline();
    tl.to(steamImage1.scale, {
      x: options.imgScaleAnimation[0].end,
      y: options.imgScaleAnimation[0].end,
      duration: 14 / 60,
    })
      .addLabel('image2Start')
      .to(steamImage1, { alpha: 0, duration: 12 / 60 })
      .to(
        steamImage2.scale,
        {
          x: options.imgScaleAnimation[1].end,
          y: options.imgScaleAnimation[1].end,
          duration: 21 / 60,
          onStart() {
            steamImage2.visible = true;
          },
        },
        'image2Start'
      )
      .to(steamImage2, { alpha: 0, duration: 8 / 60 }, '>');

    return timelinePromise(tl, [steamImage1, steamImage2], container);
  },

  Sigh(target, options, sprites) {
    const { container } = prepareEmotionContainer(target, options);
    const sighImage = new PIXI.Sprite(sprites[0].texture);
    sighImage.alpha = 0;
    sighImage.angle = options.angle;
    sighImage.anchor.set(options.anchor.x, options.anchor.y);
    sighImage.scale.set(options.scaleAnimation.start);
    container.addChild(sighImage);

    const tl = gsap.timeline();
    tl.to(sighImage, { alpha: 1, duration: 2 / 60 })
      .to(sighImage.scale, {
        x: options.scaleAnimation.end,
        y: options.scaleAnimation.end,
        ease: Power4.easeOut,
        duration: 33 / 60,
      })
      .to(sighImage, { alpha: 0, duration: 11 / 60 }, `>+=${12 / 60}`);

    return timelinePromise(tl, [sighImage], container);
  },

  Bulb(target, options, sprites) {
    const dialogImg = new PIXI.Sprite(sprites[0].texture);
    const { container } = prepareEmotionContainer(target, options, dialogImg);
    container.alpha = 0;

    const bulbImage = new PIXI.Sprite(sprites[1].texture);
    bulbImage.anchor.set(0.5, 0.5);
    bulbImage.position.set(dialogImg.width / 2, options.bulbYPosition);
    bulbImage.visible = false;
    container.addChild(bulbImage);

    const lightImage = new PIXI.Sprite(sprites[2].texture);
    lightImage.anchor.set(0.5, 0.5);
    lightImage.position.set(dialogImg.width / 2, options.lightYPosition);
    lightImage.scale.set(options.lightScale);
    lightImage.visible = false;
    container.addChild(lightImage);

    const tl = gsap.timeline();
    tl.to(container, { alpha: 1, duration: 6 / 60 })
      .to(container, {
        onStart() {
          bulbImage.visible = lightImage.visible = true;
        },
        duration: 6 / 60,
      })
      .to(container, {
        onStart() {
          bulbImage.visible = true;
          lightImage.visible = false;
        },
        duration: 7 / 60,
      })
      .to(container, {
        onStart() {
          bulbImage.visible = lightImage.visible = true;
        },
        duration: 52 / 60,
        onComplete() {
          container.visible = false;
        },
      });

    return timelinePromise(tl, [bulbImage, lightImage, dialogImg]);
  },

  Tear(target, options, sprites) {
    const { container } = prepareEmotionContainer(target, options);

    const largeTearImage = new PIXI.Sprite(sprites[0].texture);
    largeTearImage.position.set(options.positions[0].x, options.positions[0].y);
    largeTearImage.anchor.set(options.anchors[0].x, options.anchors[0].y);
    largeTearImage.scale.set(options.scaleAnimations[0].start);
    container.addChild(largeTearImage);
    largeTearImage.alpha = 0;

    const smallTearImage = new PIXI.Sprite(sprites[1].texture);
    smallTearImage.position.set(options.positions[1].x, options.positions[1].y);
    smallTearImage.anchor.set(options.anchors[1].x, options.anchors[1].y);
    smallTearImage.scale.set(options.scaleAnimations[1].start);
    container.addChild(smallTearImage);
    smallTearImage.alpha = 0;

    const tl = gsap.timeline();
    tl.to(smallTearImage, { alpha: 1, duration: 7 / 60 })
      .to(smallTearImage.scale, {
        x: options.scaleAnimations[0].end,
        y: options.scaleAnimations[0].end,
        ease: Power4.easeOut,
        duration: 12 / 60,
      })
      .to(smallTearImage, { alpha: 0, duration: 15 / 60 }, `>+=${13 / 60}`)
      .to(largeTearImage, { alpha: 1, duration: 3 / 60 }, 12 / 60)
      .to(
        largeTearImage.scale,
        {
          x: options.scaleAnimations[1].end,
          y: options.scaleAnimations[1].end,
          ease: Power4.easeOut,
          duration: 13 / 60,
        },
        '<'
      )
      .to(largeTearImage, { alpha: 0, ease: Power4.easeOut, duration: 4 / 60 }, `>+=${32 / 60}`);

    return timelinePromise(tl, [smallTearImage, largeTearImage], container);
  },

  Zzz(target, options, sprites) {
    const { container } = prepareEmotionContainer(target, options);
    const zImages: PIXI.Sprite[] = [];
    for (let index = 0; index < 3; ++index) {
      const imageSetting = options.zImageSettings[index];
      const zImage = new PIXI.Sprite(sprites[0].texture);
      zImage.scale.set(imageSetting.scale);
      zImage.position.set(imageSetting.position.x, imageSetting.position.y);
      zImage.angle = imageSetting.rotate;
      zImage.visible = false;
      zImages.push(zImage);
      container.addChild(zImage);
    }

    const tl = gsap.timeline();
    tl.to(container, {
      onStart: () => {
        zImages[0].visible = true;
      },
      duration: frameToS(53),
    })
      .to(container, {
        onStart: () => {
          zImages[1].visible = true;
        },
        duration: frameToS(48),
      })
      .to(container, {
        onStart: () => {
          zImages[2].visible = true;
        },
        duration: frameToS(40),
      });

    return timelinePromise(tl, zImages, container);
  },
} as const satisfies { [K in EmotionWord]: EmotionHandler<K> };

export async function playEmotionOnTarget(
  target: PIXI.Container,
  emotionKey: string,
  textures: PIXI.Texture[]
): Promise<void> {
  // 首字母大写匹配
  const key = (emotionKey.charAt(0).toUpperCase() + emotionKey.slice(1).toLowerCase()) as EmotionWord;
  const handler = EmotionHandlers[key] as ((t: PIXI.Container, opt: unknown, s: PIXI.Sprite[]) => Promise<void>) | undefined;
  if (!handler) {
    throw new Error(`未实现的表情动效: ${emotionKey}`);
  }
  const options = emotionOptions[key];
  if (!options) {
    throw new Error(`缺失的表情配置: ${emotionKey}`);
  }
  const sprites = textures.map((tex) => new PIXI.Sprite(tex));
  await handler(target, options, sprites);
}
