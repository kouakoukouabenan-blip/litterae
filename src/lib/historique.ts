import { read, write } from "./storage";

/**
 * Ce que l'élève a ouvert récemment (fiches, sujets corrigés, leçons), gardé seulement sur son téléphone.
 * Sert aux suggestions de l'accueil et au texte des rappels ; rien de tout cela n'est envoyé au serveur.
 */
export type Vue = { t: "oeuvre" | "sujet" | "lecon"; id: string; d: number };

const CLE = "historique";
const MAX = 40;

export const historique = () => read<Vue[]>(CLE, []);

export function noterVue(t: Vue["t"], id: string) {
  const reste = historique().filter(v => !(v.t === t && v.id === id));
  write(CLE, [{ t, id, d: Date.now() }, ...reste].slice(0, MAX));
}
