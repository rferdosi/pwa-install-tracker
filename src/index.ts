interface InstallTrackerOptions {
  cacheName?: string;
  callbackParams: string[];
}

const DB_NAME = "install-tracker-db";
const STORE_NAME = "callbacks";
const DB_VERSION = 1;

class PWAInstallTracker {
  private dbName: string;
  private isStandalone: boolean;
  private callbackParams: string[];
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(options: InstallTrackerOptions) {
    this.callbackParams = options.callbackParams || [];
    this.dbName = options.cacheName || DB_NAME;
    this.isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.initDB();
      // Save query params on initial load if not in standalone mode
      if (!this.isStandalone) {
        await this.saveQueryParams();
      } else {
        await this.sendSavedParams();
      }
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  }

  private initDB(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onerror = () => {
        console.error("Error opening database");
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }
  }

  private async saveQueryParams(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const callbacks: string[] = [];

    urlParams.forEach((value, key) => {
      if (this.callbackParams.includes(key)) {
        callbacks.push(value);
      }
    });

    if (callbacks.length > 0) {
      try {
        await this.saveToIndexedDB(callbacks);
      } catch (error) {
        console.error("Error saving callbacks:", error);
      }
    }
  }

  private async saveToIndexedDB(callbacks: string[]): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: 'callbacks', values: callbacks });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getSavedParams(): Promise<string[]> {
    try {
      return await this.getFromIndexedDB();
    } catch (error) {
      console.error("Error getting saved params:", error);
      return [];
    }
  }

  private async getFromIndexedDB(): Promise<string[]> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('callbacks');

      request.onsuccess = () => {
        const data = request.result;
        resolve(data ? data.values : []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async sendSavedParams(): Promise<void> {
    try {
      const savedCallbacks = await this.getSavedParams();

      if (savedCallbacks.length > 0) {
        const sendPromises = savedCallbacks.map(async (callback) => {
          return fetch(callback, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
        });

        const results = await Promise.all(sendPromises);
        const allSuccessful = results.every((result) => result.ok);

        if (allSuccessful) {
          // Clear saved params after successful send
          await this.clearSavedParams();
        }
      }
    } catch (error) {
      console.error("Error in sendSavedParams:", error);
    }
  }

  private async clearSavedParams(): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('callbacks');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export default PWAInstallTracker;
