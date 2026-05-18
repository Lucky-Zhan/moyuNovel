# moyuNovel

一个本地 TXT 小说阅读界面，视觉风格参考 Codex App：左侧会话栏、顶部线程栏、中央对话流和底部输入框。

## 使用

直接打开 `index.html`，或启动一个静态服务器：

```bash
python3 -m http.server 4177
```

然后访问：

```text
http://127.0.0.1:4177
```

## 功能

- 导入本地 `.txt` 小说
- 自动保存阅读位置到浏览器 `localStorage`
- 上一页 / 下一页
- 字号调整
- 纯前端实现，不上传文本
