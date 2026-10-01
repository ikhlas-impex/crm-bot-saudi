/**
 * Persists the complaint form (fields + uploaded File objects) in IndexedDB
 * so it survives the full-page redirect to Moyasar's 3-D Secure page and back.
 * IndexedDB is used instead of sessionStorage because it can store File blobs
 * directly without size-limited base64 encoding.
 */

const DB_NAME = 'impex-complaint';
const STORE = 'drafts';
const KEY = 'pending-online-payment';
const MAX_AGE_MS = 60 * 60 * 1000; // drafts older than 1 hour are discarded

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export function savePaymentDraft(draft) {
  return run('readwrite', store => store.put({ ...draft, savedAt: Date.now() }, KEY));
}

export async function loadPaymentDraft() {
  try {
    const draft = await run('readonly', store => store.get(KEY));
    if (!draft || Date.now() - draft.savedAt > MAX_AGE_MS) return null;
    return draft;
  } catch (err) {
    console.error('Failed to load payment draft:', err);
    return null;
  }
}

export async function clearPaymentDraft() {
  try {
    await run('readwrite', store => store.delete(KEY));
  } catch (err) {
    console.error('Failed to clear payment draft:', err);
  }
}
