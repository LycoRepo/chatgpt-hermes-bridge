import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
async function main() {
  if(process.platform!=='win32') throw new Error('Run this probe with Windows Node.js; Hermes is installed on Windows.');
  const command=process.env.HERMES_COMMAND || join(process.env.LOCALAPPDATA || '', 'hermes','bin','hermes.exe');
  if(!existsSync(command)) throw new Error('Set HERMES_COMMAND to the installed Windows Hermes executable.');
  let modules;
  try {modules=await Promise.all([
    import('../components/hermes-action-bridge/dist/config.js'),
    import('../components/hermes-action-bridge/dist/run.js'),
    import('../components/hermes-action-bridge/dist/adapters/hermes-cli.js')
  ]);} catch {throw new Error('Build components/hermes-action-bridge first: npm ci --ignore-scripts, then npm run build.');}
  const [{defaultConfig},{buildEffectiveRun},{runHermesCli}]=modules;
  const config=structuredClone(defaultConfig);
  config.runtime.command=command;
  const run=buildEffectiveRun(config,{
    prompt:'Connectivity test only. Do not use tools, inspect files, send messages, or change anything. Reply exactly BRIDGE_LINK_OK.',
    contextFiles:[],mode:'plan',source:'tool',maxTurns:1,timeoutSeconds:90
  });
  const started=Date.now();
  const result=await runHermesCli(config,run,false);
  const report={timestamp:new Date().toISOString(),transport:'hermes-action-cli',ok:result.ok,
    exitCode:result.exitCode,markerReceived:result.stdout.includes('BRIDGE_LINK_OK'),
    timedOut:result.timedOut??false,durationMs:Date.now()-started};
  mkdirSync('.local/probes',{recursive:true});
  writeFileSync('.local/probes/hermes-cli.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(!report.ok||!report.markerReceived) {
    console.error('Hermes probe failed; check the existing provider/login configuration. Raw responses are not logged.');
    process.exitCode=1;
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
