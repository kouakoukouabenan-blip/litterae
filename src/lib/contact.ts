import { href } from "./router";
import { SERVEUR_URL } from "./site";
import { platform } from "./install";
import { appareil, licence } from "./licence";
import { read, useStored, write } from "./storage";

/** « copie » : devoir envoyé depuis l'atelier de rédaction (accès complet), absent du formulaire de contact. */
export type SujetContact = "question" | "lecon" | "oeuvre" | "erreur" | "autre" | "copie";

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

export type EchecEnvoi = "hors-ligne" | "trop" | "en-attente" | "cle" | "serveur";

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

// Texte brut : pas de demande d'autorisation préalable au serveur, comme pour les statistiques.
const poster = (chemin: string, corps: object) =>
  fetch(SERVEUR_URL + chemin, { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(corps) });

/** Adresse de notification du téléphone, pour prévenir l'élève quand la réponse arrive. */
async function adresseNotif() {
  try {
    if (!("serviceWorker" in navigator) || Notification.permission !== "granted") return undefined;
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription())?.endpoint;
  } catch {
    return undefined;
  }
}

/** Envoie le message. Avec l'accès complet, il part avec la clé : la réponse reviendra dans l'appli. */
export async function envoyerMessage(m: Message): Promise<EchecEnvoi | null> {
  if (!navigator.onLine) return "hors-ligne";
  const systeme = { ios: "ios", android: "android", desktop: "ordinateur" }[platform()];
  const lic = licence();
  const acces = lic ? { cle: lic.cle, appareil: appareil(), endpoint: await adresseNotif() } : {};
  try {
    const r = await poster("/contact", { ...m, systeme, ...acces });
    if (r.status === 429) return (await r.json().catch(() => null))?.erreur === "en-attente" ? "en-attente" : "trop";
    if (r.status === 403) return "cle";
    if (!r.ok) return "serveur";
    if (lic) actualiserQuestions(true);
    return null;
  } catch {
    return navigator.onLine ? "serveur" : "hors-ligne";
  }
}

// ---- Questions posées avec l'accès complet et réponses de l'auteur ----

export interface Question {
  id: number;
  sujet: SujetContact;
  texte: string;
  page: string;
  date: number;
  reponse: string | null;
  reponseDate: number | null;
  vue: boolean;
}

const QUESTIONS = "mes-questions";
const RELEVE = "mes-questions-releve";
export const QUESTIONS_EN_ATTENTE = 3;

/**
 * Récupère les questions de l'élève et les réponses (gardées sur l'appareil pour la lecture hors ligne).
 * `vues` : réponses que l'élève vient de lire. Sans `force`, au plus une fois toutes les 10 minutes.
 */
export async function actualiserQuestions(force = false, vues: number[] = []) {
  const lic = licence();
  if (!lic || !SERVEUR_URL || !navigator.onLine) return;
  if (!force && !vues.length && Date.now() - read<number>(RELEVE, 0) < 10 * 60e3) return;
  write(RELEVE, Date.now());
  try {
    const r = await poster("/mes-questions", { cle: lic.cle, appareil: appareil(), vues });
    if (!r.ok) return;
    // Une réponse déjà lue sur cet appareil reste lue, même si une réponse du serveur partie avant arrive après.
    const lues = new Set(read<Question[]>(QUESTIONS, []).filter(q => q.vue).map(q => q.id));
    write(QUESTIONS, ((await r.json()).questions as Question[]).map(q => ({ ...q, vue: q.vue || lues.has(q.id) })));
  } catch {
    // Hors connexion : on garde la dernière liste.
  }
}

export function useQuestions() {
  const [questions] = useStored<Question[]>(QUESTIONS, []);
  return {
    questions,
    nouvellesReponses: questions.filter(q => q.reponse && !q.vue).length,
    enAttente: questions.filter(q => !q.reponse).length
  };
}

/** Marque les réponses affichées comme lues (sur l'appareil tout de suite, puis sur le serveur). */
export function marquerVues(ids: number[]) {
  if (!ids.length) return;
  write(QUESTIONS, read<Question[]>(QUESTIONS, []).map(q => ids.includes(q.id) ? { ...q, vue: true } : q));
  actualiserQuestions(true, ids);
}
