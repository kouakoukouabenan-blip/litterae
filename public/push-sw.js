// Notifications de Litterae, chargé par le service worker de l'application.
// Le serveur envoie une notification vide ; on va chercher le dernier message à afficher.
const SERVEUR = "https://litterae-serveur.kouakoukouabenan.workers.dev";

/** Texte du rappel personnel rangé par l'appli (src/lib/rappels.ts). */
async function rappel() {
  let r = null;
  try {
    r = await (await (await caches.open("litterae-rappel")).match("/rappel"))?.json();
  } catch {
    // Pas encore de texte rangé.
  }
  const lien = typeof r?.lien === "string" && r.lien.startsWith("#/") ? r.lien : "#/accueil";
  return { id: "rappel", titre: r?.titre || "Litterae", texte: r?.texte || "Ta dissertation avance mieux un peu chaque jour. Reprends où tu en étais.", lien };
}

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let annonce = null;
    try {
      // L'adresse du téléphone permet de recevoir aussi une notification personnelle (réponse à une question).
      const endpoint = (await self.registration.pushManager.getSubscription())?.endpoint ?? "";
      const r = await fetch(SERVEUR + "/push/dernier" + (endpoint ? `?e=${encodeURIComponent(endpoint)}` : ""), { cache: "no-store" });
      const d = await r.json();
      annonce = d.annonce;
      // Rappel après quelques jours d'absence : le texte a été choisi par l'appli sur ce téléphone.
      if (!annonce && d.rappel) annonce = await rappel();
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
