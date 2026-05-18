const STORAGE_KEY = 'codex-novel-reader:v2';
const UI_KEY = 'codex-novel-reader:ui:v2';
const DEFAULT_PAGE_LINES = 16;

const demoText = [
  '第一章 终端里的雪',
  '',
  '夜色沉进屏幕边缘时，终端还亮着。',
  '一行行日志像细雪落下，安静地遮住了真正的故事。',
  '她把光标停在最后一段提示词后面，等系统继续运行，也等自己继续往前走。',
  '',
  '窗口外的城市没有声音，只有风把玻璃擦得很亮。',
  '代码、注释、警告、重试，都像某种日常的伪装。',
  '而小说就在中间，灰得刚好，像一段还没有提交的心事。',
  '',
  '她知道，真正重要的东西不一定需要大声出现。',
  '有时候，它只需要在一块安静的区域里，被慢慢读完。',
  '',
  '第二章 未保存的更改',
  '',
  '凌晨一点，状态栏仍然显示 ready。',
  '她把杯子推到键盘右侧，指尖落在方向键上。',
  '日志继续刷新，像有人在替她维持一个合理的现场。',
  '',
  '左侧文件树亮着，右侧检查器列出运行结果。',
  '中间那块被称为 modified 的区域，藏着另一条时间线。',
  '每翻过一页，进度条就向前挪一点。',
  '',
  '她并不急。',
  '越是安静的故事，越适合在看似繁忙的界面里慢慢展开。',
  '',
  '第三章 本地缓存',
  '',
  '浏览器记住了她停下的位置。',
  '下一次打开，故事会从同一行醒来。',
  '这件事很小，但足够让一个夜晚显得有秩序。',
].join('\n');

const app = document.querySelector('#app');
const state = loadState();

document.addEventListener('keydown', handleKeydown);

render();

function loadState() {
  const saved = readJson(STORAGE_KEY) || {};
  const ui = readJson(UI_KEY) || {};
  const text = typeof saved.text === 'string' && saved.text.trim() ? saved.text : demoText;
  const title = saved.title || 'demo-novel.txt';
  const lines = splitLines(text);
  const line = clamp(Number(saved.positions?.[bookId(title, text)] || saved.line || 0), 0, Math.max(lines.length - 1, 0));

  return {
    title,
    text,
    lines,
    line,
    fontSize: clamp(Number(ui.fontSize || 21), 16, 30),
    pageLines: DEFAULT_PAGE_LINES,
  };
}

