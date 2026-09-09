/*
 * REDQUIRK admin push service worker.
 *
 * Intentionally MINIMAL: it handles only `push` and `notificationclick`. There is
 * NO `fetch` handler and NO caching, so it never intercepts navigation/requests
 * and adds no runtime overhead to the site — it just sits idle until a push
 * arrives. It is only ever registered on an admin's device (when they enable
 * notifications), never on the storefront.
 */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "REDQUIRK";
  const options = {
    body: data.body || "New order",
    tag: data.tag || "rq-order", // same tag → OS coalesces duplicates
    renotify: true,
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: data.url || "/admin-v2" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin-v2";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus an existing admin tab and route it to the order if possible.
      for (const client of all) {
        if (client.url.includes("/admin-v2")) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* cross-origin/navigation guard — ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
