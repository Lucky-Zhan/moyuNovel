import {
  DEMO_BOOK_ID,
  calculateProgress,
  clamp,
  createBookRecord,
  decodeTextBuffer,
  demoBook,
  escapeHtml,
  extractChapters,
  filterTextFiles,
  findMatches,
  formatBytes,
  formatProgress,
  highlightSearchMatches,
  isChapterTitle,
  mergeBookRecord,
  nextActiveBookIdAfterDelete,
  normalizePreference,
  prepareReadingText,
  sanitizeBookTitle,
  sanitizeProjectLabel,
  splitTextBlocks,
} from './src/core.js?v=6';
import {
  COMPOSER_KEY,
  PROJECTS_KEY,
  clearBooks,
  deleteBook,
  getAllBooks,
  getBook,
  openLibrary,
  putBook,
  readJson,
  saveJson,
  UI_KEY,
} from './src/storage.js?v=7';
import {
  iconArrowUp,
  iconChevronDown,
  iconChevronLeft,
  iconChevronRight,
  iconClock,
  iconEdit,
  iconFace,
  iconFolder,
  iconGrid,
  iconInfo,
  iconList,
  iconPanel,
  iconPlay,
  iconPlus,
  iconSearch,
  iconSettings,
  iconSidebar,
  iconTerminal,
  iconTerminalSmall,
} from './src/icons.js?v=6';

const app = document.querySelector('#app');
const state = {
  books: [],
  activeBookId: null,
  fontSize: 21,
  lineHeight: 1.9,
  readerWidth: 850,
  fontFamily: 'songti',
  theme: 'light',
  autoScroll: false,
  autoScrollSpeed: 3,
  prefsOpen: false,
  db: null,
  status: '正在处理...',
  error: '',
  restoreScrollTop: null,
  saveTimer: null,
  autoScrollTimer: null,
  searchQuery: '',
  searchIndex: 0,
  composerText: '',
  projectGroups: [],
};

document.addEventListener('keydown', handleKeydown);
window.moyuNovelShell?.onCommand?.((command) => {
  if (command === 'import-file') app?.querySelector('#file-input')?.click();
  if (command === 'import-folder') app?.querySelector('#folder-input')?.click();
  if (command === 'clear-library') clearLibrary();
  if (command === 'reset-preferences') resetPreferences();
});
window.addEventListener?.('beforeunload', () => {
  const reader = app?.querySelector('[data-reader-scroll]');
  const active = getActiveBook();
  if (!reader || !active) return;

  active.scrollTop = Math.round(reader.scrollTop);
  active.progress = calculateProgress({
    scrollTop: reader.scrollTop,
    scrollHeight: reader.scrollHeight,
    clientHeight: reader.clientHeight,
  });
  active.lastReadAt = Date.now();
  saveBookProgress(active).catch(() => {});
});
init();

async function init() {
  const ui = readJson(UI_KEY) || {};
  state.fontSize = normalizePreference('fontSize', ui.fontSize || 21);
  state.lineHeight = normalizePreference('lineHeight', ui.lineHeight || 1.9);
  state.readerWidth = normalizePreference('readerWidth', ui.readerWidth || 850);
  state.fontFamily = normalizePreference('fontFamily', ui.fontFamily || 'songti');
  state.theme = normalizePreference('theme', ui.theme || 'light');
  state.autoScroll = normalizePreference('autoScroll', ui.autoScroll || false);
  state.autoScrollSpeed = normalizePreference('autoScrollSpeed', ui.autoScrollSpeed || 3);
  state.activeBookId = typeof ui.activeBookId === 'string' ? ui.activeBookId : null;
  state.projectGroups = readJson(PROJECTS_KEY) || [];
  state.composerText = readJson(COMPOSER_KEY)?.text || '';

  try {
    state.db = await openLibrary();
    await ensureDemoBook();
    state.books = await getAllBooks(state.db);
  } catch {
    state.error = '当前仅显示演示文本。';
    state.books = [demoBook()];
  }

  if (!state.books.some((book) => book.id === state.activeBookId)) {
    state.activeBookId = state.books[0]?.id || DEMO_BOOK_ID;
  }

  const active = getActiveBook();
  state.restoreScrollTop = active?.scrollTop || 0;
  state.status = '已处理 1s';
  saveUi();
  render();
}

