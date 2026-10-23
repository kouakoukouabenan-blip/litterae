import type { ContenuPayant } from "../data/types";
import { read, write } from "./storage";
import { SERVEUR_URL } from "./site";

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
}

export interface Titulaire { prenom: string; nom: string }
const lireTitulaire = (t: unknown): Titulaire | null =>
  t && typeof t === "object" && typeof (t as Titulaire).nom === "string" && (t as Titulaire).nom
    ? { prenom: String((t as Titulaire).prenom || (t as Titulaire).nom.split(" ")[0]), nom: (t as Titulaire).nom } : null;

const KEY = "licence";
const REVERIFIER_APRES = 864e5;

// Gardée en mémoire : le contenu payant pèse plus d'un mégaoctet, et le relire à chaque appel
// (des centaines de fois en ouvrant l'accueil) bloquait les téléphones modestes plusieurs secondes.
let enMemoire: { l: Licence | null } | null = null;
export const licence = () => (enMemoire ??= { l: read<Licence | null>(KEY, null) }).l;

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

export type ErreurActivation = { message: string };

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
    res = await appel("/activer", { cle: cle.trim(), appareil: appareil() });
  } catch {
    return { message: "Impossible de joindre le serveur. Vérifie ta connexion et réessaie." };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.contenu) return { message: data?.message ?? "La clé n'a pas pu être validée. Réessaie dans quelques minutes." };
  // Le serveur renvoie la clé exacte (tiret invisible retiré, O remplacé par 0…) : c'est elle qu'on garde.
  enregistrer({ cle: typeof data.cle === "string" ? data.cle : cle.trim().toUpperCase(), contenu: data.contenu, verifieeLe: Date.now(), titulaire: lireTitulaire(data.titulaire) } satisfies Licence);
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
  if (!l || !navigator.onLine || (Date.now() - l.verifieeLe < REVERIFIER_APRES && "titulaire" in l)) return;
  try {
    const res = await appel("/verifier", { cle: l.cle, appareil: appareil() });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      enregistrer({ ...l, verifieeLe: Date.now(), titulaire: data && "titulaire" in data ? lireTitulaire(data.titulaire) : l.titulaire ?? null });
      if (typeof data?.version === "number" && data.version !== l.contenu.version) await activer(l.cle); // pris en compte à la prochaine ouverture
    }
    else if (res.status === 403 || res.status === 404) {
      const data = await res.json().catch(() => null);
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
