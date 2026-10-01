import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,realpathSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assessChatGPTTarget} from '../src/adapters/chatgpt-target.mjs';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try {
  const path='config/bridge.local.json';
  const config=JSON.parse(readFileSync(existsSync(path)?path:'config/bridge.example.json','utf8'));
  const targetArg=process.argv.indexOf('--target');
  let targetPath=targetArg>=0?process.argv[targetArg+1]:config.escalation?.verified_application_path;
  const enabled=targetArg>=0||config.escalation?.enabled===true;
  let packages=[];
  if(process.platform==='win32') {
    const output=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
      'Get-AppxPackage | Where-Object { $_.Name -match "^OpenAI\\." } | Select-Object Name,InstallLocation | ConvertTo-Json -Compress'],{encoding:'utf8',timeout:15000});
    if(output.trim()) {const parsed=JSON.parse(output);packages=Array.isArray(parsed)?parsed:[parsed];}
    packages=packages.map(p=>({...p,InstallLocation:realpathSync(p.InstallLocation)}));
  }
  if(enabled&&targetPath) {
    if(!existsSync(targetPath)||!statSync(targetPath).isFile()) throw new Error('Configured target executable does not exist.');
    targetPath=realpathSync(targetPath);
  }
  const result=assessChatGPTTarget({enabled,targetPath,packages});
  console.log(JSON.stringify({...result,installedOpenAIPackages:packages.map(p=>p.Name),
    uiCompatibilityVerified:false,processesStarted:0,processesStopped:0},null,2));
  if(enabled&&!result.ready) process.exitCode=1;
} catch(error) {console.error(error.message);process.exitCode=1;}