function render() {
  if (!app) return;

  const active = getActiveBook() || demoBook();
  const progress = clamp(Number(active.progress || 0), 0, 100);
  const textBlocks = splitTextBlocks(active.text);
  const chapters = extractChapters(textBlocks);
  const matches = findMatches(textBlocks, state.searchQuery);
  state.searchIndex = matches.length ? clamp(state.searchIndex, 0, matches.length - 1) : 0;

  app.innerHTML = `
    <div class="codex-window" data-theme="${escapeHtml(state.theme)}" style="--reader-width: ${state.readerWidth}px">
      <aside class="sidebar">
        <div class="sidebar-top">
          <button class="sidebar-icon" type="button" aria-label="切换侧边栏">${iconSidebar()}</button>
        </div>

        <nav class="primary-nav" aria-label="主导航">
          <button type="button" data-action="import-file">${iconEdit()}<span>新对话</span></button>
          <button type="button" data-action="focus-search">${iconSearch()}<span>搜索</span></button>
          <button type="button">${iconGrid()}<span>插件</span></button>
          <button type="button">${iconClock()}<span>自动化</span></button>
        </nav>

        <div class="sidebar-scroll">
          <div class="sidebar-label">项目</div>
          ${projectSections()}
          <button class="thread-row ghost add-row" type="button" data-action="add-project"><span>新建项目</span><time>＋</time></button>

          <div class="sidebar-label chat-label">对话</div>
          ${bookRows()}
        </div>

        <button class="settings" type="button" data-action="toggle-prefs" aria-label="设置">${iconSettings()}<span>设置</span></button>
      </aside>

      <main class="thread">
        <header class="thread-header">
          <h1>${escapeHtml(active.title || '小说阅读工作台')}</h1>
          <button class="more-button" type="button" aria-label="更多">•••</button>
          <div class="thread-actions">
            <button type="button" aria-label="运行">${iconPlay()}</button>
            <button class="model-button" type="button">${iconFace()}<span></span>${iconChevronDown()}</button>
            <button type="button" aria-label="终端">${iconTerminal()}</button>
            <button type="button" aria-label="信息">${iconInfo()}</button>
            <button type="button" aria-label="面板">${iconPanel()}</button>
          </div>
        </header>

        <div class="thread-body" data-reader-scroll>
          <section class="message-stack">
            <div class="tool-line">${iconTerminalSmall()}<span>${escapeHtml(state.error || state.status)} ›</span></div>

            <article class="assistant-message novel-message font-${escapeHtml(state.fontFamily)}" style="--novel-size: ${state.fontSize}px; --novel-line: ${state.lineHeight}">
              <div class="message-title-row">
                <span>已打开 ${escapeHtml(active.fileName || active.title)}</span>
                <span>${progress ? `${progress}%` : '就绪'}</span>
              </div>
              <div class="reader-command-bar">
                ${chapterJump(chapters)}
                <div class="reader-search">
                  ${iconSearch()}
                  <input id="search-input" type="search" value="${escapeHtml(state.searchQuery)}" placeholder="搜索当前书" autocomplete="off" />
                  <span>${formatSearchCount(matches)}</span>
                  <button type="button" data-action="search-prev" aria-label="上一个命中">${iconChevronLeft()}</button>
                  <button type="button" data-action="search-next" aria-label="下一个命中">${iconChevronRight()}</button>
                </div>
              </div>
              <div class="novel-copy">
                ${textBlocks.map((block, index) => `<p data-line-index="${index}" class="${lineClass(block, index, matches)}">${block ? renderTextLine(block, index, matches) : '&nbsp;'}</p>`).join('')}
              </div>
            </article>
          </section>
        </div>

        <footer class="composer-area">
          <div class="composer">
            <textarea id="composer-input" class="composer-input" placeholder="要求后续变更">${escapeHtml(state.composerText)}</textarea>
            <div class="composer-bottom">
              <button class="round-button" type="button" data-action="import-file" aria-label="导入 TXT">${iconPlus()}</button>
              <button class="access-button" type="button" data-action="import-folder">打开文件夹 ${iconChevronDown()}</button>
              <input id="file-input" type="file" accept=".txt,text/plain" hidden />
              <input id="folder-input" type="file" accept=".txt,text/plain" webkitdirectory multiple hidden />
              <div class="spacer"></div>
              <button class="small-text-button" type="button" data-action="font-down">A-</button>
              <button class="small-text-button" type="button" data-action="font-up">A+</button>
              <button class="small-text-button" type="button" data-action="toggle-auto-scroll">${state.autoScroll ? '停' : '自动'}</button>
              <button class="small-text-button icon-text-button" type="button" data-action="toggle-prefs" aria-label="阅读偏好">${iconSettings()}</button>
              <span class="model-label">5.5&nbsp; 中 ${iconChevronDown()}</span>
              <button class="send-button" type="button" data-action="noop-send" aria-label="发送但不执行">${iconArrowUp()}</button>
            </div>
          </div>
          ${preferencesPanel()}

          <div class="pager">
            <button type="button" data-action="scroll-top">${iconChevronLeft()} 顶部</button>
            <div><span style="width:${progress}%"></span></div>
            <button type="button" data-action="scroll-bottom">继续 ${iconChevronRight()}</button>
          </div>
        </footer>
      </main>
    </div>
  `;

  bindDom();
  restoreScrollPosition();
  syncAutoScroll();
}

