/*
 * Service worker da nommi: só entrega os avisos push. Não intercepta fetch e
 * não guarda cache, para nunca atrapalhar o app. O aviso não carrega conteúdo
 * da notificação: quem toca abre o app e lê lá dentro, com a sua sessão.
 */
self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("nommi", {
      body: "Tem novidade te esperando por aqui.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "nommi-aviso",
      renotify: true,
      data: { url: "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alvo = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) return c.focus();
      }
      return clients.openWindow(alvo);
    }),
  );
});
