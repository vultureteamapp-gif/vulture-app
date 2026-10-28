import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),hash=x=>createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'SOURCE-MANIFEST.json')));
for(const row of manifest.files){const file=path.resolve(root,row.file);if(!file.startsWith(root+path.sep)||fs.lstatSync(file).isSymbolicLink()||hash(fs.readFileSync(file))!==row.sha256)throw Error('SOURCE_PACKAGE_INTEGRITY_FAILED '+row.file);}
const body=fs.readFileSync(path.join(root,'data/request.bytes.json'));
if(hash(body)!=='b719b7bedca24f00a4fd1ff780854907cd38602652ce747d89f94713fb81aec6')throw Error('FROZEN_REQUEST_CHANGED');
if(manifest.files.some(r=>/^dist\/|node_modules\/|approval\.USER\.json|spent\.lock|\.env(?:\.|$)|\.git\//.test(r.file)))throw Error('PRIVATE_OR_PREBUILT_INPUT_IN_SOURCE_MANIFEST');
console.log(JSON.stringify({sourceManifest:'PASS',files:manifest.files.length,requestSha256:hash(body),approvalIncluded:false,providerCalls:0}));
