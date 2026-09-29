import type { Fonction } from "../data/types";
import { normalize } from "./text";

/** Ce que recouvre chaque fonction littéraire, en une ligne. */
export const FONCTION_TEXTE: Record<Fonction, string> = {
  Engagement: "Dénoncer, éveiller les consciences, défendre une cause.",
  Esthétique: "Travailler la beauté de la forme, l'art pour l'art.",
  Évasion: "Faire rêver, divertir, transporter ailleurs.",
  Lyrique: "Exprimer les sentiments, le moi, l'intime.",
  Sociale: "Peindre la société, transmettre, éduquer."
};

/** Classe CSS de la couleur d'une fonction (« Évasion » → « fn-evasion »). */
export const fnClass = (f: string) => {
  const k = normalize(f).split(" ")[0];
  return `fn-${k === "social" ? "sociale" : k}`;
};
