import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
test('real stdio MCP handshake exposes only forward-role tools and refuses invalid requests',async()=>{
  const client=new Client({name:'bridge-test',version:'1.0.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../scripts/mcp.mjs',import.meta.url)),'chatgpt'],stderr:'pipe'});
  try {
    await client.connect(transport);
    const listing=await client.listTools();
    assert.deepEqual(listing.tools.map(tool=>tool.name),['hermes_plan']);
    const invalid=await client.callTool({name:'hermes_plan',arguments:{prompt:'test',origin:'hermes'}});
    assert.equal(invalid.isError,true);
    const forbidden=await client.callTool({name:'claim_hermes_review',arguments:{}});
    assert.equal(forbidden.isError,true);
  } finally {await client.close();}
});
