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
}

const KEY = "licence";
const REVERIFIER_APRES = 7 * 864e5;

export const licence = () => read<Licence | null>(KEY, null);

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
  write(KEY, { cle: cle.trim().toUpperCase(), contenu: data.contenu, verifieeLe: Date.now() } satisfies Licence);
  return null;
}

export function retirer() {
  write(KEY, null);
}

/**
 * Vérifie de temps en temps que la clé est toujours valide (révocation après un remboursement).
 * Sans connexion ou si le serveur ne répond pas, l'accès est conservé.
 */
export async function reverifier() {
  const l = licence();
  if (!l || !navigator.onLine || Date.now() - l.verifieeLe < REVERIFIER_APRES) return;
  try {
    const res = await appel("/verifier", { cle: l.cle });
    if (res.ok) write(KEY, { ...l, verifieeLe: Date.now() });
    else if (res.status === 403 || res.status === 404) {
      const data = await res.json().catch(() => null);
      if (data?.erreur === "revoquee" || data?.erreur === "cle-invalide" || data?.erreur === "expiree") {
        retirer();
        location.reload();
      }
    }
  } catch {
    // Réseau indisponible : on réessaiera plus tard.
  }
}
