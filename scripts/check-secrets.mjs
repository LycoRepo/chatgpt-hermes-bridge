import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['OpenAI key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['JWT credential', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/]
];
const placeholder = /^(?:|YOUR_[A-Z0-9_]+|CHANGEME|REPLACE_ME|<[^>]+>|\$\{[^}]+\}|process\.env\.[A-Z0-9_]+|null|false|true)$/i;

export function findIssues(path, content) {
  const issues = [];
  const name = path.split('/').at(-1);
  if ((name === '.env' || (name.startsWith('.env.') && name !== '.env.example')) ||
      /(?:^|\/)(?:credentials[^/]*\.json|auth[^/]*\.json|cookies[^/]*|id_rsa[^/]*|id_ed25519[^/]*|[^/]*\.(?:key|pem|p12|pfx))$/i.test(path) ||
      /(?:^|\/)(?:\.ssh|\.aws|browser-profile|\.local|logs|sessions|runtime)\//i.test(path) ||
      /(?:^|\/)config\/[^/]+\.local\.[^/]+$/i.test(path)) issues.push('local/credential file path');
  for (const [label, pattern] of rules) if (pattern.test(content)) issues.push(label);
  const assignments = /(?:["']?)(?:[A-Z0-9_]*(?:API_KEY|AUTH_TOKEN|ACCESS_TOKEN|SECRET_KEY|PASSWORD|COOKIE))(?:["']?)[ \t]*[:=][ \t]*["']?([^\r\n"',}]+)/gi;
  for (const match of content.matchAll(assignments)) {
    const value = match[1].trim();
    if (!placeholder.test(value) && value.length >= 8) issues.push('possible credential assignment');
  }
  return [...new Set(issues)];
}

function run() {
  const mode = process.argv[2] || '--staged';
  if (!['--staged','--tracked','--history'].includes(mode)) throw new Error('Use --staged, --tracked or --history');
  const git = args => execFileSync('git', args, {encoding:'utf8',maxBuffer:32*1024*1024});
  process.chdir(git(['rev-parse','--show-toplevel']).trim());
  const entries = [];
  if (mode === '--history') {
    const commits = git(['rev-list','--all']).trim().split('\n').filter(Boolean);
    const seen = new Set();
    for (const commit of commits) {
      for (const record of git(['ls-tree','-r','-z',commit]).split('\0').filter(Boolean)) {
        const split = record.indexOf('\t');
        const [fileMode,type,oid] = record.slice(0,split).split(' ');
        const path = record.slice(split+1);
        if (type !== 'blob' || fileMode === '160000') continue;
        const key = `${oid}\0${path}`;
        if (!seen.has(key)) {seen.add(key); entries.push({path,object:oid});}
      }
    }
  } else {
    for (const record of git(['ls-files','--stage','-z']).split('\0').filter(Boolean)) {
      const split = record.indexOf('\t');
      const [fileMode,oid,stage] = record.slice(0,split).split(' ');
      if (fileMode === '160000') continue;
      if (stage !== '0') throw new Error('Resolve merge conflicts before checking credentials');
      entries.push({path:record.slice(split+1),object:oid});
    }
  }
  let failures = 0;
  for (const {path,object} of entries) {
    let content;
    if (mode === '--tracked') {
      try {content = readFileSync(path,'utf8');}
      catch (error) {if (error.code === 'ENOENT') continue; throw error;}
    } else content = git(['cat-file','blob',object]);
    for (const issue of findIssues(path,content)) {
      failures++;
      console.error(`BLOCKED ${path}: ${issue}`);
    }
  }
  if (failures) console.error('Remove credentials from the affected files/history before committing or pushing. Values are never printed.');
  else console.log(`Credential check passed (${mode}, ${entries.length} blobs; third-party gitlinks excluded).`);
  process.exitCode = failures ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {run();}
  catch {console.error('Credential check could not complete; check Git access and repository state.');process.exitCode=1;}
}
