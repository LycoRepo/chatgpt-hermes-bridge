import {readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from '../src/config.mjs';
import {Coordinator} from '../src/coordinator.mjs';
import {bridgeTools} from '../src/mcp-tools.mjs';
import {runHermesTask} from '../src/adapters/hermes-task.mjs';
import {serve} from '../src/service.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
try {
  const config=await loadConfig(root);
  const path=join(root,'.local','service.json');
  const state=JSON.parse(await readFile(path,'utf8'));
  const coordinator=new Coordinator({directory:join(root,'.local','coordinator'),maxHops:config.tasks.max_hops,timeoutMs:config.tasks.timeout_seconds*1000,leaseMs:config.escalation.claim_lease_seconds*1000});
  const tools=bridgeTools({role:'chatgpt',coordinator,runTask:id=>runHermesTask(coordinator,id,{command:config.runtime.hermes_command})});
  await serve({port:state.port,token:state.token,instanceId:state.instanceId,tools,onStopped:async()=>{
    const current=JSON.parse(await readFile(path,'utf8'));
    if(current.instanceId===state.instanceId) await unlink(path);
  }});
} catch {console.error('bridge_service_start_failed');process.exitCode=1;}
