import {PROFILE,scopedEntries,exportProfile,inspectProfile,importInspected,recoverTransfer} from "./profile-transfer.mjs";
import {backupDigest} from "./backup-digest.mjs";
import {createUpdateController,updateExclusive,UI_VERSION} from "./update-controller.mjs";
export function installPwaTools(io){
 const $=id=>document.getElementById(id),copy=(en,ko)=>io.getLanguage()==='ko'?ko:en;
 const storage=globalThis.localStorage;let installEvent=null,staged=null,operation=false,importCapture=null,lastNotice=null;
 if(!$('app-tools'))return;
 const show=(en,ko,error=false)=>{lastNotice=[en,ko,error];const el=$('app-tools-status');el.hidden=false;el.textContent=copy(en,ko);el.className=error?'error':'notice';el.setAttribute('role',error?'alert':'status');};
 $('language').addEventListener('change',()=>{if(lastNotice)show(...lastNotice);});
 const control=createUpdateController({
  getState:()=>({...io.getState(),busy:io.getState().busy||operation}),
  capture:io.capture,persist:io.persist,secure:()=>globalThis.isSecureContext&&location.protocol==='https:',
  currentRelease:()=>document.documentElement.dataset.uiRelease,
  readVersion:async()=>{const r=await fetch('/app-version.json',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('UPDATE_CHECK_FAILED');return r.json();},
  exclusive:fn=>updateExclusive(io.prefix,fn),reload:()=>location.reload()
 });
 const errors={
  REVIEW_OR_SAVE_BUSY:['Finish the current review or save first. Nothing was refreshed.','진행 중인 검토·저장을 먼저 마치세요. 새로고침하지 않았습니다.'],
  KEEP_DRAFT_BEFORE_UPDATE:['Keep this draft for the update first. Unconfirmed work is not discarded.','먼저 업데이트용 초안 보관을 누르세요. 미확인 작업을 버리지 않습니다.'],
  ANOTHER_TAB_BUSY:['Another tab is reviewing or saving. Close it after that work finishes, then apply manually.','다른 탭에서 검토·저장 중입니다. 작업이 끝난 뒤 해당 탭을 닫고 직접 적용하세요.'],
  SECURE_UPDATE_LOCK_UNAVAILABLE:['Safe update/import locking is unavailable here. Use the fixed HTTPS app in Chrome.','안전한 업데이트·가져오기 잠금을 사용할 수 없습니다. 고정 HTTPS 앱을 Chrome에서 여세요.'],
  HTTPS_REQUIRED_FOR_PWA_UPDATE:['PWA updating requires the approved fixed HTTPS address. This hotspot preview remains unchanged.','PWA 업데이트는 승인된 고정 HTTPS 주소에서 사용합니다. 핫스폿 시험본은 그대로 유지됩니다.'],
  TRANSFER_TARGET_HAS_DATA:['This address already has different records or drafts. Import was blocked; nothing was merged or overwritten.','이 주소에 다른 기록·초안이 있어 가져오기를 차단했습니다. 병합·덮어쓰기하지 않았습니다.'],
  TRANSFER_RECOVERY_REQUIRED:['An interrupted import needs recovery. Reviews, saves and updates are blocked until it is undone.','중단된 가져오기 복구가 필요합니다. 되돌리기 전 검토·저장·업데이트를 차단합니다.'],
  TRANSFER_ROLLBACK_UNCERTAIN:['Import recovery could not be verified. Stop editing; retain the original backup file. Do not reset site data.','가져오기 복구를 확인하지 못했습니다. 편집을 멈추고 원본 백업을 보존하세요. 사이트 데이터를 초기화하지 마세요.']
 };
 const blockInterruptedEditing=()=>{
  if(storage.getItem(PROFILE+'transfer-pending')!==null)for(const control of document.querySelectorAll('main input,main textarea,main select,main button'))control.disabled=true;
 };
 const fail=e=>{const texts=errors[e.message];show(texts?.[0]??'Action stopped; data was not reset. Error: '+e.message,texts?.[1]??'작업 중단; 데이터를 초기화하지 않았습니다. 오류: '+e.message,true);blockInterruptedEditing();};
 const button=(id,run)=>$(id).addEventListener('click',async()=>{
  if(operation)return;const b=$(id);b.disabled=true;
  try{await run();}catch(e){fail(e);}finally{b.disabled=false;}
 });
 button('pwa-install',async()=>{
  if(location.protocol!=='https:'||!isSecureContext){show('This HTTP hotspot is a browser test, not a verified installed PWA. Fixed HTTPS access is needed.','이 HTTP 핫스폿은 브라우저 시험이며 설치형 PWA 검증이 아닙니다. 고정 HTTPS 접속이 필요합니다.',true);return;}
  if(!installEvent){show('Use Chrome menu → Add to Home screen / Install app. The icon opens this inbox. Availability depends on Chrome.','Chrome 메뉴 → 홈 화면에 추가 / 앱 설치를 사용하세요. 아이콘은 수신함을 엽니다. 표시 여부는 Chrome에 따라 다릅니다.');return;}
  await installEvent.prompt();const choice=await installEvent.userChoice;installEvent=null;
  show(choice.outcome==='accepted'?'Browser accepted the installation request. Verify the home icon on your phone.':'Installation was not accepted; no data was removed.',choice.outcome==='accepted'?'브라우저가 설치 요청을 수락했습니다. 휴대폰 홈 아이콘을 확인하세요.':'설치를 수락하지 않았습니다. 데이터를 삭제하지 않았습니다.');
 });
 addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;});
 button('pwa-check',async()=>{
  const r=await control.check();$('pwa-apply').disabled=r.status!=='available';
  show(r.status==='available'?'Update '+r.version+' is available. It will not apply automatically.':'This is the current available release ('+UI_VERSION+').',
   r.status==='available'?'새 버전 '+r.version+'이 있습니다. 자동 적용하지 않습니다.':'현재 제공 버전입니다 ('+UI_VERSION+').');
 });
 button('pwa-keep',()=>{control.keepDraft();show('Draft saved and read back. It remains unconfirmed. Applying an update will require reviewing it again.','초안 저장 후 읽기를 확인했습니다. 확정 기록이 아니며 업데이트 뒤 다시 검토해야 합니다.');});
 button('pwa-apply',()=>control.apply());
 button('backup-export',async()=>{
  if(io.prefix!==PROFILE||io.getState().busy)throw Error('REVIEW_OR_SAVE_BUSY');
  io.persist();const before=JSON.stringify(scopedEntries(storage));operation=true;
  try{
   const text=await exportProfile(storage,location.origin,backupDigest);
   if(before!==JSON.stringify(scopedEntries(storage)))throw Error('RECORDS_CHANGED_EXPORT_AGAIN');
   const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
   a.href=url;a.download='vulture-synthetic-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   show('Backup download requested. It contains scoped synthetic records/drafts only; no API keys, provider logs or paid-call locks. Keep the old address data.','백업 다운로드를 요청했습니다. 해당 합성 기록·초안만 포함하며 키·응답 로그·유료 호출 잠금은 포함하지 않습니다. 기존 주소 데이터도 보존하세요.');
  }finally{operation=false;}
 });
 $('backup-file').addEventListener('change',async()=>{
  staged=null;$('backup-import').disabled=true;$('backup-confirm').checked=false;
  try{
   const f=$('backup-file').files?.[0];if(!f||f.size>2000000)throw Error('TRANSFER_SIZE_LIMIT');
   staged=await inspectProfile(await f.text(),backupDigest);
   $('backup-preview').textContent=JSON.stringify({sourceOrigin:staged.payload.sourceOrigin,targetOrigin:location.origin,sha256:staged.sha256,...staged.counts},null,2);
   show('Backup checked locally. Review its address and counts, then confirm to import into an empty profile. No records have been saved.','백업을 로컬 검증했습니다. 주소와 건수를 확인한 뒤 빈 프로필에 가져오기를 확인하세요. 아직 기록을 저장하지 않았습니다.');
  }catch(e){fail(e);}
 });
 $('backup-confirm').addEventListener('change',()=>{$('backup-import').disabled=!staged||!$('backup-confirm').checked;});
 button('backup-import',async()=>{
  if(!staged||!$('backup-confirm').checked)throw Error('TRANSFER_CONFIRMATION_REQUIRED');
  if(io.getState().busy||io.getState().unconfirmed)throw Error('REVIEW_OR_SAVE_BUSY');
  const signature=io.capture();
  await updateExclusive(io.prefix,()=>{
   if(io.capture()!==signature||io.getState().busy)throw Error('INPUT_CHANGED_DURING_IMPORT');
   const result=importInspected(storage,staged,true);
   importCapture=signature;$('backup-open').disabled=false;
   show('Imported '+result.imported+' missing entries without resaving business records. Choose Show imported records when ready. Existing matching entries were kept.','누락된 항목 '+result.imported+'개를 업무 기록 재저장 없이 가져왔습니다. 준비되면 가져온 기록 보기를 누르세요. 기존 일치 항목은 유지했습니다.');
  });
 });
 button('backup-open',()=>updateExclusive(io.prefix,()=>{
  if(io.getState().busy||importCapture!==io.capture())throw Error('INPUT_CHANGED_DURING_IMPORT');
  location.reload(); // Explicit user action only; imported draft bytes are not overwritten.
 }));
 button('backup-recover',()=>updateExclusive(io.prefix,()=>{
  if(io.getState().busy)throw Error('REVIEW_OR_SAVE_BUSY');
  recoverTransfer(storage);show('Interrupted import undone. Reload this page manually before editing; no automatic refresh or retry.','중단된 가져오기를 되돌렸습니다. 편집 전에 직접 새로고침하세요. 자동 새로고침·재시도는 없습니다.');
 }));
 addEventListener('beforeunload',e=>{
  if(io.getState().busy){e.preventDefault();e.returnValue='';}
 });
 addEventListener('storage',e=>{if(e.key===PROFILE+'transfer-pending')blockInterruptedEditing();});
 if(storage.getItem(PROFILE+'transfer-pending')!==null)fail(Error('TRANSFER_RECOVERY_REQUIRED'));
}
