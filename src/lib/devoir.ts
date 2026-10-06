import type { Fonction, MotDico, Oeuvre, Sujet, SujetApercu } from "../data/types";
import { OEUVRES, SUJETS } from "./data";
import { contenuLibre } from "./libre";
import { motsPublics } from "./dictionnaire";
import { fonctionsDuSujet, oeuvresPour } from "./defi";
import { normalize } from "./text";
import { ARGUMENTS } from "./arguments";
import { cle, commencePar, jetons, memeFamille, memeMot, type Jeton } from "./flou";

/**
 * « J'ai un devoir » : l'élève colle l'énoncé de son sujet, l'appli le lit sur le téléphone
 * (thèmes, fonction littéraire, mots difficiles) et propose un plan, des œuvres et des sujets corrigés proches.
 * La lecture tolère les fautes d'orthographe (voir flou.ts), l'absence de guillemets et de majuscules.
 */

/**
 * Mots qui trahissent la fonction de la littérature dont parle la citation :
 * début de mot (par défaut), mot entier (« $ ») ou expression (avec une espace, compte double).
 */
const INDICES: [Fonction, string[]][] = [
  ["Engagement", ["engage$", "engagement", "denon", "combat", "lutt", "arme$", "militant", "changer le monde", "changer la societe", "eveill", "conscien", "revolt", "revolution", "liber", "injust", "oppress", "opprim", "servir", "au service", "peuple", "responsab", "mission", "temoign", "bataille", "battre", "porte-parole", "sans voix", "defend", "critiqu", "transform", "agir", "action", "utile$", "guide$", "eclair", "flambeau", "vocation", "croisade", "resist", "dictat", "tyran", "colonis", "esclav", "racis", "fusil", "bombe", "prophet", "verite", "mensonge", "hypocris", "silenc", "devoir$", "accuse", "soumission", "bouche$", "malheur", "voix$", "echo$", "histoire$", "relecture", "relire", "memoire"]],
  ["Sociale", ["societ", "social", "miroir", "realit", "reel$", "realis", "peindre", "peint", "tableau", "reflet", "refleter", "moeurs", "epoque", "vie quotidienne", "c est la vie", "de la vie", "observ", "decri", "description", "milieu", "photograph", "document", "imiter", "imitation", "faits$", "tels qu", "telle qu", "tel qu", "empreinte"]],
  ["Esthétique", ["beau$", "beaute", "belle$", "art$", "l art pour l art", "artist", "forme$", "style", "langage", "poesie pure", "createur", "creation", "creat", "gratuit", "musique", "musical", "harmon", "rime", "rythme", "image$", "verbe$", "perfection", "esthet", "inutile", "elle meme", "symbole", "parole artistique", "orfevre", "sculpt"]],
  ["Évasion", ["evasion", "evad", "reve$", "rever$", "reveur", "imagin", "divert", "distrai", "distrac", "fuir", "fuite", "ailleurs", "plaisir", "amus", "oubli", "fiction", "invent", "ennui", "ennuy", "loisir", "detente", "voyag", "aventur", "merveill", "fantast", "fantaisie", "magie", "echapp", "arracher", "consol", "chimere", "illusion", "raconter des histoires", "spectacle"]],
  ["Lyrique", ["sentiment", "emotion", "coeur", "ame$", "moi$", "intime", "souffr", "douleur", "douloureu", "amour", "joie", "tristesse", "triste", "confid", "emouv", "emu$", "toucher", "touche le", "ressen", "sensib", "larme", "pleur", "chagrin", "melancol", "desesper", "nostalg", "passion", "solitude", "sanglot", "plainte", "lament", "gemi", "chant", "personnel"]]
];

