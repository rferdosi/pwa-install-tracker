const FAKE_ENDPOINT = "/fake-endpoint";
class PWAInstallTracker {
    constructor(options) {
        this.callbackParams = options.callbackParams || [];
        this.cacheName = options.cacheName || "intall-tracker-cache";
        this.isStandalone = window.matchMedia("(display-mode: standalone)").matches;
        this.initialize();
    }
    initialize() {
        // Save query params on initial load if not in standalone mode
        if (!this.isStandalone) {
            this.saveQueryParams();
        }
        else {
            this.sendSavedParams();
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
                const cache = await caches.open(this.cacheName);
                const responseBody = JSON.stringify(callbacks);
                const response = new Response(responseBody);
                await cache.put(FAKE_ENDPOINT, response);
            }
            catch (error) {
                console.error("Error saving callbacks:", error);
            }
        }
    }
    async getSavedParams() {
        try {
            const cache = await caches.open(this.cacheName);
            const response = await cache.match(FAKE_ENDPOINT);
            if (!response) {
                return [];
            }
            const responseBody = await response.json();
            return responseBody;
        }
        catch (error) {
            console.error("Error getting saved params:", error);
            return [];
        }
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
                    const cache = await caches.open(this.cacheName);
                    await cache.delete(FAKE_ENDPOINT);
                }
            }
        }
        catch (error) {
            console.error("Error in sendSavedParams:", error);
        }
    }
}
export default PWAInstallTracker;
