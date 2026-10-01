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
// Messages masqués avec l'ancienne croix de l'accueil : comptés comme lus.
const FERMEES = "annonces-fermees";
const LUES = "annonces-lues";

let enCours: Promise<void> | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach(f => f());

/** Recharge les messages à l'ouverture et au retour dans l'appli ; hors connexion, les derniers reçus restent. */
function charger(forcer = false) {
  if (!SERVEUR_URL || !navigator.onLine) return Promise.resolve();
  if (forcer) enCours = null;
  enCours ??= fetch(SERVEUR_URL + "/annonces")
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (Array.isArray(d?.annonces)) { write(CACHE, d.annonces); prevenir(); } })
    .catch(() => {});
  return enCours;
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") charger(true); });

/** Message ouvert dans le panneau de la cloche (null : panneau fermé ; 0 : liste seule). */
let ouvert: number | null = null;

export function ouvrirMessages(id = 0) { ouvert = id; prevenir(); }
export function fermerMessages() { ouvert = null; prevenir(); }

export function marquerLue(id: number) {
  const lues = read<number[]>(LUES, []);
  if (lues.includes(id)) return;
  write(LUES, [...lues, id].slice(-100));
  noter({ t: "vue", ref: String(id) });
  prevenir();
}

export function useAnnonces() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(n => n + 1);
    abonnes.add(f);
    charger();
    return () => { abonnes.delete(f); };
  }, []);
  const lues = new Set([...read<number[]>(LUES, []), ...read<number[]>(FERMEES, [])]);
  const annonces = read<Annonce[]>(CACHE, []);
  // Les urgents d'abord, puis les plus récents.
  const tries = [...annonces].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || b.date - a.date);
  return {
    annonces: tries,
    nonLues: tries.filter(a => !lues.has(a.id)),
    estLue: (id: number) => lues.has(id),
    ouvert,
    clic: (id: number) => noter({ t: "clic", ref: String(id) })
  };
}
