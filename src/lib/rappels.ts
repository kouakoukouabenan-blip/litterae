import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import { etatNotif } from "./notifications";
import { texteRappel } from "./suggestions";

/**
 * Rappels personnels : si l'élève ne revient pas pendant 3 jours, une notification lui propose
 * la suite de ce qu'il faisait (sujet commencé, leçon suivante, œuvre proche…).
 *
 * Le texte est choisi sur le téléphone et rangé dans un cache que lit le service worker (public/push-sw.js).
 * Le serveur sait seulement quand réveiller le téléphone : jamais ce que l'élève a lu.
 * Sans retour de l'élève, un 2e rappel part une semaine plus tard, puis plus rien.
 */
export const JOURS_AVANT_RAPPEL = 3;
const CACHE = "litterae-rappel";
const ACTIFS = "rappels-actifs";
const PROGRAMME = "rappel-programme";

export const rappelsActifs = () => read<boolean>(ACTIFS, true);

async function adresse() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    return (await reg?.pushManager.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

async function envoyer(corps: object) {
  await fetch(SERVEUR_URL + "/push/rappel", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(corps), keepalive: true });
}

/** Range le texte du prochain rappel là où le service worker le trouvera. */
async function rangerTexte() {
  if (!("caches" in window)) return;
  const c = await caches.open(CACHE);
  await c.put("/rappel", new Response(JSON.stringify({ ...texteRappel(), date: Date.now() }), { headers: { "content-type": "application/json" } }));
}

/**
 * À chaque visite : met à jour le texte du rappel et repousse sa date (au plus une fois toutes les 12 heures).
 * Ne fait rien si les notifications ne sont pas activées ou si l'élève a coupé les rappels.
 */
export async function preparerRappel() {
  if (!SERVEUR_URL || etatNotif() !== "abonne" || !rappelsActifs()) return;
  try {
    await rangerTexte();
    if (Date.now() - read<number>(PROGRAMME, 0) < 12 * 3600e3 || !navigator.onLine) return;
    const endpoint = await adresse();
    if (!endpoint) return;
    await envoyer({ endpoint, jours: JOURS_AVANT_RAPPEL });
    write(PROGRAMME, Date.now());
  } catch {
    // Hors connexion : ce sera fait à la prochaine visite.
  }
}

export async function changerRappels(actifs: boolean) {
  write(ACTIFS, actifs);
  write(PROGRAMME, 0);
  if (actifs) return preparerRappel();
  const endpoint = await adresse();
  if (endpoint) await envoyer({ endpoint, arret: true }).catch(() => {});
}
