import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';

export async function serve({port,token,instanceId,tools,onStopped=()=>{}}) {
  if(typeof token!=='string'||token.length<32) throw new Error('invalid_service_token');
  let active=0,jobs=0,stopping=false;
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const http=createServer(async (req,res)=>{
    const auth=req.headers.authorization??'';
    const expected=`Bearer ${token}`;
    const authorized=Buffer.byteLength(auth)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(auth),Buffer.from(expected));
    // No browser origins, redirects, CORS or non-loopback hostnames.
    if(req.headers.origin||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.headers.host!==`127.0.0.1:${http.address().port}`) return json(res,403,{error:'forbidden_origin'});
    if(!authorized) return json(res,401,{error:'unauthorized'});
    if(req.url==='/health'&&req.method==='GET') return json(res,200,{instanceId,active,jobs,stopping});
    if(req.url==='/stop'&&req.method==='POST') {
      if(active||jobs) return json(res,409,{error:'tasks_active'});
      stopping=true; json(res,200,{instanceId,status:'stopping'});
      http.close(async()=>{await onStopped();}); http.closeIdleConnections(); return;
    }
    if(req.url!=='/mcp') return json(res,404,{error:'not_found'});
    if(stopping) return json(res,503,{error:'stopping'});
    if(req.method!=='POST') return json(res,405,{error:'post_required'});
    if(active>=4||jobs>=4) return json(res,429,{error:'service_busy'});
    if(!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{error:'json_required'});
    active++;
    let server;
    try {
      const chunks=[];let size=0;
      for await(const chunk of req) {
        size+=chunk.length;
        if(size>131072) {json(res,413,{error:'request_too_large'}); return;}
        chunks.push(chunk);
      }
      const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(Array.isArray(parsed)) {json(res,400,{error:'batch_not_supported'});return;}
      server=new Server({name:'chatgpt-hermes-local',version:'0.1.0'},{capabilities:{tools:{}}});
      server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:tools.list()}));
      server.setRequestHandler(CallToolRequestSchema,async request=>{
        jobs++;
        try {return {content:[{type:'text',text:JSON.stringify(await tools.call(request.params.name,request.params.arguments))}]};}
        catch(error) {return {isError:true,content:[{type:'text',text:error.code??'bridge_request_failed'}]};}
        finally {jobs--;}
      });
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      await server.connect(transport);
      await transport.handleRequest(req,res,parsed);
    } catch {if(!res.headersSent) json(res,400,{error:'invalid_request'});}
    finally {await server?.close().catch(()=>{});active--;}
  });
  http.requestTimeout=15000; http.headersTimeout=10000;
  await new Promise((resolve,reject)=>{http.once('error',reject);http.listen(port,'127.0.0.1',resolve);});
  return {port:http.address().port,close:()=>new Promise(resolve=>{http.close(resolve);http.closeIdleConnections();})};
}
