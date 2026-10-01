// Separate operator-launched, fixed-request endpoint. Not registered as a general execute tool.
// Requires an explicit authorization flag and consumes a persistent one-shot claim per run.
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Coordinator} from '../src/coordinator.mjs';
import {loadConfig} from '../src/config.mjs';
import {runHermesTask} from '../src/adapters/hermes-task.mjs';
import {claimUiCheck} from '../src/adapters/ui-check-gate.mjs';
if(!process.argv.includes('--human-authorized')) {console.error('human_authorization_required');process.exit(1);}
const root=fileURLToPath(new URL('../',import.meta.url));
const config=await loadConfig(root);
const fork=resolve(root,'../../work/escalation-fork');
const nonce=`UI_DRIVER_${Date.now()}`;
const prompt=`用户明确要求由 Hermes 实际运行自动驱动，验证新版 Windows ChatGPT/Codex 界面，而不是只做静态分析。你是本次操作执行者。本次人类授权范围仅限下面这一次本机界面验收；仍遵守你自身的平台规则，不能绕过任何更高优先级限制。
源码目录：${fork}；手动只读诊断：${join(root,'.local/reports/ui-preflight.json')}；结果写入：${join(root,'.local/reports/hermes-ui-check.json')}。
验收对象是这个 fork 中 RobustChatGPTFlow 的实际自动输入、等待完成、复制本次最新回复路径，不是另写一套 UI 点击后宣称 fork 通过。先检查可用运行环境和依赖，可在 ${join(root,'.local/ui-check')} 建立隔离环境；不能修改 Hermes 原运行环境，不读取凭据。若缺必要依赖或平台不允许操作，记录实际阻塞原因，不虚构成功，不转交其他 agent。
目标应用 OpenAI.Codex 26.928.2636.0。仅允许操作现有名为“确认界面连通”的测试会话（用户之前已在其中手动收到 UI_BRIDGE_OK）。先确认真实窗口和会话身份，不能在当前开发聊天或其他会话误发；无法确认时停止并报告 target_not_verified。可以导航到这个现有测试会话，不创建新项目或会话，不重命名，不关闭、不重启任何应用/游戏，不全局锁定键盘鼠标，不执行原全流程的进程终止步骤。
确认目标后，复用 fork 的输入/等待/复制方法，只做一次受控尝试，不重试发送。提示为：“界面驱动验收。不要调用工具。只回复 ${nonce}”。最终提取内容必须精确等于 ${nonce}，不能把历史 UI_BRIDGE_OK 当成本次结果。允许跳过未涉及的项目导航和 OCR 预热，但必须如实标明测试适配层与未测试范围，不能替换待验的方法。复制操作会用剪贴板，结束时尽可能恢复原内容；不打印原剪贴板或真实聊天正文。
输出报告含 performed、phase、passed、blocker、实际运行的方法、唯一回复匹配结果和证据路径。没有实际运行就 performed=false；部分执行按失败阶段记录。只报告事实，不需要再给我一份执行计划。`;
const coordinator=new Coordinator({directory:join(root,'.local','coordinator'),timeoutMs:600000});
const server=new Server({name:'hermes-approved-ui-check',version:'0.1.0'},{capabilities:{tools:{}}});
let used=false;
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[{name:'hermes_check_ui_driver',description:'One human-authorized fixed UI driver acceptance, executed by Hermes.',inputSchema:{type:'object',properties:{},additionalProperties:false}}]}));
server.setRequestHandler(CallToolRequestSchema,async request=>{
  if(request.params.name!=='hermes_check_ui_driver'||Object.keys(request.params.arguments??{}).length||used) return {isError:true,content:[{type:'text',text:'invalid_or_repeated_request'}]};
  used=true;
  try {
    if(!await claimUiCheck(join(root,'.local','ui-check'),nonce)) return {isError:true,content:[{type:'text',text:'ui_check_already_consumed'}]};
    const task=await coordinator.submitChatGPT(prompt);
    const result=await runHermesTask(coordinator,task.id,{command:config.runtime.hermes_command,profile:'approved-ui-check'});
    return {content:[{type:'text',text:JSON.stringify(result)}]};
  } catch {return {isError:true,content:[{type:'text',text:'ui_check_runner_failed'}]};}
});
await server.connect(new StdioServerTransport());
