import type { Oeuvre } from "../data/types";
import type { BaseName } from "../components/Icon";
import { OEUVRES, SUJETS, oeuvre, sujetsCitant } from "./data";
import { LECONS } from "./lecons";
import { leconsOuvertes, LECONS_GRATUITES } from "./lecons-libres";
import { fichesOuvertes, FICHES_GRATUITES } from "./fiches";
import { FREE_SUBJECTS } from "./access";
import { licence } from "./licence";
import { avancement, lireBrouillon } from "./atelier";
import { numero, sujetsEntrainement } from "./entrainement";
import { historique, type Vue } from "./historique";
import { cles, read } from "./storage";
import { bilan } from "./progres";
import { cartesDuJour } from "./revisions";
import { defiFaitAujourdhui, sujetDuJour } from "./defi";
import { etapeFaible } from "./maitrise";

/**
 * Suggestions personnelles, calculées sur le téléphone à partir de ce que l'élève a ouvert
 * (historique, brouillons de l'atelier, leçons lues, carnet). Rien n'est envoyé au serveur.
 * Elles respectent l'offre gratuite : sans clé, on ne propose pas une fiche, une leçon
 * ou un sujet corrigé qu'il ne pourrait pas ouvrir.
 */
export interface Suggestion {
  /** Sert de clé d'affichage. */
  cle: string;
  icone: BaseName;
  titre: string;
  detail: string;
  lien: string;
  /** Texte de la notification de rappel, si c'est cette suggestion qui est choisie. */
  notif: { titre: string; texte: string };
  /** Déjà visible ailleurs sur l'accueil (la carte « Continuer la méthode ») : seulement pour les rappels. */
  horsAccueil?: boolean;
}

const JOUR = 864e5;
const titreCourt = (t: string) => (t.length > 42 ? t.slice(0, 40).trimEnd() + "…" : t);
const de = (nom: string) => (/^[aeiouyàâéèêëîïôöùûüh]/i.test(nom) ? `d'${nom}` : `de ${nom}`);

/** Sujet commencé dans l'atelier et pas encore terminé : le plus récemment modifié. */
function sujetCommence(): Suggestion | null {
  const brouillons = cles("atelier:")
    .map(k => ({ num: k.slice("atelier:".length), b: lireBrouillon(k.slice("atelier:".length)) }))
    .filter(x => x.b && !x.b.envoye)
    .map(x => ({ ...x, pct: avancement(x.b) }))
    .filter(x => x.pct > 0 && x.pct < 100 && sujetsEntrainement().some(s => s.num === x.num))
    .sort((a, b) => (b.b!.modifie ?? 0) - (a.b!.modifie ?? 0));
  const d = brouillons[0];
  if (!d) return null;
  const n = numero(d.num);
  return {
    cle: `atelier-${d.num}`, icone: "edit", lien: `#/entrainement/${d.num}`,
    titre: `Termine ton sujet ${n}`, detail: `Ta rédaction en est à ${d.pct} %`,
    notif: { titre: `Ton sujet ${n} t'attend`, texte: `Tu en es à ${d.pct} %. Quelques minutes de plus et ta dissertation avance encore.` }
  };
}

/** Leçon suivante de la méthode, si l'élève a commencé et peut la lire. */
function leconSuivante(premium: boolean): Suggestion | null {
  const lues = read<string[]>("lecons-lues", []);
  if (!lues.length) return null;
  const l = LECONS.find(x => !lues.includes(x.id));
  if (!l) return null;
  const ouvertes = leconsOuvertes();
  if (!premium && !ouvertes[l.id] && Object.keys(ouvertes).length >= LECONS_GRATUITES) return null;
  const rang = LECONS.indexOf(l) + 1;
  return {
    cle: `lecon-${l.id}`, icone: "menu_book", lien: `#/cours/${l.id}`, horsAccueil: true,
    titre: `Leçon ${rang} : ${titreCourt(l.titre)}`, detail: "La suite de la méthode",
    notif: { titre: `Leçon ${rang} : ${titreCourt(l.titre)}`, texte: `La suite de la méthode t'attend${l.duree ? `, ${l.duree} de lecture` : ""}.` }
  };
}

const oeuvresVues = (h: Vue[]) => h.filter(v => v.t === "oeuvre").map(v => oeuvre(v.id)).filter((w): w is Oeuvre => !!w);

