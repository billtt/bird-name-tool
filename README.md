# 鸟类文件重命名工具

一个基于 Web 的本地小工具，用于快速浏览图片/视频并用预设的鸟名为文件批量改名。

## 功能

- 选择本地文件夹，列出其中的 `.jpg`/`.jpeg`/`.mp4`/`.mov` 文件
- 维护一个鸟名列表，按拼音排序，并在每个首字母组的第一项左侧显示该字母
- 输入框回车新增鸟名；鸟名右键支持**修改**/**删除**
- 点击文件后在右侧预览图片或视频
- 点击鸟名给当前文件生成新名（预览状态，文件名变橙色）；改名规则：
  - 文件名中不含 `_`：在前面加 `鸟名_` 前缀
  - 文件名形如 `aaa_bbb.xxx`：将 `aaa` 替换为鸟名
- 键盘 ↓ / ↑ 在文件列表中切换
- 底部「确定改名」按钮批量提交实际改名
- 鸟名持久化到项目目录下的 `bird-names.json`，便于通过 git / 云盘在多设备同步

## 运行

需要 Node.js（仅使用内置模块，无依赖）和支持 [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API) 的浏览器（Chrome / Edge / 其它 Chromium 内核）。

```bash
node server.js
```

然后用浏览器打开 [http://localhost:8080](http://localhost:8080)。默认端口 `8080`，可通过 `PORT` 环境变量覆盖：

```bash
PORT=9000 node server.js
```

## 使用流程

1. 顶部点「选择文件夹」，授权后会列出文件夹内的图片/视频。
2. 在「鸟名」列上方输入框中输入鸟名后回车新增；右键已有鸟名可修改或删除。
3. 在左侧文件列表中点击文件（或用 ↑/↓），主区域显示预览。
4. 点击右侧任意鸟名，文件列表中的该文件名变为橙色（仅预览，未真正改名）。可重复点击不同鸟名覆盖预览。
5. 全部确认后点「确定改名」按钮批量将磁盘上的文件改名。

## 项目结构

```
bird-name-tool/
├── index.html        # 页面结构
├── styles.css        # 样式
├── script.js         # 前端逻辑：文件夹/文件、预览、改名预览与提交
├── server.js         # 零依赖 Node HTTP 服务，提供静态资源 + 鸟名读写 API
├── bird-names.json   # 鸟名持久化数据
└── README.md
```

## API

- `GET /api/bird-names` — 返回鸟名数组。
- `PUT /api/bird-names` — 接收 JSON 字符串数组并写入 `bird-names.json`。

## 说明

- 改名操作通过浏览器 File System Access API 直接作用于所选文件夹，文件不经过服务器。首次操作时浏览器会请求读写权限。
- 文件夹访问需要 HTTPS 或 `localhost` 上下文，本项目以 `localhost` 运行因此可用。
- Firefox / Safari 目前不支持 File System Access API，无法选择文件夹；页面会给出提示。
