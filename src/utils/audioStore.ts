type StoredChunk = {
  sessionId: string;
  sequence: number;
  createdAt: number;
  blob: Blob;
};

const DB_NAME = "ostiro-flow-audio";
const DB_VERSION = 1;
const STORE_NAME = "chunks";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponible."));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: ["sessionId", "sequence"]
        });
        store.createIndex("bySession", "sessionId", { unique: false });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  return dbPromise;
}

export async function saveAudioChunk(chunk: StoredChunk) {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(chunk);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAudioChunks(sessionId: string) {
  const db = await openDatabase();

  return new Promise<Blob[]>((resolve, reject) => {
    const chunks: StoredChunk[] = [];
    const transaction = db.transaction(STORE_NAME, "readonly");
    const index = transaction.objectStore(STORE_NAME).index("bySession");
    const request = index.openCursor(IDBKeyRange.only(sessionId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(
          chunks.sort((a, b) => a.sequence - b.sequence).map((item) => item.blob)
        );
        return;
      }
      chunks.push(cursor.value as StoredChunk);
      cursor.continue();
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearAudioSession(sessionId: string) {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const index = transaction.objectStore(STORE_NAME).index("bySession");
    const request = index.openCursor(IDBKeyRange.only(sessionId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
