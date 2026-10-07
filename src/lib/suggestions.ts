import type { Oeuvre } from "../data/types";
import type { BaseName } from "../components/Icon";
import { OEUVRES, SUJETS, oeuvre, sujetsCitant } from "./data";
import { LECONS } from "./lecons";
import { leconsOuvertes, LECONS_GRATUITES } from "./lecons-libres";
import { fichesOuvertes, fichesGratuites } from "./fiches";
import { FREE_SUBJECTS } from "./access";
import { licence } from "./licence";
import { avancement, lireBrouillon } from "./atelier";
import { numero, sujetsEntrainement } from "./entrainement";
import { historique, type Vue } from "./historique";
import { cles, read } from "./storage";
import { recompenseAVoir } from "./progres";
import { cartesDuJour } from "./revisions";
import { defiFaitAujourdhui, sujetDuJour } from "./defi";
import { normalize } from "./text";
import { etapeFaible, DEFS } from "./maitrise";
import { devoirARendre } from "./devoirs";
import { jourLocal } from "./progres";
import { FONCTIONS, type Fonction } from "../data/types";
import { analyserSujet } from "./devoir";
import type { DevoirGarde } from "./devoirs";
import { erreursQuiz, estEcartee, interets } from "./interets";

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
  /** Famille de la suggestion, pour compter (sans rien savoir de l'élève) celles qui sont ouvertes. */
  type?: string;
  /** Demande du temps (atelier, leçon) : passe après les choses courtes le soir en semaine, avant le week-end. */
  long?: boolean;
}

const JOUR = 864e5;
// Les phrases s'affichent en entier (sur deux lignes si besoin) : seuls les titres très longs sont raccourcis.
const titreCourt = (t: string) => (t.length > 70 ? t.slice(0, 68).trimEnd() + "…" : t);
const de = (nom: string) => (/^[aeiouyàâéèêëîïôöùûüh]/i.test(nom) ? `d'${nom}` : `de ${nom}`);

/** Sujet commencé dans l'atelier et pas encore terminé : le plus récemment modifié. */
function sujetCommence(exclu?: string): Suggestion | null {
  const brouillons = cles("atelier:")
    .map(k => ({ num: k.slice("atelier:".length), b: lireBrouillon(k.slice("atelier:".length)) }))
    .filter(x => x.b && !x.b.envoye)
    .map(x => ({ ...x, pct: avancement(x.b) }))
    .filter(x => x.pct > 0 && x.pct < 100 && x.num !== exclu && sujetsEntrainement().some(s => s.num === x.num))
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
    for (const w of OEUVRES) for (const t of w.themes) poidsThemes.set(normalize(t), (poidsThemes.get(normalize(t)) ?? 0) + 1);
  }
  return 1 / Math.log(2 + (poidsThemes.get(normalize(theme)) ?? 0));
}

