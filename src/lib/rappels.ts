import { sansEtoiles } from "./text";
import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import { etatNotif } from "./notifications";
import { texteRappel } from "./suggestions";
import { bilan, heureHabituelle } from "./progres";

/**
 * Rappels personnels : si l'élève ne revient pas pendant 3 jours, une notification lui propose
 * la suite de ce qu'il faisait (sujet commencé, leçon suivante, œuvre proche…).
 *
 * Le texte est choisi sur le téléphone et rangé dans un cache que lit le service worker (public/push-sw.js).
 * Le serveur sait seulement quand réveiller le téléphone : jamais ce que l'élève a lu.
 * Sans retour de l'élève, un 2e rappel part une semaine plus tard, puis plus rien.
 * Avec une série d'au moins 2 jours, le rappel part dès le lendemain pour qu'elle ne s'arrête pas.
 * Il part à l'heure où l'élève vient d'habitude (18 h tant qu'on ne la connaît pas).
 */
export const JOURS_AVANT_RAPPEL = 3;
const CACHE = "litterae-rappel";
const ACTIFS = "rappels-actifs";
const PROGRAMME = "rappel-cible";

/** `heure` h (UTC) du jour situé `jours` jours après aujourd'hui. */
function heureDuRappel(t: number, jours: number, heure: number) {
  const d = new Date(t);
  d.setUTCDate(d.getUTCDate() + jours);
  d.setUTCHours(heure, 0, 0, 0);
  return d.getTime();
}

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
  // Le texte d'une série ne vaut que pour le lendemain ; le 2e rappel, une semaine après, propose de recommencer.
  const r = texteRappel();
  const texte = { ...r, titre: sansEtoiles(r.titre), texte: sansEtoiles(r.texte), date: Date.now(), expire: Date.now() + 2 * 864e5,
    ensuite: { titre: "Ta dissertation t'attend", texte: "Reprends avec le défi du jour : un sujet, 5 minutes, 2 arguments.", lien: "#/defi" } };
  await c.put("/rappel", new Response(JSON.stringify(texte), { headers: { "content-type": "application/json" } }));
}

/**
 * À chaque visite : met à jour le texte du rappel et repousse sa date (au plus une fois toutes les 12 heures).
 * Ne fait rien si les notifications ne sont pas activées ou si l'élève a coupé les rappels.
 */
export async function preparerRappel() {
  if (!SERVEUR_URL || etatNotif() !== "abonne" || !rappelsActifs()) return;
  try {
    await rangerTexte();
    const jours = bilan().serie >= 2 ? 1 : JOURS_AVANT_RAPPEL;
    // Même calcul que le serveur : l'heure habituelle (UTC, heure d'Abidjan) le jour du rappel. On ne le redit que s'il change.
    const heure = heureHabituelle();
    const cible = heureDuRappel(Date.now(), jours, heure ?? 18);
    if (read<number>(PROGRAMME, 0) === cible || !navigator.onLine) return;
    const endpoint = await adresse();
    if (!endpoint) return;
    await envoyer({ endpoint, jours, ...(heure !== null ? { heure } : {}) });
    write(PROGRAMME, cible);
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
