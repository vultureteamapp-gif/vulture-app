// UI only. The server's ledger, cooldown and paid-call locks are unchanged.
export function createReviewGuard({now=Date.now, cooldownMs=1200}={}) {
  let running=false, last=null;
  return {
    begin(key) {
      if(running)return {ok:false,code:'DOCUMENT_REQUEST_BUSY'};
      if(last?.key===key && now()-last.at<cooldownMs)return {ok:false,code:'DUPLICATE_INPUT_COOLDOWN'};
      running=true;return {ok:true};
    },
    finish(key,accepted) {if(accepted)last={key,at:now()};running=false;},
    isRunning:()=>running
  };
}
export async function withUIActivity(prefix, run, {storage=globalThis.localStorage,locks=globalThis.navigator?.locks}={}) {
  if(storage.getItem(prefix+'transfer-pending')!==null)throw Error('TRANSFER_RECOVERY_REQUIRED');
  if(locks?.request)return locks.request('vulture-ui-update:'+prefix,{mode:'shared'},()=>{
    if(storage.getItem(prefix+'transfer-pending')!==null)throw Error('TRANSFER_RECOVERY_REQUIRED');
    return run();
  });
  return run(); // Existing confirmation mutex applies; PWA update application requires Web Locks.
}
export async function exclusiveUI(prefix,run,locks=globalThis.navigator?.locks) {
  if(!locks?.request)throw Error('SECURE_UPDATE_LOCK_UNAVAILABLE');
  return locks.request('vulture-ui-update:'+prefix,{mode:'exclusive',ifAvailable:true},lock=>{
    if(!lock)throw Error('ANOTHER_TAB_BUSY');
    return run();
  });
}