function render() {
  const total = Math.max(state.lines.length, 1);
  const end = Math.min(state.line + state.pageLines, total);
  const pageLines = state.lines.slice(state.line, end);
  const progress = total <= 1 ? 0 : Math.round((state.line / (total - 1)) * 100);
  const delta = Math.max(end - state.line, 0);

  app.innerHTML = `
    <div class="codex-window">
      <aside class="sidebar">
        <div class="sidebar-top">
          <div class="traffic" aria-hidden="true"><span></span><span></span><span></span></div>
          <button class="sidebar-icon" type="button" aria-label="切换侧边栏">${iconSidebar()}</button>
        </div>

        <nav class="primary-nav" aria-label="主导航">
          <button type="button">${iconEdit()}<span>New chat</span></button>
          <button type="button">${iconSearch()}<span>Search</span></button>
          <button type="button">${iconGrid()}<span>Plugins</span></button>
        </nav>

        <div class="sidebar-scroll">
          ${quickSection('用户提示词', [
            ['ai完成率测试', '⌘5'],
            ['OK，我想跟你讨论一下ai自动...', '⌘6'],
            ['开发', '⌘7'],
            ['生成数据开发平台页面', '⌘8'],
          ])}

          ${folderSection('tsRebuild', [
            ['接口测试专家', '1mo'],
            ['了解 Jenkins', '1w'],
            ['我想统计一下我在用大模型重...', '3d'],
            ['接口修复专家', '1mo'],
          ])}

          <section class="sidebar-section">
            <div class="folder-title">${iconFolder()}<span>Playground</span></div>
            <button class="thread-row active" type="button">
              <span>小说阅读工作台</span>
              <span class="spinner"></span>
            </button>
            <button class="thread-row" type="button"><span>查询地址位置</span><time>1w</time></button>
            <button class="thread-row" type="button"><span>你看看github上，选出前10个...</span><time>6d</time></button>
            <button class="thread-row" type="button"><span>mempalace</span><time>3w</time></button>
            <button class="show-more" type="button">Show more</button>
          </section>
        </div>

        <button class="settings" type="button">${iconSettings()}<span>Settings</span></button>
      </aside>

      <main class="thread">
        <header class="thread-header">
          <h1>小说阅读工作台</h1>
          <button class="more-button" type="button" aria-label="更多">•••</button>
          <div class="thread-actions">
            <button type="button" aria-label="运行">${iconPlay()}</button>
            <button class="model-button" type="button">${iconFace()}<span></span>${iconChevronDown()}</button>
            <button type="button" aria-label="终端">${iconTerminal()}</button>
            <button type="button" aria-label="信息">${iconInfo()}</button>
            <button type="button" aria-label="面板">${iconPanel()}</button>
          </div>
        </header>

        <div class="thread-body">
          <section class="message-stack">
            <div class="tool-line">${iconTerminalSmall()}<span>Ran 3 commands</span></div>

            <article class="assistant-message novel-message" style="--novel-size: ${state.fontSize}px">
              <div class="message-title-row">
                <span>${escapeHtml(state.title)}</span>
                <span>${state.line + 1}-${end}/${total}</span>
              </div>
              <div class="novel-copy">
                ${pageLines.map((line) => `<p>${line ? escapeHtml(line) : '&nbsp;'}</p>`).join('')}
              </div>
            </article>

            <div class="tool-line strong">${iconTerminalSmall()}<span>Edited 2 files</span><span>ran 1 command</span></div>

            <article class="assistant-message status-message">
              <p>已缓存当前阅读位置。继续翻页会更新本地进度，不会上传文本。</p>
              <div class="mini-shot">
                <div class="shot-sidebar"></div>
                <div class="shot-main">
                  <span></span><span></span><span></span><span></span>
                </div>
              </div>
            </article>

            <div class="tool-line muted">${iconTerminalSmall()}<span>Running git status --short</span></div>
            <div class="thinking">Thinking</div>
          </section>
        </div>

        <footer class="composer-area">
          <div class="change-strip">
            <span>${delta} lines changed</span>
            <strong>+${progress}</strong>
            <em>-0</em>
            <button type="button" data-action="next">Review here</button>
          </div>

          <div class="composer">
            <div class="composer-text">你要做的和codex一模一样的感觉</div>
            <div class="composer-bottom">
              <button class="round-button" type="button" data-action="import" aria-label="导入 TXT">＋</button>
              <button class="access-button" type="button">Full access ${iconChevronDown()}</button>
              <input id="file-input" type="file" accept=".txt,text/plain" hidden />
              <div class="spacer"></div>
              <button class="small-text-button" type="button" data-action="font-down">A-</button>
              <button class="small-text-button" type="button" data-action="font-up">A+</button>
              <span class="model-label">5.5&nbsp; High ${iconChevronDown()}</span>
              <button class="send-button" type="button" data-action="next" aria-label="下一页">${iconArrowUp()}</button>
            </div>
          </div>

          <div class="pager">
            <button type="button" data-action="prev">${iconChevronLeft()} 上一页</button>
            <div><span style="width:${progress}%"></span></div>
            <button type="button" data-action="next">下一页 ${iconChevronRight()}</button>
          </div>
        </footer>
      </main>
    </div>
  `;

  bindDom();
}

