# 第三方许可与声明

本项目自身代码以 AGPL-3.0-only 分发（见根目录 [LICENSE](../LICENSE)）。

## Spine Runtimes（按需下载，不随程序分发）

「立绘骨骼预览」使用的 Spine Runtimes **不包含在本仓库或发行包中**。后端首次启动时检查用户资源根目录下的 `plugins/spine/`：

- `spine-webgl.mjs`（默认 WebGL 路径）
- `spine-canvas.mjs`（保守 / 回退路径）
- `LICENSE`（Spine Runtimes License Agreement）

缺失时会在终端说明许可并给出三种选择：自动下载并加载、手动放入文件夹、强制无 Spine 加载（不推荐）。自动下载会从官方 npm 包的 CDN 写入该目录；手动放置会打印目标路径与下载地址；强制无 Spine 则只警告立绘预览不可用。三种选择都不会阻止服务启动。前端只通过 `/plugins/spine/*.mjs` 动态加载本地缓存，构建期不依赖 `@esotericsoftware/*` 包。

下载的 `LICENSE` 文件即下列全文；使用者需要自行拥有 Spine Editor 许可证。

```
Spine Runtimes License Agreement
Last updated April 5, 2025. Replaces all prior versions.

Copyright (c) 2013-2025, Esoteric Software LLC

Integration of the Spine Runtimes into software or otherwise creating
derivative works of the Spine Runtimes is permitted under the terms and
conditions of Section 2 of the Spine Editor License Agreement:
http://esotericsoftware.com/spine-editor-license

Otherwise, it is permitted to integrate the Spine Runtimes into software
or otherwise create derivative works of the Spine Runtimes (collectively,
"Products"), provided that each user of the Products must obtain their own
Spine Editor license and redistribution of the Products in any form must
include this license and copyright notice.

THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## resources/

`resources/` 下的美术与音频资产以 CC BY-NC-ND 4.0 授权，不在 AGPLv3 覆盖范围内，
具体见 [resources/OurArchive/LICENSE](../resources/OurArchive/LICENSE)。

## 关于《蔚蓝档案》游戏资源
项目不会包含任何游戏内的文件，请自行处理。