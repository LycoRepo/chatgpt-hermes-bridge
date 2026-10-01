import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fork} from 'node:child_process';
import {Coordinator} from '../src/coordinator.mjs';

async function fixture(t,options={}) {
  const directory=await mkdtemp(join(tmpdir(),'bridge-coord-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  return {directory,coordinator:new Coordinator({directory,sessionId:'dedicated-test-session',...options})};
}
async function native(coordinator) {return coordinator.start((await coordinator.submitHermes('private prompt')).id);}
const rejected = (promise,code) => assert.rejects(promise,error=>error.code===code);
function child(input) {
  return new Promise((resolve,reject)=>{
    const process=fork(new URL('./helpers/coord-process.mjs',import.meta.url),[],{stdio:['ignore','ignore','ignore','ipc']});
    let result;
    process.once('message',value=>{result=value;});
    process.once('error',reject);
    process.once('exit',code=>result?resolve(result):reject(new Error(`test worker exited ${code}`)));
    process.send(input);
  });
}
test('ChatGPT provenance persists and cannot escalate back',async t=>{
  const {coordinator}=await fixture(t);
  const task=await coordinator.start((await coordinator.submitChatGPT('delegate')).id);
  await rejected(coordinator.requestEscalation({parentId:task.id,contextToken:task.contextToken,prompt:'recurse'}),'recursive_escalation_denied');
});
test('unknown, forged and expired contexts refuse escalation',async t=>{
  let now=100;
  const {coordinator}=await fixture(t,{now:()=>now,timeoutMs:10});
  const task=await native(coordinator);
  await rejected(coordinator.requestEscalation({parentId:task.id,contextToken:'forged',prompt:'help'}),'invalid_context');
  now=111;
  await rejected(coordinator.requestEscalation({parentId:task.id,contextToken:task.contextToken,prompt:'help'}),'invalid_context');
  assert.equal((await coordinator.status(task.id)).status,'timed_out');
});
test('session binding, claim capability and result delivery',async t=>{
  const {coordinator}=await fixture(t);
  const task=await native(coordinator);
  const queued=await coordinator.requestEscalation({parentId:task.id,contextToken:task.contextToken,prompt:'private question'});
  await rejected(coordinator.claimEscalation('wrong-session'),'session_not_bound');
  const claim=await coordinator.claimEscalation('dedicated-test-session');
  assert.equal(claim.id,queued.id);
  await rejected(coordinator.completeEscalation({...claim,sessionId:'dedicated-test-session',claimToken:'forged',response:'answer'}),'invalid_claim');
  await coordinator.completeEscalation({...claim,sessionId:'dedicated-test-session',response:'private answer'});
  assert.equal((await coordinator.escalationResult({parentId:task.id,contextToken:task.contextToken})).response,'private answer');
  await rejected(coordinator.completeEscalation({...claim,sessionId:'dedicated-test-session',response:'replay'}),'invalid_claim');
  await rejected(coordinator.requestEscalation({parentId:task.id,contextToken:task.contextToken,prompt:'another hop'}),'max_hops_exceeded');
});
test('unbound consumer cannot claim a request',async t=>{
  const {coordinator}=await fixture(t,{sessionId:null});
  await rejected(coordinator.claimEscalation('dedicated-test-session'),'session_not_bound');
});
test('cross-process task start has exactly one winner',async t=>{
  const {directory,coordinator}=await fixture(t);
  const {id}=await coordinator.submitChatGPT('once');
  const results=await Promise.all(Array.from({length:6},()=>child({directory,action:'start',id})));
  assert.equal(results.filter(r=>r.ok).length,1);
  assert.ok(results.filter(r=>!r.ok).every(r=>r.code==='task_not_queued'));
});
test('cross-process consumers serialize globally across separate requests',async t=>{
  const {directory,coordinator}=await fixture(t);
  for(let i=0;i<2;i++) {
    const task=await native(coordinator);
    await coordinator.requestEscalation({parentId:task.id,contextToken:task.contextToken,prompt:'help'});
  }
  const results=await Promise.all(Array.from({length:6},()=>child({directory,action:'claim',sessionId:'dedicated-test-session'})));
  assert.ok(results.every(r=>r.ok),JSON.stringify(results.map(r=>({ok:r.ok,code:r.code})))); assert.equal(results.filter(r=>r.result).length,1);
});
test('expired claims fail parent and are never delivered twice',async t=>{
  let now=100;
  const {coordinator}=await fixture(t,{now:()=>now,leaseMs:10,timeoutMs:1000});
  const task=await native(coordinator);
  await coordinator.requestEscalation({parentId:task.id,contextToken:task.contextToken,prompt:'help'});
  const claim=await coordinator.claimEscalation('dedicated-test-session'); now=111;
  await rejected(coordinator.completeEscalation({...claim,sessionId:'dedicated-test-session',response:'late'}),'invalid_claim');
  assert.equal((await coordinator.status(task.id)).status,'failed');
  assert.equal(await coordinator.claimEscalation('dedicated-test-session'),null);
});
test('restart preserves waiting task and nonce without reissuing',async t=>{
  const {directory,coordinator}=await fixture(t);
  const task=await native(coordinator);
  await coordinator.requestEscalation({parentId:task.id,contextToken:task.contextToken,prompt:'help'});
  const claim=await coordinator.claimEscalation('dedicated-test-session');
  const restarted=new Coordinator({directory,sessionId:'dedicated-test-session'});
  assert.equal(await restarted.claimEscalation('dedicated-test-session'),null);
  await restarted.completeEscalation({...claim,sessionId:'dedicated-test-session',response:'resume'});
  assert.equal((await restarted.status(task.id)).status,'running');
});
test('metadata logs/status exclude prompts, answers and capabilities',async t=>{
  const {directory,coordinator}=await fixture(t);
  const task=await native(coordinator);
  await coordinator.finish({id:task.id,contextToken:task.contextToken,ok:true,response:'private answer'});
  const output=(await readFile(join(directory,'events.jsonl'),'utf8'))+JSON.stringify(await coordinator.status(task.id));
  for(const value of ['private prompt','private answer',task.contextToken]) assert.ok(!output.includes(value));
});
test('invalid payload, corrupt store and orphan lock fail closed',async t=>{
  const {directory,coordinator}=await fixture(t);
  await rejected(coordinator.submitChatGPT('x'.repeat(65537)),'invalid_content');
  await writeFile(join(directory,'tasks.json'),'broken');
  await assert.rejects(coordinator.submitChatGPT('test'),SyntaxError);
  await rm(join(directory,'tasks.json'));
  await writeFile(join(directory,'coordinator.lock'),'orphan');
  await rejected(coordinator.submitChatGPT('test'),'store_locked');
});
