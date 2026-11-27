import type { ContenuPayant } from "../data/types";
import { read, write } from "./storage";
import { SERVEUR_URL } from "./site";
import { contenuLibre } from "./libre";

/**
 * Accès complet par clé de licence Chariow.
 * La clé est vérifiée par le serveur (Cloudflare), qui seul connaît la clé secrète Chariow
 * et renvoie le contenu payant. Ce contenu est ensuite gardé sur l'appareil pour la lecture hors ligne.
 */
interface Licence {
  cle: string;
  contenu: ContenuPayant;
  verifieeLe: number;
  /** Nom de l'acheteur chez Chariow (null : Chariow ne le donne pas ; absent : pas encore demandé). */
  titulaire?: Titulaire | null;
  /** Fin de l'accès (ms) pour une clé achetée après la mise en place de la durée ; null ou absent : sans limite. */
  fin?: number | null;
  /** Réglage de durée connu lors de la dernière vérification : s'il change, on revérifie tout de suite. */
  duree?: string;
}

/** Réglage de durée de l'éditeur, tel que reçu (« null » tant que les clés sont sans limite). */
const dureeActuelle = () => JSON.stringify(contenuLibre()?.duree ?? null);

/** Accès terminé sur cet appareil : gardé pour proposer de renouveler (et prolonger avec une nouvelle clé). */
interface Termine { cle: string; fin: number; titulaire: Titulaire | null }
const TERMINE = "acces-termine";

export interface Titulaire { prenom: string; nom: string }
const lireTitulaire = (t: unknown): Titulaire | null =>
  t && typeof t === "object" && typeof (t as Titulaire).nom === "string" && (t as Titulaire).nom
    ? { prenom: String((t as Titulaire).prenom || (t as Titulaire).nom.split(" ")[0]), nom: (t as Titulaire).nom } : null;

const KEY = "licence";
const REVERIFIER_APRES = 864e5;

// Gardée en mémoire : le contenu payant pèse plus d'un mégaoctet, et le relire à chaque appel
// (des centaines de fois en ouvrant l'accueil) bloquait les téléphones modestes plusieurs secondes.
let enMemoire: { l: Licence | null } | null = null;
export const licence = () => (enMemoire ??= { l: lireLicence() }).l;

/** Lit la clé gardée ; si son année est passée (même hors connexion), l'appli repasse en version gratuite. */
function lireLicence(): Licence | null {
  const l = read<Licence | null>(KEY, null);
  if (l?.fin && Date.now() > l.fin) {
    write(TERMINE, { cle: l.cle, fin: l.fin, titulaire: l.titulaire ?? null } satisfies Termine);
    write(KEY, null);
    return null;
  }
  return l;
}

/** Date de fin de l'accès sur cet appareil (null : sans limite ou pas de clé). */
export const finAcces = () => licence()?.fin ?? null;

/** Accès terminé sur cet appareil (pour proposer de renouveler), ou null. */
export const accesTermine = () => (licence() ? null : read<Termine | null>(TERMINE, null));

/** Nom de l'élève qui a acheté la clé, pour l'accueillir par son prénom. */
export const titulaire = () => licence()?.titulaire ?? null;

function enregistrer(l: Licence | null) {
  const avant = !!licence();
  enMemoire = null;
  write(KEY, l);
  // Clé activée ou retirée : les messages et notifications « ont payé / n'ont pas payé » suivent.
  if (avant !== !!l) window.dispatchEvent(new Event("acces-change"));
}

/** Pour les messages de l'éditeur : l'élève a l'accès complet sur cet appareil, ou pas. */
export const acces = (): "paye" | "gratuit" => (licence() ? "paye" : "gratuit");

// Clé ajoutée ou retirée depuis un autre onglet : on relira la valeur enregistrée.
window.addEventListener("storage", e => { if (e.key === null || e.key.endsWith(KEY)) enMemoire = null; });

/** Identifiant anonyme de l'appareil, pour que Chariow compte les appareils d'une clé. */
export function appareil() {
  let id = read<string>("appareil", "");
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    write("appareil", id);
  }
  return id;
}

export type ErreurActivation = { message: string; code?: string };

async function appel(chemin: string, corps: object): Promise<Response> {
  if (!SERVEUR_URL) throw new Error("serveur");
  return fetch(SERVEUR_URL + chemin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corps)
  });
}

