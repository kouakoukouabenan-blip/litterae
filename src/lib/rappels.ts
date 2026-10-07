import { sansEtoiles } from "./text";
import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import { etatNotif } from "./notifications";
import { devoirDuJour, texteSuite } from "./suggestions";
import { bilan, heureHabituelle, jourLocal } from "./progres";
import { carteNotification, paysDecouverts, TOUS_LES_PAYS } from "./fil";
import { badgeProche } from "./collection";
import { sujetDuJour } from "./defi";

/**
 * Notifications du jour : au plus une par jour, à l'heure où l'élève vient d'habitude (18 h tant qu'on ne la connaît pas),
 * et seulement s'il n'est pas encore venu ce jour-là. Sans retour de l'élève, une 2e part deux jours plus tard, puis plus rien.
 *
 * Le contenu change chaque jour : une question à jouer (vrai ou faux, devine l'œuvre), la citation du défi du jour,
 * un badge ou un pays presque gagné, la suite de ce que l'élève faisait. Avant tout : un devoir à rendre,
 * puis la série qui va s'arrêter, puis le dimanche le bilan de la semaine.
 *
 * Les textes sont choisis sur le téléphone et rangés dans un cache que lit le service worker (public/push-sw.js).
 * Le serveur sait seulement quand réveiller le téléphone : jamais ce que l'élève a lu.
 */
const CACHE = "litterae-rappel";
const ACTIFS = "rappels-actifs";
const PROGRAMME = "rappel-cible";
const JOUR = 864e5;
/** La première notification part le lendemain ; sans retour, la 2e deux jours après. */
const PREMIERE = 1;
const ENSUITE = 2;

export interface TexteNotif { titre: string; texte: string; lien: string; type: string }

const court = (t: string, n: number) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)).replace(/[,;:.]$/, "") + "…");
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Une carte à jouer : la question tient dans la notification, la réponse se donne dans « Pour toi ». */
function question(jour: string): TexteNotif | null {
  const c = carteNotification(jour, "question");
  const lien = `#/accueil?carte=${encodeURIComponent(c?.cle ?? "")}`;
  if (c?.t === "vraifaux") return { titre: "Vrai ou faux ?", texte: sansEtoiles(c.phrase), lien, type: "question" };
  if (c?.t === "devine") return { titre: "Devine l'œuvre", texte: `${majuscule(c.indices.join(", "))}. Tu trouves ?`, lien, type: "question" };
  return null;
}

function defi(jour: string): TexteNotif | null {
  const s = sujetDuJour(jour);
  if (!s) return null;
  return { titre: "Le défi du jour", texte: `« ${court(sansEtoiles(s.citation), 110)} » (${s.auteur}). 2 arguments en 5 minutes ?`, lien: "#/defi", type: "defi" };
}

/** Un badge à moitié gagné, sinon un nouveau pays pour le tour du monde. */
function presque(jour: string): TexteNotif | null {
  const b = badgeProche();
  if (b) return { titre: `Presque le badge ${b.nom}`, texte: b.reste(b.objectif - b.valeur), lien: "#/collection", type: "badge" };
  const n = paysDecouverts().length;
  if (!n || n >= TOUS_LES_PAYS.length) return null;
  const c = carteNotification(jour, "pays");
  if (c?.t !== "pays") return null;
  return { titre: "Tour du monde littéraire", texte: `Tu as découvert ${n} pays sur ${TOUS_LES_PAYS.length}. D'où vient « ${sansEtoiles(c.w.titre)} » ?`, lien: `#/accueil?carte=${encodeURIComponent(c.cle)}`, type: "pays" };
}

const suite = (): TexteNotif => ({ ...texteSuite(), type: "suite" });
const SORTES = [question, defi, presque, suite];

/** Texte de la notification du jour situé `apres` jours après aujourd'hui. */
export function texteDuJour(apres: number, maintenant = Date.now()): TexteNotif {
  const t = maintenant + apres * JOUR;
  const jour = jourLocal(t);
  const devoir = devoirDuJour(t);
  if (devoir) return { ...devoir.notif, lien: devoir.lien, type: "devoir" };
  const b = bilan(undefined, maintenant);
  // Série : le lendemain, dernier jour pour la garder si la protection de la semaine a déjà servi.
  const lundi = new Date(t).getDay() === 1;
  if (apres === 1 && b.serie >= 2 && !b.protectionDispo && !lundi)
    return { titre: `Ta série de ${b.serie} jours s'arrête ce soir`, texte: "Relève le défi du jour en 5 minutes pour la garder.", lien: "#/defi", type: "serie" };
  // Le dimanche : ce que l'élève a fait dans la semaine.
  if (new Date(t).getDay() === 0 && b.joursActifs >= 2)
    return {
      titre: "Ta semaine sur Litterae",
      texte: `${pluriel(b.joursActifs, "jour actif", "jours actifs")}, ${pluriel(b.lectures, "lecture", "lectures")}, ${pluriel(b.defis, "défi", "défis")}. Vois ton bilan et prépare la semaine.`,
      lien: "#/progres", type: "bilan"
    };
  // Sinon, une sorte différente chaque jour (la suivante si celle du jour n'a rien à dire).
  const n = Math.floor(Date.parse(jour + "T12:00:00Z") / JOUR);
  for (let i = 0; i < SORTES.length; i++) {
    const r = SORTES[(n + i) % SORTES.length](jour);
    if (r) {
      // Série en cours : rappelée en fin de texte, le contenu reste celui du jour.
      if (apres === 1 && b.serie >= 2 && r.type !== "suite") return { ...r, texte: `${r.texte} Ta série : ${b.serie} jours.` };
      return r;
    }
  }
  return suite();
}

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

/** Range les textes des prochaines notifications là où le service worker les trouvera, un par jour. */
async function rangerTexte() {
  if (!("caches" in window)) return;
  const c = await caches.open(CACHE);
  const parJour: Record<string, TexteNotif> = {};
  for (const apres of [PREMIERE, PREMIERE + ENSUITE]) {
    const r = texteDuJour(apres);
    parJour[jourLocal(Date.now() + apres * JOUR)] = { ...r, titre: sansEtoiles(r.titre), texte: sansEtoiles(r.texte) };
  }
  const [premier, second] = Object.values(parJour);
  // Les champs du haut servent au service worker d'avant (le premier texte, puis le second après 2 jours).
  const texte = { ...premier, date: Date.now(), expire: Date.now() + 2 * JOUR, ensuite: second, parJour };
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
    const jours = PREMIERE;
    // Même calcul que le serveur : l'heure habituelle (UTC, heure d'Abidjan) le jour du rappel. On ne le redit que s'il change.
    const heure = heureHabituelle();
    const cible = heureDuRappel(Date.now(), jours, heure ?? 18);
    if (read<number>(PROGRAMME, 0) === cible || !navigator.onLine) return;
    const endpoint = await adresse();
    if (!endpoint) return;
    await envoyer({ endpoint, jours, ensuite: ENSUITE, ...(heure !== null ? { heure } : {}) });
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
