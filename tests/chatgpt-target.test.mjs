import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessChatGPTTarget} from '../src/adapters/chatgpt-target.mjs';
const packages=[
  {Name:'OpenAI.Codex',InstallLocation:'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1'},
  {Name:'OpenAI.ChatGPT-Desktop',InstallLocation:'C:\\Program Files\\WindowsApps\\OpenAI.ChatGPT-Desktop_1'}
];
const assess=targetPath=>assessChatGPTTarget({enabled:true,targetPath,packages,platform:'win32'});
test('same executable name in unified application is blocked',()=>{
  assert.equal(assess('C:\\Program Files\\WindowsApps\\OpenAI.Codex_1\\app\\ChatGPT.exe').code,'unified_app_driver_unsupported');
});
test('known legacy identity is allowed only within installed package boundary',()=>{
  assert.equal(assess('C:\\Program Files\\WindowsApps\\OpenAI.ChatGPT-Desktop_1\\ChatGPT.exe').ready,true);
  assert.equal(assess('C:\\Program Files\\WindowsApps\\OpenAI.ChatGPT-Desktop_1-FAKE\\ChatGPT.exe').ready,false);
  assert.equal(assess('C:\\Program Files\\WindowsApps\\OpenAI.ChatGPT-Desktop_1\\..\\Unverified\\ChatGPT.exe').ready,false);
});
test('unverified executable, relative path and other platforms fail closed',()=>{
  assert.equal(assess('C:\\Tools\\ChatGPT.exe').ready,false);
  assert.equal(assess('ChatGPT.exe').ready,false);
  assert.equal(assess('C:\\Program Files\\WindowsApps\\OpenAI.ChatGPT-Desktop_1\\Other.exe').ready,false);
  assert.equal(assessChatGPTTarget({enabled:true,targetPath:'C:\\ChatGPT.exe',packages,platform:'linux'}).ready,false);
});
test('escalation remains disabled without explicit enablement',()=>{
  assert.equal(assessChatGPTTarget({targetPath:'C:\\ChatGPT.exe',packages,platform:'win32'}).code,'escalation_disabled');
});
