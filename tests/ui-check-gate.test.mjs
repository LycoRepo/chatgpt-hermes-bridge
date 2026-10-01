import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {claimUiCheck} from '../src/adapters/ui-check-gate.mjs';
test('UI check claim is consumed exactly once across processes and restarts', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'bridge-ui-gate-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  assert.ok(await claimUiCheck(directory, 'UI_DRIVER_FIRST'));
  assert.equal(await claimUiCheck(directory, 'UI_DRIVER_REPLAY'), null);
  const record = JSON.parse(await readFile(join(directory, 'ui-check-claim.json'), 'utf8'));
  assert.equal(record.nonce, 'UI_DRIVER_FIRST');
});
test('claim refuses a second run even from a fresh claim directory race', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'bridge-ui-gate-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const results = await Promise.all([claimUiCheck(directory, 'A'), claimUiCheck(directory, 'B')]);
  assert.equal(results.filter(Boolean).length, 1);
});
