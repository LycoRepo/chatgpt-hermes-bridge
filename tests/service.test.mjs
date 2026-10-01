import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {request} from 'node:http';
import {serve} from '../src/service.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
test('HTTP rejects unauthenticated, browser-origin, malformed and oversized requests',async()=>{
  const token=randomBytes(32).toString('hex');
  const service=await serve({port:0,token,instanceId:randomUUID(),tools:{list:()=>[],call:()=>null}});
  const url=`http://127.0.0.1:${service.port}`;
  try {
    assert.equal((await fetch(url+'/health')).status,401);
    const headers={Authorization:`Bearer ${token}`};
    assert.equal((await fetch(url+'/health',{headers:{...headers,Origin:'https://example.com'}})).status,403);
    const forgedHost=await new Promise((resolve,reject)=>{
      const req=request(url+'/health',{headers:{...headers,Host:`evil.test:${service.port}`}},res=>{res.resume();resolve(res.statusCode);});req.once('error',reject);req.end();
    });
    assert.equal(forgedHost,403);
    assert.equal((await fetch(url+'/mcp',{headers})).status,405);
    assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'invalid'})).status,400);
    assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'x'.repeat(131073)})).status,413);
  } finally {await service.close();}
});
test('HTTP MCP handshake and stop refuse to interrupt an active tool',async()=>{
  const token=randomBytes(32).toString('hex'),instanceId=randomUUID();
  let release,entered;
  const ready=new Promise(resolve=>{entered=resolve;});
  const waiting=new Promise(resolve=>{release=resolve;});
  let stopped;const done=new Promise(resolve=>{stopped=resolve;});
  const service=await serve({port:0,token,instanceId,tools:{list:()=>[{name:'fixture',description:'test',inputSchema:{type:'object'}}],call:async()=>{entered();await waiting;return {ok:true};}},onStopped:stopped});
  const url=`http://127.0.0.1:${service.port}`,headers={Authorization:`Bearer ${token}`};
  const client=new Client({name:'lifecycle-test',version:'1'});
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(url+'/mcp'),{requestInit:{headers}}));
    assert.equal((await client.listTools()).tools[0].name,'fixture');
    const pending=client.callTool({name:'fixture',arguments:{}});await ready;
    assert.equal((await fetch(url+'/stop',{method:'POST',headers})).status,409);
    release();assert.ok((await pending).content[0].text.includes('true'));
    await client.close();
    const response=await fetch(url+'/stop',{method:'POST',headers});assert.equal(response.status,200);
    await done;
  } finally {release();await client.close();await service.close();}
});
