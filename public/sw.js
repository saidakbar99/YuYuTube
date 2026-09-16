const VERSION = "yuyutube-v3";
const SHELL = `${VERSION}-shell`;
const THUMBS = `${VERSION}-thumbs`;

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>YuYuTube</title><style>
html,body{height:100%;margin:0;background:#0f0f0f;font-family:Roboto,Arial,sans-serif;
display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#f1f1f1;
-webkit-user-select:none;user-select:none}
h1{font-size:1.5rem;font-weight:600;margin:1.5rem 0 .5rem}p{font-size:1rem;color:#aaa;max-width:22rem;padding:0 1.5rem}
</style></head><body><div style="font-size:4.5rem">&#9729;&#65039;</div>
<h1>No internet</h1><p>The videos are taking a nap. They&rsquo;ll be back when the internet comes home.</p></body></html>`;

const offlinePage = () =>
  new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });

// A failed put (quota, redirected/partial response) must never reject the fetch itself.
function store(cache, request, response) {
  try {
    cache.put(request, response).catch(() => undefined);
  } catch {
    // unsupported request/response pair — serving still works
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (!response.redirected && (response.ok || response.type === "opaque")) {
    store(cache, request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) store(cache, request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) ?? (await fallback());
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icons/icon-192.png"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.hostname === "i.ytimg.com") {
    event.respondWith(cacheFirst(request, THUMBS));
    return;
  }

  // Leave the YouTube player's own traffic completely alone.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL, async () => (await caches.match("/", { ignoreSearch: true })) ?? offlinePage()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  event.respondWith(networkFirst(request, SHELL, async () => Response.error()));
});
