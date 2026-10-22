#!/usr/bin/env node
/* 公开前的只读启发式扫描；只输出类别与文件位置，不输出命中原文。 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const findings=new Set();
const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['provider-key',/\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|LTAI[A-Za-z0-9]{12,})\b/],
  ['personal-path',/(?:\/(?:Users|home)\/[^\s/]+\/|\/var\/folders\/|\/tmp\/codex-)/],
  ['embedded-url-credential',/https?:\/\/[^\s/@:]+:[^\s/@]+@/],
  ['literal-secret',/\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key|password|passwd|authorization)\s*[:=]\s*["'`]([A-Za-z0-9_+\/.=-]{16,})["'`]/i]
];
function scan(label,bytes){
  if(bytes.includes(0))return;
  const content=bytes.toString('utf8');
  for(const [rule,pattern] of rules)if(pattern.test(content))findings.add(`${rule}: ${label}`);
}
function checkName(name,label=name){
  if(/(?:^|\/)(?:\.env(?:\.(?!example$)[^/]*)?|[^/]*\.(?:pem|p12|pfx|key|har|log)|[^/]*(?:cookie|storage-state)[^/]*\.json)$/i.test(name))findings.add(`private-file: ${label}`);
}
const files=new Set(git('ls-files','--cached','--others','--exclude-standard','-z').toString().split('\0').filter(Boolean));
for(const file of files){
  checkName(file);const full=path.join(root,file);
  if(fs.existsSync(full)&&fs.statSync(full).isFile())scan(file,fs.readFileSync(full));
}
let blobCount=0;
if(process.argv.includes('--history')){
  const objects=git('rev-list','--objects','HEAD').toString().trim().split('\n').filter(Boolean);
  for(const entry of objects){
    const [oid,...parts]=entry.split(' '),name=parts.join(' '),type=git('cat-file','-t',oid).toString().trim();
    if(type!=='blob')continue;
    checkName(name,`${oid.slice(0,8)}:${name}`);scan(`${oid.slice(0,8)}:${name}`,git('cat-file','blob',oid));blobCount++;
  }
  const metadata=git('log','--format=%ae%n%ce','HEAD').toString().trim().split('\n');
  for(const email of new Set(metadata))if(!/^[^\s@]+@users\.noreply\.github\.com$/.test(email))findings.add('author-email: non-noreply email in public history');
}
for(const finding of findings)console.error(finding);
console.log(`Checked ${files.size} working files${process.argv.includes('--history')?` and ${blobCount} reachable historical blobs`:''}; ${findings.size} findings.`);
if(findings.size)process.exitCode=1;
