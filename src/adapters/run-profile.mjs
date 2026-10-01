import {defaultConfig} from '../../components/hermes-action-bridge/dist/config.js';
import {buildEffectiveRun} from '../../components/hermes-action-bridge/dist/run.js';
export function profileRun(command,prompt,profile,timeoutSeconds) {
  if(!['plan','approved-ui-check'].includes(profile)) throw new Error('invalid_run_profile');
  const config=structuredClone(defaultConfig);config.runtime.command=command;
  const executing=profile==='approved-ui-check';
  // Only the fixed, human-authorized UI-check endpoint selects this trusted preset.
  // The ordinary planning tools cannot choose a profile or change approval policy.
  if(executing) config.presets['approved-ui-check']={skills:[],toolsets:[],requireApprovalFor:[]};
  // Budget covers one-shot acceptance navigation/input/wait/copy after the
  // isolated environment is prebuilt; the claim gate keeps the blast radius to one run.
  const run=buildEffectiveRun(config,{prompt,contextFiles:[],mode:executing?'execute':'plan',
    preset:executing?'approved-ui-check':'default',source:'tool',maxTurns:executing?40:1,timeoutSeconds});
  return {config,run};
}
