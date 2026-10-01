import {spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,rename,mkdir,copyFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {loadConfig} from '../src/config.mjs';
import {clientConfigs} from '../src/setup.mjs';
import {replaceOwnedServer} from '../src/codex-config.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const cli=(args)=>spawnSync('codex.exe',args,{encoding:'utf8',windowsHide:true,timeout:20000});
try {
  if(process.platform!=='win32') throw new Error('connect_on_windows');
  const config=await loadConfig(root);
  const launcher=join(root,'scripts','mcp.mjs');
  const existing=cli(['mcp','get','hermes_bridge','--json']);
  let existed=false;
  if(existing.status===0) {
    existed=true;
    const value=JSON.parse(existing.stdout);
    if(value.transport?.command!==process.execPath||JSON.stringify(value.transport?.args)!==JSON.stringify([launcher,'chatgpt'])) throw new Error('existing_server_conflict');
  } else if(!/No MCP server named|not found/i.test(existing.stderr??'')) throw new Error('codex_configuration_unavailable');
  const codexDirectory=process.env.CODEX_HOME||join(homedir(),'.codex');
  const configPath=join(codexDirectory,'config.toml');
  const backup=join(root,'.local','backups');await mkdir(backup,{recursive:true});
  try {await copyFile(configPath,join(backup,`codex-${randomUUID()}.toml`));}
  catch(error) {if(error.code!=='ENOENT') throw error;}
  if(!existed) {
    const result=cli(['mcp','add','hermes_bridge','--',process.execPath,launcher,'chatgpt']);
    if(result.status!==0) throw new Error('codex_registration_failed');
  }
  const before=await readFile(configPath,'utf8');
  const after=replaceOwnedServer(before,clientConfigs(root,process.execPath,config.tasks.timeout_seconds).toml);
  const temporary=join(codexDirectory,`bridge-${randomUUID()}.tmp`);
  await writeFile(temporary,after,{mode:0o600,flag:'wx'});
  if(await readFile(configPath,'utf8')!==before) throw new Error('concurrent_configuration_change');
  await rename(temporary,configPath);
  const verified=cli(['mcp','get','hermes_bridge','--json']);
  if(verified.status!==0) throw new Error('codex_registration_verification_failed');
  const entry=JSON.parse(verified.stdout);
  if(entry.transport?.command!==process.execPath||entry.tool_timeout_sec!==config.tasks.timeout_seconds+15) throw new Error('codex_registration_verification_failed');
  console.log(JSON.stringify({status:existed?'registered_configuration_refreshed':'registered',server:'hermes_bridge',transport:'stdio',applicationReloadRequired:true},null,2));
} catch(error) {console.error(['existing_server_conflict','concurrent_configuration_change','codex_configuration_unavailable'].includes(error.message)?error.message:'codex_registration_failed');process.exitCode=1;}
