import { useEffect, useState } from "preact/hooks";
import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import { noter } from "./stats";

/** Messages publiés par l'éditeur depuis son tableau de bord : promos, informations, astuces. */
export interface Annonce {
  id: number;
  type: "promo" | "message" | "astuce";
  titre: string;
  texte: string;
  lien: string | null;
  lienTexte: string | null;
  date: number;
  /** Message urgent : affiché en premier, avec un signal qui clignote. */
  urgent?: boolean;
}

const CACHE = "annonces";
const FERMEES = "annonces-fermees";
const VUES = "annonces-vues";

let enCours: Promise<void> | null = null;

/** Recharge les messages une fois par ouverture ; hors connexion, les derniers reçus restent affichés. */
function charger() {
  if (!SERVEUR_URL || !navigator.onLine) return Promise.resolve();
  enCours ??= fetch(SERVEUR_URL + "/annonces")
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (Array.isArray(d?.annonces)) write(CACHE, d.annonces); })
    .catch(() => {});
  return enCours;
}

export function useAnnonces() {
  const [, force] = useState(0);
  useEffect(() => { charger().then(() => force(n => n + 1)); }, []);
  const fermees = read<number[]>(FERMEES, []);
  const annonces = read<Annonce[]>(CACHE, []).filter(a => !fermees.includes(a.id));

  useEffect(() => {
    const vues = read<number[]>(VUES, []);
    const nouvelles = annonces.filter(a => !vues.includes(a.id));
    if (!nouvelles.length) return;
    nouvelles.forEach(a => noter({ t: "vue", ref: String(a.id) }));
    write(VUES, [...vues, ...nouvelles.map(a => a.id)].slice(-50));
  }, [annonces.map(a => a.id).join()]);

  return {
    annonces,
    fermer: (id: number) => { write(FERMEES, [...fermees, id].slice(-50)); force(n => n + 1); },
    clic: (id: number) => noter({ t: "clic", ref: String(id) })
  };
}
