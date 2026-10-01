import {randomUUID, randomBytes, timingSafeEqual} from 'node:crypto';
import {mkdir, open, readFile, rename, unlink, appendFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';

const active = new Set(['queued', 'running', 'waiting']);
const secret = () => randomBytes(32).toString('hex');
const equal = (a,b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export class BridgeError extends Error {
  constructor(code) { super(code); this.code=code; }
}
const fail = code => { throw new BridgeError(code); };
function content(value) {
  if(typeof value !== 'string' || !value.trim() || Buffer.byteLength(value)>65536) fail('invalid_content');
  return value;
}
function positive(value) { if(!Number.isSafeInteger(value)||value<1) fail('invalid_policy'); return value; }

// Trusted local service API. Do not expose root creation/binding to untrusted MCP callers.
// An exclusive file handle serializes all task transitions across processes.
export class Coordinator {
  constructor({directory, maxHops=1, timeoutMs=600000, leaseMs=60000, sessionId=null, now=Date.now}) {
    this.directory=resolve(directory); this.maxHops=positive(maxHops);
    this.timeoutMs=positive(timeoutMs); this.leaseMs=positive(leaseMs);
    this.sessionId=sessionId; this.now=now;
  }
  async transaction(operation) {
    await mkdir(this.directory,{recursive:true});
    const lock=join(this.directory,'coordinator.lock');
    let handle;
    for(let attempt=0;attempt<100;attempt++) {
      try { handle=await retryFs(()=>open(lock,'wx',0o600)); break; }
      catch(error) {
        if(error.code!=='EEXIST') throw error;
        if(attempt===99) fail('store_locked');
        await new Promise(r=>setTimeout(r,20));
      }
    }
    let temporary;
    try {
      await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:this.now()}));
      let state;
      try { state=JSON.parse(await retryFs(()=>readFile(join(this.directory,'tasks.json'),'utf8'))); }
      catch(error) { if(error.code!=='ENOENT') throw error; state={version:1,tasks:{}}; }
      if(state.version!==1 || !state.tasks || typeof state.tasks!=='object') fail('invalid_store');
      const events=[];
      for(const task of Object.values(state.tasks)) {
        if(active.has(task.status)&&(task.deadline<=this.now() || (task.kind==='escalation' && task.status==='running' && task.leaseDeadline<=this.now()))) {
          task.status='timed_out'; delete task.contextToken; delete task.claimToken;
          events.push({event:'timed_out',taskId:task.id});
          const parent=state.tasks[task.parentId];
          if(parent && parent.status==='waiting') {
            parent.status='failed'; delete parent.contextToken;
            events.push({event:'failed',taskId:parent.id});
          }
        }
      }
      // Expected policy refusals still persist expiration transitions.
      let result, failure;
      try {result=await operation(state,events);} catch(error) {failure=error;}
      temporary=join(this.directory,`${randomUUID()}.tmp`);
      await requireWrite(temporary,JSON.stringify(state),0o600);
      await retryFs(()=>rename(temporary,join(this.directory,'tasks.json'))); temporary=null;
      for(const event of events) await appendFile(join(this.directory,'events.jsonl'),JSON.stringify({at:this.now(),...event})+'\n',{mode:0o600});
      if(failure) throw failure;
      return result;
    } finally {
      if(temporary) await unlink(temporary).catch(()=>{});
      await handle.close(); await retryFs(()=>unlink(lock));
    }
  }
  makeTask(state,events,{origin,kind,prompt,parentId=null,hops=0,deadline=this.now()+this.timeoutMs}) {
    const id=randomUUID();
    const task={id,origin,kind,prompt,parentId,hops,deadline,createdAt:this.now(),status:'queued'};
    state.tasks[id]=task; events.push({event:'queued',taskId:id,kind,origin,hops});
    return {id,status:task.status};
  }
  // These two entry points are for the trusted operator/forward transport only.
  async submitChatGPT(prompt) {
    content(prompt);
    return this.transaction((state,events)=>this.makeTask(state,events,{origin:'chatgpt',kind:'hermes',prompt,hops:1}));
  }
  async submitHermes(prompt) {
    content(prompt);
    return this.transaction((state,events)=>this.makeTask(state,events,{origin:'hermes',kind:'hermes',prompt}));
  }
  start(id) {
    return this.transaction((state,events)=>{
      const task=state.tasks[id]; if(!task || task.kind!=='hermes' || task.status!=='queued') fail('task_not_queued');
      task.status='running'; task.contextToken=secret();
      events.push({event:'started',taskId:id});
      return structuredClone(task);
    });
  }
  async requestEscalation({parentId,contextToken,prompt}) {
    content(prompt);
    return this.transaction((state,events)=>{
      const parent=state.tasks[parentId];
      if(!parent||parent.status!=='running'||!equal(parent.contextToken,contextToken)) fail('invalid_context');
      if(parent.origin==='chatgpt') fail('recursive_escalation_denied');
      if(parent.hops+1>this.maxHops) fail('max_hops_exceeded');
      if(Object.values(state.tasks).some(t=>t.parentId===parentId&&active.has(t.status))) fail('task_already_waiting');
      const result=this.makeTask(state,events,{origin:parent.origin,kind:'escalation',prompt,parentId,hops:parent.hops+1,deadline:parent.deadline});
      parent.status='waiting'; return result;
    });
  }
  claimEscalation(sessionId) {
    return this.transaction((state,events)=>{
      if(!this.sessionId || sessionId!==this.sessionId) fail('session_not_bound');
      const tasks=Object.values(state.tasks).filter(t=>t.kind==='escalation');
      // One outstanding claim across all consumers/processes. Never auto-replay a leased request.
      if(tasks.some(t=>t.status==='running')) return null;
      const task=tasks.filter(t=>t.status==='queued').sort((a,b)=>a.createdAt-b.createdAt || a.id.localeCompare(b.id))[0];
      if(!task) return null;
      task.status='running'; task.claimToken=secret(); task.sessionId=sessionId;
      task.leaseDeadline=Math.min(task.deadline,this.now()+this.leaseMs);
      events.push({event:'claimed',taskId:task.id});
      return {id:task.id,prompt:task.prompt,claimToken:task.claimToken,deadline:task.leaseDeadline};
    });
  }
  async completeEscalation({id,sessionId,claimToken,response}) {
    content(response);
    return this.transaction((state,events)=>{
      const task=state.tasks[id];
      if(!task||task.status!=='running'||task.sessionId!==sessionId||sessionId!==this.sessionId||!equal(task.claimToken,claimToken)) fail('invalid_claim');
      if(task.leaseDeadline<=this.now()) fail('claim_expired');
      const parent=state.tasks[task.parentId];
      if(!parent||parent.status!=='waiting') fail('parent_not_waiting');
      task.status='completed'; task.response=response; delete task.claimToken;
      parent.status='running'; parent.hops=task.hops;
      events.push({event:'completed',taskId:id});
      return {id,status:task.status};
    });
  }
  escalationResult({parentId,contextToken}) {
    return this.transaction(state=>{
      const parent=state.tasks[parentId];
      if(!parent||parent.status!=='running'||!equal(parent.contextToken,contextToken)) fail('invalid_context');
      const child=Object.values(state.tasks).filter(t=>t.parentId===parentId&&t.status==='completed').at(-1);
      return child ? {id:child.id,response:child.response} : null;
    });
  }
  async finish({id,contextToken,ok,response}) {
    if(typeof ok!=='boolean') fail('invalid_result');
    if(response!==undefined) content(response);
    return this.transaction((state,events)=>{
      const task=state.tasks[id];
      if(!task||task.status!=='running'||!equal(task.contextToken,contextToken)) fail('invalid_context');
      task.status=ok?'completed':'failed'; if(response!==undefined) task.response=response;
      delete task.contextToken; events.push({event:task.status,taskId:id});
      return {id,status:task.status};
    });
  }
  // Safe metadata for doctor/status; payloads and capabilities stay in the local store.
  status(id) {
    return this.transaction(state=>{
      const task=state.tasks[id]; if(!task) fail('task_not_found');
      const {origin,kind,hops,status,deadline,parentId}=task;
      return {id,origin,kind,hops,status,deadline,parentId};
    });
  }
}
async function requireWrite(path,data,mode) {
  const handle=await open(path,'wx',mode);
  try {await handle.writeFile(data); await handle.sync();} finally {await handle.close();}
}
// Windows scanners can briefly hold files. Retry only transient access failures,
// with the store lock retained; never remove somebody else's lock or overwrite it.
async function retryFs(operation) {
  for(let attempt=0;;attempt++) {
    try {return await operation();}
    catch(error) {
      if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=9) throw error;
      await new Promise(resolve=>setTimeout(resolve,20*(attempt+1)));
    }
  }
}
