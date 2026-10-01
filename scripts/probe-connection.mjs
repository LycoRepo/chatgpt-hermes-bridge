import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {serviceState,queryService} from '../src/lifecycle.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const client=new Client({name:'bridge-connection-probe',version:'1'});
try {
  const mode=process.argv[2]??'stdio';
  let transport;
  if(mode==='stdio') transport=new StdioClientTransport({command:process.execPath,args:[join(root,'scripts','mcp.mjs'),'chatgpt'],stderr:'pipe'});
  else if(mode==='http') {
    const state=await serviceState(root);if(!state) throw new Error('start_service_first');
    await queryService(state);
    transport=new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${state.port}/mcp`),{requestInit:{headers:{Authorization:`Bearer ${state.token}`}}});
  } else throw new Error('invalid_probe_mode');
  await client.connect(transport);
  const tools=await client.listTools();
  if(JSON.stringify(tools.tools.map(t=>t.name))!==JSON.stringify(['hermes_plan'])) throw new Error('unexpected_tools');
  const response=await client.callTool({name:'hermes_plan',arguments:{prompt:'Connectivity test only. Do not use tools, inspect files, send messages, or change anything. Reply exactly BRIDGE_TRANSPORT_OK.'}},undefined,{timeout:90000});
  const result=JSON.parse(response.content[0].text);
  const markerReceived=result.response?.includes('BRIDGE_TRANSPORT_OK')??false;
  const report={transport:mode,ok:response.isError!==true&&result.status==='completed'&&markerReceived,markerReceived,uiOperations:0};
  console.log(JSON.stringify(report,null,2));if(!report.ok) process.exitCode=1;
} catch {console.error('bridge_connection_probe_failed');process.exitCode=1;}
finally {await client.close();}
