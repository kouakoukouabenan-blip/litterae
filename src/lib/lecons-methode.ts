import type { QuestionQuiz } from "../data/types";
import { licence } from "./licence";
import { read, useStored, write } from "./storage";
import { SERVEUR_URL } from "./site";
import type { EchecLecon } from "./lecons-libres";

/**
 * Leçons du commentaire composé et du résumé de texte sans clé : 3 au choix par méthode,
 * demandées une à une au serveur puis gardées sur l'appareil, comme les 5 leçons de la dissertation.
 */
export const LECONS_GRATUITES_METHODE = 3;
export type MethodeLecons = "cc" | "rs";

export interface LeconOuverte<B = unknown> { blocs: B[]; quiz: QuestionQuiz[] | null }
type Ouvertes = Record<string, LeconOuverte>;
const cle = (m: MethodeLecons) => `lecons-ouvertes-${m}`;

const ouvertes = (m: MethodeLecons) => read<Ouvertes>(cle(m), {});

/** Ouvre une leçon gratuite : elle compte dans les 3 dès que son texte arrive sur l'appareil. */
export async function ouvrirLeconMethode(m: MethodeLecons, id: string): Promise<LeconOuverte | EchecLecon> {
  const vues = ouvertes(m);
  if (vues[id]) return vues[id];
  if (Object.keys(vues).length >= LECONS_GRATUITES_METHODE) return "limite";
  if (!navigator.onLine || !SERVEUR_URL) return "hors-ligne";
  try {
    const r = await fetch(`${SERVEUR_URL}/lecon?id=${m}:${encodeURIComponent(id)}`);
    const d = await r.json().catch(() => null);
    if (r.status === 429) return "trop";
    if (!r.ok || !Array.isArray(d?.blocs)) return "erreur";
    const l: LeconOuverte = { blocs: d.blocs, quiz: Array.isArray(d.quiz) ? d.quiz : null };
    write(cle(m), { ...ouvertes(m), [id]: l });
    return l;
  } catch {
    return "erreur";
  }
}

/**
 * Accès aux leçons d'une méthode : `complet` quand tout le contenu payant est sur l'appareil,
 * sinon les leçons déjà ouvertes et celles qui restent à choisir.
 */
export function useLeconsMethode(m: MethodeLecons, complet: boolean) {
  const [vues] = useStored<Ouvertes>(cle(m), {});
  const nbOuvertes = Object.keys(vues).length;
  // Avec une clé mais sans le contenu reçu, on fait venir le contenu complet plutôt que de compter des leçons.
  const libre = !complet && !licence();
  const restantes = libre ? Math.max(0, LECONS_GRATUITES_METHODE - nbOuvertes) : 0;
  return {
    libre,
    nbOuvertes,
    restantes,
    ouverte: (id: string) => (libre ? vues[id] : undefined) as LeconOuverte | undefined,
    peutLire: (id: string) => complet || (libre && (!!vues[id] || restantes > 0))
  };
}
