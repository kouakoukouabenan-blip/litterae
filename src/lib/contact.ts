import { href } from "./router";
import { SERVEUR_URL } from "./site";
import { platform } from "./install";

export type SujetContact = "question" | "lecon" | "oeuvre" | "erreur" | "autre";

export const SUJETS_CONTACT: { id: SujetContact; label: string }[] = [
  { id: "question", label: "Poser une question" },
  { id: "lecon", label: "Proposer une leçon" },
  { id: "oeuvre", label: "Proposer une œuvre" },
  { id: "erreur", label: "Signaler une erreur" },
  { id: "autre", label: "Autre chose" }
];

/**
 * Lien vers la page Contact, déjà réglée : sujet choisi et page concernée
 * (`page` : adresse dans l'appli, `objet` : ce que l'élève lira, ex. « la fiche Une si longue lettre »).
 */
export function lienContact(sujet: SujetContact, page?: string, objet?: string) {
  const p: Record<string, string> = { sujet };
  if (page) p.page = page;
  if (objet) p.objet = objet;
  return href(["contact"], p);
}

export type EchecEnvoi = "hors-ligne" | "trop" | "serveur";

export interface Message {
  sujet: SujetContact;
  texte: string;
  nom: string;
  reponse: string;
  page: string;
  /** Champ invisible : seuls les robots le remplissent. */
  site: string;
  /** Temps passé sur le formulaire, en millisecondes. */
  duree: number;
}

export async function envoyerMessage(m: Message): Promise<EchecEnvoi | null> {
  if (!navigator.onLine) return "hors-ligne";
  const systeme = { ios: "ios", android: "android", desktop: "ordinateur" }[platform()];
  try {
    // Texte brut : pas de demande d'autorisation préalable au serveur, comme pour les statistiques.
    const r = await fetch(SERVEUR_URL + "/contact", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ ...m, systeme })
    });
    if (r.status === 429) return "trop";
    return r.ok ? null : "serveur";
  } catch {
    return navigator.onLine ? "serveur" : "hors-ligne";
  }
}