/** Sujet corrigé qui cite une œuvre que l'élève a lue récemment, et qu'il n'a pas encore ouvert. */
function sujetCitant(h: Vue[], premium: boolean): Suggestion | null {
  const sujetsVus = new Set(h.filter(v => v.t === "sujet").map(v => v.id));
  for (const w of oeuvresVues(h).slice(0, 10)) {
    const s = sujetsCitant(w.id).find(s => !sujetsVus.has(s.num) && (premium || SUJETS.indexOf(s) < FREE_SUBJECTS));
    if (s) return {
      cle: `sujet-${s.num}`, icone: "history_edu", lien: `#/sujets/${s.num}`,
      titre: `Sujet corrigé ${s.num}`, detail: `Il cite « ${titreCourt(w.titre)} », que tu as lue`,
      notif: { titre: `« ${titreCourt(w.titre)} » dans un sujet corrigé`, texte: `Vois comment le sujet ${s.num} s'en sert comme exemple dans sa copie.` }
    };
  }
  return null;
}

// Un thème rare (« Tradition orale ») rapproche plus deux œuvres qu'un thème courant (« Société »).
let poidsThemes: Map<string, number> | null = null;
function poids(theme: string) {
  if (!poidsThemes) {
    poidsThemes = new Map();
    for (const w of OEUVRES) for (const t of w.themes) poidsThemes.set(t, (poidsThemes.get(t) ?? 0) + 1);
  }
  return 1 / Math.log(2 + (poidsThemes.get(theme) ?? 0));
}

/** Œuvre proche de celles que l'élève vient de lire (thèmes, fonctions, auteur), pas encore ouverte. */
function oeuvreProche(h: Vue[], premium: boolean, aujourdhui: number): Suggestion | null {
  const ouvertes = fichesOuvertes();
  // Sans clé et sans fiche gratuite restante, une nouvelle fiche serait verrouillée : on n'en propose pas.
  if (!premium && Object.keys(ouvertes).length >= FICHES_GRATUITES) return null;
  const lues = oeuvresVues(h).slice(0, 5);
  if (!lues.length) return null;
  const dejaVues = new Set(h.filter(v => v.t === "oeuvre").map(v => v.id));
  const candidates = OEUVRES.filter(w => w.detaillee && !dejaVues.has(w.id) && !ouvertes[w.id]).map(w => {
    let score = 0, raison = "", source = lues[0];
    lues.forEach((l, rang) => {
      const recence = 1 - rang * 0.15;
      const communs = w.themes.filter(t => l.themes.includes(t));
      const s = (communs.reduce((n, t) => n + poids(t), 0) * 2 + w.fonctions.filter(f => l.fonctions.includes(f)).length * 0.3
        + (w.auteur === l.auteur ? 1.5 : 0)) * recence;
      if (s > 0) score += s;
      if (!raison && communs.length) { raison = communs.sort((a, b) => poids(b) - poids(a))[0]; source = l; }
    });
    return { w, score, raison, source };
  }).filter(c => c.score > 0.8).sort((a, b) => b.score - a.score);
  if (!candidates.length) return null;
  // Parmi les trois plus proches, une différente chaque jour.
  const c = candidates[aujourdhui % Math.min(3, candidates.length)];
  const meme = c.w.auteur === c.source.auteur;
  return {
    cle: `oeuvre-${c.w.id}`, icone: "local_library", lien: `#/oeuvres/${encodeURIComponent(c.w.id)}`,
    titre: `« ${titreCourt(c.w.titre)} »`,
    detail: meme ? `Du même auteur que « ${titreCourt(c.source.titre)} »` : c.raison ? `Thème proche : ${c.raison.toLowerCase()}` : `Proche de « ${titreCourt(c.source.titre)} »`,
    notif: { titre: "Une œuvre pour ta prochaine copie", texte: `« ${c.w.titre} » ${de(c.w.auteur)}${c.raison ? `, sur le thème : ${c.raison.toLowerCase()}` : ""}.` }
  };
}