/** Valide une clé ; en cas de succès, le contenu payant est enregistré sur l'appareil. */
export async function activer(cle: string): Promise<ErreurActivation | null> {
  if (!navigator.onLine) return { message: "Tu es hors connexion. Connecte-toi à Internet pour valider ta clé." };
  let res: Response;
  try {
    // Clé précédente de cet appareil : si elle courait encore, ses jours restants s'ajoutent à la nouvelle.
    const ancienne = licence()?.cle ?? read<Termine | null>(TERMINE, null)?.cle ?? null;
    res = await appel("/activer", { cle: cle.trim(), appareil: appareil(), ancienne });
  } catch {
    return { message: "Impossible de joindre le serveur. Vérifie ta connexion et réessaie." };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.contenu) return { message: data?.message ?? "La clé n'a pas pu être validée. Réessaie dans quelques minutes.", code: typeof data?.erreur === "string" ? data.erreur : undefined };
  // Le serveur renvoie la clé exacte (tiret invisible retiré, O remplacé par 0…) : c'est elle qu'on garde.
  enregistrer({ cle: typeof data.cle === "string" ? data.cle : cle.trim().toUpperCase(), contenu: data.contenu, verifieeLe: Date.now(), titulaire: lireTitulaire(data.titulaire), fin: typeof data.fin === "number" ? data.fin : null, duree: dureeActuelle() } satisfies Licence);
  write(TERMINE, null);
  return null;
}

export function retirer() {
  enregistrer(null);
  write("mes-questions", []);
}

/** Recharge le contenu payant depuis le serveur (même appareil : aucune place utilisée). */
export async function rechargerContenu() {
  const l = licence();
  if (!l || !navigator.onLine) return false;
  return (await activer(l.cle)) === null;
}

/**
 * Vérifie une fois par jour que la clé est toujours valide (révocation après un remboursement),
 * et recharge le contenu payant quand il a été enrichi sur le serveur (même appareil : aucune place utilisée).
 * Sans connexion ou si le serveur ne répond pas, l'accès est conservé.
 */
export async function reverifier() {
  const l = licence();
  // Clé activée avant que l'appli connaisse le nom de l'élève : on le demande tout de suite.
  // Durée mise en place ou changée par l'éditeur depuis la dernière vérification : on demande tout de suite la date de fin.
  if (!l || !navigator.onLine || (Date.now() - l.verifieeLe < REVERIFIER_APRES && "titulaire" in l && l.duree === dureeActuelle())) return;
  try {
    const res = await appel("/verifier", { cle: l.cle, appareil: appareil() });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      enregistrer({ ...l, verifieeLe: Date.now(), titulaire: data && "titulaire" in data ? lireTitulaire(data.titulaire) : l.titulaire ?? null,
        // Fin changée par l'éditeur (geste, erreur) ou fixée à la première vérification après la mise en place de la durée.
        fin: data && "fin" in data ? (typeof data.fin === "number" ? data.fin : null) : l.fin ?? null, duree: dureeActuelle() });
      if (typeof data?.version === "number" && data.version !== l.contenu.version) await activer(l.cle); // pris en compte à la prochaine ouverture
    }
    else if (res.status === 403 || res.status === 404) {
      const data = await res.json().catch(() => null);
      // Année d'accès terminée : l'appli repasse en version gratuite et propose de renouveler (les questions restent).
      if (data?.erreur === "terminee") {
        write(TERMINE, { cle: l.cle, fin: typeof data.fin === "number" ? data.fin : Date.now(), titulaire: l.titulaire ?? null } satisfies Termine);
        enregistrer(null);
        location.reload();
        return;
      }
      // « appareil-libere » : l'éditeur a retiré cet appareil de la clé (téléphone perdu ou changé).
      if (["revoquee", "cle-invalide", "expiree", "appareil-libere"].includes(data?.erreur)) {
        retirer();
        location.reload();
      }
    }
  } catch {
    // Réseau indisponible : on réessaiera plus tard.
  }
}

/** Un appareil où la clé est active, vu par l'élève (« ref » désigne l'appareil sans révéler son identifiant). */
export interface AppareilCle { ref: string; nom: string; premier: number; dernier: number; moi: boolean }
export interface AppareilsCle {
  appareils: AppareilCle[]; max: number;
  /** Déconnexions encore possibles sur 30 jours, et date où une nouvelle redevient possible. */
  restants: number; parMois: number; prochain: number | null;
  erreur?: string;
}

/** Appareils de la clé (celle de cet appareil, ou celle qu'on vient de saisir et qui est pleine). */
export async function appareilsCle(cle: string): Promise<AppareilsCle | null> {
  try {
    const res = await appel("/appareils", { cle: cle.trim(), appareil: appareil() });
    const d = await res.json().catch(() => null);
    return res.ok && Array.isArray(d?.appareils) ? d : null;
  } catch { return null; }
}

/** Déconnecte un autre appareil de la clé : il perd l'accès complet à sa prochaine connexion. */
export async function deconnecterAppareil(cle: string, ref: string): Promise<AppareilsCle | null> {
  try {
    const res = await appel("/deconnecter", { cle: cle.trim(), appareil: appareil(), cible: ref });
    const d = await res.json().catch(() => null);
    return Array.isArray(d?.appareils) ? d : null;
  } catch { return null; }
}
