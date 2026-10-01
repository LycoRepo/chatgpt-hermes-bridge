import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
const client=new Client({name:'human-authorized-hermes-check',version:'1'});
try {
  await client.connect(new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('./ui-check-mcp.mjs',import.meta.url)),'--human-authorized'],stderr:'pipe'}));
  const result=await client.callTool({name:'hermes_check_ui_driver',arguments:{}},undefined,{timeout:620000});
  const task=JSON.parse(result.content[0].text);
  await mkdir(new URL('../.local/reports/',import.meta.url),{recursive:true});
  await writeFile(new URL('../.local/reports/hermes-ui-check-response.json',import.meta.url),JSON.stringify(task,null,2),{mode:0o600});
  console.log(JSON.stringify({id:task.id,status:task.status,response:task.response},null,2));
} finally {await client.close().catch(()=>{});}