/** Mots qui annoncent chaque argument de dissertation (les mêmes que ceux des fiches d'œuvres). */
const INDICES_ARGUMENTS: [string, Fonction, string[]][] = [
  ["Dénonciation", "Engagement", ["denon", "critiqu", "accuse", "combat", "lutt", "injust", "mensonge", "hypocris", "arme$", "bataille", "croisade", "fusil"]],
  ["Éveil des consciences", "Engagement", ["eveill", "conscien", "eclair", "guide$", "flambeau", "aveugle", "instrui", "eduqu", "ouvrir les yeux", "professeur", "enseign", "esper", "espoir", "changer le monde", "transform"]],
  ["Défense des opprimés", "Engagement", ["opprim", "oppress", "sans voix", "voix$", "porte-parole", "bouche$", "malheur", "defend", "peuple", "faible", "pauvre", "misere", "liber", "esclav"]],
  ["Satire", "Engagement", ["satir", "moqu", "ridicul", "railler", "caricatur"]],
  ["Mémoire collective", "Sociale", ["histoire$", "memoire", "passe$", "souvenir", "relecture", "relire", "ancetre", "temoign"]],
  ["Valorisation de la culture", "Sociale", ["culture", "culturel", "tradition", "valeur", "patrimoine", "identite", "oral", "griot", "conte$", "contes$", "racine"]],
  ["Peinture de la réalité sociale", "Sociale", ["societ", "social", "miroir", "realit", "reel$", "peindre", "peint", "reflet", "refleter", "moeurs", "epoque", "observ", "faits$", "tels qu", "telle qu", "c est la vie", "de la vie", "vie quotidienne"]],
  ["Culte de la forme", "Esthétique", ["forme$", "style", "art$", "langage", "rime", "rythme", "gratuit", "elle meme", "perfection", "musique", "image$", "verbe$", "artist", "createur", "creat"]],
  ["Célébration de la beauté", "Esthétique", ["beaute", "beau$", "belle$", "celebr", "nature", "chant"]],
  ["Expression des sentiments", "Lyrique", ["sentiment", "emotion", "coeur", "ame$", "amour", "souffr", "douleur", "douloureu", "tristesse", "triste", "joie", "chagrin", "ressen", "sensib", "larme", "desesper", "melancol", "toucher"]],
  ["Expression du vécu", "Lyrique", ["vecu", "experience", "intime", "moi$", "personnel", "autobiograph", "sa propre vie", "sa vie"]],
  ["Imagination", "Évasion", ["imagin", "invent", "fiction", "rever$", "reve$", "reveur", "merveill", "fantast", "fantaisie", "magie", "chimere"]],
  ["Voyage imaginaire", "Évasion", ["voyag", "ailleurs", "evasion", "evad", "fuir", "fuite", "echapp", "arracher", "exotis"]],
  ["Divertissement", "Évasion", ["divert", "distrai", "distrac", "amus", "plaisir", "loisir", "ennui", "ennuy", "detente", "raconter des histoires", "spectacle"]],
  ["Rire", "Évasion", ["rire$", "comique", "comedie", "humour", "drole"]]
];

/** Les deux arguments les plus courants de chaque fonction, quand le sujet n'en annonce pas. */
const ARGUMENTS_TYPES: Record<Fonction, string[]> = {
  Engagement: ["Dénonciation", "Éveil des consciences", "Défense des opprimés"],
  Sociale: ["Peinture de la réalité sociale", "Mémoire collective", "Valorisation de la culture"],
  Esthétique: ["Culte de la forme", "Célébration de la beauté"],
  Évasion: ["Imagination", "Divertissement", "Voyage imaginaire"],
  Lyrique: ["Expression des sentiments", "Expression du vécu"]
};

/** Ce que la littérature est, selon chaque fonction : sert à rédiger le plan conseillé. */
const IDEE: Record<Fonction, string> = {
  Engagement: "une arme pour dénoncer l'injustice et changer la société",
  Sociale: "un miroir qui montre la société telle qu'elle est",
  Esthétique: "un art qui cherche d'abord la beauté de la forme",
  Évasion: "un moyen de rêver, de se divertir et de s'évader",
  Lyrique: "l'expression des sentiments et de l'âme de l'écrivain"
};
/** Le point de vue opposé, pour la partie « discussion ». */
const OPPOSE: Record<Fonction, Fonction> = { Engagement: "Esthétique", Esthétique: "Engagement", Sociale: "Évasion", Évasion: "Sociale", Lyrique: "Engagement" };

/**
 * Autres mots qui disent le même thème sans partager sa racine (« femme » → Condition féminine).
 * Les mots de la même famille (« africaine » → Afrique, « colonial » → Colonisation) sont trouvés tout seuls.
 */
