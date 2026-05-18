# moyuNovel

一个本地 TXT 小说阅读界面，视觉风格参考 Codex App：左侧会话栏、顶部线程栏、中央对话流和底部输入框。中间区域是连续滚动小说文本，左侧的“会话”实际是本地书架。

## 使用

直接打开 `index.html`，或启动一个静态服务器：

```bash
python3 -m http.server 4177
```

然后访问：

```text
http://127.0.0.1:4177
```

也可以用 Electron 桌面壳启动：

```bash
npm install
npm start
```

Mac 打包命令：

```bash
npm run dist:mac
```

## 功能

- 导入本地 `.txt` 小说
- 导入本地文件夹中的 `.txt` 小说
- 自动兼容 UTF-8 和常见 GBK/GB18030 中文 TXT
- 自动保存书籍文本和阅读位置到浏览器 `IndexedDB`
- 连续滚动阅读，支持方向键 / 空格向下阅读
- 自动识别常见章节标题，支持章节下拉跳转
- 搜索当前小说正文，支持命中高亮和上下跳转
- 阅读偏好面板：字号、行高、阅读宽度、字体和浅/暗色主题
- Electron 菜单：导入 TXT、导入文件夹、重置窗口
- 纯前端实现，不上传文本

## 测试

```bash
npm run check
npm test
```

## 结构

- `app.js`：页面状态、事件绑定和 UI 渲染
- `src/core.js`：书籍、搜索、章节、偏好等纯函数
- `src/storage.js`：IndexedDB 和 `localStorage`
- `src/icons.js`：界面图标
- `electron/main.mjs`：Electron 主进程、窗口和菜单
- `electron/preload.mjs`：菜单命令到网页的安全桥