/** Œuvre proche de celles que l'élève vient de lire (thèmes, fonctions, auteur), pas encore ouverte. */
function oeuvreProche(h: Vue[], premium: boolean, aujourdhui: number): Suggestion | null {
  const ouvertes = fichesOuvertes();
  // Sans clé et sans fiche gratuite restante, une nouvelle fiche serait verrouillée : on n'en propose pas.
  if (!premium && Object.keys(ouvertes).length >= fichesGratuites()) return null;
  const lues = oeuvresVues(h).slice(0, 5);
  if (!lues.length) return null;
  const dejaVues = new Set(h.filter(v => v.t === "oeuvre").map(v => v.id));
  const candidates = OEUVRES.filter(w => w.detaillee && !dejaVues.has(w.id) && !ouvertes[w.id]).map(w => {
    let score = 0, raison = "", source = lues[0];
    lues.forEach((l, rang) => {
      const recence = 1 - rang * 0.15;
      // « amour » et « Amour » sont le même thème (fiches écrites à la main dans le tableau de bord).
      const siens = new Set(l.themes.map(normalize));
      const communs = w.themes.filter(t => siens.has(normalize(t)));
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
    titre: `Révise ${n > 1 ? `${n} cartes` : "une carte"}`, detail: "Mots, quiz et œuvres à revoir aujourd'hui",
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

/** Fiche que l'élève peut ouvrir : accès complet, fiche déjà choisie, ou fiche gratuite restante. */
function ficheOuvrable(id: string, premium: boolean) {
  if (premium) return true;
  const ouvertes = fichesOuvertes();
  return !!ouvertes[id] || Object.keys(ouvertes).length < fichesGratuites();
}

const lienOeuvre = (w: Oeuvre) => `#/oeuvres/${encodeURIComponent(w.id)}`;

/** Leçon dont une question de quiz a été ratée et qui n'a pas été relue depuis. */
function leconARevoir(h: Vue[], premium: boolean, maintenant: number): Suggestion | null {
  const ouvertes = leconsOuvertes();
  for (const [id, quand] of Object.entries(erreursQuiz()).sort((a, b) => b[1] - a[1])) {
    if (maintenant - quand > 21 * JOUR) continue;
    if (h.some(v => v.t === "lecon" && v.id === id && v.d > quand)) continue;
    const l = LECONS.find(x => x.id === id);
    if (!l) continue;
    if (!premium && !ouvertes[id] && Object.keys(ouvertes).length >= LECONS_GRATUITES) continue;
    const rang = LECONS.indexOf(l) + 1;
    return {
      cle: `erreur-${id}`, icone: "menu_book", lien: `#/cours/${id}`,
      titre: `Relis la leçon ${rang}`, detail: "Une réponse du quiz à revoir",
      notif: { titre: `Relis la leçon ${rang}`, texte: `Une question du quiz t'a posé problème. Relis « ${titreCourt(l.titre)} » pour ne plus te tromper.` }
    };
  }
  return null;
}

/** Devoir gardé dans Mon espace : une œuvre (ou un sujet corrigé) qui va avec, pas encore ouverte. */
function pourMonDevoir(h: Vue[], premium: boolean, maintenant: number): Suggestion | null {
  const d = read<DevoirGarde[]>("devoirs-gardes", [])[0];
  if (!d || maintenant - d.garde > 30 * JOUR) return null;
  const a = analyserSujet(d.auteur ? `${d.texte} (${d.auteur})` : d.texte, 8);
  const vues = new Set(h.map(v => `${v.t}:${v.id}`));
  // D'abord une œuvre dont la fonction principale est celle du sujet.
  const libres = a.oeuvres.filter(w => w.detaillee && !vues.has(`oeuvre:${w.id}`) && ficheOuvrable(w.id, premium));
  const w = libres.find(w => w.fonctions[0] === a.fonctions[0]) ?? libres[0];
  if (w) return {
    cle: `oeuvre-${w.id}`, icone: "content_paste", lien: lienOeuvre(w),
    titre: `« ${titreCourt(w.titre)} »`, detail: "Pour le devoir que tu as gardé",
    notif: { titre: "Un exemple pour ton devoir", texte: `« ${w.titre} » ${de(w.auteur)} peut illustrer le sujet que tu as gardé.` }
  };
  const s = a.proches.find(s => !vues.has(`sujet:${s.num}`) && (premium || SUJETS.findIndex(x => x.num === s.num) < FREE_SUBJECTS));
  if (s) return {
    cle: `sujet-${s.num}`, icone: "history_edu", lien: `#/sujets/${s.num}`,
    titre: `Sujet corrigé ${s.num}`, detail: "Proche du devoir que tu as gardé",
    notif: { titre: "Un sujet corrigé proche de ton devoir", texte: `Vois comment le sujet ${s.num} est traité, il ressemble au tien.` }
  };
  return null;
}

/** Dernière recherche dans Œuvres (thème, fonction, argument) : une fiche qui y répond, pas encore ouverte. */
function pourTaRecherche(h: Vue[], premium: boolean, jour: number, maintenant: number): Suggestion | null {
  const i = interets().find(i => maintenant - i.d < 14 * JOUR);
  if (!i) return null;
  const vues = new Set(h.filter(v => v.t === "oeuvre").map(v => v.id));
  const n = normalize(i.v);
  const va = (w: Oeuvre) => i.type === "theme" ? w.themes.some(t => normalize(t) === n)
    : i.type === "fonction" ? w.fonctions.includes(i.v as Fonction)
    : w.idees.some(x => normalize(x.argument) === n);
  const candidates = OEUVRES.filter(w => w.detaillee && va(w) && !vues.has(w.id) && !fichesOuvertes()[w.id] && ficheOuvrable(w.id, premium));
  if (!candidates.length) return null;
  const w = candidates[jour % Math.min(3, candidates.length)];
  const quoi = i.type === "theme" ? `« ${i.v.toLowerCase()} »` : i.type === "fonction" ? `les œuvres ${FONCTION_NOM[i.v as Fonction]}s` : "un argument";
  return {
    cle: `oeuvre-${w.id}`, icone: "search", lien: lienOeuvre(w),
    titre: `« ${titreCourt(w.titre)} »`, detail: `Pour ta recherche sur ${quoi}`,
    notif: { titre: "Une œuvre pour ta recherche", texte: `« ${w.titre} » ${de(w.auteur)} répond à ta recherche sur ${quoi}.` }
  };
}

const FONCTION_NOM: Record<Fonction, string> = { Engagement: "engagée", Sociale: "sociale", Esthétique: "esthétique", Évasion: "d'évasion", Lyrique: "lyrique" };

/** Carnet sans aucune œuvre pour une fonction littéraire : une œuvre pour combler le manque. */
function carnetIncomplet(h: Vue[], premium: boolean, jour: number, exclues: Set<string>): Suggestion | null {
  const gardees = read<string[]>("oeuvres-enregistrees", []);
  const carnet = gardees.map(id => oeuvre(id)).filter((w): w is Oeuvre => !!w);
  if (carnet.length < 2) return null;
  const manque = FONCTIONS.filter(f => !carnet.some(w => w.fonctions.includes(f)));
  if (!manque.length) return null;
  const f = manque[jour % manque.length];
  // D'abord une fiche déjà lue (il suffit de la garder), sinon une fiche au programme.
  const lue = oeuvresVues(h).find(w => w.fonctions.includes(f) && !gardees.includes(w.id) && !exclues.has(`oeuvre-${w.id}`));
  const autres = OEUVRES.filter(w => w.detaillee && w.fonctions[0] === f && !gardees.includes(w.id) && !exclues.has(`oeuvre-${w.id}`) && ficheOuvrable(w.id, premium))
    .sort((a, b) => (b.niveaux?.length ? 1 : 0) - (a.niveaux?.length ? 1 : 0));
  const w = lue ?? autres[jour % Math.max(1, Math.min(5, autres.length))];
  if (!w) return null;
  return {
    cle: `oeuvre-${w.id}`, icone: "bookmark", lien: lienOeuvre(w),
    titre: `« ${titreCourt(w.titre)} »`, detail: `Ton carnet n'a aucune œuvre ${FONCTION_NOM[f]}`,
    notif: { titre: "Complète ton carnet", texte: `Ton carnet n'a aucune œuvre ${FONCTION_NOM[f]}. « ${w.titre} » peut t'en servir.` }
  };
}

const COURT: Record<string, string> = { comprendre: "analyse du sujet", plan: "plan", introduction: "introduction", exemples: "exemples", conclusion: "conclusion" };
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const midi = (j: string) => Date.parse(j + "T12:00:00");

/**
 * Devoir gardé avec sa date : le travail qui reste (comprendre, plan, introduction, exemples, conclusion)
 * est réparti sur les jours d'ici là, et l'accueil dit ce qu'il y a à faire aujourd'hui.
 */
export function devoirDuJour(maintenant: number): Suggestion | null {
  const auj = jourLocal(maintenant);
  const d = devoirARendre(auj);
  if (!d?.pour) return null;
  const jours = Math.round((midi(d.pour) - midi(auj)) / JOUR);
  if (jours > 14) return null;
  const b = d.num ? lireBrouillon(d.num) : null;
  const reste = DEFS.filter(e => !b || !e.fait(b));
  const quand = jours === 0 ? "pour aujourd'hui" : jours === 1 ? "pour demain" : jours <= 6 ? `pour ${JOURS[new Date(midi(d.pour)).getDay()]}` : `pour le ${new Date(midi(d.pour)).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
  const lien = d.num ? `#/entrainement/${d.num}` : "#/devoirs";
  if (!reste.length) return {
    cle: `devoir-jour-${d.id}`, icone: "check", lien, titre: `Ton devoir ${quand}`, detail: "Tout est rédigé : relis ta copie",
    notif: { titre: `Ton devoir ${quand}`, texte: "Tout est rédigé. Relis ta copie une dernière fois avant de la rendre." }
  };
  // Les étapes restantes, réparties sur les jours qui restent (le jour même : tout ce qui manque).
  const parJour = Math.ceil(reste.length / Math.max(1, jours));
  const etapes = reste.slice(0, parJour);
  const liste = (q: string[]) => (q.length > 2 ? `${q.slice(0, -1).join(", ")} et ${q.at(-1)}` : q.join(" et "));
  const texte = liste(etapes.map(e => e.nom.charAt(0).toLowerCase() + e.nom.slice(1)));
  // Version courte pour l'accueil, qui tient sur une ligne de téléphone.
  const court = liste(etapes.map(e => COURT[e.id] ?? e.nom));
  return {
    cle: `devoir-jour-${d.id}`, icone: "content_paste", lien: d.num ? `${lien}${etapes[0].atelier ? `?etape=${etapes[0].atelier}` : ""}` : lien,
    titre: `Ton devoir ${quand}`, detail: `Aujourd'hui : ${court}`,
    notif: { titre: `Ton devoir ${quand}`, texte: `Aujourd'hui : ${texte}. Quelques minutes suffisent.` }
  };
}

/** Fiche oubliée en révision, ou œuvre qui allait mieux avec le défi : à relire tant qu'elle n'a pas été rouverte. */
function ficheARevoir(h: Vue[], premium: boolean, maintenant: number): Suggestion | null {
  for (const [k, quand] of Object.entries(erreursQuiz()).sort((a, b) => b[1] - a[1])) {
    const m = k.match(/^(oeuvre|defi):(.+)$/);
    if (!m || maintenant - quand > 21 * JOUR) continue;
    const w = oeuvre(m[2]);
    if (!w || h.some(v => v.t === "oeuvre" && v.id === w.id && v.d > quand) || !ficheOuvrable(w.id, premium)) continue;
    const defi = m[1] === "defi";
    return {
      cle: `oeuvre-${w.id}`, icone: "local_library", lien: lienOeuvre(w),
      titre: defi ? `« ${titreCourt(w.titre)} »` : `Relis « ${titreCourt(w.titre)} »`,
      detail: defi ? "Elle allait bien avec le sujet du défi" : "Une question de révision à revoir",
      notif: defi ? { titre: "Une œuvre pour ce genre de sujet", texte: `« ${w.titre} » ${de(w.auteur)} allait bien avec le sujet du défi. Lis sa fiche pour la prochaine fois.` }
        : { titre: `Relis « ${titreCourt(w.titre)} »`, texte: "Tu l'avais oubliée en révision. Un coup d'œil à la fiche pour l'avoir en tête le jour du devoir." }
    };
  }
  return null;
}

const africaine = (w: Oeuvre) => w.aires.some(a => /^Afrique|Maghreb/.test(a));
const etrangere = (w: Oeuvre) => w.aires.some(a => /Europe|Amériques|Asie|Moyen-Orient/.test(a));

/** Carnet d'œuvres toutes africaines (ou toutes étrangères) : une œuvre de l'autre côté, de la fonction la plus gardée. */
function varierCarnet(premium: boolean, jour: number, exclues: Set<string>): Suggestion | null {
  const gardees = read<string[]>("oeuvres-enregistrees", []);
  const carnet = gardees.map(id => oeuvre(id)).filter((w): w is Oeuvre => !!w);
  if (carnet.length < 3) return null;
  const vers = carnet.every(africaine) ? etrangere : carnet.every(etrangere) ? africaine : null;
  if (!vers) return null;
  const compte = new Map<Fonction, number>();
  for (const w of carnet) if (w.fonctions[0]) compte.set(w.fonctions[0], (compte.get(w.fonctions[0]) ?? 0) + 1);
  const f = [...compte].sort((a, b) => b[1] - a[1])[0]?.[0];
  const autres = OEUVRES.filter(w => w.detaillee && vers(w) && (!f || w.fonctions[0] === f) && !gardees.includes(w.id) && !exclues.has(`oeuvre-${w.id}`) && ficheOuvrable(w.id, premium))
    .sort((a, b) => (b.niveaux?.length ? 1 : 0) - (a.niveaux?.length ? 1 : 0));
  const w = autres[jour % Math.max(1, Math.min(5, autres.length))];
  if (!w) return null;
  const quoi = vers === africaine ? "une œuvre africaine" : "une œuvre étrangère";
  return {
    cle: `oeuvre-${w.id}`, icone: "local_library", lien: lienOeuvre(w),
    titre: `« ${titreCourt(w.titre)} »`, detail: `Pour varier ton carnet : ${quoi}`,
    notif: { titre: "Varie tes exemples", texte: `Le jour du devoir, un exemple africain et un exemple étranger font bonne impression. « ${w.titre} » ${de(w.auteur)} peut t'y aider.` }
  };
}

/** Toutes les suggestions du moment, la plus utile d'abord. */
export function suggestions(maintenant = Date.now()): Suggestion[] {
  const premium = !!licence();
  const h = historique();
  const jour = Math.floor(maintenant / JOUR);
  const avec = (type: string, s: Suggestion | null, long = false): Suggestion | null => (s ? { ...s, type, long: long || undefined } : null);
  const duJour = devoirDuJour(maintenant);
  const numDevoir = duJour?.lien.match(/#\/entrainement\/([^?]+)/)?.[1];
  const avant = [avec("devoir-jour", duJour), avec("atelier", sujetCommence(numDevoir), true), avec("devoir", pourMonDevoir(h, premium, maintenant)), avec("defi", defi()),
    avec("revisions", revisions()), avec("erreur", leconARevoir(h, premium, maintenant)), avec("fiche-revoir", ficheARevoir(h, premium, maintenant)),
    avec("sujet", sujetCitant(h, premium)), avec("etape", etapeATravailler(premium), true), avec("lecon", leconSuivante(premium), true),
    avec("proche", oeuvreProche(h, premium, jour)), avec("recherche", pourTaRecherche(h, premium, jour, maintenant))];
  const prises = new Set(avant.map(s => s?.cle ?? ""));
  const carnet = avec("carnet-fonction", carnetIncomplet(h, premium, jour, prises));
  if (carnet) prises.add(carnet.cle);
  // Une suggestion vue trois jours sans être ouverte laisse sa place une semaine ; une même œuvre n'est proposée qu'une fois.
  const deja = new Set<string>();
  const liste = [...avant, carnet, avec("varier", varierCarnet(premium, jour, prises)), avec("carnet", ficheDuCarnet(h, maintenant))]
    .filter((s): s is Suggestion => !!s && !estEcartee(s.cle, maintenant) && !deja.has(s.cle) && !!deja.add(s.cle));
  return selonLeMoment(liste, maintenant);
}

/**
 * Le soir en semaine, l'élève a peu de temps : les choses courtes (défi, révisions, une fiche) passent devant.
 * Le week-end en journée, c'est le moment d'un vrai travail : l'atelier et les leçons passent devant.
 * Le devoir à rendre reste toujours en tête.
 */
export function selonLeMoment(liste: Suggestion[], maintenant = Date.now()) {
  const d = new Date(maintenant);
  const h = d.getHours(), weekend = d.getDay() === 0 || d.getDay() === 6;
  const soir = !weekend && (h >= 18 || h < 7);
  const journeeWeekend = weekend && h >= 8 && h < 19;
  if (!soir && !journeeWeekend) return liste;
  const rang = (s: Suggestion, i: number) => (s.type === "devoir-jour" ? -1000 : 0) + (s.long ? (soir ? 100 : -100) : 0) + i;
  return liste.map((s, i) => ({ s, r: rang(s, i) })).sort((a, b) => a.r - b.r).map(x => x.s);
}

/**
 * Portes d'entrée pour un élève qui débute (ou qui a vidé les données de son téléphone) :
 * « Pour toi » ne reste jamais vide. Seulement ce qu'il n'a pas encore essayé, tout est gratuit.
 */
export function decouvertes(): Suggestion[] {
  const h = historique();
  const vide = { titre: "", texte: "" };
  const out: Suggestion[] = [];
  if (!read<string>("devoir-texte", "").trim())
    out.push({ cle: "decouvrir-devoir", icone: "content_paste", lien: "#/devoir", titre: "Tu as un devoir ?", detail: "Un plan, des œuvres et des mots pour démarrer", notif: vide });
  const corrige = SUJETS.slice(0, FREE_SUBJECTS).map(x => x.num).find(n => !h.some(v => v.t === "sujet" && v.id === n));
  if (corrige && !h.some(v => v.t === "sujet"))
    out.push({ cle: "decouvrir-corrige", icone: "history_edu", lien: `#/sujets/${corrige}`, titre: `Lis le sujet corrigé ${numero(corrige)}`, detail: "Une dissertation rédigée, partie par partie", notif: vide });
  if (!h.some(v => v.t === "oeuvre"))
    out.push({ cle: "decouvrir-oeuvres", icone: "search", lien: "#/oeuvres", titre: "Trouve une œuvre pour tes exemples", detail: "Cherche par thème, auteur ou classe", notif: vide });
  if (!cles("atelier:").length)
    out.push({ cle: "decouvrir-atelier", icone: "edit", lien: "#/entrainement", titre: "Traite un sujet type bac", detail: "Pas à pas dans l'atelier", notif: vide });
  return out.filter(s => !estEcartee(s.cle)).map(s => ({ ...s, type: "decouverte" }));
}

/** La suite de ce que l'élève faisait : la suggestion la plus utile, sinon une invitation simple. */
export function texteSuite(): { titre: string; texte: string; lien: string } {
  const s = suggestions()[0];
  if (s) return { ...s.notif, lien: s.lien };
  if (!read<string[]>("lecons-lues", []).length)
    return { titre: "La méthode en 5 minutes", texte: "Une leçon courte pour savoir par où commencer ta dissertation.", lien: "#/cours" };
  return { titre: "Un sujet pour garder la main", texte: "Traite un sujet type bac pas à pas dans l'atelier.", lien: "#/entrainement" };
}

/**
 * « Ta prochaine action » en tête de l'accueil : une seule chose à faire maintenant, la plus utile.
 * Un élève qui découvre l'appli commence par la leçon 1 ; une récompense de série pas encore vue passe avant tout.
 */
export function prochaineAction(maintenant = Date.now()): Suggestion {
  const premium = !!licence();
  const r = recompenseAVoir();
  if (r && !premium) return {
    cle: "recompense", icone: "check", lien: "#/oeuvres",
    titre: `${r.serie} jours d'affilée : une fiche offerte`, detail: "Choisis une nouvelle œuvre à lire",
    notif: { titre: "", texte: "" }
  };
  const lues = read<string[]>("lecons-lues", []);
  const debut = !lues.length && !historique().length && !cles("atelier:").length;
  const premiere = LECONS[0];
  if (debut && premiere) return {
    cle: `lecon-${premiere.id}`, type: "debut", icone: "menu_book", lien: `#/cours/${premiere.id}`,
    titre: "Commence par la leçon 1", detail: `${titreCourt(premiere.titre)}${premiere.duree ? `, ${premiere.duree}` : ""}`,
    notif: { titre: "", texte: "" }
  };
  return suggestions(maintenant)[0] ?? {
    cle: "entrainement", type: "entrainement", icone: "edit", lien: "#/entrainement",
    titre: "Traite un sujet type bac", detail: "Pas à pas dans l'atelier",
    notif: { titre: "", texte: "" }
  };
}
