import assert from 'node:assert/strict';
import { buildWindowOptions, isSupportedShellCommand } from '../electron/options.mjs';

{
  const options = buildWindowOptions('/tmp/preload.js', { width: 1200, height: 700, x: 50, y: 30 });
  assert.equal(options.width, 1200);
  assert.equal(options.height, 700);
  assert.equal(options.x, 50);
  assert.equal(options.y, 30);
  assert.equal(options.minWidth, 900);
  assert.equal(options.title, 'moyuNovel');
  assert.equal(options.webPreferences.preload, '/tmp/preload.js');
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
}

{
  assert.equal(isSupportedShellCommand('import-file'), true);
  assert.equal(isSupportedShellCommand('import-folder'), true);
  assert.equal(isSupportedShellCommand('reset-window'), true);
  assert.equal(isSupportedShellCommand('clear-library'), true);
  assert.equal(isSupportedShellCommand('reset-preferences'), true);
  assert.equal(isSupportedShellCommand('open-data-folder'), true);
  assert.equal(isSupportedShellCommand('unknown'), false);
}

console.log('electron options tests passed');