function bindDom() {
  app.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => handleAction(button.dataset.action, button.dataset.projectGroupId));
  });
  app.querySelectorAll('[data-book-id]').forEach((button) => {
    button.addEventListener('click', () => selectBook(button.dataset.bookId));
    button.addEventListener('keydown', handleBookRowKeydown);
  });
  app.querySelector('#file-input')?.addEventListener('change', (event) => importFiles(event.target.files, event.target));
  app.querySelector('#folder-input')?.addEventListener('change', (event) => importFiles(event.target.files, event.target));
  app.querySelector('#chapter-select')?.addEventListener('change', (event) => jumpToLine(Number(event.target.value)));
  app.querySelector('#search-input')?.addEventListener('input', handleSearchInput);
  app.querySelector('#search-input')?.addEventListener('keydown', handleSearchKeydown);
  app.querySelector('#composer-input')?.addEventListener('input', handleComposerInput);
  app.querySelectorAll('[data-project-id]').forEach((node) => {
    node.addEventListener('click', (event) => event.stopPropagation());
    node.addEventListener('blur', handleProjectEdit);
    node.addEventListener('keydown', handleEditableKeydown);
  });
  app.querySelectorAll('[contenteditable][data-project-group-id]').forEach((node) => {
    node.addEventListener('blur', handleProjectGroupEdit);
    node.addEventListener('keydown', handleEditableKeydown);
  });
  app.querySelectorAll('[data-edit-book-id]').forEach((node) => {
    node.addEventListener('click', (event) => event.stopPropagation());
    node.addEventListener('blur', handleBookInlineEdit);
    node.addEventListener('keydown', handleEditableKeydown);
  });
  app.querySelectorAll('[data-pref]').forEach((control) => {
    control.addEventListener('input', handlePreferenceInput);
    control.addEventListener('change', handlePreferenceInput);
  });
  app.querySelector('[data-reader-scroll]')?.addEventListener('scroll', handleReaderScroll, { passive: true });
}

function handleAction(action, projectGroupId) {
  if (action === 'import-file') return app.querySelector('#file-input')?.click();
  if (action === 'import-folder') return app.querySelector('#folder-input')?.click();
  if (action === 'add-project') return addProject();
  if (action === 'add-session') return addProjectSession(projectGroupId);
  if (action === 'focus-search') return app.querySelector('#search-input')?.focus();
  if (action === 'search-next') return moveSearch(1);
  if (action === 'search-prev') return moveSearch(-1);
  if (action === 'rename-book') return renameActiveBook();
  if (action === 'delete-book') return deleteActiveBook();
  if (action === 'clear-library') return clearLibrary();
  if (action === 'noop-send') return;

  if (action === 'font-up' || action === 'font-down') {
    state.fontSize = normalizePreference('fontSize', state.fontSize + (action === 'font-up' ? 1 : -1));
    saveUi();
    render();
    return;
  }

  if (action === 'toggle-auto-scroll') {
    state.autoScroll = !state.autoScroll;
    saveUi();
    render();
    return;
  }

  if (action === 'toggle-prefs') {
    state.prefsOpen = !state.prefsOpen;
    render();
    return;
  }

  const reader = app.querySelector('[data-reader-scroll]');
  if (action === 'scroll-top') return reader?.scrollTo({ top: 0, behavior: 'smooth' });
  if (action === 'scroll-bottom') reader?.scrollBy({ top: Math.max(reader.clientHeight * 0.82, 360), behavior: 'smooth' });
}

