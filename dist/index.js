const DB_NAME = "install-tracker-db";
const STORE_NAME = "callbacks";
const DB_VERSION = 1;
class PWAInstallTracker {
    constructor(options) {
        this.db = null;
        this.initPromise = null;
        this.callbackParams = options.callbackParams || [];
        this.dbName = options.cacheName || DB_NAME;
        this.isStandalone = window.matchMedia("(display-mode: standalone)").matches;
        this.initialize();
    }
    async initialize() {
        try {
            await this.initDB();
            // Save query params on initial load if not in standalone mode
            if (!this.isStandalone) {
                await this.saveQueryParams();
            }
            else {
                await this.sendSavedParams();
            }
        }
        catch (error) {
            console.error("Error during initialization:", error);
        }
    }
    initDB() {
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
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
        return this.initPromise;
    }
    async ensureDB() {
        if (!this.db) {
            await this.initDB();
        }
    }
    async saveQueryParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const callbacks = [];
        urlParams.forEach((value, key) => {
            if (this.callbackParams.includes(key)) {
                callbacks.push(value);
            }
        });
        if (callbacks.length > 0) {
            try {
                await this.saveToIndexedDB(callbacks);
            }
            catch (error) {
                console.error("Error saving callbacks:", error);
            }
        }
    }
    async saveToIndexedDB(callbacks) {
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
    async getSavedParams() {
        try {
            return await this.getFromIndexedDB();
        }
        catch (error) {
            console.error("Error getting saved params:", error);
            return [];
        }
    }
    async getFromIndexedDB() {
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
    async sendSavedParams() {
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
        }
        catch (error) {
            console.error("Error in sendSavedParams:", error);
        }
    }
    async clearSavedParams() {
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
