import {join} from 'node:path';
import {loadConfig} from '../src/config.mjs';
import {fileURLToPath} from 'node:url';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {Coordinator} from '../src/coordinator.mjs';
import {bridgeTools} from '../src/mcp-tools.mjs';
import {runHermesTask} from '../src/adapters/hermes-task.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const config=await loadConfig(root);
// State stays under the repository's ignored .local, independent of the client's cwd.
const sessionId=config.escalation.bound_session_id;
const coordinator=new Coordinator({directory:join(root,'.local','coordinator'),maxHops:config.tasks.max_hops,timeoutMs:config.tasks.timeout_seconds*1000,leaseMs:config.escalation.claim_lease_seconds*1000,sessionId});
const command=config.runtime.hermes_command||process.env.HERMES_COMMAND||join(process.env.LOCALAPPDATA??'','hermes','bin','hermes.exe');
const role=process.argv[2];
if(role!=='chatgpt' && config.escalation.enabled!==true) throw new Error('escalation_disabled');
const tools=bridgeTools({role,coordinator,sessionId,runTask:id=>runHermesTask(coordinator,id,{command}),context:{parentId:process.env.BRIDGE_PARENT_TASK_ID,contextToken:process.env.BRIDGE_CONTEXT_TOKEN}});
const server=new Server({name:`chatgpt-hermes-${role}`,version:'0.1.0'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:tools.list()}));
server.setRequestHandler(CallToolRequestSchema,async request=>{
  try {return {content:[{type:'text',text:JSON.stringify(await tools.call(request.params.name,request.params.arguments))}]};}
  catch(error) {return {isError:true,content:[{type:'text',text:error.code??'bridge_request_failed'}]};}
});
await server.connect(new StdioServerTransport());
