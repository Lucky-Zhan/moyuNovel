export const DEMO_BOOK_ID = 'demo-codex-snow';

export const demoText = [
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

export function demoBook() {
  return {
    id: DEMO_BOOK_ID,
    title: 'demo-novel',
    fileName: 'demo-novel.txt',
    text: demoText,
    scrollTop: 0,
    progress: 0,
    createdAt: 0,
    lastReadAt: 0,
  };
}

export async function createBookRecord({ name, size = 0, text, now = Date.now() }) {
  return {
    id: await createBookId(name, size, text),
    title: stripExtension(name),
    fileName: name,
    text,
    scrollTop: 0,
    progress: 0,
    createdAt: now,
    lastReadAt: now,
  };
}

export async function createBookId(name, size, text) {
  const seed = `${name}:${size}:${text.slice(0, 240)}`;
  const digest = await hashText(seed);
  return `book-${digest.slice(0, 16)}`;
}

export async function hashText(value) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.subtle && globalThis.TextEncoder) {
    const bytes = new TextEncoder().encode(value);
    const hash = await cryptoApi.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, '0');
}

export function filterTextFiles(files) {
  return Array.from(files)
    .filter((file) => /\.txt$/i.test(file.name))
    .sort((a, b) => fileSortKey(a).localeCompare(fileSortKey(b), 'zh-CN', { numeric: true, sensitivity: 'base' }));
}

export function mergeBookRecord(existing, incoming, now = Date.now()) {
  if (!existing) return incoming;

  return {
    ...incoming,
    scrollTop: Math.max(0, Number(existing.scrollTop || 0)),
    progress: clamp(Math.round(Number(existing.progress || 0)), 0, 100),
    createdAt: existing.createdAt || incoming.createdAt,
    lastReadAt: now,
  };
}

export function calculateProgress({ scrollTop, scrollHeight, clientHeight }) {
  const maxScroll = Math.max(scrollHeight - clientHeight, 0);
  if (maxScroll === 0) return 100;
  return clamp(Math.round((scrollTop / maxScroll) * 100), 0, 100);
}

export function splitTextBlocks(text) {
  return normalizeText(text).split('\n');
}

export function prepareReadingText(text) {
  const normalized = normalizeText(text).trim();
  if (!normalized) return '';
  if (/\n\s*\n/.test(normalized)) return normalized;

  return normalized
    .split('\n')
    .flatMap((line) => segmentCompactLine(line))
    .join('\n\n');
}

function segmentCompactLine(line) {
  const title = normalizeChapterTitle(line);
  if (!title) return [''];
  if (isChapterTitle(title) || (title.length <= 36 && !/[。！？!?]/.test(title))) return [title];

  const parts = title.match(/[^。！？!?]+[。！？!?」』”’）)]*/g);
  if (!parts || parts.length < 2) return [title];
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function extractChapters(lines) {
  return Array.from(lines)
    .map((line, index) => ({ title: normalizeChapterTitle(line), index }))
    .filter((chapter) => chapter.title && isChapterTitle(chapter.title));
}

export function findMatches(lines, query) {
  const needle = normalizeSearchQuery(query);
  if (!needle) return [];

  const matches = [];
  Array.from(lines).forEach((line, lineIndex) => {
    const haystack = String(line).toLocaleLowerCase();
    let from = 0;
    while (from <= haystack.length) {
      const matchIndex = haystack.indexOf(needle, from);
      if (matchIndex === -1) break;
      matches.push({ lineIndex, matchIndex });
      from = matchIndex + Math.max(needle.length, 1);
    }
  });
  return matches;
}

export function highlightSearchMatches(line, query) {
  const needle = normalizeSearchQuery(query);
  const text = String(line);
  if (!needle) return escapeHtml(text);

  const lower = text.toLocaleLowerCase();
  let html = '';
  let cursor = 0;
  while (cursor < text.length) {
    const matchIndex = lower.indexOf(needle, cursor);
    if (matchIndex === -1) break;
    html += escapeHtml(text.slice(cursor, matchIndex));
    html += `<mark>${escapeHtml(text.slice(matchIndex, matchIndex + needle.length))}</mark>`;
    cursor = matchIndex + needle.length;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

export function isChapterTitle(line) {
  const title = normalizeChapterTitle(line);
  if (!title || title.length > 48) return false;
  return /^(第\s*[零〇一二三四五六七八九十百千万\d]+\s*[章节回卷集部篇]|chapter\s+\d+|序章|楔子|番外(?:\s|$)|卷\s*[零〇一二三四五六七八九十百千万\d]+|[0-9]{1,4}[.．、]\s*\S+)/i.test(title);
}

export function normalizeChapterTitle(line) {
  return String(line || '').trim().replace(/\s+/g, ' ');
}

export function normalizeSearchQuery(query) {
  return String(query || '').trim().toLocaleLowerCase();
}

export function normalizePreference(key, value) {
  if (key === 'fontSize') return clamp(Math.round(Number(value) || 21), 16, 30);
  if (key === 'lineHeight') return clamp(Math.round((Number(value) || 1.9) * 10) / 10, 1.6, 2.4);
  if (key === 'readerWidth') return clamp(Math.round(Number(value) || 850), 680, 980);
  if (key === 'autoScrollSpeed') return clamp(Math.round(Number(value)), 1, 10);
  if (key === 'fontFamily') return ['songti', 'serif', 'sans'].includes(value) ? value : 'songti';
  if (key === 'autoScroll') return Boolean(value);
  if (key === 'theme') return ['light', 'dark'].includes(value) ? value : 'light';
  return value;
}

export function decodeTextBuffer(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || []);
  const utf8Text = new TextDecoder('utf-8').decode(bytes);
  if (!looksMojibake(utf8Text)) return utf8Text;

  try {
    return new TextDecoder('gb18030').decode(bytes);
  } catch {
    return utf8Text;
  }
}

export function normalizeText(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function stripExtension(fileName) {
  return String(fileName || 'untitled').replace(/\.[^.]+$/, '') || 'untitled';
}

export function formatProgress(progress) {
  const value = clamp(Math.round(Number(progress || 0)), 0, 100);
  return value ? `${value}%` : '就绪';
}

export function formatBookCount(count) {
  return `${Math.max(0, Number(count) || 0)} 本书`;
}

export function sanitizeBookTitle(title) {
  const value = String(title || '').trim().replace(/\s+/g, ' ');
  return value || 'untitled';
}

export function sanitizeProjectLabel(label) {
  const value = String(label || '').trim().replace(/\s+/g, ' ');
  return value || 'Untitled project';
}

export function estimateLibraryBytes(books) {
  return Array.from(books || []).reduce((total, book) => total + String(book.text || '').length * 2, 0);
}

export function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function nextActiveBookIdAfterDelete(books, deletedId) {
  const remaining = Array.from(books || []).filter((book) => book.id !== deletedId);
  if (!remaining.length) return null;

  const deletedIndex = Array.from(books || []).findIndex((book) => book.id === deletedId);
  if (deletedIndex <= 0) return remaining[0].id;
  return remaining[Math.max(0, deletedIndex - 1)]?.id || remaining[0].id;
}

export function clamp(value, min, max) {
  const number = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(number, min), max);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fileSortKey(file) {
  return file.webkitRelativePath || file.name || '';
}

function looksMojibake(text) {
  if (!text) return false;
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  if (replacementCount >= 2) return true;
  return replacementCount > 0 && replacementCount / text.length > 0.002;
}
