const sw = /** @type {any} */ (self);

// Install: activate immediately
sw.addEventListener("install", () => sw.skipWaiting());

// Activate: take control of all pages and notify clients
sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

// Push Notification
sw.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "New Notification",
      body: event.data?.text() || "You have a new update.",
    };
  }

  event.waitUntil(
    sw.registration
      .showNotification(data.title || "New Notification", {
        body: data.body || "",
        icon: data.icon || "",
        badge: data.badge || "",
        image: data.image,
        tag: data.tag,
        renotify: data.renotify,
        vibrate: data.vibrate || [200, 100, 200],
        data: {
          url: data.url || sw.location.origin,
        },
        actions: data.actions || [],
      })
      .catch((error) => {
        console.error("Error showing notification:", error);
      }),
  );
});

// Notification click: open or focus the tab
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification?.data?.url || sw.location.origin;

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen) {
          return client.focus();
        }
      }
      return sw.clients.openWindow(urlToOpen);
    }),
  );
});

// Message handler
sw.addEventListener("message", (event) => {
  if (event.data?.action === "skipWaiting") {
    sw.skipWaiting();
  }

  if (event.data?.action === "unsubscribe") {
    sw.registration.pushManager.getSubscription().then((subscription) => {
      if (subscription) {
        subscription
          .unsubscribe()
          .then((success) => console.log("Unsubscribed successfully:", success))
          .catch((error) => console.error("Failed to unsubscribe:", error));
      }
    });
  }
});
