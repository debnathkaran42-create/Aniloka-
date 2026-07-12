/* =========================================================
   ANILOKA — LOCAL ASSET STORAGE (IndexedDB)
   -----------------------------------------------------------
   Our own image storage system: real files picked from the
   admin's gallery are stored as Blobs inside the browser's
   IndexedDB (much larger capacity than localStorage, which
   can't hold images at all). No server, no paid storage.

   Reference scheme: any manga.cover / manga.banner / chapter
   page can be either:
     - a normal path/URL string   e.g. "images/manga/covers/x.jpg"
     - an IndexedDB reference     e.g. "idb://cover:manga-1"
   resolveImageSrc() below turns either into something an
   <img> tag can use.
   ========================================================= */

const AssetStore = (() => {
  const DB_NAME = "aniloka_assets_db";
  const STORE = "images";
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function put(key, blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function get(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function del(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function delPrefix(prefix) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (String(cursor.key).startsWith(prefix)) cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // in-memory cache of object URLs so we don't regenerate repeatedly
  const urlCache = new Map();

  async function getObjectURL(key) {
    if (urlCache.has(key)) return urlCache.get(key);
    const blob = await get(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(key, url);
    return url;
  }

  function fileToBlob(file) { return file; } // File already is a Blob

  return { put, get, del, delPrefix, getObjectURL, fileToBlob };
})();

/* ---------------------------------------------------------
   resolveImageSrc(value, imgEl)
   Sets imgEl.src correctly whether value is a normal path
   or an "idb://key" reference. Falls back to onerror-driven
   placeholder handling already used across the site.
   --------------------------------------------------------- */
async function resolveImageSrc(value, imgEl) {
  if (!value) { imgEl.dispatchEvent(new Event("error")); return; }
  if (value.startsWith("idb://")) {
    const key = value.slice(6);
    const url = await AssetStore.getObjectURL(key);
    if (url) imgEl.src = url;
    else imgEl.dispatchEvent(new Event("error"));
  } else {
    imgEl.src = value;
  }
}
