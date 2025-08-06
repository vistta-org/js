// Install: activate immediately
self.addEventListener("install", () => self.skipWaiting());

// Activate: take control of all pages and notify clients
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Notification
self.addEventListener("push", (event) => {
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
    self.registration
      .showNotification(data.title || "New Notification", {
        body: data.body || "",
        icon: data.icon || "",
        badge: data.badge || "",
        image: data.image,
        tag: data.tag,
        renotify: data.renotify,
        vibrate: data.vibrate || [200, 100, 200],
        data: {
          url: data.url || self.location.origin,
        },
        actions: data.actions || [],
      })
      .catch((error) => {
        console.error("Error showing notification:", error);
      }),
  );
});

// Notification click: open or focus the tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification?.data?.url || self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});

// Message handler
self.addEventListener("message", (event) => {
  if (event.data?.action === "skipWaiting") {
    self.skipWaiting();
  }

  if (event.data?.action === "unsubscribe") {
    self.registration.pushManager.getSubscription().then((subscription) => {
      if (subscription) {
        subscription
          .unsubscribe()
          .then((success) => console.log("Unsubscribed successfully:", success))
          .catch((error) => console.error("Failed to unsubscribe:", error));
      }
    });
  }
});
