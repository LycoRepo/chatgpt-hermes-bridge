import {mkdir, open} from 'node:fs/promises';
import {join} from 'node:path';

// One human-authorized UI check per claim file. The marker lives outside the
// executed run's workspace so that run cannot remove its own record; it survives
// process restarts, so respawning the server cannot replay the authorization.
// A failed run still consumes it. Recovery is a deliberate operator removal after review.
export async function claimUiCheck(directory, nonce) {
  await mkdir(directory, {recursive: true});
  const path = join(directory, 'ui-check-claim.json');
  let handle;
  try { handle = await open(path, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') return null; throw error; }
  try { await handle.writeFile(JSON.stringify({nonce, claimedAt: Date.now()})); }
  finally { await handle.close(); }
  return path;
}