const SYNONYMES: Record<string, string[]> = {
  "condition feminine": ["femme", "feminin", "feminisme", "epouse"],
  femme: ["feminin", "epouse"],
  mort: ["mourir", "meurt", "deces", "tuer"],
  amour: ["aimer", "aime", "amoureux"],
  liberte: ["libre", "liberer"],
  pauvrete: ["pauvre", "pauvres"],
  misere: ["miserable", "miserables"],
  guerre: ["guerrier", "guerres"],
  enfance: ["enfant", "enfants"],
  tradition: ["coutume", "coutumes", "ancetre", "ancetres"],
  religion: ["dieu", "dieux", "eglise", "religieux", "religieuse"],
  societe: ["social", "sociale", "sociaux"],
  corruption: ["corrompu", "corrompus"],
  racisme: ["race", "raciste"],
  histoire: ["historique", "historien"],
  memoire: ["souvenir", "souvenirs"],
  solitude: ["isole", "isolement", "solitaire"],
  reve: ["rever", "songe", "reveur"],
  humanite: ["humain", "humains", "humaine"],
  espoir: ["esperer", "esperance"],
  education: ["ecole", "instruction", "eduquer", "enseigner", "instruire"],
  argent: ["riche", "riches", "fortune"],
  beaute: ["beau", "belle", "beaux"],
  satire: ["moquer", "moquerie", "ridiculiser"],
  comedie: ["comique", "rire"],
  tragedie: ["tragique"],
  folie: ["fou", "folle", "fous"],
  negritude: ["negre", "negres"],
  trahison: ["trahir", "traitre"],
  mensonge: ["mentir", "menteur", "mensonges"],
  "tradition orale": ["griot", "conte", "contes", "oral", "orale"],
  spleen: ["ennui"],
  oppression: ["opprime", "opprimes", "opprimer"],
  famille: ["parents"],
  mariage: ["epoux", "marier"],
  ville: ["urbain", "urbaine"],
  science: ["scientifique"],
  pouvoir: ["puissant", "puissants", "dirigeant", "dirigeants"],
  immigration: ["immigre", "migrant", "migrants", "emigre"],
  desillusion: ["deception", "desenchantement", "decu"],
  dictature: ["dictateur", "dictateurs"],
  colonisation: ["colon", "colons", "colonial", "coloniale", "colonise"]
};

/** Thèmes trop vagues pour guider (« Monde », « Autre ») ou qui désignent juste la littérature. */
const TROP_COURANTS = new Set(["litterature", "litteraire", "ecrire", "ecriture", "ecrivain", "auteur", "lecteur", "lecture", "livre", "oeuvre", "roman", "poesie", "theatre", "monde", "autre", "fin", "role", "message", "devoir", "temps", "vision", "union", "surprise", "retour", "attente", "parole", "esthetique", "quotidien", "valeurs"]);

/** Le sujet parle d'un genre : on met d'abord en avant les œuvres de ce genre. */
const GENRES: [string, string[]][] = [
  ["Poésie", ["poete", "poetes", "poesie", "poeme", "poemes", "poetique", "vers", "rime", "recueil", "chant", "chants"]],
  ["Roman", ["roman", "romans", "romancier", "romanciere", "romanciers", "recit", "personnage", "personnages", "narrateur"]],
  ["Théâtre", ["theatre", "dramaturge", "scene", "spectacle", "comedie", "tragedie", "acteur", "acteurs", "spectateur", "spectateurs", "public", "piece"]]
];

/** Verbes de consigne. Les « forts » marquent la consigne sous toutes leurs formes, même mal écrits. */
const CONSIGNE_FORTS = ["expliq", "explic", "comment", "discut", "analys", "illustr", "justifi", "apprec", "partag"].map(m => cle(m, false));
const CONSIGNE_DEBUTS = /^(vous|en vous|a l aide|a partir|a la lumiere|en vous appuyant|en vous fondant|sur la base|que pensez|qu en pensez|pensez vous|partagez vous|etes vous|dans quelle mesure|selon vous|montrez|dites|etudiez|commentez|expliquez|discutez|analysez|illustrez|justifiez|appreciez)\b/;

