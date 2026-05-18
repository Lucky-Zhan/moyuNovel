import assert from 'node:assert/strict';
import { DEFAULT_WINDOW_STATE, mergeWindowState, normalizeWindowState } from '../electron/window-state.mjs';

{
  assert.deepEqual(normalizeWindowState(null), DEFAULT_WINDOW_STATE);
  assert.deepEqual(normalizeWindowState({ width: 100, height: 100, x: 'bad', y: 10 }), DEFAULT_WINDOW_STATE);
}

{
  assert.deepEqual(
    normalizeWindowState({ width: 1200, height: 720, x: 80, y: 40, isMaximized: false }),
    { width: 1200, height: 720, x: 80, y: 40, isMaximized: false },
  );
}

{
  assert.deepEqual(
    mergeWindowState(DEFAULT_WINDOW_STATE, { width: 1100, height: 700, x: 20, y: 30 }, true),
    { width: 1100, height: 700, x: 20, y: 30, isMaximized: true },
  );
}

console.log('window state tests passed');
