import {exclusiveUI} from "./review-guard.mjs";
export const UI_VERSION='0.14.3';
export function createUpdateController(io) {
  let candidate=null, acknowledged=null,checking=false;
  return {
    async check(){
      if(checking)return {status:'busy'};
      checking=true;
      try{
        const next=await io.readVersion();
        if(!next||next.schema!=='vulture-ui-release/1'||!/^[a-f0-9]{64}$/.test(next.release))throw Error('UPDATE_METADATA_INVALID');
        candidate=next;
        return {status:next.release===io.currentRelease()?'current':'available',version:next.version};
      }finally{checking=false;}
    },
    keepDraft(){
      if(io.getState().busy)throw Error('REVIEW_OR_SAVE_BUSY');
      io.persist();acknowledged=io.capture();
      return {status:'draft-kept'};
    },
    async apply(){
      if(!candidate||candidate.release===io.currentRelease())throw Error('NO_NEW_VERSION');
      if(!io.secure())throw Error('HTTPS_REQUIRED_FOR_PWA_UPDATE');
      const selected=candidate;
      return io.exclusive(async()=>{
        if(io.getState().busy)throw Error('REVIEW_OR_SAVE_BUSY');
        if(io.getState().unconfirmed&&acknowledged!==io.capture())throw Error('KEEP_DRAFT_BEFORE_UPDATE');
        io.persist();const captured=io.capture();
        // Prevent applying an unreviewed third release after the user checked this one.
        const now=await io.readVersion();if(now.release!==selected.release||candidate.release!==selected.release)throw Error('UPDATE_CHANGED_CHECK_AGAIN');
        if(io.getState().busy||captured!==io.capture()||(io.getState().unconfirmed&&acknowledged!==io.capture()))throw Error('INPUT_CHANGED_DURING_UPDATE');
        io.reload();return {status:'reload-requested'};
      });
    }
  };
}
export const updateExclusive=(prefix,run)=>exclusiveUI(prefix,run);