export interface Analyse {
  themes: string[];
  fonctions: Fonction[];
  mots: MotDico[];
  discussion: boolean;
  /** « Expliquer puis discuter », « Expliquer », … : ce que demande la consigne. */
  travail: string;
  auteur: string;
  /** Arguments de dissertation que le sujet annonce (« Dénonciation », « Imagination »…). */
  arguments: string[];
  plan: { axe1: string; axe2: string; args1: string[]; args2: string[] };
  oeuvres: Oeuvre[];
  proches: (Sujet | SujetApercu)[];
}

let themesConnus: { nom: string; formes: Jeton[][]; frequence: number }[] | null = null;
let fonctionsParTheme: Map<string, Map<Fonction, number>> | null = null;

/** Tous les thèmes connus (œuvres, sujets, contenus ajoutés), avec leurs formes déjà découpées en clés. */
function tousLesThemes() {
  if (!themesConnus) {
    const n = new Map<string, { nom: string; frequence: number }>();
    const ajouter = (t: string, poids: number) => {
      const k = normalize(t);
      if (!k || TROP_COURANTS.has(k)) return;
      const e = n.get(k) ?? { nom: t, frequence: 0 };
      e.frequence += poids;
      n.set(k, e);
    };
    for (const w of OEUVRES) w.themes.forEach(t => ajouter(t, 1));
    for (const s of SUJETS) (s.themes ?? []).forEach(t => ajouter(t, 0));
    for (const e of contenuLibre()?.entrainement ?? []) (e.themes ?? []).forEach(t => ajouter(t, 0));
    themesConnus = [...n.entries()].map(([k, { nom, frequence }]) => ({
      nom, frequence,
      // « ARME DE COMBAT / INSTRUMENT DE LUTTE » : chaque forme compte ; plus les synonymes.
      formes: [...nom.split(/\s*[\/(),]\s*/), ...(SYNONYMES[k] ?? [])].map(f => jetons(f)).filter(f => f.length)
    }));
  }
  return themesConnus;
}

/** Pour chaque thème, les fonctions des œuvres qui le traitent : aide quand la citation ne dit pas clairement la fonction. */
function fonctionsDesThemes() {
  if (!fonctionsParTheme) {
    fonctionsParTheme = new Map();
    for (const w of OEUVRES) for (const t of w.themes) {
      const k = normalize(t);
      const m = fonctionsParTheme.get(k) ?? new Map<Fonction, number>();
      for (const f of w.fonctions) m.set(f, (m.get(f) ?? 0) + 1 / w.fonctions.length);
      fonctionsParTheme.set(k, m);
    }
  }
  return fonctionsParTheme;
}

/** Deux mots se valent : clé identique, à une ou deux fautes près ; les mots très courts doivent être écrits pareil. */
const egal = (a: Jeton, b: Jeton) => (b.cle.length < 3 ? a.brut === b.brut || a.brut === b.brut + "s" || (a.cle === b.cle && a.brut.length >= 4 && b.brut.length >= 4) : a.colle ? a.cle === b.cle : memeMot(a.cle, b.cle));

/** Qualité de la présence d'un mot dans le texte : 3 identique, 2 à quelques fautes près, 1 même famille, 0 absent. */
function presence(mots: Jeton[], w: Jeton) {
  let q = 0;
  for (const m of mots) {
    if (m.cle === w.cle && (w.cle.length >= 3 || m.brut === w.brut || m.brut === w.brut + "s" || (m.brut.length >= 4 && w.brut.length >= 4))) return 3;
    if (egal(m, w)) q = Math.max(q, 2);
    else if (w.cle.length >= 3 && !m.colle && memeFamille(m.cle, w.cle)) q = Math.max(q, 1);
  }
  return q;
}

/** Un indice de fonction (début de mot, mot entier ou expression) se trouve dans ces mots. */
function indicePresent(mots: Jeton[], indice: string, phrase: string) {
  // Expression : ses mots à la suite, chacun ramené à sa clé (« changé le monde » vaut « changer le monde »).
  if (indice.includes(" ")) return phrase.includes(` ${clesDe(indice.replace("$", ""))} `);
  if (indice.endsWith("$")) {
    const w = { brut: indice.slice(0, -1), cle: cle(indice.slice(0, -1)) };
    return mots.some(m => egal(m, w));
  }
  const debut = cle(indice, false);
  // « langage » ne doit pas devenir « l'angage » : un mot décollé de son article ne compte que sur un long début de mot.
  return mots.some(m => (!m.colle || debut.length >= 5) && commencePar(m.cle, debut));
}
const clesDe = (texte: string) => normalize(texte).replace(/[^a-z]+/g, " ").trim().split(" ").map(m => cle(m) || m).join(" ");

