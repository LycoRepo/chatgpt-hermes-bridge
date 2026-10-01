// Roles are selected by the trusted launcher, never by tool arguments.
export function bridgeTools({role,coordinator,runTask,context,sessionId}) {
  const tools=new Map();
  const add=(name,description,properties,required,call)=>tools.set(name,{definition:{name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}},call});
  const text={type:'string',minLength:1,maxLength:65536};
  if(role==='chatgpt') {
    add('hermes_plan','Delegate a planning request to Windows Hermes. One turn; no UI driver.',{prompt:text},['prompt'],async ({prompt})=>{
      const task=await coordinator.submitChatGPT(prompt);
      return runTask(task.id);
    });
  } else if(role==='hermes') {
    if(!context?.parentId||!context?.contextToken) throw new Error('missing_task_context');
    add('request_chatgpt_review','Queue review for the bound consumer; ChatGPT-origin tasks are denied.',{prompt:text},['prompt'],args=>coordinator.requestEscalation({...context,prompt:args.prompt}));
    add('read_chatgpt_review','Read a completed review for this task.',{},[],()=>coordinator.escalationResult(context));
  } else if(role==='session') {
    if(!sessionId) throw new Error('missing_session_binding');
    add('claim_hermes_review','Claim one request for this bound session. Do not claim outside the dedicated conversation.',{},[],()=>coordinator.claimEscalation(sessionId));
    add('complete_hermes_review','Complete a claimed request with its capability.',{id:text,claimToken:text,response:text},['id','claimToken','response'],args=>coordinator.completeEscalation({...args,sessionId}));
  } else throw new Error('invalid_role');
  return {
    list:()=>[...tools.values()].map(t=>t.definition),
    async call(name,args={}) {
      const tool=tools.get(name); if(!tool) throw new Error('unknown_tool');
      if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(key=>!Object.hasOwn(tool.definition.inputSchema.properties,key))) throw new Error('invalid_arguments');
      for(const key of tool.definition.inputSchema.required) if(typeof args[key]!=='string'||!args[key].trim()||Buffer.byteLength(args[key])>65536) throw new Error('invalid_arguments');
      return tool.call(args);
    }
  };
}
