import {readFile} from 'node:fs/promises';
import {join,win32} from 'node:path';
const bad=field=>{throw new Error(`invalid_config:${field}`);};
const integer=(value,min,max,key)=>{if(!Number.isInteger(value)||value<min||value>max) bad(key);};
function keys(value,allowed,key) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k))) bad(key);
  if(allowed.some(k=>!Object.hasOwn(value,k))) bad(key);
}
export function validateConfig(config) {
  keys(config,['schema_version','runtime','server','tasks','escalation','logging'],'root');
  if(config.schema_version!==1) bad('schema_version');
  keys(config.runtime,['platform','hermes_command','state_directory'],'runtime');
  if(config.runtime.platform!=='windows'||config.runtime.state_directory!=='.local') bad('runtime');
  const command=config.runtime.hermes_command;
  if(typeof command!=='string'||(command!==''&&(!win32.isAbsolute(command)||win32.basename(command).toLowerCase()!=='hermes.exe'))) bad('hermes_command');
  keys(config.server,['host','port','auth_token_env'],'server');
  if(config.server.host!=='127.0.0.1'||config.server.auth_token_env!=='BRIDGE_AUTH_TOKEN') bad('server');
  integer(config.server.port,1024,65535,'port');
  keys(config.tasks,['max_hops','timeout_seconds','lock_scope','deny_chatgpt_origin_escalation'],'tasks');
  integer(config.tasks.max_hops,1,10,'max_hops'); integer(config.tasks.timeout_seconds,1,3600,'timeout_seconds');
  if(config.tasks.lock_scope!=='store'||config.tasks.deny_chatgpt_origin_escalation!==true) bad('task_policy');
  keys(config.escalation,['enabled','project','conversation','serialize_requests','bound_session_id','claim_lease_seconds','verified_application_path'],'escalation');
  const e=config.escalation;
  if(typeof e.enabled!=='boolean'||e.serialize_requests!==true) bad('escalation_policy');
  for(const key of ['project','conversation']) if(typeof e[key]!=='string'||!e[key].trim()||e[key].length>200) bad(key);
  if(e.bound_session_id!==null&&(typeof e.bound_session_id!=='string'||!e.bound_session_id.trim()||e.bound_session_id.length>200)) bad('bound_session_id');
  integer(e.claim_lease_seconds,1,600,'claim_lease_seconds');
  if(typeof e.verified_application_path!=='string'||(e.verified_application_path!==''&&!win32.isAbsolute(e.verified_application_path))) bad('verified_application_path');
  keys(config.logging,['level','record_payloads'],'logging');
  if(!['info','warn','error'].includes(config.logging.level)||config.logging.record_payloads!==false) bad('logging');
  return config;
}
export async function loadConfig(root) {
  let text;
  try {text=await readFile(join(root,'config','bridge.local.json'),'utf8');}
  catch(error) {if(error.code!=='ENOENT') throw error; text=await readFile(join(root,'config','bridge.example.json'),'utf8');}
  return validateConfig(JSON.parse(text));
}
