export const PROFILE="document-phrase-006-execution:"+(new URLSearchParams(location.search).get("channel")==="real"?"real":"offline")+":";
const SCHEMA='vulture-synthetic-profile-transfer/1', MAX_BYTES=2000000;
const actorPattern='(?:synthetic-admin|synthetic-driver)';
export function allowedKey(key) {
  return new RegExp('^'+PROFILE+'(?:fleet-store-v1:'+actorPattern+'|document-confirm-002:draft:'+actorPattern+'|document-confirm-002:trial-backup:'+actorPattern+':[0-9]{10,17}:[a-f0-9-]{36})$').test(key);
}
function parseEntry(key,value) {
  if(!allowedKey(key)||typeof value!=='string'||value.length>MAX_BYTES)throw Error('TRANSFER_KEY_NOT_ALLOWED');
  let data;try{data=JSON.parse(value);}catch{throw Error('TRANSFER_JSON_INVALID');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('TRANSFER_SCHEMA_INVALID');
  if(key.includes('fleet-store-v1:')){
    for(const field of ['dispatches','fuelings','expenses','maintenances','overloads'])if(!Array.isArray(data[field]))throw Error('TRANSFER_STORE_INVALID');
    const actor=key.split(':').at(-1), inbox=data.documentInbox;
    if(inbox&&(inbox.actor!==actor||inbox.schema!=='document-confirm-002/0.2.0'||!Array.isArray(inbox.confirmations)))throw Error('TRANSFER_SCOPE_INVALID');
  }else if(typeof data.text!=='string'||!['load','fuel','payment'].includes(data.kind)||typeof data.synthetic!=='boolean')throw Error('TRANSFER_DRAFT_INVALID');
  return data;
}
export function scopedEntries(storage) {
  const entries=[];
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(allowedKey(key)){const value=storage.getItem(key);parseEntry(key,value);entries.push({key,value});}}
  return entries.sort((a,b)=>a.key.localeCompare(b.key));
}
export async function exportProfile(storage,origin,digest) {
  if(storage.getItem(PROFILE+'transfer-pending')!==null)throw Error('TRANSFER_RECOVERY_REQUIRED');
  const payload={schema:SCHEMA,profile:PROFILE,sourceOrigin:origin,createdUtc:new Date().toISOString(),entries:scopedEntries(storage)};
  if(!payload.entries.length)throw Error('NO_SCOPED_RECORDS_OR_DRAFTS');
  const body=JSON.stringify(payload);if(body.length>MAX_BYTES)throw Error('TRANSFER_SIZE_LIMIT');
  return JSON.stringify({payload,sha256:await digest(body)},null,2);
}
export async function inspectProfile(text,digest) {
  if(typeof text!=='string'||text.length>MAX_BYTES)throw Error('TRANSFER_SIZE_LIMIT');
  let wrapped;try{wrapped=JSON.parse(text);}catch{throw Error('TRANSFER_JSON_INVALID');}
  const p=wrapped?.payload;
  if(!p||p.schema!==SCHEMA||p.profile!==PROFILE||!Array.isArray(p.entries)||p.entries.length<1||p.entries.length>100)throw Error('TRANSFER_SCHEMA_INVALID');
  if(await digest(JSON.stringify(p))!==wrapped.sha256)throw Error('TRANSFER_HASH_MISMATCH');
  const origin=new URL(p.sourceOrigin);if(!['http:','https:'].includes(origin.protocol)||origin.origin!==p.sourceOrigin)throw Error('TRANSFER_ORIGIN_INVALID');
  const keys=new Set(),counts={loads:0,fuel:0,expenses:0,confirmations:0,drafts:0};
  for(const entry of p.entries){
    if(!entry||keys.has(entry.key))throw Error('TRANSFER_DUPLICATE_KEY');
    keys.add(entry.key);const data=parseEntry(entry.key,entry.value);
    if(entry.key.includes('fleet-store-v1:')){counts.loads+=data.dispatches.length;counts.fuel+=data.fuelings.length;counts.expenses+=data.expenses.length;counts.confirmations+=data.documentInbox?.confirmations.length??0;}
    else counts.drafts++;
  }
  return {payload:p,sha256:wrapped.sha256,counts};
}
function rollback(storage,journal) {
  for(const entry of [...journal.writes].reverse()){
    const current=storage.getItem(entry.key);
    if(current===entry.value)storage.removeItem(entry.key);
    else if(current!==null)throw Error('TRANSFER_RECOVERY_CONFLICT');
    if(storage.getItem(entry.key)!==null)throw Error('TRANSFER_ROLLBACK_UNCERTAIN');
  }
  storage.removeItem(PROFILE+'transfer-pending');
  if(storage.getItem(PROFILE+'transfer-pending')!==null)throw Error('TRANSFER_ROLLBACK_UNCERTAIN');
}
export function recoverTransfer(storage) {
  const raw=storage.getItem(PROFILE+'transfer-pending');if(raw===null)return;
  let j;try{j=JSON.parse(raw);}catch{throw Error('TRANSFER_RECOVERY_INVALID');}
  if(j.schema!==SCHEMA||!Array.isArray(j.writes))throw Error('TRANSFER_RECOVERY_INVALID');
  for(const e of j.writes)parseEntry(e.key,e.value);
  rollback(storage,j);
}
export function importInspected(storage,checked,explicitlyConfirmed) {
  if(!explicitlyConfirmed)throw Error('TRANSFER_CONFIRMATION_REQUIRED');
  if(storage.getItem(PROFILE+'transfer-pending')!==null)throw Error('TRANSFER_RECOVERY_REQUIRED');
  // No merging and no overwriting existing records or drafts, even an empty default store.
  const writes=[];
  for(const e of checked.payload.entries){
    parseEntry(e.key,e.value);const old=storage.getItem(e.key);
    if(old!==null&&old!==e.value)throw Error('TRANSFER_TARGET_HAS_DATA');
    if(old===null)writes.push(e);
  }
  if(!writes.length)return {imported:0,alreadyPresent:true};
  const journal={schema:SCHEMA,sha256:checked.sha256,writes};
  const pending=PROFILE+'transfer-pending',bytes=JSON.stringify(journal);
  storage.setItem(pending,bytes);if(storage.getItem(pending)!==bytes)throw Error('TRANSFER_JOURNAL_WRITE_FAILED');
  try {
    for(const e of writes){storage.setItem(e.key,e.value);if(storage.getItem(e.key)!==e.value)throw Error('TRANSFER_READBACK_FAILED');}
    storage.removeItem(pending);if(storage.getItem(pending)!==null)throw Error('TRANSFER_COMMIT_UNCERTAIN');
    return {imported:writes.length,alreadyPresent:false};
  }catch(error){
    try{rollback(storage,journal);}catch{throw Error('TRANSFER_ROLLBACK_UNCERTAIN');}
    throw Error('TRANSFER_FAILED_OLD_DATA_KEPT');
  }
}
