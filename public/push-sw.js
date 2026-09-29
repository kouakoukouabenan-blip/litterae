// Notifications de Litterae, chargé par le service worker de l'application.
// Le serveur envoie une notification vide ; on va chercher le dernier message à afficher.
const SERVEUR = "https://litterae-serveur.kouakoukouabenan.workers.dev";

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let annonce = null;
    try {
      const r = await fetch(SERVEUR + "/push/dernier", { cache: "no-store" });
      annonce = (await r.json()).annonce;
    } catch {
      // Hors connexion ou serveur injoignable : notification générique.
    }
    await self.registration.showNotification(annonce?.titre ?? "Litterae", {
      body: annonce ? annonce.texte : "Un nouveau message t'attend sur l'accueil.",
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: annonce ? `annonce-${annonce.id}` : "litterae",
      lang: "fr",
      data: { id: annonce?.id ?? null, lien: annonce?.lien?.startsWith("#/") ? annonce.lien : "#/" }
    });
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const { id, lien } = event.notification.data ?? {};
  const url = self.registration.scope + (id ? `?annonce=${id}` : "") + (lien ?? "#/");
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const ouverte = fenetres.find(f => f.url.startsWith(self.registration.scope));
    if (ouverte) {
      await ouverte.focus();
      return ouverte.navigate(url);
    }
    return self.clients.openWindow(url);
  })());
});
