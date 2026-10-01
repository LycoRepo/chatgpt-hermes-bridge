import {win32} from 'node:path';

// This gate has no UI, process-start or process-stop operations.
// Legacy upstream automation must not receive the newer unified application's identity.
const canonical=path=>win32.normalize(path).toLowerCase();
export function assessChatGPTTarget({enabled=false,targetPath='',packages=[],platform=process.platform}={}) {
  if(!enabled) return {ready:false,code:'escalation_disabled'};
  if(platform!=='win32') return {ready:false,code:'windows_required'};
  if(!targetPath || !win32.isAbsolute(targetPath)) return {ready:false,code:'absolute_target_path_required'};
  const target=canonical(targetPath);
  if(win32.basename(target)!=='chatgpt.exe') return {ready:false,code:'unexpected_executable'};
  const installed=packages.find(p=>{
    if(!p.InstallLocation) return false;
    const base=canonical(p.InstallLocation).replace(/[\\/]+$/,'')+'\\';
    return target.startsWith(base);
  });
  if(installed && /^OpenAI\.Codex$/i.test(installed.Name)) return {ready:false,code:'unified_app_driver_unsupported'};
  if(!installed || !/^OpenAI\.ChatGPT(?:-Desktop)?$/i.test(installed.Name)) return {ready:false,code:'legacy_application_identity_unverified'};
  return {ready:true,code:'legacy_identity_verified',packageName:installed.Name};
}
