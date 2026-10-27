
"use strict";

const CACHE_PREFIX = "nelsenshop-pwa-";
const CACHE_VERSION = "v2";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon.svg"
];

// Install: cache aset dasar aplikasi.
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

// Activate: hapus cache versi lama milik aplikasi ini.
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();

            await Promise.all(
                keys
                    .filter((key) =>
                        key.startsWith(CACHE_PREFIX) &&
                        key !== CACHE_NAME
                    )
                    .map((key) => caches.delete(key))
            );

            await self.clients.claim();
        })()
    );
});

// Tangani permintaan halaman dan aset dari origin sendiri.
self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== "GET") return;
    if (url.origin !== self.location.origin) return;

    // Jangan cache API, endpoint dinamis, atau URL berparameter.
    if (
        url.pathname.includes("/api/") ||
        url.search ||
        request.headers.has("authorization")
    ) {
        return;
    }

    // Navigasi: utamakan server, fallback ke halaman offline.
    if (request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(request, {
                        cache: "no-store"
                    });

                    if (response.ok) {
                        const cache = await caches.open(CACHE_NAME);

                        await cache.put(
                            "./index.html",
                            response.clone()
                        );
                    }

                    return response;
                } catch {
                    const cached =
                        await caches.match("./index.html") ||
                        await caches.match("./");

                    return cached || new Response(
                        "Anda sedang offline. Hubungkan internet untuk membuka Nelsen SHOP.",
                        {
                            status: 503,
                            headers: {
                                "Content-Type": "text/plain; charset=utf-8"
                            }
                        }
                    );
                }
            })()
        );

        return;
    }

    // Hanya cache aset statis yang memang dibutuhkan aplikasi.
    const isStaticAsset =
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".jpeg") ||
        url.pathname.endsWith(".ico") ||
        url.pathname.endsWith(".woff2");

    if (!isStaticAsset) return;

    event.respondWith(
        (async () => {
            try {
                const response = await fetch(request, {
                    cache: "no-cache"
                });

                if (response.ok && response.type === "basic") {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                }

                return response;
            } catch {
                return (
                    await caches.match(request)
                ) || Response.error();
            }
        })()
    );
});
