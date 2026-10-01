import {mkdir,readFile,open,unlink,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {loadConfig} from './config.mjs';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function serviceState(root) {
  try {
    const state=JSON.parse(await readFile(join(root,'.local','service.json'),'utf8'));
    if(!Number.isInteger(state.port)||state.port<1024||state.port>65535||typeof state.token!=='string'||state.token.length<32||typeof state.instanceId!=='string') throw new Error('invalid_service_state');
    return state;
  } catch(error) {if(error.code==='ENOENT') return null;throw error;}
}
export async function queryService(state,path='/health',method='GET') {
  const response=await fetch(`http://127.0.0.1:${state.port}${path}`,{method,headers:{Authorization:`Bearer ${state.token}`},redirect:'error',signal:AbortSignal.timeout(2000)});
  const body=await response.json();
  if(response.status===409) throw new Error('tasks_active');
  if(!response.ok||body.instanceId!==state.instanceId) throw new Error('service_identity_mismatch');
  return body;
}
async function locked(root,operation) {
  await mkdir(join(root,'.local'),{recursive:true});
  const path=join(root,'.local','lifecycle.lock');
  let handle;
  try {handle=await open(path,'wx',0o600);} catch(error) {if(error.code==='EEXIST') throw new Error('lifecycle_locked');throw error;}
  try {await handle.writeFile(JSON.stringify({pid:process.pid}));return await operation();}
  finally {await handle.close();await unlink(path);}
}
export async function startService(root) {
  if(process.platform!=='win32') throw new Error('start_on_windows');
  return locked(root,async()=>{
    const existing=await serviceState(root);
    if(existing) {await queryService(existing);return {status:'already_running',port:existing.port};}
    const config=await loadConfig(root);
    if(!config.runtime.hermes_command) throw new Error('run_setup_first');
    const override=process.env[config.server.auth_token_env];
    if(override && (override.length<32||override.length>256||/\s/.test(override))) throw new Error('invalid_auth_token');
    const state={instanceId:randomUUID(),token:override||randomBytes(32).toString('hex'),port:config.server.port};
    const path=join(root,'.local','service.json');
    await writeFile(path,JSON.stringify(state),{flag:'wx',mode:0o600});
    const child=spawn(process.execPath,[join(root,'scripts','serve.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:'ignore'});
    let exited=false;child.once('error',()=>{exited=true;});child.once('exit',()=>{exited=true;});child.unref();
    for(let i=0;i<40;i++) {
      try {await queryService(state);return {status:'running',port:state.port};}
      catch {if(exited) break;await pause(200);}
    }
    // Preserve identity metadata after failure; never kill a process by PID or steal a port.
    throw new Error('service_not_ready_check_doctor');
  });
}
export async function stopService(root) {
  return locked(root,async()=>{
    const state=await serviceState(root);if(!state) return {status:'already_stopped'};
    await queryService(state,'/stop','POST');
    for(let i=0;i<40;i++) {if(!await serviceState(root)) return {status:'stopped'};await pause(100);}
    throw new Error('service_stop_pending');
  });
}
