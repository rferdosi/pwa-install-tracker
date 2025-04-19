interface InstallTrackerOptions {
    cacheName?: string;
    callbackParams: string[];
}
declare class PWAInstallTracker {
    private dbName;
    private isStandalone;
    private callbackParams;
    private db;
    private initPromise;
    constructor(options: InstallTrackerOptions);
    private initialize;
    private initDB;
    private ensureDB;
    private saveQueryParams;
    private saveToIndexedDB;
    getSavedParams(): Promise<string[]>;
    private getFromIndexedDB;
    private sendSavedParams;
    private clearSavedParams;
}
export default PWAInstallTracker;
