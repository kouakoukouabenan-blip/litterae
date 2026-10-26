import { useEffect, useState } from "preact/hooks";
import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import { noter } from "./stats";
import { acces } from "./licence";
import { methodeActive } from "./methodes";

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
  /** Mis en tête de l'accueil, à la place de « Ta prochaine action », tant que l'élève ne l'a pas lu ou fermé. */
  accueil?: boolean;
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
  // Le serveur ne garde que les messages pour tout le monde et ceux du groupe de l'élève (a payé ou non).
  enCours ??= fetch(`${SERVEUR_URL}/annonces?pour=${acces()}&methode=${methodeActive()}`)
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (Array.isArray(d?.annonces)) { write(CACHE, d.annonces); prevenir(); } })
    .catch(() => {});
  return enCours;
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") charger(true); });
window.addEventListener("acces-change", () => charger(true));
window.addEventListener("methode-change", () => charger(true));

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
    aLaUne: tries.find(a => a.accueil && !lues.has(a.id)) ?? null,
    estLue: (id: number) => lues.has(id),
    ouvert,
    clic: (id: number) => noter({ t: "clic", ref: String(id) })
  };
}
