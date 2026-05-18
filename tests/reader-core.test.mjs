import assert from 'node:assert/strict';
import {
  calculateProgress,
  createBookRecord,
  decodeTextBuffer,
  estimateLibraryBytes,
  extractChapters,
  filterTextFiles,
  findMatches,
  formatBookCount,
  formatBytes,
  formatProgress,
  highlightSearchMatches,
  isChapterTitle,
  mergeBookRecord,
  nextActiveBookIdAfterDelete,
  prepareReadingText,
  normalizePreference,
  sanitizeBookTitle,
  sanitizeProjectLabel,
} from '../src/core.js';

{
  const record = await createBookRecord({
    name: '长夜.txt',
    size: 1024,
    text: '第一章\n这里是正文。\n第二段',
    now: 1000,
  });

  assert.equal(record.title, '长夜');
  assert.equal(record.fileName, '长夜.txt');
  assert.equal(record.text, '第一章\n这里是正文。\n第二段');
  assert.equal(record.scrollTop, 0);
  assert.equal(record.progress, 0);
  assert.equal(record.createdAt, 1000);
  assert.equal(record.lastReadAt, 1000);
  assert.match(record.id, /^book-/);
}

{
  const files = [
    { name: 'b.TXT', webkitRelativePath: 'books/b.TXT' },
    { name: 'cover.png' },
    { name: 'a.txt', webkitRelativePath: 'books/a.txt' },
    { name: 'notes.md' },
  ];

  assert.equal(JSON.stringify(filterTextFiles(files).map((file) => file.name)), JSON.stringify(['a.txt', 'b.TXT']));
}

{
  const existing = {
    id: 'book-1',
    title: '旧标题',
    fileName: 'old.txt',
    text: '旧内容',
    scrollTop: 320,
    progress: 42,
    createdAt: 100,
    lastReadAt: 200,
  };
  const incoming = {
    id: 'book-1',
    title: '新标题',
    fileName: 'new.txt',
    text: '新内容',
    scrollTop: 0,
    progress: 0,
    createdAt: 900,
    lastReadAt: 900,
  };
  const merged = mergeBookRecord(existing, incoming, 1000);

  assert.equal(merged.title, '新标题');
  assert.equal(merged.text, '新内容');
  assert.equal(merged.scrollTop, 320);
  assert.equal(merged.progress, 42);
  assert.equal(merged.createdAt, 100);
  assert.equal(merged.lastReadAt, 1000);
}

{
  const utf8 = new TextEncoder().encode('第一章\nUTF-8 正文');
  assert.equal(decodeTextBuffer(utf8.buffer), '第一章\nUTF-8 正文');
}

{
  const gb18030 = new Uint8Array([0xb5, 0xda, 0xd2, 0xbb, 0xd5, 0xc2, 0x0a, 0xd5, 0xfd, 0xce, 0xc4]);
  assert.equal(decodeTextBuffer(gb18030.buffer), '第一章\n正文');
}

{
  const chapters = extractChapters([
    '序',
    '',
    '第一章 风起',
    '正文',
    '第 2 章 雨落',
    '正文',
    'Chapter 3 Return',
  ]);

  assert.equal(JSON.stringify(chapters), JSON.stringify([
    { title: '第一章 风起', index: 2 },
    { title: '第 2 章 雨落', index: 4 },
    { title: 'Chapter 3 Return', index: 6 },
  ]));
}

{
  assert.equal(isChapterTitle('序章'), true);
  assert.equal(isChapterTitle('楔子'), true);
  assert.equal(isChapterTitle('番外 雨夜'), true);
  assert.equal(isChapterTitle('卷一 风起'), true);
  assert.equal(isChapterTitle('1. 开始'), true);
  assert.equal(isChapterTitle('第十二回 旧梦重来'), true);
  assert.equal(isChapterTitle('正文里提到第一章并不是标题'), false);
  assert.equal(isChapterTitle('这是很长很长的一行正文，不应该被识别成章节标题，因为它明显超过了普通章节标题的长度限制。'), false);
}

