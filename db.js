/* =============================================================================
 * db.js — Tiny IndexedDB wrapper
 * -----------------------------------------------------------------------------
 * We persist the whole application state as a single record inside an IndexedDB
 * object store. IndexedDB is used (instead of LocalStorage) because uploaded
 * photos and attachments are stored as base64 and can easily exceed the ~5MB
 * LocalStorage quota.
 *
 * The wrapper exposes a Promise-based API: DB.get(), DB.set(state).
 * A LocalStorage fallback is included for the rare environment where IndexedDB
 * is unavailable (e.g. some private-browsing modes).
 * ========================================================================== */

const DB = (() => {
  const DB_NAME = "apex-performance";
  const STORE = "state";
  const KEY = "app-state";
  const LS_KEY = "apex-performance-state";

  let dbPromise = null;

  /** Open (or upgrade) the IndexedDB database. */
  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  /** Read the persisted state (or null if none). Falls back to LocalStorage. */
  async function get() {
    try {
      const db = await open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // Fallback: LocalStorage
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  }

  /** Persist the full state object. Falls back to LocalStorage on failure. */
  async function set(state) {
    try {
      const db = await open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(state, KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        return true;
      } catch (err) {
        console.error("Failed to persist state", err);
        return false;
      }
    }
  }

  /** Wipe all persisted data (used by the "reset demo data" action). */
  async function clear() {
    try {
      const db = await open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      /* ignore */
    }
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  return { get, set, clear };
})();