/** Mots qui nient ce qui suit (« ce n'est pas faire du bien », « je ne crois pas à l'évasion »). */
const NIENT = new Set(["pas", "jamais", "point", "guere", "nullement", "plus", "rien", "aucun", "aucune", "non"]);
/** Mots qui arrêtent la négation : « n'a pas d'autre but qu'elle-même », « n'est pas un théorème mais un spectacle ». */
const ARRETENT = new Set(["que", "qu", "mais", "plutot", "seulement", "sinon", ","]);

/**
 * Coupe une phrase en ce qui est affirmé et ce qui est nié : les cinq mots qui suivent une négation.
 * Deux négations dans la même phrase (« qui n'ose pas…, ne mérite pas… ») s'annulent : rien n'est nié.
 */
function affirmeEtNie(phrase: string) {
  const mots = phrase.split(" ").filter(Boolean);
  const estNegation = (m: string, i: number) => NIENT.has(m) && (m === "non" || mots.slice(Math.max(0, i - 6), i).some(x => x === "ne" || x === "n"));
  const negations = mots.filter(estNegation).length;
  if (negations !== 1) return { affirme: phrase, nie: "", sujet: "" };
  const affirme: string[] = [], nie: string[] = [];
  let reste = 0, sujet = "";
  mots.forEach((m, i) => {
    if (ARRETENT.has(m)) reste = 0;
    if (reste > 0) { nie.push(m); if (m.length >= 3) reste--; }
    else affirme.push(m);
    if (estNegation(m, i)) {
      reste = 5;
      // « L'imagination n'est plus la qualité du romancier » : c'est ce dont on parle qui est nié.
      const debut = mots.lastIndexOf(",", i) + 1;
      if (/^(est|sont|etait|etaient|sera|seront|doit|doivent|peut|peuvent)$/.test(mots[i - 1] ?? "")) sujet = mots.slice(debut, i).join(" ");
    }
  });
  return { affirme: affirme.join(" "), nie: nie.join(" "), sujet };
}

/**
 * L'énoncé collé : l'introduction (« Selon Mongo Beti, »), la citation, puis la consigne.
 * Marche avec ou sans guillemets, en minuscules, sans ponctuation.
 */
