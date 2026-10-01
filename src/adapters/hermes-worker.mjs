import {profileRun} from './run-profile.mjs';
import {startHermesCli} from '../../components/hermes-action-bridge/dist/adapters/hermes-cli.js';

// A fresh process isolates per-task context environment from concurrent Hermes jobs.
process.once('message',async ({command,prompt,taskId,contextToken,timeoutSeconds,profile='plan'})=>{
  let invocation;
  try {
    process.env.BRIDGE_PARENT_TASK_ID=taskId;
    process.env.BRIDGE_CONTEXT_TOKEN=contextToken;
    const {config,run}=profileRun(command,prompt,profile,timeoutSeconds);
    invocation=startHermesCli(config,run,false,{maxOutputBytes:65536});
    process.once('disconnect',()=>{invocation.cancel();});
    const result=await invocation.result;
    process.send?.({ok:result.ok && !result.outputTruncated,timedOut:result.timedOut??false,stdout:result.stdout},()=>process.disconnect());
  } catch {
    process.send?.({ok:false,stdout:'',timedOut:false},()=>process.disconnect());
  }
});
