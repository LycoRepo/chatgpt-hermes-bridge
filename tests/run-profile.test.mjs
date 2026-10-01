import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileRun} from '../src/adapters/run-profile.mjs';
test('planning profile stays plan with one turn and approval policy intact',()=>{
  const {config,run}=profileRun('hermes','test','plan',30);
  assert.equal(run.mode,'plan');assert.equal(run.maxTurns,1);assert.equal(run.yolo,false);
  assert.ok(config.policy.requireApprovalFor.length>0);
});
test('scoped authorized profile can execute multiple turns without YOLO',()=>{
  const {run}=profileRun('hermes','fixed test','approved-ui-check',600);
  assert.equal(run.mode,'execute');assert.equal(run.maxTurns,24);assert.equal(run.yolo,false);
  assert.throws(()=>profileRun('hermes','test','arbitrary-execute',30),/invalid_run_profile/);
});