{
  const compact = '第一章 开始\n这是第一句。这是第二句！这是第三句？';
  assert.equal(
    prepareReadingText(compact),
    '第一章 开始\n\n这是第一句。\n\n这是第二句！\n\n这是第三句？',
  );

  const alreadySpaced = '第一段。\n\n第二段。';
  assert.equal(prepareReadingText(alreadySpaced), alreadySpaced);
}

{
  const matches = findMatches(['风起风落', '没有命中', '风继续吹'], '风');
  assert.equal(JSON.stringify(matches), JSON.stringify([
    { lineIndex: 0, matchIndex: 0 },
    { lineIndex: 0, matchIndex: 2 },
    { lineIndex: 2, matchIndex: 0 },
  ]));
}

{
  assert.equal(highlightSearchMatches('风起 <风落>', '风'), '<mark>风</mark>起 &lt;<mark>风</mark>落&gt;');
  assert.equal(highlightSearchMatches('没有关键词', ''), '没有关键词');
}

{
  assert.equal(formatBookCount(0), '0 本书');
  assert.equal(formatBookCount(1), '1 本书');
  assert.equal(formatBookCount(3), '3 本书');
  assert.equal(formatProgress(0), '就绪');
  assert.equal(formatProgress(42), '42%');
  assert.equal(normalizePreference('fontSize', 12), 16);
  assert.equal(normalizePreference('fontSize', 40), 30);
  assert.equal(normalizePreference('lineHeight', 1.2), 1.6);
  assert.equal(normalizePreference('lineHeight', 2.8), 2.4);
  assert.equal(normalizePreference('readerWidth', 500), 680);
  assert.equal(normalizePreference('readerWidth', 1200), 980);
  assert.equal(normalizePreference('autoScrollSpeed', 0), 1);
  assert.equal(normalizePreference('autoScrollSpeed', 12), 10);
  assert.equal(normalizePreference('autoScrollSpeed', 4), 4);
  assert.equal(normalizePreference('fontFamily', 'serif'), 'serif');
  assert.equal(normalizePreference('fontFamily', 'weird'), 'songti');
  assert.equal(normalizePreference('theme', 'dark'), 'dark');
  assert.equal(normalizePreference('theme', 'neon'), 'light');
}

{
  assert.equal(sanitizeBookTitle('  新 标题  '), '新 标题');
  assert.equal(sanitizeBookTitle(''), 'untitled');
  assert.equal(sanitizeBookTitle('   '), 'untitled');
  assert.equal(sanitizeProjectLabel('  查看moyuNovel项目  '), '查看moyuNovel项目');
  assert.equal(sanitizeProjectLabel(''), 'Untitled project');
}

{
  const books = [
    { id: 'a', text: '一二三' },
    { id: 'b', text: 'abcd' },
  ];
  assert.equal(estimateLibraryBytes(books), 14);
  assert.equal(formatBytes(14), '14 B');
  assert.equal(formatBytes(2048), '2.0 KB');
}

{
  const books = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(nextActiveBookIdAfterDelete(books, 'b'), 'a');
  assert.equal(nextActiveBookIdAfterDelete(books, 'a'), 'b');
  assert.equal(nextActiveBookIdAfterDelete([{ id: 'a' }], 'a'), null);
}

{
  assert.equal(calculateProgress({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 }), 0);
  assert.equal(calculateProgress({ scrollTop: 250, scrollHeight: 1000, clientHeight: 500 }), 50);
  assert.equal(calculateProgress({ scrollTop: 700, scrollHeight: 1000, clientHeight: 500 }), 100);
  assert.equal(calculateProgress({ scrollTop: 0, scrollHeight: 400, clientHeight: 500 }), 100);
}

console.log('reader core tests passed');
