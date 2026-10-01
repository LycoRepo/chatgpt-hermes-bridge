import {fork} from 'node:child_process';
import {isAbsolute} from 'node:path';
import {existsSync} from 'node:fs';

export async function runHermesTask(coordinator,id,{command,profile='plan'}) {
  if(!['plan','approved-ui-check'].includes(profile)) throw new Error('invalid_run_profile');
  if(process.platform!=='win32'||!isAbsolute(command)||!existsSync(command)) throw new Error('Windows Hermes executable required');
  const task=await coordinator.start(id);
  const seconds=Math.max(1,Math.floor((task.deadline-Date.now())/1000));
  const result=await new Promise(resolve=>{
    const worker=fork(new URL('./hermes-worker.mjs',import.meta.url),[],{stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
    let received;
    worker.once('message',message=>{received=message;});
    worker.once('error',()=>resolve({ok:false,stdout:''}));
    worker.once('exit',()=>resolve(received??{ok:false,stdout:''}));
    worker.send({command,prompt:task.prompt,taskId:id,contextToken:task.contextToken,timeoutSeconds:seconds,profile});
  });
  try {
    const completed=await coordinator.finish({id,contextToken:task.contextToken,ok:result.ok,response:result.stdout?.trim()||undefined});
    return {...completed,response:result.stdout};
  } catch(error) {
    if(error.code==='invalid_context') return coordinator.status(id);
    throw error;
  }
}
