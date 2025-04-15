interface InstallTrackerOptions {
    cacheName?: string;
    callbackParams: string[];
    registerServiceWorker?: boolean;
}
declare class PWAInstallTracker {
    private cacheName;
    private isStandalone;
    private callbackParams;
    private registerServiceWorker;
    constructor(options: InstallTrackerOptions);
    private initialize;
    private saveQueryParams;
    getSavedParams(): Promise<string[]>;
    private sendSavedParams;
}
export default PWAInstallTracker;
