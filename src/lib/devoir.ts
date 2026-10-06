import type { Fonction, MotDico, Oeuvre, Sujet, SujetApercu } from "../data/types";
import { OEUVRES, SUJETS } from "./data";
import { contenuLibre } from "./libre";
import { motsPublics } from "./dictionnaire";
import { fonctionsDuSujet, oeuvresPour } from "./defi";
import { normalize } from "./text";
import { ARGUMENTS } from "./arguments";
import MODELE from "../data/modele-fonctions.json";
import { redresser, cle, commencePar, jetons, memeFamille, memeMot, type Jeton } from "./flou";

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
  ["Engagement", ["instrui", "accus", "pistolet", "tract$", "propagande", "militer", "jours meilleurs", "aveugle", "eduqu", "enseign", "former", "moral", "lecon", "verite", "conscientis", "engage$", "engagement", "change$", "changement", "denon", "combat", "lutt", "arme$", "militant", "changer le monde", "changer la societe", "eveill", "conscien", "revolt", "revolution", "liber", "injust", "oppress", "opprim", "servir", "au service", "peuple", "responsab", "mission", "temoign", "bataille", "battre", "porte-parole", "sans voix", "defend", "critiqu", "transform", "agir", "action", "utile$", "guide$", "eclair", "flambeau", "vocation", "croisade", "resist", "dictat", "tyran", "colonis", "esclav", "racis", "fusil", "bombe", "prophet", "verite", "mensonge", "hypocris", "silenc", "devoir$", "accuse", "soumission", "bouche$", "malheur", "voix$", "echo$", "derang", "inquiet", "boulevers", "envahi", "secou", "choqu", "provoqu", "histoire$", "relecture", "relire", "memoire"]],
  ["Sociale", ["tradition", "coutume", "vie d un peuple", "type$", "types$", "condition", "decouvr", "temoin", "temoignage", "point d optique", "realisme", "reflet", "histoire$", "memoire", "connaitre", "classe", "sociaux", "societ", "social", "miroir", "realit", "reel$", "realis", "peindre", "peint", "tableau", "reflet", "refleter", "moeurs", "epoque", "vie quotidienne", "c est la vie", "de la vie", "observ", "decri", "description", "milieu", "photograph", "document", "imiter", "imitation", "faits$", "tels qu", "telle qu", "tel qu", "empreinte", "nous vivons", "ce que nous vivons", "vivent", "information", "barometre"]],
  ["Esthétique", ["maniere", "langue$", "mots$", "technique", "enchant", "vocabulaire", "dictionnaire", "clairement", "partition", "danse", "grandeur", "peintre", "sonor", "vers$", "ecriture$", "travail", "ciseler", "beau$", "beaute", "belle$", "art$", "l art pour l art", "artist", "forme$", "style", "langage", "poesie pure", "createur", "creation", "creat", "gratuit", "musique", "musical", "harmon", "rime", "rythme", "image$", "verbe$", "perfection", "esthet", "inutile", "elle meme", "symbole", "parole artistique", "orfevre", "sculpt", "spectacle"]],
  ["Évasion", ["refuge", "hors de ce monde", "n importe ou", "menteur", "emport", "loin", "rire$", "comique", "humour", "plaire", "suffit pas", "chambre", "voyager", "fable", "conte$", "contes$", "legende", "aventure", "evasion", "evad", "reve$", "rever$", "reveur", "imagin", "divert", "distrai", "distrac", "fuir", "fuite", "ailleurs", "plaisir", "amus", "oubli", "fiction", "invent", "ennui", "ennuy", "loisir", "detente", "voyag", "aventur", "merveill", "fantast", "fantaisie", "magie", "echapp", "arracher", "consol", "chimere", "illusion", "raconter des histoires", "spectacle", "partir$", "lointain", "endroits"]],
  ["Lyrique", ["nu$", "lui meme", "soi meme", "moi meme", "se chercher", "autobiograph", "confession", "sincer", "temperament", "vecu", "experience", "coeur", "cri$", "souvenir", "nostalg", "aveu", "sentiment", "emotion", "coeur", "ame$", "moi$", "intime", "souffr", "douleur", "douloureu", "amour", "joie", "tristesse", "triste", "confid", "emouv", "emu$", "toucher le coeur", "touche le coeur", "tourment", "sourire", "souri$", "malheureu", "ressen", "sensib", "larme", "pleur", "chagrin", "melancol", "desesper", "nostalg", "passion", "solitude", "sanglot", "plainte", "lament", "gemi", "chant", "personnel$"]]
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
  ["Divertissement", "Évasion", ["divert", "distrai", "distrac", "amus", "plaisir", "loisir", "ennui", "ennuy", "detente", "raconter des histoires", "spectacle", "partir$", "lointain", "endroits"]],
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
  negritude: ["negre", "negres", "peuple noir", "race noire", "homme noir", "hommes noirs", "monde noir"],
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

