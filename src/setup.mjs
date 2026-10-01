import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {join,win32} from 'node:path';
import {loadConfig,validateConfig} from './config.mjs';
export function clientConfigs(root,nodePath,timeout=600) {
  const launcher=join(root,'scripts','mcp.mjs');
  const toml=`[mcp_servers.hermes_bridge]\ncommand = ${JSON.stringify(nodePath)}\nargs = ${JSON.stringify([launcher,'chatgpt'])}\nstartup_timeout_sec = 20\ntool_timeout_sec = ${timeout+15}\nenabled_tools = ["hermes_plan"]\n`;
  // WSL launches Windows Node via its mounted executable; script argv remains a Windows path.
  const mount=value=>{
    if(!/^[A-Za-z]:[\\/]/.test(value)) throw new Error('windows_drive_path_required');
    return `/mnt/${value[0].toLowerCase()}/${value.slice(3).replaceAll('\\','/')}`;
  };
  const wslToml=toml.replace(JSON.stringify(nodePath),JSON.stringify(mount(nodePath)));
  return {toml,wslToml,vscode:{servers:{hermes_bridge:{type:'stdio',command:nodePath,args:[launcher,'chatgpt']}}}};
}
async function preserveWrite(path,data) {
  try {await writeFile(path,data,{flag:'wx',mode:0o600});return 'created';}
  catch(error) {
    if(error.code!=='EEXIST') throw error;
    if(await readFile(path,'utf8')!==data) return 'preserved_existing';
    return 'unchanged';
  }
}
export async function setup(root,{command,nodePath=process.execPath,platform=process.platform}={}) {
  if(platform!=='win32') throw new Error('setup_on_windows');
  await mkdir(join(root,'config'),{recursive:true});
  let existing=false;
  try {await access(join(root,'config','bridge.local.json'));existing=true;} catch(error) {if(error.code!=='ENOENT') throw error;}
  let config=await loadConfig(root);
  if(!existing) {
    command=command||process.env.HERMES_COMMAND||win32.join(process.env.LOCALAPPDATA??'','hermes','bin','hermes.exe');
    if(!command) throw new Error('hermes_command_required');
    config=structuredClone(config);config.runtime.hermes_command=command;validateConfig(config);
    await access(command);
    await preserveWrite(join(root,'config','bridge.local.json'),JSON.stringify(config,null,2)+'\n');
  }
  // Never overwrite existing real configuration, bindings, or credentials.
  config=await loadConfig(root);
  const clients=clientConfigs(root,nodePath,config.tasks.timeout_seconds);
  const generated=join(root,'.local','clients');await mkdir(generated,{recursive:true});
  await writeFile(join(generated,'codex-windows.toml'),clients.toml,{mode:0o600});
  await writeFile(join(generated,'codex-wsl.toml'),clients.wslToml,{mode:0o600});
  await writeFile(join(generated,'vscode-mcp.json'),JSON.stringify(clients.vscode,null,2)+'\n',{mode:0o600});
  await mkdir(join(root,'.vscode'),{recursive:true});
  const vscode=await preserveWrite(join(root,'.vscode','mcp.json'),JSON.stringify(clients.vscode,null,2)+'\n');
  return {status:existing?'configuration_preserved':'configured',vscode,generatedClients:3,escalationEnabled:config.escalation.enabled};
}