function bindDom() {
  app.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => handleAction(button.dataset.action));
  });
  app.querySelector('#file-input')?.addEventListener('change', handleFile);
}

function handleAction(action) {
  if (action === 'import') {
    app.querySelector('#file-input')?.click();
    return;
  }

  if (action === 'next') {
    movePage(1);
    return;
  }

  if (action === 'prev') {
    movePage(-1);
    return;
  }

  if (action === 'font-up') {
    state.fontSize = clamp(state.fontSize + 1, 16, 30);
    saveUi();
    render();
    return;
  }

  if (action === 'font-down') {
    state.fontSize = clamp(state.fontSize - 1, 16, 30);
    saveUi();
    render();
  }
}

function handleKeydown(event) {
  if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
    event.preventDefault();
    movePage(1);
  }

  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault();
    movePage(-1);
  }
}

function movePage(direction) {
  const maxStart = Math.max(state.lines.length - state.pageLines, 0);
  state.line = clamp(state.line + direction * state.pageLines, 0, maxStart);
  saveBook();
  render();
}

function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '').replace(/\r\n/g, '\n');
    if (!text.trim()) return;

    state.title = file.name;
    state.text = text;
    state.lines = splitLines(text);
    state.line = 0;
    saveBook();
    render();
  };
  reader.readAsText(file, 'utf-8');
}

function saveBook() {
  const previous = readJson(STORAGE_KEY) || {};
  const id = bookId(state.title, state.text);
  const positions = { ...(previous.positions || {}), [id]: state.line };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: state.title, text: state.text, line: state.line, positions }));
}

function saveUi() {
  localStorage.setItem(UI_KEY, JSON.stringify({ fontSize: state.fontSize }));
}

function quickSection(title, rows) {
  return `
    <section class="sidebar-section">
      <h2>${escapeHtml(title)}</h2>
      ${rows.map(([label, hotkey]) => `<button class="thread-row" type="button"><span>${escapeHtml(label)}</span><kbd>${escapeHtml(hotkey)}</kbd></button>`).join('')}
      <button class="show-more" type="button">Show more</button>
    </section>
  `;
}

function folderSection(title, rows) {
  return `
    <section class="sidebar-section">
      <div class="folder-title">${iconFolder()}<span>${escapeHtml(title)}</span></div>
      ${rows.map(([label, time]) => `<button class="thread-row" type="button"><span>${escapeHtml(label)}</span><time>${escapeHtml(time)}</time></button>`).join('')}
      <button class="show-more" type="button">Show more</button>
    </section>
  `;
}

function splitLines(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function bookId(title, text) {
  return `${title}:${text.length}:${text.slice(0, 120)}`;
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function iconEdit() {
  return '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
}

function iconSearch() {
  return '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
}

function iconGrid() {
  return '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
}

function iconFolder() {
  return '<svg viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z"/></svg>';
}

function iconSettings() {
  return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 0 0 .1-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 5.5h-4l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 .1 2l-2.1 1.5 2 3.4 2.5-1a8 8 0 0 0 1.6.9l.4 2.7h4l.4-2.7a8 8 0 0 0 1.6-.9l2.5 1 2-3.4Z"/></svg>';
}

function iconSidebar() {
  return '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14"/></svg>';
}

function iconPlay() {
  return '<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>';
}

function iconFace() {
  return '<span class="face-icon">Finder</span>';
}

function iconTerminal() {
  return '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m7 9 3 3-3 3"/><path d="M13 15h4"/></svg>';
}

function iconInfo() {
  return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>';
}

function iconPanel() {
  return '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M15 5v14"/></svg>';
}

function iconTerminalSmall() {
  return '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m8 10 3 2-3 2"/><path d="M13 15h3"/></svg>';
}

function iconChevronDown() {
  return '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';
}

function iconChevronLeft() {
  return '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>';
}

function iconChevronRight() {
  return '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
}

function iconArrowUp() {
  return '<svg viewBox="0 0 24 24"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
}
