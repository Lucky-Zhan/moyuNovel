import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_WINDOW_STATE = {
  width: 1365,
  height: 768,
  x: undefined,
  y: undefined,
  isMaximized: false,
};

export function normalizeWindowState(value) {
  if (!value || typeof value !== 'object') return { ...DEFAULT_WINDOW_STATE };

  const width = Math.round(Number(value.width));
  const height = Math.round(Number(value.height));
  const x = value.x === undefined ? undefined : Math.round(Number(value.x));
  const y = value.y === undefined ? undefined : Math.round(Number(value.y));

  if (width < 900 || height < 620) return { ...DEFAULT_WINDOW_STATE };
  if ((value.x !== undefined && !Number.isFinite(x)) || (value.y !== undefined && !Number.isFinite(y))) return { ...DEFAULT_WINDOW_STATE };

  return {
    width,
    height,
    x,
    y,
    isMaximized: Boolean(value.isMaximized),
  };
}

export function mergeWindowState(previous, bounds, isMaximized = false) {
  return normalizeWindowState({
    ...previous,
    ...bounds,
    isMaximized,
  });
}

export function windowStatePath(userDataPath) {
  return path.join(userDataPath, 'window-state.json');
}

export async function readWindowState(userDataPath) {
  try {
    const raw = await fs.readFile(windowStatePath(userDataPath), 'utf8');
    return normalizeWindowState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_WINDOW_STATE };
  }
}

export async function writeWindowState(userDataPath, state) {
  await fs.mkdir(userDataPath, { recursive: true });
  await fs.writeFile(windowStatePath(userDataPath), `${JSON.stringify(normalizeWindowState(state), null, 2)}\n`);
}
