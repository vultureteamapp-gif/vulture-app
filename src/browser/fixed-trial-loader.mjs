// This controller can only fetch and load source documents. It has no analysis or record-save capability.
export function createFixedTrialLoader(io) {
  let loading = false, pending = null;
  const stamp = value => JSON.stringify(value);
  async function run(replacementConfirmed = false) {
    if (loading || io.isBlocked()) return {status:'busy'};
    const initial = io.capture(), fingerprint = stamp(initial);
    if (io.hasDraft(initial) && (!replacementConfirmed || pending !== fingerprint)) {
      pending = fingerprint;
      io.show({status:'confirmation'});
      return {status:'confirmation'};
    }
    pending = null;
    loading = true;
    io.setLoading(true);
    io.show({status:'loading'});
    let completed = false;
    try {
      const info = await io.fetchTrial();
      const checked = await io.validateTrial(info);
      if (stamp(io.capture()) !== fingerprint) throw Error('DRAFT_CHANGED');
      let backupKey = null;
      if (io.hasDraft(initial)) backupKey = io.backupDraft(initial);
      io.applyTrial(checked);
      const result = {status:'success', count:checked.documents.length, ids:checked.ids, backupKey};
      io.show(result);
      completed = true;
      return result;
    } catch (error) {
      const code = /^[A-Z][A-Z0-9_]*$/.test(error?.message ?? '') ? error.message : 'LOAD_FAILED';
      const result = {status:'error', code};
      io.show(result);
      return result;
    } finally {
      loading = false;
      io.setLoading(false);
      if (completed) io.focusSource();
    }
  }
  return {
    load:() => run(false),
    confirmReplacement:() => run(true),
    cancel() { if (!loading) { pending = null; io.show({status:'cancelled'}); } },
    isLoading:() => loading
  };
}

export function backupTrialDraft(storage, key, value) {
  const bytes = JSON.stringify(value);
  try {
    if (storage.getItem(key) !== null) throw Error('DRAFT_BACKUP_COLLISION');
    storage.setItem(key, bytes);
    if (storage.getItem(key) !== bytes) throw Error('DRAFT_BACKUP_READBACK_FAILED');
  } catch { throw Error('DRAFT_BACKUP_FAILED'); }
  return key;
}

export function replaceTrialDraft(storage, key, value) {
  const before = storage.getItem(key), bytes = JSON.stringify(value);
  try {
    storage.setItem(key, bytes);
    if (storage.getItem(key) !== bytes) throw Error('DRAFT_WRITE_READBACK_FAILED');
  } catch {
    if (storage.getItem(key) !== before) {
      try { if (before === null) storage.removeItem(key); else storage.setItem(key, before); }
      catch { throw Error('DRAFT_RESTORE_UNCERTAIN'); }
      if (storage.getItem(key) !== before) throw Error('DRAFT_RESTORE_UNCERTAIN');
    }
    throw Error('DRAFT_WRITE_FAILED');
  }
}
