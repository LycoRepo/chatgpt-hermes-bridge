import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateConfig,loadConfig} from '../src/config.mjs';
import {setup,clientConfigs} from '../src/setup.mjs';
import {replaceOwnedServer} from '../src/codex-config.mjs';
const example=JSON.parse(await readFile(new URL('../config/bridge.example.json',import.meta.url),'utf8'));
test('Codex registration changes only its own server table including multiline CLI args',()=>{
  const before='model = "existing"\n[mcp_servers.existing]\ncommand = "other"\n[mcp_servers.hermes_bridge]\ncommand = "node"\nargs = [\n    "launcher",\n    "chatgpt",\n]\n[mcp_servers.after]\ncommand = "after"\n';
  const table='[mcp_servers.hermes_bridge]\ncommand = "new-node"\n';
  const result=replaceOwnedServer(before,table);
  assert.ok(result.startsWith('model = "existing"\n[mcp_servers.existing]\ncommand = "other"\n'));
  assert.ok(result.endsWith('[mcp_servers.after]\ncommand = "after"\n'));
  assert.ok(!result.includes('launcher'));assert.equal((result.match(/hermes_bridge/g)||[]).length,1);
});
test('configuration refuses unsupported hosts, weakened policies and unknown settings',()=>{
  assert.equal(validateConfig(structuredClone(example)).schema_version,1);
  const invalid=[c=>c.server.host='0.0.0.0',c=>c.server.port=80,c=>c.tasks.max_hops=0,c=>c.tasks.deny_chatgpt_origin_escalation=false,c=>c.escalation.serialize_requests=false,c=>c.logging.record_payloads=true,c=>c.runtime.hermes_command='hermes',c=>c.runtime.state_directory='../shared',c=>c.server.token='not-a-real-credential',c=>c.tasks.timeout_seconds=Infinity];
  for(const change of invalid) {const config=structuredClone(example);change(config);assert.throws(()=>validateConfig(config),/invalid_config/);}
});
test('config loader never falls back from an invalid existing local file',async t=>{
  const root=await mkdtemp(join(tmpdir(),'bridge-config-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'config'));await writeFile(join(root,'config','bridge.example.json'),JSON.stringify(example));
  await writeFile(join(root,'config','bridge.local.json'),'broken');
  await assert.rejects(loadConfig(root),SyntaxError);
});
test('Windows and WSL snippets quote paths and point to the same Windows launcher',()=>{
  const configs=clientConfigs('C:\\Users\\A B\\bridge','C:\\Program Files\\nodejs\\node.exe');
  assert.ok(configs.toml.includes(JSON.stringify('C:\\Program Files\\nodejs\\node.exe')));
  assert.ok(configs.wslToml.includes('/mnt/c/Program Files/nodejs/node.exe'));
  assert.equal(configs.vscode.servers.hermes_bridge.args.at(-1),'chatgpt');
});
test('setup is repeatable and preserves user config and existing VS Code servers',{skip:process.platform!=='win32'},async t=>{
  const root=await mkdtemp(join(tmpdir(),'bridge-setup-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'config'));await mkdir(join(root,'.vscode'));
  await writeFile(join(root,'config','bridge.example.json'),JSON.stringify(example));
  const command=join(root,'hermes.exe');await writeFile(command,'fixture');
  await setup(root,{command});
  const config=await loadConfig(root);config.tasks.max_hops=2;
  const original=JSON.stringify(config);await writeFile(join(root,'config','bridge.local.json'),original);
  const vscode='{ "servers": { "existing": { "type": "stdio", "command": "existing" } } }';
  await writeFile(join(root,'.vscode','mcp.json'),vscode);
  const result=await setup(root,{command:'C:\\ignored\\hermes.exe'});
  assert.equal(result.status,'configuration_preserved');assert.equal(result.vscode,'preserved_existing');
  assert.equal(await readFile(join(root,'config','bridge.local.json'),'utf8'),original);
  assert.equal(await readFile(join(root,'.vscode','mcp.json'),'utf8'),vscode);
});
