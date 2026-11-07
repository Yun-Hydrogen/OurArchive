/**
 * WebGL 后端：spine-webgl 的 PolygonBatcher，按「贴图 + 混合模式」合批。
 *
 * 与 canvas 后端的差距是数量级的：阿罗娜的 80 个网格附件（5863 个三角形）在 canvas 里
 * 是 5863 次 clip + drawImage，在这里被合成 1~2 个 draw call，所以高密度形变立绘也能满帧。
 *
 * **管道是预乘 alpha（PMA）**，这是唯一能让「小尺寸采样」不产生色边的组合：
 *   - 贴图解码时 `premultiplyAlpha: 'premultiply'`，透明像素变成 (0,0,0,0)；
 *   - `GLTexture.DISABLE_UNPACK_PREMULTIPLY_ALPHA_WEBGL = true`，让 GL 只上传不二次预乘；
 *   - `SkeletonRenderer.premultipliedAlpha = true`，混合用 ONE / ONE_MINUS_SRC_ALPHA。
 *
 * 这样 mipmap 平均的是预乘后的颜色，半透明边缘不会混进「透明黑」，腮红 / 发丝这类细线
 * 缩小时会像 canvas 2d 一样平滑淡出，而不是变粗发黑。三者必须同时成立，改一个就要改全部。
 */
import {
  GLTexture,
  ManagedWebGLRenderingContext,
  Matrix4,
  PolygonBatcher,
  Shader,
  ShapeRenderer,
  SkeletonDebugRenderer,
  SkeletonRenderer,
  type Skeleton,
  type TextureAtlas,
} from '@esotericsoftware/spine-webgl';
import type { SpineBackend } from './backend';

/**
 * 图集是「透明区 RGB 为黑」的直通 alpha 图，直接把 mipmap 建在它上面会让半透明边缘
 * 混进黑色（腮红、发丝变粗发黑）。只有走预乘管道后 mipmap 才是正确的，所以这个开关
 * 必须和文件顶部那三条 PMA 约定同时成立。
 */
const USE_MIPMAPS = true;

/** WebGL1 只允许 2 的幂贴图生成 mipmap */
function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export function createWebglBackend(canvas: HTMLCanvasElement): SpineBackend {
  const context = new ManagedWebGLRenderingContext(canvas, {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: false,
    stencil: false,
  });
  const gl = context.gl;
  if (!gl) {
    context.dispose();
    throw new Error('当前环境不支持 WebGL');
  }

  let shader: Shader;
  let shapeShader: Shader;
  try {
    shader = Shader.newColoredTextured(context);
    shapeShader = Shader.newColored(context);
  } catch (error) {
    context.dispose();
    throw new Error(
      `WebGL 着色器创建失败：${error instanceof Error ? error.message : String(error)}`
    );
  }

  const batcher = new PolygonBatcher(context, false);
  const renderer = new SkeletonRenderer(context, false);
  // 顶点色与贴图都按预乘处理，混合走 ONE / ONE_MINUS_SRC_ALPHA
  renderer.premultipliedAlpha = true;
  // 贴图已经是预乘的（见 bindTextures），不能再让 GL 乘一次
  GLTexture.DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL = true;
  const isWebgl2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

  const shapes = new ShapeRenderer(context);
  const debugRenderer = new SkeletonDebugRenderer(context);
  debugRenderer.drawBones = true;
  debugRenderer.drawRegionAttachments = true;
  debugRenderer.drawMeshTriangles = true;
  debugRenderer.drawBoundingBoxes = false;
  debugRenderer.drawMeshHull = false;
  debugRenderer.drawPaths = false;
  debugRenderer.drawClipping = false;
  debugRenderer.drawSkeletonXY = false;

  const projection = new Matrix4();
  const textures: GLTexture[] = [];

  return {
    kind: 'webgl',

    async bindTextures(atlas: TextureAtlas, fileOf) {
      for (const page of atlas.pages) {
        const file = fileOf(page.name);
        if (!file) {
          continue;
        }
        // 直通 alpha 的图集里透明区 RGB 是黑的，预乘后它们才是 (0,0,0,0)，
        // mipmap 平均才不会把黑色渗进半透明边缘
        const bitmap = await createImageBitmap(file, { premultiplyAlpha: 'premultiply' });
        const mipmaps =
          USE_MIPMAPS && (isWebgl2 || (isPowerOfTwo(bitmap.width) && isPowerOfTwo(bitmap.height)));
        const texture = new GLTexture(context, bitmap, mipmaps);
        textures.push(texture);
        page.setTexture(texture);
      }
    },

    setViewport() {
      // 舞台把 CSS 尺寸 × DPR 写进 canvas.width/height，投影直接用设备像素，
      // 保证与 gl.viewport 完全同坐标系
      projection.ortho(0, Math.max(1, canvas.width), Math.max(1, canvas.height), 0, 1, -1);
    },

    render(skeleton: Skeleton, debug: boolean) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      shader.bind();
      shader.setUniform4x4f(Shader.MVP_MATRIX, projection.values);
      shader.setUniformi(Shader.SAMPLER, 0);
      batcher.begin(shader);
      renderer.draw(batcher, skeleton);
      batcher.end();

      if (!debug) {
        return;
      }

      shapeShader.bind();
      shapeShader.setUniform4x4f(Shader.MVP_MATRIX, projection.values);
      shapes.begin(shapeShader);
      debugRenderer.draw(shapes, skeleton);
      shapes.end();
    },

    dispose() {
      for (const texture of textures) {
        texture.dispose();
      }
      textures.length = 0;
      batcher.dispose();
      shapes.dispose();
      debugRenderer.dispose();
      shader.dispose();
      shapeShader.dispose();
      context.dispose();
    },
  };
}
