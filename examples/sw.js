self.addEventListener("install", (event) => {
  console.log(event);
  console.log("Service worker installing");
  
  // Get URL parameters
  const url = new URL(self.location.href);
  const params = Object.fromEntries(url.searchParams);
  console.log("Service Worker URL parameters:", params);
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
});
