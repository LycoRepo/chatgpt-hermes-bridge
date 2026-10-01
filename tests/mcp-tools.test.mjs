import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Coordinator} from '../src/coordinator.mjs';
import {bridgeTools} from '../src/mcp-tools.mjs';
test('forward tool ignores no caller provenance and rejects extra arguments',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'bridge-tools-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const coordinator=new Coordinator({directory});
  const tools=bridgeTools({role:'chatgpt',coordinator,runTask:id=>coordinator.status(id)});
  await assert.rejects(tools.call('hermes_plan',{prompt:'test',origin:'hermes'}),/invalid_arguments/);
  const result=await tools.call('hermes_plan',{prompt:'test'});
  assert.equal(result.origin,'chatgpt');
  assert.deepEqual(tools.list().map(t=>t.name),['hermes_plan']);
  await assert.rejects(tools.call('claim_hermes_review'),/unknown_tool/);
});
test('Hermes tool cannot reset origin/hops and session role cannot switch binding',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'bridge-tools-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const coordinator=new Coordinator({directory,sessionId:'session-test'});
  const task=await coordinator.start((await coordinator.submitChatGPT('forward')).id);
  const tools=bridgeTools({role:'hermes',coordinator,context:{parentId:task.id,contextToken:task.contextToken}});
  await assert.rejects(tools.call('request_chatgpt_review',{prompt:'reset',hops:0}),/invalid_arguments/);
  await assert.rejects(tools.call('request_chatgpt_review',{prompt:'recurse'}),/recursive_escalation_denied/);
  const consumer=bridgeTools({role:'session',coordinator,sessionId:'session-test'});
  await assert.rejects(consumer.call('claim_hermes_review',{sessionId:'different'}),/invalid_arguments/);
  assert.throws(()=>bridgeTools({role:'hermes',coordinator}),/missing_task_context/);
});