/** Fiche enregistrée dans le carnet et pas rouverte depuis une semaine. */
function ficheDuCarnet(h: Vue[], maintenant: number): Suggestion | null {
  const enregistrees = read<string[]>("oeuvres-enregistrees", []);
  const derniere = new Map(h.filter(v => v.t === "oeuvre").map(v => [v.id, v.d]));
  const id = enregistrees.find(id => oeuvre(id) && maintenant - (derniere.get(id) ?? 0) > 7 * JOUR);
  const w = id && oeuvre(id);
  if (!w) return null;
  return {
    cle: `carnet-${w.id}`, icone: "bookmark", lien: `#/oeuvres/${encodeURIComponent(w.id)}`,
    titre: `Relis « ${titreCourt(w.titre)} »`, detail: "Enregistrée dans ton carnet",
    notif: { titre: `Relis « ${titreCourt(w.titre)} »`, texte: "Tu l'as gardée dans ton carnet. Un coup d'œil pour avoir tes exemples prêts le jour du devoir." }
  };
}

/** Défi du jour, tant qu'il n'est pas relevé. */
function defi(): Suggestion | null {
  if (defiFaitAujourdhui()) return null;
  const s = sujetDuJour();
  return {
    cle: "defi", icone: "edit", lien: "#/defi",
    titre: "Défi du jour", detail: `Sujet ${numero(s.num)} : 2 arguments en 5 minutes`,
    notif: { titre: "Le défi du jour t'attend", texte: "Un sujet type bac, 5 minutes pour trouver 2 arguments et 2 œuvres." }
  };
}

/** Cartes à revoir aujourd'hui (mots du dictionnaire, questions de quiz). */
function revisions(): Suggestion | null {
  const n = cartesDuJour().length;
  if (!n) return null;
  return {
    cle: "revisions", icone: "history_edu", lien: "#/revisions",
    titre: `Révise ${n > 1 ? `${n} cartes` : "une carte"}`, detail: "Mots et quiz à revoir aujourd'hui",
    notif: { titre: `${n > 1 ? `${n} cartes` : "Une carte"} à réviser`, texte: "Deux minutes pour ne pas oublier les mots et les règles vus ces derniers jours." }
  };
}

/** Étape de la dissertation la plus faible, avec ce qui la ferait progresser (si l'élève peut l'ouvrir). */
function etapeATravailler(premium: boolean): Suggestion | null {
  const e = etapeFaible();
  if (!e || e.score >= 60) return null;
  const lecon = e.conseil.lien.match(/^#\/cours\/(.+)$/)?.[1];
  const ouvertes = leconsOuvertes();
  if (lecon && !premium && !ouvertes[lecon] && Object.keys(ouvertes).length >= LECONS_GRATUITES) return null;
  return {
    cle: `etape-${e.id}`, icone: "menu_book", lien: e.conseil.lien,
    titre: `À travailler : ${e.nom.charAt(0).toLowerCase()}${e.nom.slice(1)}`, detail: e.conseil.texte,
    notif: { titre: `Progresse sur une étape : ${e.nom.toLowerCase()}`, texte: `${e.conseil.texte}, c'est là que tu peux gagner le plus de points.` }
  };
}

/** Toutes les suggestions du moment, la plus utile d'abord. */
export function suggestions(maintenant = Date.now()): Suggestion[] {
  const premium = !!licence();
  const h = historique();
  const jour = Math.floor(maintenant / JOUR);
  return [sujetCommence(), defi(), revisions(), sujetCitant(h, premium), etapeATravailler(premium), leconSuivante(premium), oeuvreProche(h, premium, jour), ficheDuCarnet(h, maintenant)]
    .filter((s): s is Suggestion => !!s);
}

/** Texte du rappel envoyé si l'élève ne revient pas : la suggestion la plus utile, sinon une invitation simple. */
export function texteRappel(): { titre: string; texte: string; lien: string } {
  // Série en cours : le rappel part le lendemain soir, avant qu'elle ne s'arrête.
  const serie = bilan().serie;
  if (serie >= 2) return { titre: `Garde ta série de ${serie} jours`, texte: "Relève le défi du jour en 5 minutes pour la continuer.", lien: "#/defi" };
  const s = suggestions()[0];
  if (s) return { ...s.notif, lien: s.lien };
  if (!read<string[]>("lecons-lues", []).length)
    return { titre: "La méthode en 5 minutes", texte: "Une leçon courte pour savoir par où commencer ta dissertation.", lien: "#/cours" };
  return { titre: "Un sujet pour garder la main", texte: "Traite un sujet type bac pas à pas dans l'atelier.", lien: "#/entrainement" };
}