/** Une œuvre qui illustre un argument, et en une ligne pourquoi (quand l'élève a accès à la fiche). */
export interface Exemple { id: string; titre: string; auteur: string; pourquoi: string }

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
  /** `ex1`, `ex2` : pour chaque argument, les œuvres qui l'illustrent (une, ou deux si la consigne demande d'illustrer). */
  plan: { axe1: string; axe2: string; args1: string[]; args2: string[]; ex1: Exemple[][]; ex2: Exemple[][]; problematique: string };
  /** L'autre fonction possible quand l'appli hésite entre deux lectures du sujet. */
  doute: Fonction | null;
  /** Très peu d'indices dans le sujet : la fonction proposée est à vérifier. */
  faible: boolean;
  /** La fonction que l'auteur rejette (« Je ne crois pas à l'évasion »), s'il en rejette une. */
  rejet: Fonction | null;
  /** Le sujet est presque un sujet corrigé : son numéro, et si l'élève peut ouvrir le corrigé (le plan vient alors du corrigé). */
  corrige: { num: string; ouvert: boolean } | null;
  /** Ce que demande vraiment l'énoncé : une dissertation littéraire, ou autre chose. */
  nature: "dissertation" | "commentaire" | "resume" | "generale";
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
const ARRETENT = new Set(["que", "qu", "mais", "plutot", "seulement", "sinon", "si", ","]);

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
  const net = nettoyer(texte);
  let avant = "", citation = net, apres = "";

  // La citation est le plus long passage entre guillemets (un titre d'œuvre entre guillemets est plus court).
  const passages = [...net.matchAll(/[«“"„]\s*([^«»“”"„]{8,}?)\s*[»”"“]/g)];
  const g = passages.sort((a, b) => b[1].length - a[1].length)[0];
  if (g && g[1].split(/\s+/).length >= 4) {
    avant = net.slice(0, g.index!);
    citation = g[1];
    // La consigne : la phrase qui suit la citation (pas la suite du message, ni une correction collée après).
    apres = net.slice(g.index! + g[0].length).replace(/^[\s.»”"]+/, "");
    const fin = apres.search(/[.!?](\s|$)/);
    if (fin > 0) apres = apres.slice(0, fin + 1);
  } else {
    // Sans guillemets : la consigne commence au premier verbe de consigne, ou à une phrase de consigne.
    const debut = debutConsigne(net);
    if (debut > 0) [citation, apres] = [net.slice(0, debut), net.slice(debut)];
    // « Selon X, … » ou « X affirme que … » en tête : c'est l'introduction.
    const intro = citation.match(/^((?:selon|pour|d apres|d'après|d’après)\s+[^,:]{2,40}[,:]|[^,:.]{2,60}?\s(?:affirme|ecrit|écrit|declare|déclare|pense|soutient|estime|dit|disait|ecrivait|écrivait|soulignait|souligne|constate)(?:\s*:|\s+que\s|\s+qu'|\s+qu’))\s*/i);
    if (intro && citation.length - intro[0].length > 15) [avant, citation] = [intro[1], citation.slice(intro[0].length)];
    else {
      // « selon mongo beti l'écrivain doit… » : sans virgule, on s'arrête au nom d'un auteur connu.
      const tete = citation.match(/^(?:selon|d'après|d’après|d'apres|d apres|pour)\s+/i);
      if (tete) {
        const mots = citation.split(/\s+/), debut = tete[0].trim().split(/\s+/).length;
        // Le plus court groupe de mots qui donne un auteur connu, même mal écrit (« selon sengor »).
        for (let k = 1; k <= 4; k++) if (auteurConnu(mots.slice(debut, debut + k).join(" "))) {
          [avant, citation] = [mots.slice(0, debut + k).join(" "), mots.slice(debut + k).join(" ")];
          break;
        }
      }
    }
  }
  citation = citation.replace(/^[«"“\s:,-]+|[»"”\s,]+$/g, "");
  const consigne = apres.replace(/^[\s.,;:»"”]+/, "").trim();
  return { citation, consigne, introduction: avant.trim(), auteur: trouverAuteur(avant, consigne) };
}

/**
 * Le message tel que l'élève le colle : « << >> » remis en guillemets, salutations et en-têtes retirés
 * (« Salut à tous svp aidez-moi », « BAC BLANC RÉGIONAL DALOA », « Sujet : »).
 */
function nettoyer(texte: string) {
  let t = texte.replace(/<<|«/g, " « ").replace(/>>|»/g, " » ").replace(/[“”]/g, "\"").replace(/æ/g, "œ");
  // Lignes qui ne sont pas le sujet.
  t = t.split(/\n+/).filter(l => !/^\s*(salut|bonjour|bonsoir|svp|s.il vous pla[iî]t|aide[zr]?[- ]moi|aidé moi|merci|bac blanc|examen blanc|devoir de|dissertation( litt[ée]raire)?\s*(:|$)|fran[cç]ais\s*$|correction)/i.test(l) || /[«"]/.test(l)).join(" ");
  return t
    .replace(/\b(salut( à tous)?|bonjour( à tous)?|svp|s.il vous pla[iî]t|j.ai besoin de (votre|ton) aide|aid[eé]z?[- ]moi( avec [^.:«]*)?|merci( d.avance)?)[,.!:]*/gi, " ")
    .replace(/(^|\s)(sujet( de dissertation( litt[ée]raire)?)?|dissertation( litt[ée]raire)?)\s*:/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const exact = auteurs.find(a => t.includes(` ${a.cle} `));
  if (exact) return exact;
  // Mal écrit (« sengor », « couroma », « mongo béti ») : par le son. Prénom et nom, ou un nom de famille
  // long et sans ambiguïté qui n'est pas aussi un mot courant (« Racine »).
  const sons = t.trim().split(" ").filter(m => m.length >= 3).map(m => cle(m));
  const present = (k: string) => sons.some(x => x === k || (k.length >= 6 && memeMot(x, k)));
  let meilleur: { a: { nom: string; cle: string }; n: number } | null = null;
  for (const a of auteurs) {
    const noms = a.cle.split(" ").filter(m => m.length >= 3).map(m => cle(m)).filter(k => k.length >= 3);
    const n = noms.filter(present).length;
    const nom = noms[noms.length - 1];
    const seul = n === 1 && nom && nom.length >= 6 && present(nom) && !MOTS_COURANTS.has(nom) && auteurs.filter(b => b.cle.endsWith(a.cle.split(" ").pop()!)).length === 1;
    if ((n >= 2 || seul) && (!meilleur || n > meilleur.n)) meilleur = { a, n };
  }
  return meilleur?.a ?? null;
}
/** Noms d'auteurs qui sont aussi des mots courants : jamais reconnus seuls. */
const MOTS_COURANTS = new Set(["racine", "france", "laforgue", "lafontaine"].map(m => cle(m)));

/** Ce que demande la consigne. « Commentez » demande aussi d'apprécier, donc de nuancer. */
function typeDeConsigne(consigne: string, texte: string, tout: string): Consigne {
  const c = normalize(consigne);
  if (/^(pensez|partagez|etes|que pensez|qu en pensez|dans quelle mesure)/.test(c) || (!c && /\?\s*$/.test(texte))) return "avis";
  if (/\?/.test(texte) || /discut|diskut|nuanc|partag|apprec|pensez vous|penser vous|etes vous|d accord|daccord|dans quelle mesure|selon vous|limites/.test(tout)
    || jetons(consigne).some(m => commencePar(m.cle, cle("discut", false)))) return "discuter";
  if (/comment/.test(c)) return "commenter";
  if (/illustr/.test(c)) return "illustrer";
  return "expliquer";
}
const TRAVAIL: Record<Consigne, string> = {
  avis: "Donner ton avis en discutant l'idée",
  discuter: "Expliquer puis discuter",
  commenter: "Expliquer puis apprécier (montrer les limites)",
  illustrer: "Expliquer et illustrer d'exemples",
  expliquer: "Expliquer (sans discuter)"
};

/** L'appli hésite quand la deuxième fonction a presque autant de points que la première. */
const SEUIL_DOUTE = 0.8;

/** Tournures par lesquelles un auteur écarte une idée. */
const REJETTE = /\b(n est pas|ne sont pas|n est plus|ne crois pas|ne lis pas|n ecris pas|ne raconte pas|ne chante pas|ne doit pas|n a pas pour|pas pour|non pas|pas fait)\b/;
/** En dessous, presque aucun indice : la fonction proposée est un simple pari. */
const SEUIL_FAIBLE = 1;

/**
 * Le sujet tapé est presque un sujet corrigé : la plupart de ses mots importants s'y retrouvent, dans les deux sens.
 * Rend le sujet tel que l'élève y a accès (avec son corrigé s'il peut l'ouvrir).
 */
function sujetCorrigeProche(citation: string): Sujet | SujetApercu | null {
  // Mots importants, une fois chacun (sans les mots recollés ou décollés que la lecture essaie en plus).
  const courants = new Set([...TROP_COURANTS].map(m => cle(m)));
  const importants = (t: string) => jetons(t).filter((m, i, l) => !m.colle && m.brut.length >= 4 && !courants.has(m.cle) && l.findIndex(x => x.cle === m.cle) === i);
  const a = importants(citation), sons = clesDe(citation);
  // Côté élève, les mots collés ou décollés comptent aussi (« sarmer » → « armer », « lecho » → « écho »).
  const tous = jetons(citation);
  // Sujet court (« La poésie n'a pas d'autre but qu'elle-même ») : il faut le retrouver presque mot pour mot.
  if (sons.length >= 14) for (const s of SUJETS) {
    const t = clesDe(redresser(s.citation));
    if (t.length >= 14 && (t.includes(sons) || sons.includes(t)) && Math.min(t.length, sons.length) / Math.max(t.length, sons.length) > 0.7) return s;
  }
  if (a.length < 4) return null;
  let mieux: { s: Sujet | SujetApercu; score: number } | null = null;
  for (const s of SUJETS) {
    const b = importants(redresser(s.citation));
    if (b.length < 4) continue;
    const dansB = a.filter(x => b.some(y => egal(x, y))).length / a.length;
    const dansA = b.filter(y => tous.some(x => egal(x, y))).length / b.length;
    // Presque tous les mots du corrigé sont dans le sujet tapé ; l'élève peut en avoir mal écrit ou collé quelques-uns.
    const score = dansA + dansB;
    if (dansA >= 0.75 && dansB >= 0.3 && (!mieux || score > mieux.score)) mieux = { s, score };
  }
  return mieux?.s ?? null;
}

/** Débuts de mots qui montrent qu'un sujet parle de littérature (larges exprès : au moindre doute, c'est une dissertation littéraire). */
const MOTS_LITTERAIRES = /^(litt?er|lettre|ecri|ecrir|poe|poem|roman|oeuvr|livr|lect|lir|lis|lu$|auteur|artis|art$|arts$|theat|drama|scen|spectat|salle|acteur|conte|recit|raconte|personnag|narra|fiction|styl|langa|vers$|mot$|mots$|chant|critiq|comed|comiq|traged|humour|satir|ironi|rime|rythm|image|metaph|recueil|page|texte|verbe|parole|griot|dire$|forme$|fond$|nouvelle|genre|negritude|imagin|inspir|muse|plume|creat|beaute|esthet|exprim|style|journal|intime|autobio|memoires|fabl|hero|langue|lyri|ouvrage|cre|beau|merveill|invent|legende|epope|mythe|fantais|utopi|essai)/;

/** Ce que demande vraiment l'énoncé : un commentaire, un résumé, un sujet de société, ou bien une dissertation littéraire. */
function natureDuSujet(texte: string, citation: string, auteurCite: boolean): Analyse["nature"] {
  const t = normalize(texte).replace(/[^a-z ]+/g, " ");
  if (/\bcommentaire (compose|de texte|litteraire)|\b(vous ferez|faites|faire|redigez) (un|le) commentaire|\bcommentez (ce|le|cet) (texte|poeme|passage|extrait)/.test(t)) return "commentaire";
  if (/\bresum(ez|er|e) (ce|le|du) texte|\bresume de texte|\bcontraction de texte|\bvous resumerez|\bfaites le resume/.test(t)) return "resume";
  // Toute la phrase compte, consigne comprise (« à partir des œuvres que vous avez lues »).
  const mots = normalize(`${citation} ${texte}`).replace(/[^a-z]+/g, " ").split(" ");
  // Un écrivain cité suffit à en faire un sujet littéraire.
  return auteurCite || mots.some(m => MOTS_LITTERAIRES.test(m)) ? "dissertation" : "generale";
}

/**
 * Ce que le modèle appris regarde dans une citation : la clé (le son) de chaque mot important,
 * précédée de « ! » quand le mot est nié (« n'est pas une arme » → « !arm »).
 */
export function traits(citation: string): string[] {
  const out = new Set<string>();
  for (const phrase of normalize(citation).replace(/,/g, " , ").replace(/[^a-z.;!?,]+/g, " ").split(/[.;!?]/)) {
    const { affirme, nie } = affirmeEtNie(phrase);
    for (const [bout, signe] of [[affirme, ""], [nie, "!"]] as const)
      for (const j of jetons(bout)) if (!j.colle && j.cle.length >= 3 && !TROP_COURANTS.has(j.brut)) out.add(signe + j.cle);
  }
  return [...out];
}

/** Modèle appris sur des centaines de sujets corrigés à la main : poids de chaque mot pour chaque fonction. */
const ORDRE: Fonction[] = ["Engagement", "Sociale", "Esthétique", "Évasion", "Lyrique"];
const POIDS = (MODELE as { poids: Record<string, number[]> }).poids;
const ECHELLE = (MODELE as { echelle?: number }).echelle ?? 0;
let vocabulaire: string[] | null = null;
function scoresAppris(citation: string): Map<Fonction, number> {
  const total = new Map<Fonction, number>();
  if (!ECHELLE) return total;
  vocabulaire ??= Object.keys(POIDS).filter(k => k.length >= 6 && !k.startsWith("!"));
  for (const t of traits(citation)) {
    // Mot mal écrit absent du modèle : le mot connu le plus proche (une lettre près, mots longs).
    const p = POIDS[t] ?? (t.length >= 6 && !t.startsWith("!") ? POIDS[vocabulaire.find(v => memeMot(v, t)) ?? ""] : undefined);
    if (p) ORDRE.forEach((f, i) => total.set(f, (total.get(f) ?? 0) + p[i] / 10));
  }
  return total;
}

// ---- Plan propre à chaque sujet : ses mots, ses thèmes, des arguments et des œuvres qui vont avec ----

/** Thèmes dont on connaît le genre, pour les glisser dans une phrase (« quand elle parle de la colonisation »). */
const THEMES_FEMININS = new Set(["societe", "identite", "colonisation", "memoire", "tradition", "liberte", "politique", "afrique", "corruption", "justice", "modernite", "famille", "guerre", "femme", "mort", "histoire", "nature", "satire", "oppression", "revolte", "enfance", "violence", "resistance", "tragedie", "dignite", "dictature", "hypocrisie", "foi", "condition feminine", "humanite", "education", "pauvrete", "desillusion", "independance", "trahison", "illusion", "religion", "revolution", "misere", "jeunesse", "solidarite", "ambition", "poesie", "science", "solitude", "tyrannie", "beaute", "aventure", "quete", "survie", "comedie", "culture", "exploitation", "immigration", "amitie", "ville", "tradition orale", "injustice", "spiritualite", "sagesse", "folie", "guerre civile", "passion", "initiation", "morale", "marginalite", "lutte", "melancolie", "loi", "paix", "utopie", "culpabilite", "negritude", "philosophie", "prison", "democratie", "conscience", "identite culturelle", "loyaute", "medecine", "manipulation", "souffrance", "polygamie", "reconciliation", "histoire africaine", "ironie", "oralite", "surveillance", "verite", "seduction", "drogue", "maternite", "vie quotidienne", "civilisation", "esthetique", "exploration", "absence", "condition humaine", "maladie", "emotion", "avarice", "musique", "lutte des classes", "greve", "vengeance", "gloire", "vision", "emancipation", "egalite", "epopee", "hypocrisie sociale", "absurdite", "esclavage", "colonisation", "mythe"]);
const THEMES_MASCULINS = new Set(["amour", "pouvoir", "destin", "racisme", "exil", "espoir", "sacrifice", "mariage", "art", "voyage", "reve", "temps", "totalitarisme", "capitalisme", "heritage", "engagement", "courage", "spleen", "peuple", "langage", "metissage", "humour", "theatre", "exotisme", "genocide", "travail", "patriarcat", "trauma", "argent", "dilemme", "prejuges"]);
/** « de la colonisation », « de l'amour », « du pouvoir », « des préjugés » ; null si on ne sait pas l'écrire. */
function deTheme(theme: string): string | null {
  const t = theme.trim(), k = normalize(t);
  if (/^[0-9]/.test(t) || t.includes(" et ")) return null;
  const nom = t.charAt(0).toLowerCase() + t.slice(1);
  const pluriel = /s$/.test(k) && !/(ss|is|us)$/.test(k);
  if (pluriel && THEMES_MASCULINS.has(k)) return `des ${nom}`;
  const fem = THEMES_FEMININS.has(k), masc = THEMES_MASCULINS.has(k);
  if (!fem && !masc) return null;
  if (/^[aeiouyhàâéèêëîïôöùûü]/i.test(nom)) return `de l'${nom}`;
  return fem ? `de la ${nom}` : `du ${nom}`;
}

/** Nom de la fonction dans une phrase : « c'est l'engagement ». */
const NOM_FONCTION: Record<Fonction, string> = { Engagement: "la fonction d'engagement", Sociale: "la fonction sociale", Esthétique: "la fonction esthétique", Évasion: "la fonction d'évasion", Lyrique: "la fonction lyrique" };

/** Nuance de la partie 2, liée au thème du sujet (« {de} » : « de la colonisation »). */
const NUANCE: Record<Fonction, (de: string) => string> = {
  Engagement: de => `Nuance : pour toucher le lecteur quand elle parle ${de}, la littérature doit aussi être belle ; elle reste un art avant d'être une arme.`,
  Sociale: de => `Nuance : la littérature ne se contente pas de montrer la réalité ${de} ; elle fait aussi rêver le lecteur et l'emmène ailleurs.`,
  Esthétique: de => `Nuance : même quand elle parle ${de}, la littérature ne cherche pas que la beauté ; sa forme sert aussi à dénoncer et à faire réfléchir.`,
  Évasion: de => `Nuance : même quand elle fait rêver, la littérature parle ${de} et du monde réel ; le rêve cache souvent une critique.`,
  Lyrique: de => `Nuance : en parlant ${de}, l'écrivain ne parle pas que de lui ; son émotion rejoint celle de tous et peut défendre une cause.`
};

/**
 * La thèse de la citation, reprise telle quelle quand elle s'y prête (« la littérature doit être une arme au service du peuple ») :
 * une seule phrase, assez courte, qui parle de la littérature ou de l'écrivain, sans « je » ni « nous ».
 */
function theseDe(citation: string): string | null {
  const c = citation.replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim().replace(/[.!…]+$/, "");
  if (c.length < 15 || c.length > 150 || /[.;?!]\s/.test(c)) return null;
  if (/\b(je|j'|j’|me|m'|m’|moi|mon|ma|mes|nous|notre|nos|vous|votre|vos|tu|ton|ta|tes)\b/i.test(c)) return null;
  if (!/^(la littérature|l[’']écrivain|le poète|la poésie|l[’']art|le roman|le romancier|le théâtre|l[’']œuvre|l[’']oeuvre|un écrivain|un poète|une œuvre|un livre|le livre|l[’']artiste|écrire|lire|la lecture|l[’']écriture|le dramaturge|un roman)\b/i.test(c)) return null;
  return c.charAt(0).toLowerCase() + c.slice(1);
}

/** La citation entière, entre guillemets, quand elle est assez courte pour être reprise dans un titre. */
function citationCourte(citation: string): string | null {
  const c = citation.replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim().replace(/[.!…]+$/, "");
  return c.length >= 15 && c.length <= 120 ? c : null;
}

/** Un nombre tiré du sujet : deux sujets différents ne vont pas chercher leurs exemples au même endroit. */
function graine(t: string) {
  let h = 0;
  for (const c of normalize(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Chaque fonction en quelques mots, pour la problématique. */
const EN_BREF: Record<Fonction, string> = {
  Engagement: "une arme de combat", Sociale: "un miroir de la société", Esthétique: "un art de la forme",
  Évasion: "un moyen de rêver et de s'évader", Lyrique: "l'expression des sentiments"
};

/** Ce que l'élève doit faire, d'après la consigne : il décide de la partie 2 et du nombre d'exemples. */
type Consigne = "expliquer" | "illustrer" | "commenter" | "discuter" | "avis";

/** Une phrase courte, coupée à un mot entier. */
function court(t: string, max = 150) {
  const x = t.replace(/\s+/g, " ").trim();
  if (x.length <= max) return x;
  const c = x.slice(0, max);
  return c.slice(0, Math.max(c.lastIndexOf(" "), 60)).replace(/[,;:]$/, "") + "…";
}

interface Contexte {
  citation: string;
  f: Fonction | undefined;
  f2: Fonction | undefined;
  consigne: Consigne;
  discussion: boolean;
  themes: string[];
  annonces: string[];
  oeuvres: Oeuvre[];
  genres: string[];
  rejet: Fonction | null;
}

/**
 * Plan conseillé, construit à partir du sujet lui-même : la thèse avec ses mots, les arguments que les
 * fiches des œuvres sur ces thèmes illustrent vraiment, une œuvre pour chaque argument, et une nuance liée au thème.
 * Quand l'auteur rejette une fonction (« Je ne crois pas à l'évasion »), la partie 1 défend ce qu'il pense vraiment.
 */
function planDuSujet({ citation, f: f0, f2: f20, consigne, discussion, themes, annonces, oeuvres, genres, rejet }: Contexte): Analyse["plan"] {
  // L'auteur rejette la fonction que le sujet évoque le plus : sa thèse est l'autre.
  const f = rejet && f0 === rejet ? (f20 && f20 !== rejet ? f20 : OPPOSE[rejet]) : f0;
  const f2 = f20 === f ? f0 : f20;
  const de = themes.map(deTheme).find((x): x is string => !!x) ?? null;
  const these = theseDe(citation), courte = citationCourte(citation);
  const axe1 = !f ? "Explique la citation : ce que l'auteur veut dire, avec des exemples d'œuvres."
    : these ? `Montre que, selon l'auteur, ${these} : c'est ${NOM_FONCTION[f]}.`
    : rejet && rejet !== f ? `Montre pourquoi, pour l'auteur, la littérature n'est pas d'abord ${IDEE[rejet]} : elle est plutôt ${IDEE[f]}.`
    : courte ? `Explique ce que veut dire l'auteur par « ${courte} » : pour lui, la littérature est ${IDEE[f]}.`
    : `Explique la thèse : pour l'auteur, la littérature est ${IDEE[f]}${de ? `, surtout quand elle parle ${de}` : ""}.`;
  // Partie 2 : la fonction rejetée par l'auteur est la nuance toute trouvée.
  const fN = f && (rejet && rejet !== f ? rejet : OPPOSE[f]);
  const axe2 = discussion
    ? (f ? (rejet && rejet !== f ? `Nuance : la littérature peut tout de même être ${IDEE[rejet]}.` : de ? NUANCE[f](de) : `Nuance : la littérature peut aussi être ${IDEE[fN!]}.`) : "Discute : montre les limites de cette idée, avec d'autres exemples.")
    : `Approfondis : montre, avec d'autres œuvres${de ? ` qui parlent ${de}` : ""}, d'autres façons dont la littérature le prouve.`;

  const problematique = !f ? "Que veut dire l'auteur, et a-t-il raison ?"
    : [rejet && rejet !== f ? `Pourquoi, selon l'auteur, la littérature est-elle ${EN_BREF[f]} plutôt ${/^[aeiouyhé]/.test(EN_BREF[rejet]) ? "qu'" : "que "}${EN_BREF[rejet]} ?`
      : these ? `En quoi peut-on dire que ${these} ?`
      : `En quoi la littérature est-elle ${IDEE[f]}${de ? ` quand elle parle ${de}` : ""} ?`,
    discussion ? `La littérature ne peut-elle pas aussi être ${EN_BREF[fN!]} ?` : "Comment les œuvres le montrent-elles ?"].join(" ");

  // Œuvres du sujet d'abord, puis toutes celles qui partagent ses thèmes : quels arguments illustrent-elles ?
  const cles = new Set(themes.map(normalize));
  const surLesThemes = [...oeuvres, ...OEUVRES.filter(w => !oeuvres.includes(w) && w.themes.some(t => cles.has(normalize(t))))];
  const choisir = (fn: Fonction | undefined, exclus: string[]) => {
    if (!fn) return [] as string[];
    const compte = new Map<string, number>();
    surLesThemes.forEach((w, rang) => {
      for (const a of new Set(w.idees.filter(i => i.fonction === fn && ARGUMENTS[i.argument]).map(i => i.argument)))
        compte.set(a, (compte.get(a) ?? 0) + (rang < oeuvres.length ? 2 : 1));
    });
    // Un argument rangé ailleurs par une fiche (« éveil des consciences » pour la fonction sociale) reste à sa fonction.
    const parThemes = [...compte].sort((x, y) => y[1] - x[1]).map(([a]) => a).filter(a => INDICES_ARGUMENTS.find(x => x[0] === a)?.[1] === fn);
    return [...annonces.filter(a => INDICES_ARGUMENTS.find(x => x[0] === a)![1] === fn), ...parThemes, ...ARGUMENTS_TYPES[fn]]
      .filter((a, i, t) => t.indexOf(a) === i && !exclus.includes(a)).slice(0, 2);
  };
  // Pour chaque argument, une œuvre qui l'illustre (deux si la consigne demande d'illustrer), différente d'un
  // argument à l'autre, du genre dont parle le sujet si possible, et jamais une fiche encore incomplète.
  const prises = new Set<string>();
  const sure = (w: Oeuvre) => w.detaillee !== false;
  const duGenre = (w: Oeuvre) => !genres.length || genres.includes(w.genre);
  const illustre = (w: Oeuvre, a: string, fn: Fonction | undefined) => w.idees.some(i => i.argument === a && (!fn || i.fonction === fn));
  const autres = (a: string, fn: Fonction | undefined, genre: boolean) => {
    // Aucune œuvre du sujet ne l'illustre : on en prend une ailleurs dans la base, pas toujours la même.
    const l = OEUVRES.filter(x => !prises.has(x.id) && sure(x) && (!genre || duGenre(x)) && illustre(x, a, fn));
    return l.length ? l[graine(citation + a) % l.length] : undefined;
  };
  const uneOeuvre = (a: string, fn: Fonction | undefined) =>
    surLesThemes.find(x => !prises.has(x.id) && sure(x) && duGenre(x) && illustre(x, a, fn))
    ?? autres(a, fn, true)
    ?? surLesThemes.find(x => !prises.has(x.id) && sure(x) && illustre(x, a, fn))
    ?? autres(a, fn, false);
  const exemples = (a: string, fn: Fonction | undefined): Exemple[] => {
    const out: Exemple[] = [];
    for (let k = 0; k < (consigne === "illustrer" ? 2 : 1); k++) {
      const w = uneOeuvre(a, fn);
      if (!w) break;
      prises.add(w.id);
      // Pourquoi l'œuvre convient : l'idée de la fiche, quand l'élève y a accès.
      const idee = w.idees.find(i => i.argument === a && i.texte)?.texte ?? "";
      out.push({ id: w.id, titre: w.titre, auteur: w.auteur, pourquoi: idee ? court(idee) : "" });
    }
    return out;
  };
  const f2b = discussion ? fN : f2 ?? f;
  const a1 = choisir(f, []), a2 = choisir(f2b, a1);
  return {
    axe1, axe2, problematique,
    args1: a1.map(a => ARGUMENTS[a] ?? a), args2: a2.map(a => ARGUMENTS[a] ?? a),
    ex1: a1.map(a => exemples(a, f)), ex2: a2.map(a => exemples(a, f2b))
  };
}

/** Le plan d'un sujet corrigé que l'élève peut ouvrir : celui écrit par le professeur. */
function planDuCorrige(s: Sujet): Analyse["plan"] {
  const ex = (a: { ex: string }): Exemple[] => a.ex ? [{ id: "", titre: "", auteur: "", pourquoi: court(a.ex, 170) }] : [];
  // Les questions de l'introduction, sans ce qui les annonce (« Une telle affirmation soulève les questions suivantes : »).
  const questions = s.intro.match(/[^.?!»]*\?/g)?.map(q => q.replace(/^.*:\s*/, "").trim()).filter(q => q.length > 10) ?? [];
  return {
    axe1: s.axe1.titre, axe2: s.axe2.titre,
    args1: s.axe1.args.map(a => a.titre), args2: s.axe2.args.map(a => a.titre),
    ex1: s.axe1.args.map(ex), ex2: s.axe2.args.map(ex),
    problematique: questions.slice(-2).join(" ")
  };
}

/** `imposee` : la fonction choisie par l'élève quand celle proposée ne lui convient pas ; le plan et les œuvres la suivent. */
export function analyserSujet(texteTape: string, combien = 6, imposee?: Fonction): Analyse {
  // Écriture SMS et mots courts écrits au son (« ds », « ki », « doi », « na pa ») remis en toutes lettres.
  // Le découpage garde le texte tapé (majuscules et guillemets aident à trouver l'auteur et la consigne).
  const { citation: brute, consigne, auteur } = decouperSujet(texteTape);
  const texte = redresser(texteTape);
  const c0 = redresser(brute);
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
  // Ce que l'auteur rejette (« je ne crois pas à l'évasion », « au lieu de s'évader ») et ce qu'il affirme, par fonction.
  const rejets = new Map<Fonction, number>(), affirmes = new Map<Fonction, number>();
  const ajoute = (m: Map<Fonction, number>, f: Fonction, n: number) => m.set(f, (m.get(f) ?? 0) + n);
  for (const brute of normalize(citation).replace(/,/g, " , ").replace(/[^a-z.;!?,]+/g, " ").split(/[.;!?]/)) {
    // « au lieu de s'évader par une œuvre » : ce qui suit est écarté par l'auteur.
    const lieu = brute.match(/\b(?:au lieu d|plutot que d)[a-z]*\s+((?:[a-z]+\s*){1,5})/);
    const phrase = lieu ? brute.replace(lieu[0], " ") : brute;
    const ecartees = lieu ? indices(lieu[1]) : [];
    for (const [f, n] of ecartees) if (n) { plus(f === "Lyrique" ? f : OPPOSE[f], n * 0.5); ajoute(rejets, f, n); }
    const { affirme, nie, sujet } = affirmeEtNie(phrase);
    const niees = indices(nie), duSujet = sujet ? indices(sujet) : [];
    const sujetNie = sujet && !niees.some(([, n]) => n) && duSujet.some(([, n]) => n);
    // Un vrai rejet : « n'est pas », « je ne crois pas », « pas pour »… mais pas « ne doit pas faire oublier » (double négation).
    if (REJETTE.test(phrase) && !/oubli|empech|neglig|exclu|sans/.test(nie)) for (const [f, n] of sujetNie ? duSujet : niees) if (n) ajoute(rejets, f, n);
    for (const [f, n] of indices(affirme)) if (n) { plus(f, n); ajoute(affirmes, f, n); }
    // Un sentiment nié reste un sentiment (« des gens qui n'ont jamais souri ») : seul le reste est renversé.
    for (const [f, n] of sujetNie ? duSujet : niees) if (n) plus(f === "Lyrique" ? f : OPPOSE[f], n * (sujetNie ? 1.5 : 0.5));
    // Ce qui était compté comme affirmé dans le sujet nié ne compte plus.
    if (sujetNie) for (const [f, n] of duSujet) if (n) plus(f, -n);
  }
  // Ce que le modèle appris en pense (il connaît bien plus de mots que la liste d'indices).
  for (const [f, n] of scoresAppris(citation)) plus(f, n * ECHELLE);
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
  const fonctions = imposee ? [imposee] : classes.filter(([, n], i) => n >= 0.3 && (i === 0 || n >= meilleur * 0.45)).map(([f]) => f).slice(0, 2);
  // La fonction que l'auteur rejette clairement (plus rejetée qu'affirmée) ; un sentiment nié reste un sentiment.
  const rejet = imposee ? null : ([...rejets].filter(([f, n]) => f !== "Lyrique" && n >= 1 && n > (affirmes.get(f) ?? 0)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
  // Deux lectures presque aussi probables l'une que l'autre : on le dit, et l'élève peut voir l'autre plan.
  const second = classes[1];
  const doute = !imposee && !rejet && second && second[1] >= meilleur * SEUIL_DOUTE ? second[0] : null;
  const faible = !imposee && meilleur < SEUIL_FAIBLE && !trouves.length;

  // Mots du dictionnaire présents dans l'énoncé (« ENGAGEMENT (ENGAGÉ) » : chaque forme compte), sans faute ou presque.
  const dico = motsPublics().filter(e => {
    if (TROP_COURANTS.has(normalize(e.mot).split(/[^a-z]/)[0])) return false;
    return e.mot.split(/\s*[\/(),]\s*/).some(f => { const p = jetons(f); return p.length > 0 && p.every(w => presence(mots, w) >= 2); });
  }).slice(0, 6);

  const tout = normalize(texte);
  const type = typeDeConsigne(consigne, texte, tout);
  const discussion = type === "discuter" || type === "avis" || type === "commenter";
  const f = fonctions[0];
  // Arguments annoncés par le sujet (ce qui est nié n'en annonce pas).
  const affirme = normalize(citation).replace(/,/g, " , ").replace(/[^a-z.;!?,]+/g, " ").split(/[.;!?]/).map(p => { const a = affirmeEtNie(p); return a.sujet && a.nie ? a.affirme.replace(a.sujet, "") : a.affirme; }).join(" . ");
  const ma = jetons(affirme).filter(x => !TROP_COURANTS.has(x.brut)), pa = ` ${clesDe(affirme)} `;
  const argumentsTrouves = INDICES_ARGUMENTS.map(([a, fa, l]) => ({ a, fa, n: l.filter(i => indicePresent(ma, i, pa)).length }))
    .filter(x => x.n > 0 && fonctions.includes(x.fa)).sort((x, y) => y.n - x.n).map(x => x.a);

  const genres = GENRES.filter(([, ms]) => ms.some(m => mots.some(x => x.brut === m || x.cle === cle(m)))).map(([g]) => g);
  // Sans thème reconnu : les œuvres au programme qui illustrent la fonction attendue.
  const avecThemes = oeuvresPour(themes, fonctions, combien, 2, genres, argumentsTrouves);
  // Trop peu d'œuvres sur ces thèmes : on complète avec celles qui illustrent la même fonction.
  const oeuvres = avecThemes.length >= combien ? avecThemes
    : [...avecThemes, ...oeuvresPour([], fonctions, combien, 1.5, genres, argumentsTrouves).filter(w => !avecThemes.includes(w))].slice(0, combien);

  // Sujet presque identique à un sujet corrigé : le plan du professeur passe avant le plan automatique.
  const corrigeProche = sujetCorrigeProche(c0);
  const plan = corrigeProche && "axe1" in corrigeProche ? planDuCorrige(corrigeProche)
    : planDuSujet({ citation: brute, f, f2: fonctions[1], consigne: type, discussion, themes, annonces: argumentsTrouves, oeuvres, genres, rejet });
  const corrige = corrigeProche ? { num: corrigeProche.num, ouvert: "axe1" in corrigeProche } : null;

  const importants = mots.filter(m => m.brut.length >= 5 && !TROP_COURANTS.has(m.brut));
  const proches = SUJETS.map(s => {
    const ts = new Set((s.themes ?? []).map(normalize));
    const fs = fonctionsDuSujet(s.num);
    const communs = new Set(jetons(`${s.citation} ${s.notion ?? ""}`).filter(m => m.brut.length >= 5 && !TROP_COURANTS.has(m.brut) && importants.some(x => egal(x, m))).map(m => m.cle)).size;
    return { s, score: themes.filter(x => ts.has(normalize(x))).length * 2 + fonctions.filter(x => fs.includes(x)).length * 1.5 + communs };
  }).filter(x => x.score >= 2.5).sort((a, b) => b.score - a.score).slice(0, 2).map(x => x.s);

  return {
    themes, fonctions, mots: dico, discussion, arguments: argumentsTrouves, travail: TRAVAIL[type], auteur, plan, oeuvres,
    proches: corrige ? proches.filter(x => x.num !== corrige.num) : proches,
    doute, faible, rejet, corrige, nature: natureDuSujet(texte, citation, !!auteur)
  };
}