function resetPreferences() {
  state.fontSize = 21;
  state.lineHeight = 1.9;
  state.readerWidth = 850;
  state.fontFamily = 'songti';
  state.theme = 'light';
  state.autoScroll = false;
  state.autoScrollSpeed = 3;
  state.prefsOpen = false;
  state.status = '已处理 1s · 已重置偏好';
  saveUi();
  render();
}

function addProject() {
  const now = Date.now();
  const project = {
    id: `project-${now}`,
    title: '新项目',
    rows: [],
  };
  state.projectGroups = [...state.projectGroups, project];
  saveJson(PROJECTS_KEY, state.projectGroups);
  render();
  requestAnimationFrame(() => app.querySelector(`[data-project-group-id="${cssEscape(project.id)}"]`)?.focus());
}

function addProjectSession(projectGroupId) {
  if (!state.projectGroups.length) {
    addProject();
    requestAnimationFrame(addProjectSession);
    return;
  }

  const group = state.projectGroups.find((item) => item.id === projectGroupId) || state.projectGroups[0];
  const row = { id: `session-${Date.now()}`, label: '新会话', time: '刚刚' };
  state.projectGroups = state.projectGroups.map((item) => (item.id === group.id ? { ...item, rows: [row, ...item.rows] } : item));
  saveJson(PROJECTS_KEY, state.projectGroups);
  render();
  requestAnimationFrame(() => app.querySelector(`[data-project-id="${cssEscape(row.id)}"]`)?.focus());
}

function handleSearchInput(event) {
  state.searchQuery = event.target.value;
  state.searchIndex = 0;
  render();
  if (state.searchQuery.trim()) requestAnimationFrame(() => jumpToCurrentSearch());
}

function handleSearchKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    moveSearch(event.shiftKey ? -1 : 1);
  }
}

function handleComposerInput(event) {
  state.composerText = event.target.value;
  saveJson(COMPOSER_KEY, { text: state.composerText });
}

function handleEditableKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

function handleBookRowKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  selectBook(event.currentTarget.dataset.bookId);
}

function handleProjectEdit(event) {
  const id = event.currentTarget.dataset.projectId;
  const label = sanitizeProjectLabel(event.currentTarget.textContent);
  state.projectGroups = state.projectGroups.map((group) => ({
    ...group,
    rows: group.rows.map((row) => (row.id === id ? { ...row, label } : row)),
  }));
  saveJson(PROJECTS_KEY, state.projectGroups);
  event.currentTarget.textContent = label;
}

function handleProjectGroupEdit(event) {
  const id = event.currentTarget.dataset.projectGroupId;
  const title = sanitizeProjectLabel(event.currentTarget.textContent);
  state.projectGroups = state.projectGroups.map((group) => (group.id === id ? { ...group, title } : group));
  saveJson(PROJECTS_KEY, state.projectGroups);
  event.currentTarget.textContent = title;
}

async function handleBookInlineEdit(event) {
  const id = event.currentTarget.dataset.editBookId;
  const book = state.books.find((item) => item.id === id);
  if (!book) return;

  const title = sanitizeBookTitle(event.currentTarget.textContent);
  const updated = { ...book, title, lastReadAt: Date.now() };
  updateActiveBookInState(updated);
  await persistBook(updated);
  event.currentTarget.textContent = title;
  if (id === state.activeBookId) {
    app.querySelector('h1').textContent = title;
  }
}

function handlePreferenceInput(event) {
  const key = event.currentTarget.dataset.pref;
  const value = key === 'autoScroll' ? event.currentTarget.value === 'true' : event.currentTarget.value;
  state[key] = normalizePreference(key, value);
  saveUi();
  render();
}