export function decouperSujet(texte: string) {
  const net = texte.replace(/\s+/g, " ").trim();
  let avant = "", citation = net, apres = "";

  const g = net.match(/^(.*?)[«“"„]\s*(.{8,}?)\s*[»”"“](.*)$/);
  if (g) [avant, citation, apres] = [g[1], g[2], g[3]];
  else {
    // Sans guillemets : la consigne commence au premier verbe de consigne, ou à une phrase de consigne.
    const debut = debutConsigne(net);
    if (debut > 0) [citation, apres] = [net.slice(0, debut), net.slice(debut)];
    // « Selon X, … » ou « X affirme que … » en tête : c'est l'introduction.
    const intro = citation.match(/^((?:selon|pour|d apres|d'après|d’après)\s+[^,:]{2,40}[,:]|[^,:.]{2,60}?\s(?:affirme|ecrit|écrit|declare|déclare|pense|soutient|estime|dit|disait|ecrivait|écrivait|soulignait|souligne|constate)(?:\s*:|\s+que\s|\s+qu'|\s+qu’))\s*/i);
    if (intro && citation.length - intro[0].length > 15) [avant, citation] = [intro[1], citation.slice(intro[0].length)];
    else {
      // « selon mongo beti l'écrivain doit… » : sans virgule, on s'arrête au nom d'un auteur connu.
      const a = citation.match(/^(?:selon|d'après|d’après|pour)\s+/i) && auteurConnu(citation.split(/\s+/).slice(1, 5).join(" "));
      if (a) {
        const mots = citation.split(/\s+/), n = a.cle.split(" ").length + 1;
        [avant, citation] = [mots.slice(0, n).join(" "), mots.slice(n).join(" ")];
      }
    }
  }
  citation = citation.replace(/^[«"“\s:,-]+|[»"”\s,]+$/g, "");
  const consigne = apres.replace(/^[\s.,;:»"”]+/, "").trim();
  return { citation, consigne, introduction: avant.trim(), auteur: trouverAuteur(avant, consigne) };
}

/** Position où la consigne commence dans un énoncé sans guillemets (0 si on ne la trouve pas). */
function debutConsigne(net: string) {
  // Par phrase : la première phrase (après la première) qui commence comme une consigne.
  const phrases = [...net.matchAll(/[^.!?]+[.!?]*/g)];
  for (const p of phrases.slice(1)) if (CONSIGNE_DEBUTS.test(normalize(p[0]).replace(/[^a-z ]+/g, " ").trim()) || estVerbeConsigne(p[0].trim().split(/\s+/)[0])) return p.index!;
  // Sans ponctuation : le premier verbe de consigne après les premiers mots.
  const mots = [...net.matchAll(/\S+/g)];
  for (let i = 4; i < mots.length; i++) if (estVerbeConsigne(mots[i][0])) {
    const avant = normalize(mots[i - 1][0]);
    return mots[avant === "vous" || avant === "puis" ? i - 1 : i].index!;
  }
  return 0;
}

function estVerbeConsigne(mot: string) {
  const b = normalize(mot).replace(/[^a-z]/g, "");
  if (b.length < 6) return false;
  // Formes de consigne seulement (« expliquez », « expliquer », « expliqué ») : pas « explication ».
  if (!/(ez|er|e|es|erez)$/.test(b)) return false;
  return CONSIGNE_FORTS.some(d => commencePar(cle(b, false), d));
}

/** « Commentez cette pensée de Mongo Beti », « Selon Mongo Beti, » : le nom qui suit, s'il est écrit avec des majuscules. */
function trouverAuteur(avant: string, consigne: string) {
  const nom = "([A-ZÀ-Ý][\\p{L}'’.-]+(?:\\s+(?:de |d'|du |la |le )?[A-ZÀ-Ý][\\p{L}'’.-]+){0,3})";
  const connu = auteurConnu(`${avant} ${consigne}`);
  if (connu) return connu.nom;
  const m = consigne.match(new RegExp(`\\b(?:de|d'|d’)\\s*${nom}`, "u")) ?? avant.match(new RegExp(`(?:[Ss]elon|[Pp]our|[Dd]'après|[Dd]’après)\\s+${nom}`, "u")) ?? avant.match(new RegExp(`^\\s*${nom}\\s`, "u"));
  const n = m?.[1]?.trim().replace(/[.,;:]+$/, "") ?? "";
  return n && !/^(L|La|Le|Les|Un|Une|Dans|Cette|Ce|Vous|Selon)$/.test(n.split(" ")[0]) ? n : "";
}

let auteurs: { nom: string; cle: string }[] | null = null;
/** Un auteur des fiches cité dans le texte, nom complet (« Mongo Beti », « Aimé Césaire »). */
function auteurConnu(texte: string) {
  if (!auteurs) {
    const vus = new Map<string, string>();
    for (const w of OEUVRES) for (const a of w.auteur.split(/\s*(?:,|&| et )\s*/)) {
      const k = normalize(a).replace(/[^a-z ]+/g, " ").trim();
      if (k.split(" ").length >= 2 && !vus.has(k)) vus.set(k, a.trim());
    }
    auteurs = [...vus].map(([cle, nom]) => ({ nom, cle })).sort((a, b) => b.cle.length - a.cle.length);
  }
  const t = ` ${normalize(texte).replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ")} `;
  return auteurs.find(a => t.includes(` ${a.cle} `)) ?? null;
}

/** Ce que demande la consigne, en quelques mots. */
function travailDemande(consigne: string, texte: string, discussion: boolean) {
  const c = normalize(consigne);
  if (/^(pensez|partagez|etes|que pensez|qu en pensez|dans quelle mesure)/.test(c) || (!c && /\?\s*$/.test(texte))) return "Donner ton avis en discutant l'idée";
  if (discussion) return "Expliquer puis discuter";
  if (/comment/.test(c)) return "Expliquer et commenter";
  if (/illustr/.test(c)) return "Expliquer et illustrer d'exemples";
  return "Expliquer";
}

export function analyserSujet(texte: string, combien = 6): Analyse {
  const { citation: c0, consigne, auteur } = decouperSujet(texte);
  // Thèmes, fonction et mots difficiles : dans la citation seulement (pas dans « Expliquez et discutez »),
  // sauf si l'élève a tapé une question sans citation (« La littérature peut-elle changer le monde ? »).
  const citation = jetons(c0).length >= 3 ? c0 : texte;
  const mots = jetons(citation);

  // Thèmes : tous les mots importants d'une forme du thème se retrouvent dans le sujet.
  const trouves = tousLesThemes().map(th => ({ th, q: Math.max(0, ...th.formes.map(f => Math.min(...f.map(w => presence(mots, w))))) }))
    .filter(x => x.q > 0)
    .sort((a, b) => b.q - a.q || b.th.frequence - a.th.frequence);
  const themes = trouves.map(x => x.th.nom).slice(0, 6);

  // Fonction : les indices, phrase par phrase ; ce qui est nié compte pour la fonction opposée.
  const scores = new Map<Fonction, number>();
  const plus = (f: Fonction, n: number) => scores.set(f, (scores.get(f) ?? 0) + n);
  const indices = (bout: string) => {
    // « littérature », « écrivain »… ne servent pas d'indice (« liber » ne doit pas les trouver, même mal écrits).
    const m = jetons(bout).filter(x => !TROP_COURANTS.has(x.brut)), ph = ` ${clesDe(bout)} `;
    return INDICES.map(([f, liste]) => [f, liste.filter(i => indicePresent(m, i, ph)).reduce((s, i) => s + (i.includes(" ") ? 2 : 1), 0)] as [Fonction, number]);
  };
  for (const phrase of normalize(citation).replace(/,/g, " , ").replace(/[^a-z.;!?,]+/g, " ").split(/[.;!?]/)) {
    const { affirme, nie, sujet } = affirmeEtNie(phrase);
    const niees = indices(nie), duSujet = sujet ? indices(sujet) : [];
    const sujetNie = sujet && !niees.some(([, n]) => n) && duSujet.some(([, n]) => n);
    for (const [f, n] of indices(affirme)) if (n) plus(f, n);
    for (const [f, n] of sujetNie ? duSujet : niees) if (n) plus(OPPOSE[f], n * (sujetNie ? 1.5 : 0.5));
    // Ce qui était compté comme affirmé dans le sujet nié ne compte plus.
    if (sujetNie) for (const [f, n] of duSujet) if (n) plus(f, -n);
  }
  // Les thèmes trouvés départagent (et suffisent quand aucun indice n'apparaît).
  for (const x of trouves.slice(0, 6)) {
    const m = fonctionsDesThemes().get(normalize(x.th.nom));
    if (!m) continue;
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    for (const [f, n] of m) plus(f, (0.6 * n) / total);
  }
  // Auteur connu : ses propres œuvres disent souvent ce qu'il défend (Césaire, Mongo Beti → engagement).
  const ecrivain = auteur ? auteurConnu(auteur) : null;
  if (ecrivain) {
    const siennes = OEUVRES.filter(w => normalize(w.auteur).includes(ecrivain.cle));
    for (const w of siennes) for (const f of w.fonctions) plus(f, 0.8 / siennes.length / w.fonctions.length * 2);
  }
  const classes = [...scores].sort((a, b) => b[1] - a[1]);
  const meilleur = classes[0]?.[1] ?? 0;
  const fonctions = classes.filter(([, n], i) => n >= 0.3 && (i === 0 || n >= meilleur * 0.45)).map(([f]) => f).slice(0, 2);

  // Mots du dictionnaire présents dans l'énoncé (« ENGAGEMENT (ENGAGÉ) » : chaque forme compte), sans faute ou presque.
  const dico = motsPublics().filter(e => {
    if (TROP_COURANTS.has(normalize(e.mot).split(/[^a-z]/)[0])) return false;
    return e.mot.split(/\s*[\/(),]\s*/).some(f => { const p = jetons(f); return p.length > 0 && p.every(w => presence(mots, w) >= 2); });
  }).slice(0, 6);

  const tout = normalize(texte);
  const discussion = /\?/.test(texte) || /discut|diskut|nuanc|partag|apprec|pensez vous|penser vous|pensez-vous|etes vous|etes-vous|d accord|daccord|dans quelle mesure|selon vous|limites/.test(tout)
    || jetons(consigne).some(m => commencePar(m.cle, cle("discut", false)));
  const f = fonctions[0];
  const plan = f
    ? { axe1: `Explique la thèse : pour l'auteur, la littérature est ${IDEE[f]}.`,
        axe2: discussion ? `Nuance : la littérature peut aussi être ${IDEE[OPPOSE[f]]}.` : `Approfondis : montre d'autres façons dont les œuvres le prouvent.`, args1: [] as string[], args2: [] as string[] }
    : { axe1: "Explique la citation : ce que l'auteur veut dire, avec des exemples d'œuvres.",
        axe2: discussion ? "Discute : montre les limites de cette idée, avec d'autres exemples." : "Approfondis : montre d'autres façons dont les œuvres le prouvent.", args1: [] as string[], args2: [] as string[] };

  // Arguments annoncés par le sujet (ce qui est nié n'en annonce pas).
  const affirme = normalize(citation).replace(/,/g, " , ").replace(/[^a-z.;!?,]+/g, " ").split(/[.;!?]/).map(p => { const a = affirmeEtNie(p); return a.sujet && a.nie ? a.affirme.replace(a.sujet, "") : a.affirme; }).join(" . ");
  const ma = jetons(affirme).filter(x => !TROP_COURANTS.has(x.brut)), pa = ` ${clesDe(affirme)} `;
  const argumentsTrouves = INDICES_ARGUMENTS.map(([a, fa, l]) => ({ a, fa, n: l.filter(i => indicePresent(ma, i, pa)).length }))
    .filter(x => x.n > 0 && fonctions.includes(x.fa)).sort((x, y) => y.n - x.n).map(x => x.a);
  const choisir = (fn: Fonction | undefined, exclus: string[]) => fn
    ? [...argumentsTrouves.filter(a => INDICES_ARGUMENTS.find(x => x[0] === a)![1] === fn), ...ARGUMENTS_TYPES[fn]].filter((a, i, t) => t.indexOf(a) === i && !exclus.includes(a)).slice(0, 2)
    : [];
  const args1 = choisir(f, []);
  const args2 = discussion ? choisir(f && OPPOSE[f], args1) : choisir(fonctions[1] ?? f, args1);
  plan.args1 = args1.map(a => ARGUMENTS[a] ?? a);
  plan.args2 = args2.map(a => ARGUMENTS[a] ?? a);

  const genres = GENRES.filter(([, ms]) => ms.some(m => mots.some(x => x.brut === m || x.cle === cle(m)))).map(([g]) => g);
  // Sans thème reconnu : les œuvres au programme qui illustrent la fonction attendue.
  const avecThemes = oeuvresPour(themes, fonctions, combien, 2, genres, argumentsTrouves);
  // Trop peu d'œuvres sur ces thèmes : on complète avec celles qui illustrent la même fonction.
  const oeuvres = avecThemes.length >= Math.min(3, combien) ? avecThemes
    : [...avecThemes, ...oeuvresPour([], fonctions, Math.min(combien, 6), 1.5, genres, argumentsTrouves).filter(w => !avecThemes.includes(w))].slice(0, Math.max(combien, avecThemes.length));

  const importants = mots.filter(m => m.brut.length >= 5 && !TROP_COURANTS.has(m.brut));
  const proches = SUJETS.map(s => {
    const ts = new Set((s.themes ?? []).map(normalize));
    const fs = fonctionsDuSujet(s.num);
    const communs = new Set(jetons(`${s.citation} ${s.notion ?? ""}`).filter(m => m.brut.length >= 5 && !TROP_COURANTS.has(m.brut) && importants.some(x => egal(x, m))).map(m => m.cle)).size;
    return { s, score: themes.filter(x => ts.has(normalize(x))).length * 2 + fonctions.filter(x => fs.includes(x)).length * 1.5 + communs };
  }).filter(x => x.score >= 2.5).sort((a, b) => b.score - a.score).slice(0, 2).map(x => x.s);

  return { themes, fonctions, mots: dico, discussion, arguments: argumentsTrouves, travail: travailDemande(consigne, texte, discussion), auteur, plan, oeuvres, proches };
}
