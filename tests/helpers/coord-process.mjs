import {Coordinator} from '../../src/coordinator.mjs';
process.once('message',async ({directory,action,id,sessionId})=>{
  const coordinator=new Coordinator({directory,sessionId});
  try {
    const result=action==='start'?await coordinator.start(id):await coordinator.claimEscalation(sessionId);
    process.send({ok:true,result},()=>process.disconnect());
  } catch(error) {process.send({ok:false,code:error.code},()=>process.disconnect());}
});
