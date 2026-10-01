import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(readFileSync(new URL('../components.lock.json', import.meta.url)));
let failed = false;
for (const component of lock.components) {
  try {
    const head = execFileSync('git', ['-C', component.path, 'rev-parse', 'HEAD'], {cwd:root,encoding:'utf8'}).trim();
    const index = execFileSync('git', ['ls-files', '--stage', '--', component.path], {cwd:root,encoding:'utf8'}).trim();
    if (head !== component.revision || !index.startsWith(`160000 ${component.revision} 0\t`)) {
      throw new Error('checkout or gitlink differs from components.lock.json');
    }
    const status = execFileSync('git', ['-C', component.path, 'status', '--porcelain'], {cwd:root,encoding:'utf8'}).trim();
    if (status) throw new Error('component checkout contains uncommitted changes');
    console.log(`OK ${component.name}: ${head}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${component.name}: ${error.message}`);
  }
}
process.exitCode = failed ? 1 : 0;