function moveSearch(direction) {
  const matches = findMatches(splitTextBlocks((getActiveBook() || demoBook()).text), state.searchQuery);
  if (!matches.length) return;
  state.searchIndex = (state.searchIndex + direction + matches.length) % matches.length;
  render();
  requestAnimationFrame(() => jumpToCurrentSearch());
}

function jumpToCurrentSearch() {
  const matches = findMatches(splitTextBlocks((getActiveBook() || demoBook()).text), state.searchQuery);
  const match = matches[state.searchIndex];
  if (match) jumpToLine(match.lineIndex);
}

function handleKeydown(event) {
  const reader = app?.querySelector('[data-reader-scroll]');
  if (!reader) return;
  if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
    event.preventDefault();
    reader.scrollBy({ top: Math.max(reader.clientHeight * 0.82, 360), behavior: 'smooth' });
  }
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault();
    reader.scrollBy({ top: -Math.max(reader.clientHeight * 0.82, 360), behavior: 'smooth' });
  }
}

async function selectBook(bookId) {
  await saveCurrentReadingPosition();
  state.activeBookId = bookId;
  state.restoreScrollTop = getActiveBook()?.scrollTop || 0;
  saveUi();
  render();
}

async function renameActiveBook() {
  const active = getActiveBook();
  if (!active) return;
  const input = window.prompt?.('重命名当前小说', active.title);
  if (input === null || input === undefined) return;
  const nextTitle = sanitizeBookTitle(input);
  if (nextTitle === active.title) return;
  const updated = { ...active, title: nextTitle, lastReadAt: Date.now() };
  updateActiveBookInState(updated);
  await persistBook(updated);
  state.status = `已处理 1s · 已重命名 ${nextTitle}`;
  render();
}

async function deleteActiveBook() {
  const active = getActiveBook();
  if (!active || !window.confirm?.(`删除《${active.title}》？这会移除正文和进度。`)) return;
  await deleteBook(state.db, active.id, (id) => {
    state.books = state.books.filter((book) => book.id !== id);
  });
  state.books = state.books.filter((book) => book.id !== active.id);
  if (!state.books.length) {
    await persistBook(demoBook());
    state.books = await getAllBooks(state.db, state.books);
  }
  state.activeBookId = nextActiveBookIdAfterDelete(state.books, active.id) || state.books[0]?.id || DEMO_BOOK_ID;
  state.restoreScrollTop = getActiveBook()?.scrollTop || 0;
  state.status = `已处理 1s · 已删除 ${active.title}`;
  saveUi();
  render();
}

async function clearLibrary() {
  if (!window.confirm?.('清空所有已导入小说和阅读进度？')) return;
  await clearBooks(state.db, () => {
    state.books = [];
  });
  await persistBook(demoBook());
  state.books = await getAllBooks(state.db, state.books);
  state.activeBookId = state.books[0]?.id || DEMO_BOOK_ID;
  state.restoreScrollTop = 0;
  state.status = '已处理 1s · 已清空';
  saveUi();
  render();
}

async function importFiles(fileList, input) {
  const files = filterTextFiles(Array.from(fileList || []));
  if (input) input.value = '';
  if (!files.length) {
    state.status = '没有发现 TXT 文件。';
    render();
    return;
  }

  const now = Date.now();
  const imported = [];
  for (const file of files) {
    const text = prepareReadingText(await readFileText(file));
    if (!text.trim()) continue;
    const incoming = await createBookRecord({ name: file.name, size: file.size, text, now });
    const existing = await getBook(state.db, incoming.id, state.books);
    const record = mergeBookRecord(existing, incoming, now);
    await persistBook(record);
    imported.push(record);
  }

  if (!imported.length) {
    state.status = 'TXT 文件为空，没有导入。';
    render();
    return;
  }

  state.books = await getAllBooks(state.db, state.books);
  state.activeBookId = imported[0].id;
  state.restoreScrollTop = 0;
  state.status = `已处理 1s · 已导入 ${imported.length} 个 TXT`;
  saveUi();
  render();
}

