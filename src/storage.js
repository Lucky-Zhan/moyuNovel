export const DB_NAME = 'moyu-novel-reader';
export const DB_VERSION = 1;
export const BOOK_STORE = 'books';
export const UI_KEY = 'codex-novel-reader:ui:v6';
export const PROJECTS_KEY = 'codex-novel-reader:projects:v3';
export const COMPOSER_KEY = 'codex-novel-reader:composer:v1';

export async function openLibrary() {
  if (!('indexedDB' in window)) throw new Error('IndexedDB unavailable');

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const store = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
        store.createIndex('lastReadAt', 'lastReadAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getAllBooks(db, fallbackBooks = []) {
  if (!db) return Promise.resolve(fallbackBooks);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, 'readonly');
    const request = tx.objectStore(BOOK_STORE).getAll();
    request.onsuccess = () => {
      resolve(request.result.sort((a, b) => Number(b.lastReadAt || 0) - Number(a.lastReadAt || 0)));
    };
    request.onerror = () => reject(request.error);
  });
}

export function getBook(db, id, fallbackBooks = []) {
  if (!db) return Promise.resolve(fallbackBooks.find((book) => book.id === id) || null);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, 'readonly');
    const request = tx.objectStore(BOOK_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export function putBook(db, book, onFallback) {
  if (!db) {
    onFallback?.(book);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, 'readwrite');
    tx.objectStore(BOOK_STORE).put(book);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function deleteBook(db, id, onFallback) {
  if (!db) {
    onFallback?.(id);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, 'readwrite');
    tx.objectStore(BOOK_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function clearBooks(db, onFallback) {
  if (!db) {
    onFallback?.();
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, 'readwrite');
    tx.objectStore(BOOK_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
