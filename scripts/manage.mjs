import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readFile,access,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {setup} from '../src/setup.mjs';
import {loadConfig} from '../src/config.mjs';
import {startService,stopService,serviceState,queryService} from '../src/lifecycle.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
function run(command,args,cwd=root) {
  const result=spawnSync(command,args,{cwd,stdio:'inherit',windowsHide:true,shell:false});
  if(result.error||result.status!==0) throw new Error('installation_step_failed');
}
async function install() {
  if(process.platform!=='win32') throw new Error('install_on_windows');
  run('git',['submodule','update','--init','--recursive']);
  run(process.execPath,[join(root,'scripts','check-components.mjs')]);
  const npm=process.env.npm_execpath;
  if(!npm) throw new Error('run_npm_run_setup');
  run(process.execPath,[npm,'ci','--ignore-scripts']);
  run(process.execPath,[npm,'ci','--ignore-scripts'],join(root,'components','hermes-action-bridge'));
  run(process.execPath,[npm,'run','build'],join(root,'components','hermes-action-bridge'));
  run('git',['config','--local','core.hooksPath','.githooks']);
  return setup(root);
}
async function doctor() {
  const checks=[];
  const check=async(name,operation)=>{try {checks.push({name,status:'pass',...await operation()});}catch {checks.push({name,status:'fail'});}};
  await check('windows_runtime',async()=>{if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<20) throw new Error();return {};});
  await check('configuration',async()=>{const config=await loadConfig(root);await access(config.runtime.hermes_command);return {escalationEnabled:config.escalation.enabled};});
  await check('pinned_components',async()=>{
    const result=spawnSync(process.execPath,[join(root,'scripts','check-components.mjs')],{cwd:root,encoding:'utf8',windowsHide:true});
    if(result.status!==0) throw new Error();return {};
  });
  await check('action_build',async()=>{await access(join(root,'components','hermes-action-bridge','dist','adapters','hermes-cli.js'));await access(join(root,'node_modules','@modelcontextprotocol','sdk','dist','esm','server','index.js'));return {};});
  await check('hermes_version',async()=>{
    const config=await loadConfig(root);
    const result=spawnSync(config.runtime.hermes_command,['--version'],{encoding:'utf8',windowsHide:true,timeout:10000});
    if(result.status!==0) throw new Error();return {}; // Don't copy arbitrary runtime output into logs.
  });
  await check('managed_service',async()=>{
    const state=await serviceState(root);if(!state) return {status:'stopped'};
    const status=await queryService(state);return {active:status.active,jobs:status.jobs};
  });
  await check('task_store',async()=>{
    let state;
    try {state=JSON.parse(await readFile(join(root,'.local','coordinator','tasks.json'),'utf8'));}
    catch(error) {if(error.code==='ENOENT') return {taskCount:0};throw error;}
    if(state.version!==1||!state.tasks||typeof state.tasks!=='object'||Array.isArray(state.tasks)) throw new Error();
    return {taskCount:Object.keys(state.tasks).length};
  });
  for(const name of ['lifecycle','coordinator']) {
    const lock=join(root,'.local',name==='coordinator'?'coordinator':'',`${name}.lock`);
    try {await access(lock);checks.push({name:`${name}_lock`,status:'present',note:'Do not remove while an owner may be writing.'});}
    catch(error) {if(error.code!=='ENOENT') throw error;}
  }
  checks.push({name:'dedicated_chatgpt_session',status:'pending',note:'Real session binding/consumer/wakeup not verified; UI remains disabled.'});
  const report={ok:!checks.some(check=>check.status==='fail'),checks,uiOperations:0};
  await mkdir(join(root,'.local','reports'),{recursive:true});
  await writeFile(join(root,'.local','reports','doctor.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  return report;
}
try {
  const action=process.argv[2];
  const actions={install,config:()=>setup(root),start:()=>startService(root),stop:()=>stopService(root),doctor};
  if(!Object.hasOwn(actions,action)) throw new Error('use_install_config_start_stop_doctor');
  const result=await actions[action]();console.log(JSON.stringify(result,null,2));
  if(result.ok===false) process.exitCode=1;
} catch(error) {console.error(error.message.startsWith('invalid_config:')?error.message:(['start_on_windows','setup_on_windows','install_on_windows','lifecycle_locked','tasks_active','service_not_ready_check_doctor','service_identity_mismatch','run_setup_first'].includes(error.message)?error.message:'bridge_management_failed_check_doctor'));process.exitCode=1;}
