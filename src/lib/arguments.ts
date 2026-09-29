import type { Fonction, Oeuvre } from "../data/types";
import { FONCTIONS } from "../data/types";

/**
 * Arguments de dissertation, rédigés comme un élève les énonce dans un axe.
 * Chaque idée d'illustration d'une œuvre est rangée sous l'un de ces arguments.
 */
export const ARGUMENTS: Record<string, string> = {
  "Dénonciation": "La littérature dénonce les injustices et les abus de la société.",
  "Éveil des consciences": "La littérature éveille les consciences et pousse le lecteur à réagir.",
  "Défense des opprimés": "La littérature prend la défense des faibles et des opprimés.",
  "Satire": "La littérature critique les travers des hommes et des puissants en les tournant en ridicule.",
  "Mémoire collective": "La littérature conserve la mémoire d'un peuple et de son histoire.",
  "Valorisation de la culture": "La littérature valorise la culture et les traditions d'un peuple.",
  "Peinture de la réalité sociale": "La littérature est le miroir de la société : elle en peint la réalité.",
  "Culte de la forme": "La littérature est d'abord un art : l'écrivain recherche la beauté de la forme.",
  "Célébration de la beauté": "La littérature célèbre la beauté du monde, de la nature et des êtres.",
  "Expression des sentiments": "La littérature permet à l'écrivain d'exprimer ses sentiments intimes.",
  "Expression du vécu": "La littérature raconte l'expérience vécue de son auteur.",
  "Imagination": "La littérature crée des mondes imaginaires qui font rêver le lecteur.",
  "Voyage imaginaire": "La littérature fait voyager le lecteur loin de son quotidien.",
  "Rire": "La littérature divertit et fait rire.",
  "Divertissement": "La littérature procure au lecteur le plaisir d'une belle histoire."
};

/** Argument général de chaque fonction, quand aucune idée de la fiche ne le précise. */
const PAR_FONCTION: Record<Fonction, string> = {
  Engagement: "La littérature est une arme de combat au service d'une cause.",
  Esthétique: "La littérature est avant tout la recherche du beau.",
  Évasion: "La littérature permet au lecteur de s'évader du réel.",
  Lyrique: "La littérature exprime les émotions et l'intimité de l'écrivain.",
  Sociale: "La littérature reflète la société de son époque."
};

export interface ArgumentOeuvre {
  /** Clé de l'argument (sert au filtre des œuvres), absente pour un argument général de fonction. */
  cle?: string;
  texte: string;
  fonction: Fonction;
  /** Idées de la fiche qui appuient cet argument (vides si la fiche n'est pas ouverte). */
  appuis: string[];
}

/** Tous les arguments qu'une œuvre peut illustrer, rangés par fonction de la littérature. */
export function argumentsDe(w: Oeuvre): ArgumentOeuvre[] {
  const liste: ArgumentOeuvre[] = [];
  for (const i of w.idees) {
    const deja = liste.find(a => a.cle === i.argument && a.fonction === i.fonction) ?? liste.find(a => a.cle === i.argument);
    if (deja) { if (i.texte) deja.appuis.push(i.texte); continue; }
    liste.push({ cle: i.argument, texte: ARGUMENTS[i.argument] ?? i.argument, fonction: i.fonction, appuis: i.texte ? [i.texte] : [] });
  }
  for (const f of w.fonctions) if (!liste.some(a => a.fonction === f)) liste.push({ texte: PAR_FONCTION[f], fonction: f, appuis: [] });
  return liste.sort((a, b) => FONCTIONS.indexOf(a.fonction) - FONCTIONS.indexOf(b.fonction));
}