function handleReaderScroll(event) {
  const reader = event.currentTarget;
  const active = getActiveBook();
  if (!active) return;
  active.scrollTop = Math.round(reader.scrollTop);
  active.progress = calculateProgress({ scrollTop: reader.scrollTop, scrollHeight: reader.scrollHeight, clientHeight: reader.clientHeight });
  active.lastReadAt = Date.now();
  updateActiveBookInState(active);
  updateVisibleProgress(active);
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    saveBookProgress(active).catch(() => {
      state.error = '保存阅读进度失败，可以继续阅读但刷新后可能无法恢复。';
    });
  }, 220);
}

async function saveCurrentReadingPosition() {
  const reader = app?.querySelector('[data-reader-scroll]');
  const active = getActiveBook();
  if (!reader || !active) return;
  active.scrollTop = Math.round(reader.scrollTop);
  active.progress = calculateProgress({ scrollTop: reader.scrollTop, scrollHeight: reader.scrollHeight, clientHeight: reader.clientHeight });
  active.lastReadAt = Date.now();
  updateActiveBookInState(active);
  await saveBookProgress(active);
}

function restoreScrollPosition() {
  const reader = app.querySelector('[data-reader-scroll]');
  const scrollTop = state.restoreScrollTop;
  state.restoreScrollTop = null;
  if (reader && scrollTop) requestAnimationFrame(() => { reader.scrollTop = scrollTop; });
}

function syncAutoScroll() {
  if (state.autoScrollTimer) {
    window.clearInterval(state.autoScrollTimer);
    state.autoScrollTimer = null;
  }

  if (!state.autoScroll) return;
  state.autoScrollTimer = window.setInterval(() => {
    const reader = app.querySelector('[data-reader-scroll]');
    if (!reader) return;
    const maxScroll = Math.max(reader.scrollHeight - reader.clientHeight, 0);
    if (reader.scrollTop >= maxScroll) {
      state.autoScroll = false;
      saveUi();
      render();
      return;
    }
    reader.scrollBy({ top: state.autoScrollSpeed, behavior: 'auto' });
  }, 120);
}

function jumpToLine(index) {
  const reader = app.querySelector('[data-reader-scroll]');
  const line = app.querySelector(`[data-line-index="${index}"]`);
  if (reader && line) reader.scrollTo({ top: line.offsetTop - 86, behavior: 'smooth' });
}

async function ensureDemoBook() {
  const books = await getAllBooks(state.db, state.books);
  if (!books.length) await persistBook(demoBook());
}

async function persistBook(book) {
  await putBook(state.db, book, updateActiveBookInState);
}

function saveBookProgress(book) {
  return persistBook({ ...book, scrollTop: Math.round(book.scrollTop || 0), progress: clamp(Math.round(book.progress || 0), 0, 100) });
}

function getActiveBook() {
  return state.books.find((book) => book.id === state.activeBookId) || state.books[0] || null;
}

function updateActiveBookInState(book) {
  const index = state.books.findIndex((item) => item.id === book.id);
  if (index >= 0) state.books[index] = book;
  else state.books = [book, ...state.books];
}

function updateVisibleProgress(book) {
  const progressNode = app.querySelector('.message-title-row span:last-child');
  const progressBar = app.querySelector('.pager span');
  const activeRow = app.querySelector(`[data-book-id="${cssEscape(book.id)}"] time`);
  if (progressNode) progressNode.textContent = book.progress ? `${book.progress}%` : '就绪';
  if (progressBar) progressBar.style.width = `${book.progress}%`;
  if (activeRow) activeRow.textContent = formatProgress(book.progress);
}

function bookRows() {
  if (!state.books.length) return '<div class="thread-row active"><span>demo-novel</span><time>就绪</time></div>';
  return state.books.map((book) => `
    <div class="thread-row${book.id === state.activeBookId ? ' active' : ''}" role="button" tabindex="0" data-book-id="${escapeHtml(book.id)}">
      <span contenteditable="true" spellcheck="false" data-edit-book-id="${escapeHtml(book.id)}">${escapeHtml(book.title)}</span>
      <time>${formatProgress(book.progress)}</time>
    </div>
  `).join('');
}

function projectSections() {
  return state.projectGroups.map((group) => `
    <section class="sidebar-section project-section">
      <div class="folder-title">${iconFolder()}<span contenteditable="true" spellcheck="false" data-project-group-id="${escapeHtml(group.id)}">${escapeHtml(group.title)}</span>${group.badge ? `<em>${escapeHtml(group.badge)}</em>` : ''}</div>
      ${group.rows.map((row) => projectRow(row)).join('')}
      <button class="thread-row ghost add-row" type="button" data-action="add-session" data-project-group-id="${escapeHtml(group.id)}"><span>新建会话</span><time>＋</time></button>
      ${group.more ? '<button class="show-more" type="button">展开显示</button>' : ''}
    </section>
  `).join('');
}

function projectRow(row) {
  const active = row.active ? ' active' : '';
  return `
    <div class="thread-row project-row${active}">
      <span contenteditable="true" spellcheck="false" data-project-id="${escapeHtml(row.id)}">${escapeHtml(row.label)}</span>
      <time>${escapeHtml(row.time || '')}</time>
    </div>
  `;
}

function defaultProjectGroups() {
  return [];
}

function chapterJump(chapters) {
  if (!chapters.length) return '';
  return `
    <div class="chapter-jump">
      <span>${iconList()}章节</span>
      <select id="chapter-select" aria-label="章节跳转">
        <option value="">跳转到...</option>
        ${chapters.map((chapter) => `<option value="${chapter.index}">${escapeHtml(chapter.title)}</option>`).join('')}
      </select>
    </div>
  `;
}

function preferencesPanel() {
  if (!state.prefsOpen) return '';
  return `
    <section class="prefs-panel" aria-label="阅读偏好">
      <div class="prefs-header"><strong>阅读偏好</strong><button type="button" data-action="toggle-prefs" aria-label="关闭阅读偏好">×</button></div>
      ${rangePreference('字号', 'fontSize', 16, 30, 1, `${state.fontSize}px`)}
      ${rangePreference('行高', 'lineHeight', 1.6, 2.4, 0.1, state.lineHeight.toFixed(1))}
      ${rangePreference('宽度', 'readerWidth', 680, 980, 20, `${state.readerWidth}px`)}
      ${rangePreference('自动', 'autoScrollSpeed', 1, 10, 1, `${state.autoScrollSpeed}x`)}
      <div class="pref-row"><span>播放</span><div class="segmented">${preferenceButton('autoScroll', false, '关闭')}${preferenceButton('autoScroll', true, '开启')}</div></div>
      <div class="pref-row"><span>字体</span><div class="segmented">${preferenceButton('fontFamily', 'songti', '宋体')}${preferenceButton('fontFamily', 'serif', '衬线')}${preferenceButton('fontFamily', 'sans', '黑体')}</div></div>
      <div class="pref-row"><span>主题</span><div class="segmented">${preferenceButton('theme', 'light', '浅色')}${preferenceButton('theme', 'dark', '暗色')}</div></div>
    </section>
  `;
}

function rangePreference(label, key, min, max, step, valueLabel) {
  return `<label><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${state[key]}" data-pref="${key}" /><em>${valueLabel}</em></label>`;
}

function preferenceButton(key, value, label) {
  return `<label class="segment"><input type="radio" name="${key}" value="${value}" data-pref="${key}"${state[key] === value ? ' checked' : ''} /><span>${label}</span></label>`;
}

function lineClass(line, index, matches) {
  const classes = [];
  if (isChapterTitle(line)) classes.push('chapter-line');
  if (matches.some((match) => match.lineIndex === index)) classes.push('search-line');
  return classes.join(' ');
}

function renderTextLine(line, index, matches) {
  if (!matches.some((match) => match.lineIndex === index)) return escapeHtml(line);
  return highlightSearchMatches(line, state.searchQuery);
}

function formatSearchCount(matches) {
  if (!state.searchQuery.trim() || !matches.length) return '0/0';
  return `${state.searchIndex + 1}/${matches.length}`;
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(decodeTextBuffer(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function saveUi() {
  saveJson(UI_KEY, {
    activeBookId: state.activeBookId,
    fontFamily: state.fontFamily,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    readerWidth: state.readerWidth,
    theme: state.theme,
    autoScroll: state.autoScroll,
    autoScrollSpeed: state.autoScrollSpeed,
  });
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
