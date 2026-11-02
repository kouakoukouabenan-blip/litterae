import type { Fonction, MotDico, Oeuvre, Sujet, SujetApercu } from "../data/types";
import { OEUVRES, SUJETS } from "./data";
import { contenuLibre } from "./libre";
import { motsPublics } from "./dictionnaire";
import { fonctionsDuSujet, oeuvresPour } from "./defi";
import { normalize } from "./text";
import { ARGUMENTS } from "./arguments";
import MODELE from "../data/modele-fonctions.json";
import BANQUE_BRUTE from "../data/banque-arguments.json";
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
  ["Engagement", ["condamner la", "condamne la", "cri de revolte", "prendre position", "prise de position", "transformer la societe", "transforme la societe", "changer la societe", "dire la verite", "indign", "fustig", "condamn", "stigmatis", "mobilis", "rebelle", "rebellion", "subversi", "contest", "sentinelle", "eclaireur", "refuser le silence", "denonc", "reside dans son message", "reside dans le message", "trahison du peuple", "trahir le peuple", "dans son message", "dans le message", "trahison", "trahir", "trahi$", "maux de la societe", "maux de notre societe", "maux$", "mettre des mots sur", "met des mots sur", "prendre parti", "parti pris", "corriger les moeurs", "corrige les moeurs", "corriger les hommes", "accus", "pistolet", "tract$", "propagande", "militer", "jours meilleurs", "aveugle", "verite", "conscientis", "engage$", "engagement", "change$", "changement", "denon", "combat", "lutt", "arme$", "militant", "changer le monde", "changer la societe", "eveill", "conscien", "revolt", "revolution", "liber", "injust", "oppress", "opprim", "servir", "au service", "peuple", "responsab", "mission", "temoign", "bataille", "battre", "porte-parole", "sans voix", "defend", "critiqu", "transform", "agir", "action", "utile$", "guide$", "eclair", "flambeau", "vocation", "croisade", "resist", "dictat", "tyran", "colonis", "esclav", "racis", "fusil", "bombe", "prophet", "verite", "mensonge", "hypocris", "silenc", "devoir$", "accuse", "soumission", "bouche$", "malheur", "voix$", "echo$", "derang", "inquiet", "boulevers", "envahi", "secou", "choqu", "provoqu", "histoire$", "relecture", "relire", "memoire"]],
  ["Sociale", ["eduque$", "eduquer$", "sa culture", "ses racines", "histoire d un peuple", "histoire des peuples", "memoire des peuples", "memoire d un peuple", "sagesse des anciens", "transmet la sagesse", "valoriser la culture", "valorise la culture", "enseigne la morale", "enseigner la morale", "enseign", "transmet", "transmett", "valoris", "enracin", "sagesse", "ancetre", "reportage", "reporter", "instrui", "eduqu", "moraliser", "lecon de", "ce qu il voit", "ce que l on voit", "ce qu ils voient", "ecole du peuple", "ecole$", "didact", "moralis", "edifi", "tradition", "representer la vie", "represente la vie", "representation de la vie", "imiter la vie", "coutume", "vie d un peuple", "type$", "types$", "condition", "decouvr", "temoin", "temoignage", "point d optique", "realisme", "reflet", "histoire$", "memoire", "connaitre", "classe", "sociaux", "societ", "social", "miroir", "realit", "reel$", "realis", "peindre", "peint", "tableau", "reflet", "refleter", "moeurs", "epoque", "vie quotidienne", "c est la vie", "de la vie", "observ", "decri", "description", "milieu", "photograph", "document", "imiter", "imitation", "faits$", "tels qu", "telle qu", "tel qu", "empreinte", "nous vivons", "ce que nous vivons", "vivent", "information", "barometre"]],
  ["Esthétique", ["magie des mots", "jeu sur les mots", "par sa forme", "sa forme", "elegan", "embelli", "alchimi", "maniere", "bien ecrire", "bien ecrit", "langue$", "mots$", "technique", "enchant", "vocabulaire", "dictionnaire", "clairement", "partition", "danse", "grandeur", "peintre", "sonor", "vers$", "ecriture$", "travail", "ciseler", "beau$", "beaute", "belle$", "art$", "l art pour l art", "artist", "forme$", "style", "langage", "poesie pure", "createur", "creation", "creat", "gratuit", "musique", "musical", "harmon", "rime", "rythme", "image$", "verbe$", "perfection", "esthet", "inutile", "elle meme", "symbole", "parole artistique", "orfevre", "sculpt", "spectacle"]],
  ["Évasion", ["enchante la vie", "passer le temps", "fait passer le temps", "tapis volant", "belle histoire", "belles histoires", "raconter une histoire", "refuge", "hors de ce monde", "n importe ou", "menteur", "emport", "loin", "rire$", "comique", "humour", "plaire", "suffit pas", "chambre", "voyager", "fable", "conte$", "contes$", "legende", "aventure", "evasion", "evad", "reve$", "rever$", "reveur", "imagin", "divert", "distrai", "distrac", "fuir", "fuite", "ailleurs", "plaisir", "amus", "oubli", "fiction", "invent", "ennui", "ennuy", "loisir", "detente", "voyag", "aventur", "merveill", "fantast", "fantaisie", "magie", "echapp", "arracher", "consol", "chimere", "illusion", "raconter des histoires", "spectacle", "partir$", "lointain", "endroits"]],
  ["Lyrique", ["biograph", "ses souvenirs", "se raconte", "se devoile", "se confie", "se confier", "parler de soi", "devoil", "epanch", "etat d ame", "etats d ame", "vie de son auteur", "vie de l auteur", "sa propre vie", "propre vie", "nu$", "lui meme", "soi meme", "moi meme", "se chercher", "autobiograph", "confession", "sincer", "temperament", "vecu", "experience", "coeur", "cri$", "souvenir", "nostalg", "aveu", "sentiment", "emotion", "coeur", "ame$", "moi$", "intime", "souffr", "douleur", "douloureu", "amour", "joie", "tristesse", "triste", "confid", "emouv", "emu$", "toucher le coeur", "touche le coeur", "tourment", "sourire", "souri$", "malheureu", "ressen", "sensib", "larme", "pleur", "chagrin", "melancol", "desesper", "nostalg", "passion", "solitude", "sanglot", "plainte", "lament", "gemi", "chant", "personnel$"]]
];

/** Mots qui annoncent chaque argument de dissertation (les mêmes que ceux des fiches d'œuvres). */
const INDICES_ARGUMENTS: [string, Fonction, string[]][] = [
  ["Dénonciation", "Engagement", ["maux de la societe", "maux$", "denon", "critiqu", "accuse", "combat", "lutt", "injust", "mensonge", "hypocris", "arme$", "bataille", "croisade", "fusil"]],
  ["Éveil des consciences", "Engagement", ["eveill", "conscien", "eclair", "guide$", "flambeau", "aveugle", "instrui", "eduqu", "ouvrir les yeux", "professeur", "enseign", "esper", "espoir", "changer le monde", "transform"]],
  ["Défense des opprimés", "Engagement", ["opprim", "oppress", "sans voix", "voix$", "porte-parole", "bouche$", "malheur", "defend", "peuple", "faible", "pauvre", "misere", "liber", "esclav"]],
  ["Satire", "Engagement", ["satir", "corriger les moeurs", "corrige les moeurs", "moqu", "ridicul", "railler", "caricatur"]],
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
 * La fonction de la Partie 2, d'après les sujets corrigés par Atikan (novembre 2026) : instruire s'oppose à plaire
 * (engagement ↔ évasion), sauf quand le sujet parle d'art ou de beauté (engagement ↔ esthétique) ; le moi s'oppose à la société.
 */
function opposeePlan(f: Fonction, parleDArt: boolean): Fonction {
  if (f === "Engagement") return parleDArt ? "Esthétique" : "Évasion";
  return ({ Esthétique: "Engagement", Sociale: "Évasion", Évasion: "Engagement", Lyrique: "Sociale" } as Record<Fonction, Fonction>)[f];
}

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

/** Mots qui nomment un genre, sous toutes leurs formes. Les mots à double sens (« vers », « scène », « public »,
 *  « acteur », « nouvelle ») ne comptent que dans une tournure qui ne trompe pas. */
const GENRES: [string[], RegExp][] = [
  [["Poésie"], /\b(poet+(?:e|es|esse|esses)|poesies?|poemes?|poetiques?|poetiquement|versifi[a-z]*|sonnets?|strophes?|alexandrins?|(?:le|les|en|des|du|ses|mes|nos|vos|leurs|ces|ce|un|beaux) vers)\b/],
  [["Roman"], /\b(romans?|romancie?re?s?|romanesques?|romancees?)\b/],
  [["Roman", "Nouvelle", "Conte"], /\b(recits?|narrat[a-z]*)\b/],
  [["Théâtre"], /\b(theatr[a-z]*|dramaturg[a-z]*|comedi[a-z]*|tragedi[a-z]*|spectateurs?|(?:oeuvres?|arts?|textes?|genres?|auteurs?|pieces?) dramatiques?|mise en scene|sur scene|pieces? de theatre)\b/],
  [["Nouvelle"], /\b(nouvellistes?|recueils? de nouvelles|genre de la nouvelle)\b/],
  [["Conte"], /\b(contes?|conteu(?:r|se)s?)\b/],
  [["Essai"], /\b(essayistes?)\b/]
];

const GENRE_DU: Record<string, string> = { "Poésie": "de la poésie", Roman: "du roman", "Théâtre": "du théâtre", Nouvelle: "de la nouvelle", Conte: "du conte", Essai: "de l'essai" };
/** « Ton sujet parle de la poésie », « … du roman, de la nouvelle et du conte ». */
export const genreDu = (genres: string[]) => genres.map(g => GENRE_DU[g] ?? g).join(", ").replace(/, ([^,]*)$/, " et $1");

/** Genres dont parle le sujet (consigne comprise : « des exemples tirés du roman africain »). Aucun : tous les genres. */
export function genresDuSujet(texte: string): string[] {
  const t = normalize(texte).replace(/[^a-z]+/g, " ");
  return [...new Set(GENRES.filter(([, r]) => r.test(t)).flatMap(([g]) => g))];
}

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
  /** « Ce que dit ton sujet » : la thèse redite, la question cachée, l'idée contraire, des problématiques, une idée d'amorce. */
  comprendre: Comprendre | null;
  plan: {
    axe1: string; axe2: string; args1: string[]; args2: string[]; ex1: Exemple[][]; ex2: Exemple[][]; problematique: string;
    /** Pourquoi chaque argument tient (deux phrases), dans l'ordre des arguments. */
    expl1?: string[]; expl2?: string[];
    /** La limite du premier argument : ce qui fait passer à la partie 2. */
    transition?: string;
    /** D'autres œuvres possibles, pour que l'élève prenne celle qu'il a lue. */
    autres?: Exemple[];
  };
  /** Genres nommés par le sujet (« le poète » → Poésie) : les exemples n'en sortent pas. Vide : tous les genres. */
  genres: string[];
  /** L'autre fonction possible quand l'appli hésite entre deux lectures du sujet. */
  doute: Fonction | null;
  /** Très peu d'indices dans le sujet : la fonction proposée est à vérifier. */
  faible: boolean;
  /** La fonction que l'auteur rejette (« Je ne crois pas à l'évasion »), s'il en rejette une. */
  rejet: Fonction | null;
  /** Le sujet est presque un sujet corrigé : son numéro, et si l'élève peut ouvrir le corrigé (le plan vient alors du corrigé). */
  corrige: { num: string; ouvert: boolean } | null;
  /** Ce dont parle la citation (l'écrivain, la poésie…), et si l'appli l'a lu dans le sujet (sinon : la littérature par défaut). */
  objet: Objet;
  objetSur: boolean;
  /** Ce que demande vraiment l'énoncé : une dissertation littéraire, ou autre chose. */
  nature: "dissertation" | "commentaire" | "resume" | "generale";
  oeuvres: Oeuvre[];
  proches: (Sujet | SujetApercu)[];
  /**
   * L'appli est assez sûre de sa lecture pour montrer le plan tout de suite. Sinon, l'élève passe par le guide
   * (trois questions) et choisit lui-même sa piste : une fonction, ou « mon sujet parle d'autre chose ».
   */
  sure: boolean;
  /** Le sujet ne porte pas d'abord sur les fonctions de la littérature (la langue d'écriture, le lecteur, un genre…). */
  horsCadre: HorsCadre | null;
  /** Le nom que le cours donne à la fonction (« didactique », « ludique », « de témoignage »…), rattaché à la fonction trouvée. */
  precision: Precision | null;
  /** L'auteur dit que la littérature (la poésie, la lecture…) ne sert à rien : la partie 1 explique ce point de vue, la partie 2 le discute. */
  devalorise: boolean;
  /** Plan sans fonction, pour un sujet qui parle d'autre chose : ce qui donne raison à l'auteur, puis ses limites. */
  planLibre: Analyse["plan"];
}

/** Ce dont parle un sujet qui sort des fonctions de la littérature, et une piste de réflexion écrite à la main. */
export interface HorsCadre { cle: string; nom: string; conseil: string }

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
/**
 * Mots qui se prononcent pareil mais ne veulent pas dire la même chose (« des mots sur les maux ») :
 * la lecture au son ne doit jamais les confondre.
 */
const HOMOPHONES = [["mot", "mots", "maux", "mal"], ["vers", "verre", "verres", "vert", "verts", "ver"], ["foi", "fois", "foie"], ["voix", "voie", "voies", "voit", "vois"],
  ["cour", "cours", "court", "courts"], ["mer", "mers", "mere", "meres", "maire", "maires"], ["sang", "sans", "cent", "cents"], ["chant", "chants", "champ", "champs"],
  ["conte", "contes", "compte", "comptes", "comte", "comtes"], ["fin", "fins", "faim"], ["sein", "seins", "saint", "saints"], ["paix", "pet"], ["lait", "laid", "laids"],
  ["cou", "coup", "coups", "cout", "couts"], ["temps", "tant", "tante"], ["pere", "paire", "pair"], ["tache", "taches"], ["peine", "penne"]];
const SENS = new Map<string, string>();
for (const g of HOMOPHONES) for (const m of g) SENS.set(m, m.replace(/(s|x)$/, "") || m);
/** Deux homophones de sens différent (« mots » et « maux ») ne sont jamais le même mot. */
const sensDifferent = (a: string, b: string) => SENS.has(a) && SENS.has(b) && SENS.get(a) !== SENS.get(b) && a !== b;

const egal = (a: Jeton, b: Jeton) => !sensDifferent(a.brut, b.brut) && (b.cle.length < 3 ? a.brut === b.brut || a.brut === b.brut + "s" || (a.cle === b.cle && a.brut.length >= 4 && b.brut.length >= 4) : a.colle ? a.cle === b.cle : memeMot(a.cle, b.cle));

/** Qualité de la présence d'un mot dans le texte : 3 identique, 2 à quelques fautes près, 1 même famille, 0 absent. */
function presence(mots: Jeton[], w: Jeton) {
  let q = 0;
  for (const m of mots) {
    if (sensDifferent(m.brut, w.brut)) continue;
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
    // « …», affirme un critique. Commentez… » : la consigne est la première phrase qui en a la forme.
    const phrases = apres.match(/[^.!?]+[.!?]*/g) ?? [];
    // Rien qui ressemble à une consigne (« (Émile Zola, 1877) ») : pas de consigne.
    apres = (phrases.find(p => estConsigne(p)) ?? "").trim();
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
  let t = texte.replace(/<<|«/g, " « ").replace(/>>|»/g, " » ").replace(/''|’’/g, "\"").replace(/[“”]/g, "\"").replace(/æ/g, "œ");
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

/** Une phrase de consigne : elle commence comme une consigne ou contient un verbe de consigne. */
function estConsigne(phrase: string) {
  const net = normalize(phrase).replace(/[^a-z ]+/g, " ").trim();
  return CONSIGNE_DEBUTS.test(net) || /\b(dans quelle mesure|pensez vous|partagez vous)\b/.test(net) || phrase.trim().split(/\s+/).some(estVerbeConsigne);
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
  // Pas de consigne trouvée : au BAC, c'est presque toujours « Expliquez et discutez ».
  if (!c.trim()) return "discuter";
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

/** « … » (Jean de La Fontaine) : une citation suivie de son auteur entre parenthèses. */
const CITE_ENTRE_PARENTHESES = /[»"”>]\s*\(\s*[A-ZÀ-Ý][^)]{2,80}\)/u;

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
const MOTS_LITTERAIRES = /^(litt?er|lettre|ecri|ecrir|poe|poem|roman|oeuvr|livr|lect|lir|lis|lu$|auteur|artis|art$|arts$|theat|drama|scen|spectat|salle|acteur|conte|recit|raconte|personnag|narra|fiction|styl|langa|vers$|mot$|mots$|chant|critiq|comed|comiq|traged|humour|satir|ironi|rime|rythm|image|metaph|recueil|page|texte|verbe|parole|griot|dire$|forme$|fond$|nouvelle|genre|negritude|imagin|inspir|muse|plume|creat|beaute|esthet|exprim|style|journal|intime|autobio|memoires|fabl|hero|langue|lyri|ouvrage|cre|beau|merveill|invent|legende|epope|mythe|fantais|utopi|essai|culture)/;

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
  Engagement: de => `Nuance : pour toucher le lecteur quand elle parle ${de}, la littérature doit aussi soigner sa forme ; elle reste un art avant d'être une arme.`,
  Sociale: de => `Nuance : la littérature ne se contente pas de montrer la réalité ${de} ; elle fait aussi rêver le lecteur et l'emmène ailleurs.`,
  Esthétique: de => `Nuance : même quand elle parle ${de}, la littérature ne cherche pas que la beauté ; sa forme sert aussi à dénoncer et à faire réfléchir.`,
  Évasion: de => `Nuance : même quand elle fait rêver, la littérature parle ${de} et du monde réel ; le rêve cache souvent une critique.`,
  Lyrique: de => `Nuance : en parlant ${de}, l'écrivain ne parle pas que de lui ; son émotion rejoint celle de tous et peut défendre une cause.`
};

// ---- De qui ou de quoi parle le sujet : la problématique et le plan reprennent ce mot ----

/** Ce dont parle la citation : l'écrivain, le poète, la poésie, le roman, la lecture… (la littérature par défaut). */
export type Objet = "litterature" | "ecrivain" | "poete" | "romancier" | "dramaturge" | "poesie" | "roman" | "theatre" | "ecriture" | "lecture" | "oeuvre";
interface InfoObjet { nom: string; choix: string; personne: boolean; il: "il" | "elle"; motif: RegExp }
/** Dans l'ordre où l'élève les voit quand il corrige ; `motif` cherche dans la citation sans accents ni majuscules. */
export const OBJETS: Record<Objet, InfoObjet> = {
  litterature: { nom: "la littérature", choix: "La littérature", personne: false, il: "elle", motif: /\blitteratures?\b/ },
  ecrivain: { nom: "l'écrivain", choix: "L'écrivain", personne: true, il: "il", motif: /\b(ecrivains?|auteurs?|artistes?|hommes? de lettres|createurs?)\b/ },
  poete: { nom: "le poète", choix: "Le poète", personne: true, il: "il", motif: /\bpoetes?\b/ },
  romancier: { nom: "le romancier", choix: "Le romancier", personne: true, il: "il", motif: /\bromancier(e|s|es)?\b/ },
  dramaturge: { nom: "le dramaturge", choix: "Le dramaturge", personne: true, il: "il", motif: /\bdramaturges?\b/ },
  poesie: { nom: "la poésie", choix: "La poésie", personne: false, il: "elle", motif: /\b(poesie|poemes?)\b/ },
  roman: { nom: "le roman", choix: "Le roman", personne: false, il: "il", motif: /\bromans?\b/ },
  theatre: { nom: "le théâtre", choix: "Le théâtre", personne: false, il: "il", motif: /\btheatres?\b/ },
  ecriture: { nom: "l'écriture", choix: "L'écriture", personne: false, il: "elle", motif: /\b(ecriture|ecrire)\b/ },
  lecture: { nom: "la lecture", choix: "La lecture, le lecteur", personne: false, il: "elle", motif: /\b(lecture|lire|lecteurs?|lectrices?)\b/ },
  oeuvre: { nom: "l'œuvre littéraire", choix: "L'œuvre, le livre", personne: false, il: "elle", motif: /\b(oeuvres?|livres?)\b/ }
};

/**
 * Ce dont parle la citation : le premier de ces mots qu'elle emploie (« L'écrivain ne peut se mettre… » → l'écrivain).
 * « œuvre » et « livre » ne comptent que si rien d'autre n'est nommé (« l'évasion par les livres… la littérature »).
 * `sur` est faux quand la citation n'en nomme aucun : on garde la littérature, l'élève peut corriger.
 */
export function objetDuSujet(citation: string): { objet: Objet; sur: boolean } {
  const t = ` ${normalize(citation).replace(/[^a-z]+/g, " ")} `;
  const trouves = (Object.keys(OBJETS) as Objet[]).map(o => ({ o, i: t.search(OBJETS[o].motif) })).filter(x => x.i >= 0);
  const forts = trouves.filter(x => x.o !== "oeuvre").sort((a, b) => a.i - b.i);
  const objet = forts[0]?.o ?? trouves[0]?.o;
  // L'écrivain qui parle de lui (« J'écris pour agir », « ma plume », « Je me sers d'animaux… ») : c'est de l'écrivain qu'il s'agit.
  if (parleDeLui(citation) && (!objet || objet === "oeuvre" || objet === "ecriture")) return { objet: "ecrivain", sur: true };
  return objet ? { objet, sur: true } : { objet: "litterature", sur: false };
}

/** La citation est dite à la première personne (« je », « j' », « ma plume », « mes livres »). */
function parleDeLui(citation: string) {
  return /\b(je|j|moi|ma|mes|mon)\b/.test(` ${normalize(citation).replace(/[^a-z]+/g, " ")} `);
}

/** Ce qu'est l'écrivain (ou le poète…) selon chaque fonction : une personne n'est pas « une arme ». */
const IDEE_PERSONNE: Record<Fonction, string> = {
  Engagement: "un combattant qui dénonce l'injustice et veut changer la société",
  Sociale: "un témoin qui montre la société telle qu'elle est",
  Esthétique: "un artiste qui cherche d'abord la beauté de la forme",
  Évasion: "un conteur qui fait rêver et voyager son lecteur",
  Lyrique: "une voix qui exprime ses sentiments et son âme"
};
const EN_BREF_PERSONNE: Record<Fonction, string> = {
  Engagement: "un combattant au service d'une cause", Sociale: "un témoin de sa société", Esthétique: "un artiste de la forme",
  Évasion: "un faiseur de rêves", Lyrique: "la voix de ses propres sentiments"
};
const NUANCE_PERSONNE: Record<Fonction, (de: string, n: string) => string> = {
  Engagement: (de, n) => `Nuance : pour toucher le lecteur quand il parle ${de}, ${n} doit aussi soigner son style ; il reste un artiste avant d'être un combattant.`,
  Sociale: (de, n) => `Nuance : ${n} ne se contente pas de montrer la réalité ${de} ; il fait aussi rêver son lecteur et l'emmène ailleurs.`,
  Esthétique: (de, n) => `Nuance : même quand il parle ${de}, ${n} ne cherche pas que la beauté ; son style sert aussi à dénoncer et à faire réfléchir.`,
  Évasion: (de, n) => `Nuance : même quand il fait rêver, ${n} parle ${de} et du monde réel ; le rêve cache souvent une critique.`,
  Lyrique: (de, n) => `Nuance : en parlant ${de}, ${n} ne parle pas que de lui ; son émotion rejoint celle de tous et peut défendre une cause.`
};

/** Les arguments écrits pour l'écrivain (ou le poète…) : « L'écrivain dénonce les injustices… ». */
const ARG_PERSONNE: Record<string, string> = {
  "Dénonciation": "dénonce les injustices et les abus de la société.",
  "Éveil des consciences": "éveille les consciences et pousse le lecteur à réagir.",
  "Défense des opprimés": "prend la défense des faibles et des opprimés.",
  "Satire": "critique les travers des hommes et des puissants en les tournant en ridicule.",
  "Mémoire collective": "conserve la mémoire de son peuple et de son histoire.",
  "Valorisation de la culture": "valorise la culture et les traditions de son peuple.",
  "Peinture de la réalité sociale": "est le témoin de sa société : il en peint la réalité.",
  "Culte de la forme": "est d'abord un artiste : il recherche la beauté de la forme.",
  "Célébration de la beauté": "célèbre la beauté du monde, de la nature et des êtres.",
  "Expression des sentiments": "exprime ses sentiments intimes.",
  "Expression du vécu": "raconte sa propre expérience vécue.",
  "Imagination": "crée des mondes imaginaires qui font rêver le lecteur.",
  "Voyage imaginaire": "fait voyager le lecteur loin de son quotidien.",
  "Rire": "divertit et fait rire.",
  "Divertissement": "procure au lecteur le plaisir d'une belle histoire."
};
/** Un argument dit avec le mot du sujet : « Le roman dénonce… », « L'écrivain éveille… » (la lecture garde « la littérature »). */
function argumentDe(a: string, o: Objet) {
  const base = ARGUMENTS[a] ?? a, x = OBJETS[o], N = x.nom.charAt(0).toUpperCase() + x.nom.slice(1);
  if (x.personne) return ARG_PERSONNE[a] ? `${N} ${ARG_PERSONNE[a]}` : base;
  if (o === "litterature" || o === "lecture" || !base.startsWith("La littérature ")) return base;
  return N + base.slice("La littérature".length).replace(/: elle /, `: ${x.il} `);
}

/** Petits mots qui ne sont jamais des mots clés d'un sujet. */
const VIDES = new Set("le la les un une des du de d l a au aux et ou mais donc or ni car que qu qui quoi dont ou ce cet cette ces c ca cela ceci son sa ses leur leurs mon ma mes ton ta tes notre nos votre vos il elle ils elles on nous vous je j tu me m te t se s lui y en ne n pas plus point est sont etre etait etaient sera seront doit doivent devrait peut peuvent pourrait faut fait font faire avoir a ont avait dans par pour sur avec sans sous entre comme plutot aussi tres tout tous toute toutes meme seul seule seulement toujours jamais rien autre autres quelqu quelque chose si alors ainsi bien mieux non oui deja encore celui celle ceux celles".split(" "));

/**
 * Le guide « Comprends ton sujet » : les mots clés de la citation (dans l'ordre, sans les petits mots),
 * et le début de la phrase que l'élève complète pour redire l'idée avec ses mots.
 */
export function lectureDuSujet(citation: string, o: Objet): { motsCles: string[]; debut: string } {
  const net = sansAuteur(citation);
  const vus = new Set<string>();
  const motsCles = (net.match(/[A-Za-zÀ-ÖØ-öø-ÿŒœ’'-]+/g) ?? [])
    .map(m => m.replace(/^[a-zA-Z][’']/, "").replace(/[’'-]+$/, ""))
    .filter(m => {
      const k = normalize(m);
      if (k.length < 4 || VIDES.has(k) || vus.has(k) || /-(il|elle|ils|elles|on|t|je|tu|nous|vous)$/.test(k)) return false;
      vus.add(k);
      return true;
    })
    .map(m => m.toLowerCase()).slice(0, 6);
  const x = OBJETS[o];
  return { motsCles, debut: `Pour l'auteur, ${x.nom}` };
}

/** Les fonctions que les cours nomment à part, rattachées aux cinq de l'appli (choix d'Atikan, novembre 2026).
 *  Le nom est gardé tel que le cours le dit (« ludique », « témoignage ») et affiché à côté de la fonction de l'appli. */
export type Precision = string;
const NOMS_DE_FONCTION: [RegExp, Fonction, string][] = [
  [/^didacti/, "Sociale", "didactique"], [/^pedagog/, "Sociale", "pédagogique"], [/^educati/, "Sociale", "éducative"],
  [/^moralisa/, "Sociale", "moralisatrice"], [/^morale?s?$/, "Sociale", "morale"], [/^edifi/, "Sociale", "édifiante"],
  [/^testimonia/, "Sociale", "testimoniale"], [/^temoign/, "Sociale", "de témoignage"], [/^documentair/, "Sociale", "documentaire"],
  [/^informati/, "Sociale", "informative"], [/^histori/, "Sociale", "historique"], [/^memori/, "Sociale", "mémorielle"],
  [/^memoire/, "Sociale", "de mémoire"], [/^realist/, "Sociale", "réaliste"], [/^mimeti/, "Sociale", "mimétique"],
  [/^representati/, "Sociale", "de représentation"], [/^cultur/, "Sociale", "culturelle"], [/^identitair/, "Sociale", "identitaire"],
  [/^patrimon/, "Sociale", "patrimoniale"], [/^sociologi/, "Sociale", "sociologique"],
  [/^critique/, "Engagement", "critique"], [/^denonciation/, "Engagement", "de dénonciation"], [/^denoncia/, "Engagement", "dénonciatrice"],
  [/^contesta/, "Engagement", "contestataire"], [/^militant/, "Engagement", "militante"], [/^subversi/, "Engagement", "subversive"],
  [/^revolution/, "Engagement", "révolutionnaire"], [/^politique/, "Engagement", "politique"], [/^prophet/, "Engagement", "prophétique"],
  [/^satiri/, "Engagement", "satirique"], [/^combat/, "Engagement", "de combat"], [/^conscienti/, "Engagement", "de conscientisation"],
  [/^ludique/, "Évasion", "ludique"], [/^recreati/, "Évasion", "récréative"], [/^divertiss/, "Évasion", "de divertissement"],
  [/^distracti/, "Évasion", "de distraction"], [/^oniri/, "Évasion", "onirique"], [/^consolat/, "Évasion", "consolatrice"],
  [/^cathar/, "Évasion", "cathartique"], [/^evasion/, "Évasion", "d'évasion"], [/^imaginair/, "Évasion", "imaginaire"],
  [/^autobiograph/, "Lyrique", "autobiographique"], [/^expressi/, "Lyrique", "expressive"], [/^emoti/, "Lyrique", "émotive"],
  [/^confession/, "Lyrique", "confessionnelle"], [/^therapeuti/, "Lyrique", "thérapeutique"], [/^intime/, "Lyrique", "intime"],
  [/^personnel/, "Lyrique", "personnelle"], [/^affecti/, "Lyrique", "affective"],
  [/^poetique/, "Esthétique", "poétique"], [/^artisti/, "Esthétique", "artistique"], [/^ornement/, "Esthétique", "ornementale"],
  [/^esthet/, "Esthétique", "esthétique"]
];
/** « La littérature a une fonction ludique », « le rôle didactique du théâtre » : la fonction que le sujet nomme lui-même. */
/** Des noms que l'appli ne sait pas rattacher sans risque : le guide laisse l'élève choisir. */
const NOMS_NON_RATTACHES = /^(philosoph|religi|spirituel|metaphysi|mystique|sacre|initiati|economi|scientifi|juridi|commerci|existentiel)/;
function fonctionNommee(citation: string): { f: Fonction | null; nom: string; f2?: Fonction } | null {
  const m = normalize(citation).replace(/[^a-z]+/g, " ").trim().split(" ");
  const vus: { f: Fonction | null; nom: string }[] = [];
  for (let i = 0; i < m.length; i++) {
    if (!/^(fonctions?|roles?|missions?|vocations?|dimensions?|visees?|vertus?)$/.test(m[i])) continue;
    // « n'a pas une fonction ludique » : ce qui est nié n'est pas la fonction du sujet.
    if (m.slice(Math.max(0, i - 4), i).some(x => /^(n|ne|pas|plus|jamais|aucune?)$/.test(x))) continue;
    // « une fonction ludique », « sa fonction première est pédagogique », « une fonction didactique et ludique ».
    for (let j = i + 1; j <= Math.min(i + 6, m.length - 1); j++) {
      if (/^(n|ne|pas|plus|jamais|mais)$/.test(m[j])) break;
      const nom = NOMS_DE_FONCTION.find(([r]) => r.test(m[j]));
      if (nom) vus.push({ f: nom[1], nom: nom[2] });
      else if (NOMS_NON_RATTACHES.test(m[j])) vus.push({ f: null, nom: m[j] });
      else if (vus.length && !/^(et|ou|de|d|a|aussi)$/.test(m[j])) break;
    }
    if (vus.length) break;
  }
  if (!vus.length) return null;
  if (vus.some(v => !v.f)) return { f: null, nom: vus[0].nom };
  const f2 = vus.find(v => v.f !== vus[0].f)?.f ?? undefined;
  return { f: vus[0].f, nom: vus[0].nom, f2: f2 ?? undefined };
}
const DIDACTIQUES = new Set(["didactique", "pédagogique", "éducative", "moralisatrice", "morale", "édifiante"]);
function precisionDe(f: Fonction | undefined, citation: string): Precision | null {
  const nommee = fonctionNommee(citation);
  if (nommee && nommee.f === f && nommee.nom !== "esthétique") return nommee.nom;
  const t = normalize(citation).replace(/[^a-z]+/g, " ");
  if (f === "Sociale" && /\b(instrui|eduqu|enseign|lecons?\b|moral|ecole\b|didacti|edifi)/.test(t)) return "didactique";
  if (f === "Lyrique" && /\b(vecu|autobiograph|sa propre vie|vie d(e|u)? ?(son|l|sa) ?(auteur|ecrivain|poete)|se raconte|parler de (lui|soi))/.test(t)) return "autobiographique";
  return null;
}

/** « La poésie est une arme pour dénoncer l'injustice… » : une piste du guide, dite avec le mot du sujet. */
export function pisteDe(f: Fonction, o: Objet) {
  const m = motsDe(o);
  return `${m.N} est ${m.idee(f)}.`;
}

/** Les mots d'une phrase sur ce dont parle le sujet : son nom, son pronom, ce qu'il est selon une fonction. */
function motsDe(o: Objet) {
  const x = OBJETS[o], N = x.nom.charAt(0).toUpperCase() + x.nom.slice(1);
  return {
    n: x.nom, N, il: x.il,
    idee: (f: Fonction) => (x.personne ? IDEE_PERSONNE : IDEE)[f],
    bref: (f: Fonction) => (x.personne ? EN_BREF_PERSONNE : EN_BREF)[f],
    // La nuance écrite pour la littérature, reprise avec le bon nom et le bon pronom (« le roman… il »).
    nuance: (f: Fonction, de: string) => x.personne ? NUANCE_PERSONNE[f](de, x.nom)
      : NUANCE[f](de).replace(/la littérature/g, x.nom).replace(/\belle\b/g, x.il).replace(/\bElle\b/g, x.il === "il" ? "Il" : "Elle")
  };
}

/**
 * La thèse de la citation, reprise telle quelle quand elle s'y prête (« la littérature doit être une arme au service du peuple ») :
 * une seule phrase, assez courte, qui parle de la littérature ou de l'écrivain, sans « je » ni « nous ».
 */
function theseDe(citation: string): string | null {
  const c = sansAuteur(citation).replace(/[.!…]+$/, "");
  if (c.length < 15 || c.length > 150 || /[.;?!]\s/.test(c) || /\?/.test(c)) return null;
  if (/\b(je|j'|j’|me|m'|m’|moi|mon|ma|mes|nous|notre|nos|vous|votre|vos|tu|ton|ta|tes)\b/i.test(c)) return null;
  if (!/^(la littérature|l[’']écrivain|le poète|la poésie|l[’']art|le roman|le romancier|le théâtre|l[’']œuvre|l[’']oeuvre|un écrivain|un poète|une œuvre|un livre|le livre|l[’']artiste|écrire|lire|la lecture|l[’']écriture|le dramaturge|un roman)\b/i.test(c)) return null;
  return c.charAt(0).toLowerCase() + c.slice(1);
}

/** La citation sans guillemets ni « (Auteur non précisé) » à la fin, espaces remis en ordre. */
function sansAuteur(citation: string) {
  return citation.replace(/[«»"“”]/g, "").replace(/[\s.!…]+$/, "").replace(/\s*\([^()]*\)\s*$/, "").replace(/\s+([.!?,;:])/g, " $1").replace(/\s+/g, " ").trim();
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
  /** Ce que le sujet énumère : chaque élément devient un argument de la partie 1. */
  liste: string[];
  /** Ce dont parle la citation (l'écrivain, la poésie…) : la problématique et le plan reprennent ce mot. */
  objet: Objet;
  sur: boolean;
  /** L'auteur dit que la littérature ne sert à rien : partie 1 = son point de vue, partie 2 = ce qui le contredit. */
  devalorise: boolean;
  /** La fonction de la Partie 2 quand le sujet la donne (comparaison, « pas seulement X ») ou d'après l'usage. */
  p2: Fonction | null;
  /** « didactique » (rattachée à la fonction sociale) ou « autobiographique » (au lyrique), quand le sujet le dit. */
  precision: Precision | null;
  /** L'auteur reconnu dans le sujet (ses œuvres passent avant les autres). */
  auteur?: string | null;
}

// ---- La banque d'arguments : une cinquantaine, choisis d'après les mots, les thèmes et le genre du sujet ----

interface ArgBanque {
  id: string; fonction: Fonction; parent: string; titre: string; phrase: string; personne?: string;
  explication: string; limite: string; mots: string[]; themes: string[]; genres?: string[]; base?: boolean; strict?: boolean;
}
const BANQUE = BANQUE_BRUTE as ArgBanque[];

/** La phrase d'un argument de la banque, dite avec le mot du sujet (« Le poète combat la colonisation… »). */
function phraseBanque(a: ArgBanque, o: Objet) {
  const x = OBJETS[o], N = x.nom.charAt(0).toUpperCase() + x.nom.slice(1);
  const modele = x.personne && a.personne ? a.personne : a.phrase;
  // La lecture garde « la littérature » : « La lecture combat la colonisation » ne veut rien dire.
  const nom = o === "lecture" ? "La littérature" : N;
  const il = o === "lecture" ? "elle" : x.il;
  return modele.replace("{N}", nom).replace(/\{il\}/g, il);
}

/**
 * Les arguments de la banque pour une fonction, du plus adapté au moins adapté au sujet :
 * les mots du sujet qui les appellent, ses thèmes, son genre, les arguments qu'il annonce ;
 * à égalité, le sujet lui-même départage (deux sujets proches n'ont pas toujours les mêmes).
 */
function argumentsBanque(fn: Fonction, citation: string, themes: string[], genres: string[], annonces: string[], exclus: string[], seconde = false) {
  const m = jetons(citation).filter(x => !TROP_COURANTS.has(x.brut)), ph = ` ${clesDe(citation)} `;
  const th = new Set(themes.map(normalize));
  return BANQUE.filter(a => a.fonction === fn && !exclus.includes(a.id)).map(a => {
    let n = 0;
    for (const w of a.mots) if (indicePresent(m, w, ph)) n += w.includes(" ") ? 4 : 3;
    n += a.themes.filter(t => th.has(normalize(t))).length * 2;
    if (a.genres && genres.length) n += genres.some(g => a.genres!.includes(g)) ? 0.5 : -3;
    if (annonces.includes(a.parent)) n += 1.5;
    // Les arguments les plus classiques passent avant les plus particuliers quand le sujet ne dit rien de plus.
    if (a.base) n += seconde ? 0.6 : 1.2;
    // En partie 2, le sujet parle rarement de l'idée contraire : on varie davantage d'un sujet à l'autre.
    return { a, n: n + (graine(citation + a.id) % 100) / (seconde ? 70 : 400) };
  }).sort((x, y) => y.n - x.n).map(x => x.a);
}


/**
 * Plan conseillé, construit à partir du sujet lui-même : la thèse avec ses mots, les arguments que les
 * fiches des œuvres sur ces thèmes illustrent vraiment, une œuvre pour chaque argument, et une nuance liée au thème.
 * Quand l'auteur rejette une fonction (« Je ne crois pas à l'évasion »), la partie 1 défend ce qu'il pense vraiment.
 */
function planDuSujet({ citation, f: f0, f2: f20, consigne, discussion, themes, annonces, oeuvres, genres, rejet, liste, objet, sur, devalorise, p2, precision, auteur }: Contexte): Analyse["plan"] {
  // L'auteur rejette la fonction que le sujet évoque le plus : sa thèse est l'autre.
  const f = rejet && f0 === rejet ? (f20 && f20 !== rejet ? f20 : OPPOSE[rejet]) : f0;
  const f2 = f20 === f ? f0 : f20;
  const de = themes.map(deTheme).find((x): x is string => !!x) ?? null;
  const these = theseDe(citation), courte = citationCourte(citation);
  const question = /\?\s*$/.test(sansAuteur(citation));
  const m = motsDe(objet);
  const axe1 = !f ? "Explique la citation : ce que l'auteur veut dire, avec des exemples d'œuvres."
    : these ? `Montre que, selon l'auteur, ${these} : c'est ${NOM_FONCTION[f]}${precision ? ` (${precision})` : ""}.`
    : question ? `Réponds d'abord à la question posée : montre que ${m.n} peut être ${m.idee(f)}.`
    : liste.length ? `Le sujet énumère ${liste.length} idées : explique-les l'une après l'autre et illustre chacune.`
    : rejet && rejet !== f ? `Montre pourquoi, pour l'auteur, ${m.n} n'est pas d'abord ${m.idee(rejet)} : ${m.il} est plutôt ${m.idee(f)}.`
    : courte ? `Explique ce que veut dire l'auteur par « ${courte} » : pour lui, ${m.n} est ${m.idee(f)}${precision ? ` (fonction ${precision})` : ""}.`
    : `Explique la thèse : pour l'auteur, ${m.n} est ${m.idee(f)}${de ? `, surtout quand ${m.il} parle ${de}` : ""}.`;
  // L'écrivain « au service » de quelqu'un : la nuance naturelle, c'est qu'il a aussi servi les puissants, ou l'art seul.
  const auService = f === "Engagement" && OBJETS[objet].personne && /\b(servir|sert|service|serviteur)\b/.test(normalize(citation));
  // Partie 2 : la fonction rejetée par l'auteur est la nuance toute trouvée.
  const fN = f && (rejet && rejet !== f ? rejet : p2 && p2 !== f ? p2 : OPPOSE[f]);
  // Les nuances toutes écrites supposent la fonction opposée habituelle ; sinon, la phrase simple.
  const nuanceEcrite = fN === OPPOSE[f!] && !precision;
  const axe2 = discussion
    ? (f ? (auService && !rejet ? `Nuance : ${m.n} n'a pas toujours servi ceux qui souffrent ; certains ont servi les puissants, d'autres seulement leur art.`
      : rejet && rejet !== f ? `Nuance : ${m.n} peut tout de même être ${m.idee(rejet)}.` : de && nuanceEcrite ? m.nuance(f, de) : `Nuance : ${m.n} peut aussi être ${m.idee(fN!)}.`) : "Discute : montre les limites de cette idée, avec d'autres exemples.")
    : `Approfondis : montre, avec d'autres œuvres${de ? ` qui parlent ${de}` : ""}, d'autres façons dont ${m.n} le prouve.`;

  // La citation reprise mot pour mot quand elle nomme ce dont elle parle : la problématique colle au sujet.
  const net = sansAuteur(citation).replace(/[.!…]+$/, "");
  const reprise = sur && net.length >= 15 && net.length <= 170 ? net : null;
  // Une question se reprend telle quelle ; un « je » se cite ; sinon « Peut-on dire, avec l'auteur, que… ».
  const reprendre = (c: string) => /\?$/.test(c) ? `L'auteur demande : « ${c} » Que peut-on lui répondre ?`
    : parleDeLui(c) || /[.:!?]\s/.test(c) ? `L'auteur affirme : « ${c} ». A-t-il raison ?`
    : `Peut-on dire, avec l'auteur, ${/^[aeiouyhéèêàâîô]/i.test(c) ? "qu'" : "que "}${c.charAt(0).toLowerCase() + c.slice(1)} ?`;
  const problematique = !f ? "Que veut dire l'auteur ? A-t-il entièrement raison ?"
    : [rejet && rejet !== f ? `Pourquoi, selon l'auteur, ${m.n} est-${m.il} ${m.bref(f)} plutôt ${/^[aeiouyhé]/.test(m.bref(rejet)) ? "qu'" : "que "}${m.bref(rejet)} ?`
      : these ? `En quoi peut-on dire ${/^[aeiouyhéèêà]/i.test(these) ? "qu'" : "que "}${these} ?`
      : reprise ? reprendre(reprise)
      : question && net.length >= 15 && net.length <= 170 ? reprendre(net)
      : `En quoi ${m.n} est-${m.il} ${m.idee(f)}${de ? ` quand ${m.il} parle ${de}` : ""} ?`,
    !discussion ? "Comment les œuvres le montrent-elles ?"
      : auService ? `${m.N} n'a-t-${m.il} pas aussi servi les puissants, ou seulement son art ?`
      : `${m.N} ne peut-${m.il} pas aussi être ${m.bref(fN!)} ?`].join(" ");

  // Œuvres du sujet d'abord, puis toutes celles qui partagent ses thèmes : quels arguments illustrent-elles ?
  const cles = new Set(themes.map(normalize));
  const duGenre = (w: Oeuvre) => !genres.length || genres.includes(w.genre);
  const surLesThemes = [...oeuvres, ...OEUVRES.filter(w => !oeuvres.includes(w) && w.themes.some(t => cles.has(normalize(t))))].filter(duGenre);
  // Un argument qu'aucune œuvre sûre du genre demandé n'illustre ne sert à rien à l'élève.
  const illustrable = (a: string, fn: Fonction) => !genres.length || OEUVRES.some(w => w.detaillee !== false && duGenre(w) && w.idees.some(i => i.argument === a && i.fonction === fn));
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
      .filter((a, i, t) => t.indexOf(a) === i && !exclus.includes(a) && illustrable(a, fn)).slice(0, 2);
  };
  // Pour chaque argument, une œuvre qui l'illustre (deux si la consigne demande d'illustrer), différente d'un
  // argument à l'autre, du genre dont parle le sujet si possible, et jamais une fiche encore incomplète.
  const prises = new Set<string>();
  const sure = (w: Oeuvre) => w.detaillee !== false;
  const preferee = (w: Oeuvre) => !!w.niveaux?.length || (w.aires ?? []).some(x => x.startsWith("Afrique"));
  const illustre = (w: Oeuvre, a: string, fn: Fonction | undefined) => w.idees.some(i => i.argument === a && (!fn || i.fonction === fn));
  const uneOeuvre = (a: string, fn: Fonction | undefined) => {
    const ok = (x: Oeuvre) => !prises.has(x.id) && sure(x) && duGenre(x) && illustre(x, a, fn);
    // Aucune œuvre du sujet ne l'illustre : on en prend une ailleurs dans la base, pas toujours la même.
    // Les œuvres au programme et les œuvres africaines d'abord : ce sont celles que le correcteur attend.
    const l = OEUVRES.filter(ok), proches = l.filter(preferee);
    const t = surLesThemes.filter(ok);
    return t.find(w => oeuvres.includes(w)) ?? t.find(preferee) ?? t[0]
      ?? (proches.length ? proches[graine(citation + a) % proches.length] : l.length ? l[graine(citation + a) % l.length] : undefined);
  };
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
  if (devalorise) {
    // « La poésie ne sert à rien » : partie 1, ce qui peut donner raison à l'auteur ; partie 2, ce que la littérature apporte vraiment.
    // Jamais « Montre que la poésie ne sert à rien : c'est la fonction sociale ».
    const art = ["litterature", "poesie", "poete", "ecrivain", "ecriture", "oeuvre"].includes(objet);
    const a1 = art ? choisir("Esthétique", []).slice(0, 1) : [];
    const pour = [...choisir("Engagement", a1).slice(0, 1), ...choisir("Sociale", a1).slice(0, 1)];
    const net = sansAuteur(citation).replace(/[.!…]+$/, "");
    return {
      problematique: `${net.length <= 170 ? `L'auteur affirme : « ${net} ». ` : ""}${m.N} est-${m.il} vraiment inutile ? Qu'apporte-t-${m.il} aux hommes et à la société ?`,
      axe1: `Explique pourquoi on peut être d'accord avec l'auteur : cherche toi-même ces raisons.`
        + (art ? ` Certains écrivains le disent eux-mêmes : pour eux, l'art n'a pas à être utile, il cherche seulement la beauté.` : ""),
      axe2: `Montre au contraire que ${m.n} est utile : ${m.il} peut être ${m.idee("Engagement")}, ou ${m.idee("Sociale")}.`,
      args1: a1.map(a => argumentDe(a, objet)), args2: pour.map(a => argumentDe(a, objet)),
      ex1: a1.map(a => exemples(a, "Esthétique")), ex2: pour.map(a => exemples(a, INDICES_ARGUMENTS.find(x => x[0] === a)![1]))
    };
  }
  if (liste.length && f) {
    // Le sujet énumère : chaque élément est un argument de la partie 1, illustré par l'argument qu'il évoque s'il en évoque un.
    const a1 = liste.map(el => {
      const m = jetons(el), ph = ` ${clesDe(el)} `;
      // Un élément qui n'évoque aucun argument connu n'a pas d'exemple : mieux vaut rien qu'une œuvre au hasard.
      return INDICES_ARGUMENTS.find(([, , l]) => l.some(x => indicePresent(m, x, ph)))?.[0] ?? null;
    });
    const a2 = choisir(f2b, a1.filter((a): a is string => !!a));
    const titre = (el: string) => el.charAt(0).toUpperCase() + el.slice(1);
    const cites = liste.map(el => `« ${el} »`);
    return {
      axe1, axe2,
      problematique: `Pourquoi, selon l'auteur, ${m.n} est-${m.il} à la fois ${cites.slice(0, -1).join(", ")} et ${cites[cites.length - 1]} ?`
        + (discussion ? ` Ne peut-${m.il} pas aussi être ${m.bref(fN!)} ?` : " Comment les œuvres le montrent-elles ?"),
      args1: liste.map(el => `« ${titre(el)} »`), args2: a2.map(a => argumentDe(a, objet)),
      ex1: a1.map(a => (a ? exemples(a, undefined) : [])), ex2: a2.map(a => exemples(a, f2b))
    };
  }
  // Les œuvres de toute la base, notées pour un argument de la banque : celles dont la fiche illustre cet argument,
  // sur les thèmes du sujet et de l'argument, au programme ou africaines, de l'auteur cité ; jamais deux fois la même.
  const thS = new Set(themes.map(normalize));
  const auteurN = auteur ? normalize(auteur).split(/\s+/).pop() ?? "" : "";
  const oeuvresDe = (a: ArgBanque) => {
    const thA = new Set(a.themes.map(normalize));
    return OEUVRES.filter(w => sure(w) && duGenre(w) && !prises.has(w.id)).map(w => {
      let n: number;
      if (w.idees.some(i => i.argument === a.parent && i.fonction === a.fonction)) n = 4;
      else if (w.idees.some(i => i.argument === a.parent)) n = 2.5;
      else if (w.fonctions.includes(a.fonction)) n = 0.5;
      else return null;
      const wt = w.themes.map(normalize);
      const surArg = wt.filter(t => thA.has(t)).length, surSujet = wt.filter(t => thS.has(t)).length;
      // Une œuvre qui n'illustre pas l'argument n'est prise que si elle parle de ses thèmes.
      if ((n < 1 || a.strict) && !surArg) return null;
      n += Math.min(2, surArg) * 1.5 + Math.min(2, surSujet) * 2;
      if (a.genres?.includes(w.genre)) n += 1;
      if (oeuvres.includes(w)) n += 1.5;
      if (preferee(w)) n += 2.5;
      if (auteurN.length > 3 && normalize(w.auteur).includes(auteurN)) n += 3;
      return { w, n: n + (graine(citation + a.id + w.id) % 100) / 200 };
    }).filter((x): x is { w: Oeuvre; n: number } => !!x).sort((x, y) => y.n - x.n).map(x => x.w);
  };
  const pourquoiDe = (w: Oeuvre, a: ArgBanque) => {
    const idee = w.idees.find(i => i.argument === a.parent && i.texte)?.texte ?? w.idees.find(i => i.fonction === a.fonction && i.texte)?.texte ?? "";
    return idee ? court(idee) : "";
  };
  const exemplesBanque = (a: ArgBanque): Exemple[] => oeuvresDe(a).slice(0, consigne === "illustrer" ? 2 : 1).map(w => {
    prises.add(w.id);
    return { id: w.id, titre: w.titre, auteur: w.auteur, pourquoi: pourquoiDe(w, a) };
  });
  // Deux arguments par partie, de deux familles différentes quand c'est possible, chacun avec au moins une œuvre
  // encore libre (ses exemples sont pris tout de suite, pour que l'argument suivant ne compte pas sur les mêmes).
  const deux = (fn: Fonction | undefined, imposes: string[] = [], exclus: string[] = []) => {
    const pris: { a: ArgBanque; ex: Exemple[] }[] = [];
    if (!fn) return pris;
    const rang = argumentsBanque(fn, citation, themes, genres, annonces, exclus, exclus.length > 0);
    const essaie = (a: ArgBanque) => { if (oeuvresDe(a).length) pris.push({ a, ex: exemplesBanque(a) }); };
    for (const id of imposes) { const a = BANQUE.find(x => x.id === id); if (a) essaie(a); }
    for (const passe of [0, 1]) for (const a of rang) {
      if (pris.length >= 2) break;
      if (pris.some(p => p.a === a) || (passe === 0 && pris.some(p => p.a.parent === a.parent))) continue;
      essaie(a);
    }
    return pris.slice(0, 2);
  };
  const didactique = !!precision && DIDACTIQUES.has(precision) && f === "Sociale";
  const p1 = deux(f, didactique ? ["soc-instruire"] : []);
  const b1 = p1.map(p => p.a), ex1 = p1.map(p => p.ex);
  const p2b = deux(f2b, [], b1.map(a => a.id));
  const b2 = p2b.map(p => p.a), ex2 = p2b.map(p => p.ex);
  // D'autres œuvres possibles pour les arguments de la partie 1, que l'élève a peut-être lues.
  const autres = [...new Map(b1.flatMap(a => oeuvresDe(a).slice(0, 3)).map(w => [w.id, w])).values()].slice(0, 3)
    .map(w => ({ id: w.id, titre: w.titre, auteur: w.auteur, pourquoi: "" }));
  return {
    axe1, axe2, problematique,
    args1: b1.map(a => phraseBanque(a, objet)), args2: b2.map(a => phraseBanque(a, objet)),
    expl1: b1.map(a => a.explication), expl2: b2.map(a => a.explication),
    transition: discussion && b1[0] && !rejet ? b1[0].limite : undefined,
    ex1, ex2, autres
  };
}

/**
 * Les éléments que le sujet énumère (« les amis…, les conseillers…, les professeurs… ») : chacun est déjà un argument.
 * Il faut au moins trois groupes séparés par des virgules ou des points-virgules, qui commencent par le même article.
 */
export function enumeration(citation: string): string[] {
  const ARTICLE = /^(les|le|la|un|une|des)\s/i;
  // Chaque groupe s'arrête avant « dont », « qui », « que » ; il reste court.
  const couper = (g: string) => g.split(/\s(?:dont|qui|que|qu'|qu’)\s/i)[0].trim();
  const bouts = citation.replace(/[«»"“”.!?…]/g, " ").split(/\s*[;,]\s*/)
    .map(b => b.trim().replace(/^(et|ou|mais)\s+/i, "").replace(/^(ils|elles|il|elle|ce|c'|c’)\s*(sont|est|seront|sera)\s+/i, ""));
  for (let i = 1; i < bouts.length; i++) {
    const art = bouts[i].match(ARTICLE)?.[1].toLowerCase();
    if (!art) continue;
    const suite: string[] = [];
    for (let k = i; k < bouts.length && bouts[k].match(ARTICLE)?.[1].toLowerCase() === art; k++) suite.push(couper(bouts[k]));
    if (suite.length < 2) continue;
    // Le premier élément est dans le groupe d'avant, après le verbe (« Les livres sont les amis… »).
    const avant = bouts[i - 1].match(new RegExp(`(?:^|\\s)(?:sont|est|été|seront|sera|restent|reste|devient|deviennent)\\s(?:.*?\\s)??(${art}\\s.*)$`, "i"))?.[1];
    const tout = [...(avant ? [couper(avant)] : []), ...suite];
    // « …, c'est la littérature » : le mot du sujet lui-même n'est pas un élément de la liste.
    const sujetMeme = (g: string) => /^(la|le|les)\s(littérature|poésie|roman|théâtre|écrivain|poète|livres?)$/i.test(g);
    if (tout.length >= 3 && tout.every(g => g.split(/\s+/).length <= 9 && !sujetMeme(g))) return tout.slice(0, 3);
  }
  return [];
}

/**
 * Sujets qui ne portent pas d'abord sur les fonctions de la littérature : le plan par fonctions y serait hors sujet.
 * Chaque famille a sa piste de réflexion, écrite à la main (jamais un plan tout fait).
 */
const HORS_CADRE: { cle: string; nom: string; motif: RegExp; conseil: string }[] = [
  { cle: "langue", nom: "la langue dans laquelle on écrit", motif: /\b(langues? (maternelles?|africaines?|nationales?|locales?|etrangeres?|du colon|coloniales?|d ecriture)|(ecrit|ecrire|ecrivent|ecrite|ecrites) en (francais|anglais|langue)|langue de l autre)\b/,
    conseil: "Pèse ce que gagne l'écrivain en écrivant en français (être lu par beaucoup de lecteurs, dans beaucoup de pays) et ce qu'il gagne dans sa langue maternelle (toucher son peuple, garder sa culture). Pense aussi aux écrivains qui mêlent les deux, en faisant entendre leur langue dans leur français." },
  { cle: "scene", nom: "le théâtre lu ou joué", motif: /\b(etre (lu|joue)s?|lu ou joue|joue ou lu|pour la scene|sur la scene|representation theatrale|mise en scene|lire (une|la) piece|lire du theatre)\b/,
    conseil: "Pense à ce qu'apporte la scène (les acteurs, la voix, les gestes, le décor, le public) et à ce que garde le texte lu (les didascalies, le temps de relire, l'imagination du lecteur)." },
  { cle: "lecteur", nom: "le lecteur et son rôle", motif: /\b(appartient (au|aux) lecteurs?|appartient a (son|ses) lecteurs?|role du lecteur|le lecteur (fait|cree|acheve|complete|termine|donne)|ecrit(on)? (toujours|d abord|surtout|seulement)? ?pour (quelqu un|qui|les autres|soi|lui meme|un public|le lecteur|ses lecteurs)|pour qui ecri|lecteur ideal)\b/,
    conseil: "Demande-toi pour qui écrit l'écrivain et ce que fait le lecteur : il interprète, il imagine, il donne vie au texte. L'auteur, lui, choisit ce qu'il veut dire. À qui appartient alors le sens de l'œuvre ?" },
  { cle: "personnage", nom: "le personnage et le héros", motif: /\b(personnages? (exemplaires?|positifs?|negatifs?|mediocres?|modeles?|ideals?|parfaits?)|heros (positif|exemplaire|modele|negatif|de roman)|anti heros|etre un heros|des heros)\b/,
    conseil: "Pense aux héros qui servent de modèle au lecteur, et aux personnages faibles, ratés ou méchants qui nous apprennent aussi quelque chose sur l'homme et la société." },
  { cle: "critique", nom: "la critique littéraire", motif: /\b(critiques? litteraires?|le critique|les critiques (ne|sont|est)|critique est)\b/,
    conseil: "Pense à ce que fait le critique : il explique, il juge et il fait connaître les œuvres. Est-ce le même travail que celui de l'écrivain ? Le critique peut-il aider l'écrivain et le lecteur ?" },
  { cle: "genre", nom: "la valeur d'un genre littéraire", motif: /\b(genres? (mineurs?|majeurs?|menteurs?|inferieurs?|nobles?)|roman policier|roman (d amour|de gare|populaire)|bande dessinee|n est pas de la litterature|ne sont pas de la litterature|vraie litterature|fin heureuse|finir bien|bien finir|l autobiographie est|autobiographie (ment|est menteuse|dit la verite)|que pour (amuser|les enfants|divertir)|fait pour les enfants)\b/,
    conseil: "Demande-toi ce qui fait la valeur d'une œuvre : le sens qu'elle porte, la qualité de son écriture, ce qu'elle apprend au lecteur. Un genre qu'on dit « mineur » ou « facile » peut avoir tout cela ; montre-le avec des exemples, puis montre aussi ses limites." }
];

/** Le sujet sort des fonctions de la littérature : sa famille, ou null. */
export function horsCadreDu(citation: string): HorsCadre | null {
  const t = ` ${normalize(citation).replace(/[^a-z]+/g, " ")} `;
  const h = HORS_CADRE.find(x => x.motif.test(t));
  return h ? { cle: h.cle, nom: h.nom, conseil: h.conseil } : null;
}

/** L'auteur dit que la littérature ne sert à rien, est inutile ou fait perdre son temps. */
const DEVALORISE = /^(?:\w+ ){0,2}?(?:la |le |l |les )?(?:litterature|poesie|lecture|lire|ecrire|roman|theatre|art|livres?|poemes?|poetes?|ecrivains?|oeuvres? litteraires?)(?: \w+){0,4} (?:ne (?:sert|servent|servira) (?:plus )?a rien|(?:est|sont) (?:totalement |completement |vraiment )?inutiles?|(?:est|sont) une perte de temps|fait perdre (?:son|du|notre|leur) temps|ne vaut rien|ne change rien|n a aucune utilite)/;

/** Plan sans fonction : l'élève explique l'idée de l'auteur, puis la discute. Rien n'est inventé à sa place. */
function planLibreDu(citation: string, discussion: boolean): Analyse["plan"] {
  const net = sansAuteur(citation).replace(/[.!…]+$/, "");
  const question = /\?$/.test(net);
  const c = net.length >= 15 && net.length <= 170 ? net : "";
  return {
    problematique: !c ? "Que veut dire l'auteur ? A-t-il entièrement raison ?"
      : question ? `${net.charAt(0).toUpperCase() + net.slice(1)} ${discussion ? "Quelles réponses peut-on donner, et avec quelles limites ?" : "Comment les œuvres permettent-elles d'y répondre ?"}`
      : `L'auteur affirme : « ${c} ». Pourquoi peut-on lui donner raison ? ${discussion ? "Son idée n'a-t-elle pas des limites ?" : "Comment les œuvres le montrent-elles ?"}`,
    axe1: question ? "Réponds d'abord à la question dans un sens : donne tes raisons et des exemples d'œuvres que tu as étudiées."
      : "Explique l'idée de l'auteur et montre ce qui lui donne raison, avec des exemples d'œuvres que tu as étudiées.",
    axe2: discussion
      ? (question ? "Puis montre l'autre réponse possible : ses raisons, ses exemples. Ta conclusion dit ce que tu retiens." : "Montre ensuite les limites de cette idée : dans quels cas l'auteur a-t-il tort ? Trouve d'autres exemples.")
      : "Approfondis : montre, avec d'autres œuvres, d'autres façons dont cette idée se vérifie.",
    args1: [], args2: [], ex1: [], ex2: []
  };
}

// ---- « Ce que dit ton sujet » : ce que l'appli a compris, dit avec d'autres mots que le sujet ----

export interface Comprendre { these: string; question: string; contraire: string | null; problematiques: string[]; uneQuestion: string; amorce: string }

/** La question que pose vraiment un sujet de chaque fonction ({N} : le mot du sujet ; {il} : son pronom). */
const QUESTION_CACHEE: Record<Fonction, string[]> = {
  Engagement: ["{N} doit-{il} se mettre au service d'une cause, ou peut-{il} rester libre ?", "{N} peut-{il} vraiment changer la société ?"],
  Sociale: ["{N} montre-t-{il} la réalité telle qu'elle est, ou la transforme-t-{il} ?", "{N} n'est-{il} qu'un témoin de son époque ?"],
  Esthétique: ["La beauté de la forme compte-t-elle plus que le message ?", "{N} doit-{il} chercher la beauté avant tout, ou servir à quelque chose ?"],
  Évasion: ["{N} sert-{il} à fuir la réalité, ou à mieux la comprendre ?", "Le plaisir et le rêve suffisent-ils à faire une grande œuvre ?"],
  Lyrique: ["En parlant de ses propres sentiments, l'écrivain parle-t-il aussi des autres ?", "{N} doit-{il} exprimer le moi, ou se tourner vers le monde ?"]
};

/** Une idée d'amorce pour l'introduction, liée au thème du sujet (sinon à la fonction). */
const AMORCES: [string[], string][] = [
  [["Colonisation", "Racisme", "Négritude", "Indépendance", "Indépendances"], "Pendant la colonisation, beaucoup d'écrivains africains ont pris la plume pour dire la souffrance et la dignité de leur peuple."],
  [["Pouvoir", "Dictature", "Politique", "Corruption", "Désillusion", "Tyrannie", "Pouvoir et politique"], "Après les indépendances, les espoirs des peuples africains ont souvent été déçus par des dirigeants autoritaires, et les écrivains en ont témoigné."],
  [["Femme", "Condition féminine", "Polygamie", "Mariage", "Patriarcat", "Émancipation"], "Longtemps réduite au silence, la femme africaine a trouvé dans la littérature un moyen de dire sa condition."],
  [["Tradition et modernité", "Tradition", "Modernité"], "L'Afrique d'aujourd'hui vit entre ses traditions et le monde moderne, et la littérature raconte ce déchirement."],
  [["Tradition orale", "Culture", "Sagesse", "Mythe"], "Avant l'écriture, la parole des griots et des conteurs transmettait la sagesse africaine ; la littérature écrite a pris le relais."],
  [["Guerre", "Violence", "Génocide", "Guerre civile"], "Les guerres et les violences du XXe siècle ont profondément marqué la littérature, en Afrique comme ailleurs."],
  [["Mémoire", "Histoire", "Esclavage"], "Traite négrière, colonisation, indépendances : l'histoire de l'Afrique a laissé des blessures que la littérature n'oublie pas."],
  [["Exil", "Immigration"], "Beaucoup d'écrivains ont connu l'exil, et leurs œuvres disent la nostalgie du pays perdu."],
  [["Amour", "Passion"], "Depuis toujours, l'amour est l'un des premiers sujets de la poésie et du roman."],
  [["Liberté", "Oppression", "Révolte"], "Partout où la liberté a été menacée, des écrivains ont élevé la voix."]
];
const AMORCE_FONCTION: Record<Fonction, string> = {
  Engagement: "De Victor Hugo à Mongo Beti, beaucoup d'écrivains ont mis leur plume au service d'une cause.",
  Sociale: "De Balzac et Zola en France à Ousmane Sembène en Afrique, le roman a souvent cherché à montrer la société telle qu'elle est.",
  Esthétique: "Pour certains écrivains, comme Théophile Gautier, l'art n'a pas d'autre but que la beauté.",
  Évasion: "Depuis les contes de notre enfance, les histoires nous emmènent loin de notre quotidien.",
  Lyrique: "Des poètes romantiques à Senghor, la littérature a souvent servi à dire les sentiments intimes."
};

function comprendreDu(citation: string, f: Fonction, fN: Fonction | null, o: Objet, themes: string[], rejet: Fonction | null,
  devalorise: boolean, discussion: boolean, precision: Precision | null, premiere: string): Comprendre {
  const m = motsDe(o);
  const de = themes.map(deTheme).find((x): x is string => !!x) ?? null;
  const dire = (t: string) => t.replace(/\{N\}/g, m.N).replace(/\{il\}/g, m.il);
  const these = devalorise ? `Pour l'auteur, ${m.n} ne sert à rien : ${m.il} ne change rien à la vie des hommes.`
    : rejet && rejet !== f ? `Pour l'auteur, ${m.n} n'est pas d'abord ${m.idee(rejet)} : ${m.il} est plutôt ${m.idee(f)}.`
    : `Pour l'auteur, ${m.n} est ${m.idee(f)}${de ? `, surtout quand ${m.il} parle ${de}` : ""}${precision ? ` (fonction ${precision})` : ""}.`;
  const variantes = QUESTION_CACHEE[f];
  const question = dire(variantes[graine(citation) % variantes.length]);
  const contraire = discussion && fN && fN !== f ? `${m.N} peut aussi être ${m.idee(fN)}.` : null;
  // Atikan : une problématique a au moins deux questions, une pour la thèse et une pour l'antithèse.
  const seconde = (q: string, sinon = "Comment les œuvres le montrent-elles ?") => discussion ? q : sinon;
  const autre = fN && fN !== f ? m.bref(fN) : null;
  const problematiques = [
    premiere,
    `Comment ${m.n} parvient-${m.il} à être ${m.bref(f)} ? ${seconde(autre ? `Ne peut-${m.il} pas aussi être ${autre} ?` : `Se limite-t-${m.il} pour autant à ce rôle ?`)}`,
    `Dans quelle mesure ${m.n} est-${m.il} ${m.bref(f)} ? ${seconde(`Ce rôle n'a-t-il pas des limites ?`, "Quels exemples le prouvent le mieux ?")}`
  ].filter((x, i, t) => x && t.indexOf(x) === i);
  const cles = new Set(themes);
  const amorce = AMORCES.find(([t]) => t.some(x => cles.has(x)))?.[1] ?? AMORCE_FONCTION[f];
  // Atikan : proposer aussi une problématique en une seule question.
  const uneQuestion = devalorise ? `${m.N} est-${m.il} vraiment inutile ?`
    : discussion ? `Dans quelle mesure ${m.n} est-${m.il} ${m.bref(f)} ?` : `En quoi ${m.n} est-${m.il} ${m.bref(f)} ?`;
  return { these, question, contraire, problematiques, uneQuestion, amorce };
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

/** Deux membres de phrase qui parlent chacun d'un objet différent (l'écrivain…, le poète…) et d'une fonction différente. */
function comparaison(citation: string, indices: (b: string) => [Fonction, number][]): [Fonction, Fonction] | null {
  const membres = normalize(sansAuteur(citation)).replace(/[^a-z,;:]+/g, " ").split(/[,;:]/).map(x => x.trim()).filter(Boolean);
  if (membres.length !== 2) return null;
  const objets = membres.map(x => (Object.keys(OBJETS) as Objet[]).find(o => o !== "oeuvre" && new RegExp(`^(?:le |la |l |un |une |les )?${OBJETS[o].motif.source.replace(/^\\b|\\b$/g, "")}`).test(x)));
  if (!objets[0] || !objets[1] || objets[0] === objets[1]) return null;
  const tete = (x: string) => indices(x).sort((a, b) => b[1] - a[1]).find(([, n]) => n > 0)?.[0];
  const f1 = tete(membres[0]), f2 = tete(membres[1]);
  return f1 && f2 && f1 !== f2 ? [f1, f2] : null;
}

/** `imposee` : la fonction choisie par l'élève quand celle proposée ne lui convient pas ; le plan et les œuvres la suivent. */
export function analyserSujet(texteTape: string, combien = 6, imposee?: Fonction, objetChoisi?: Objet): Analyse {
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
    // « le reflet de la vie de son auteur » : le miroir est celui de l'auteur (lyrique), pas celui de la société.
    const deLAuteur = /\bvie d(?:e|u)? ?(?:son|l|sa) ?(?:auteur|ecrivain|poete|createur)|\bsa propre vie/.test(normalize(bout).replace(/[^a-z]+/g, " "));
    const MIROIR = new Set(["reflet", "refleter", "de la vie", "miroir", "c est la vie"]);
    return INDICES.map(([f, liste]) => [f, liste.filter(i => !(deLAuteur && f === "Sociale" && MIROIR.has(i)) && indicePresent(m, i, ph)).reduce((s, i) => s + (i.includes(" ") ? 2 : 1), 0)] as [Fonction, number]);
  };
  // Ce que l'auteur rejette (« je ne crois pas à l'évasion », « au lieu de s'évader ») et ce qu'il affirme, par fonction.
  const rejets = new Map<Fonction, number>(), affirmes = new Map<Fonction, number>(), secondes = new Map<Fonction, number>();
  const ajoute = (m: Map<Fonction, number>, f: Fonction, n: number) => m.set(f, (m.get(f) ?? 0) + n);
  for (const brute of normalize(citation).replace(/,/g, " , ").replace(/[^a-z.;!?,]+/g, " ").split(/[.;!?]/)) {
    // « au lieu de s'évader par une œuvre » : ce qui suit est écarté par l'auteur.
    const lieu = brute.match(/\b(?:au lieu d|plutot que d)[a-z]*\s+((?:[a-z]+\s*){1,5})/);
    // « Le roman ne doit pas seulement distraire, il doit instruire » : distraire est admis, mais c'est la Partie 2.
    const pasSeul = brute.match(/\b(?:ne|n)\s+(?:[a-z]+\s+){0,3}pas\s+(?:seulement|uniquement|que|qu)\s+(?:(?:a|de|d|pour)\s+)?((?:[a-z]+\s*){1,4})|\bnon seulement\s+((?:[a-z]+\s*){1,4})/);
    if (pasSeul) for (const [f, n] of indices(pasSeul[1] ?? pasSeul[2])) if (n) secondes.set(f, (secondes.get(f) ?? 0) + n);
    // « La littérature engagée a fait son temps » : l'auteur rejette ce qu'il nomme.
    const fini = brute.match(/\b(?:a fait son temps|est depassee?s?|sont depassees?|est morte?|est demodee?|n a plus sa place|appartient au passe|est revolue?)\b/);
    if (fini) for (const [f, n] of indices(brute.slice(0, fini.index))) if (n) { ajoute(rejets, f, n * 2); plus(f, -n); plus(OPPOSE[f], n * 1.5); }
    const sansSeul = pasSeul ? brute.replace(pasSeul[0], " ") : brute;
    const phrase = lieu ? sansSeul.replace(lieu[0], " ") : sansSeul;
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
  let fonctions = imposee ? [imposee] : classes.filter(([, n], i) => n >= 0.3 && (i === 0 || n >= meilleur * 0.45)).map(([f]) => f).slice(0, 2);
  let p2: Fonction | null = null;
  // « … pas seulement X » : X va en Partie 2, la Partie 1 défend autre chose (instruire, le plus souvent).
  const seconde = [...secondes].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!imposee && seconde) {
    const autre = classes.find(([f, n]) => f !== seconde && n > 0.5)?.[0] ?? "Engagement";
    fonctions = [autre, seconde];
    p2 = seconde;
  }
  // « La littérature a une fonction ludique » : le nom donné par le cours décide (rattaché aux cinq fonctions).
  const nommee0 = !imposee && !seconde ? fonctionNommee(c0) : null;
  const inconnue = !!nommee0 && !nommee0.f;
  const nommee = nommee0?.f && !(rejets.get(nommee0.f) ?? 0) ? { f: nommee0.f, nom: nommee0.nom, f2: nommee0.f2 } : null;
  // « une fonction didactique et ludique » : deux fonctions nommées, la seconde va en Partie 2.
  if (nommee) { fonctions = nommee.f2 ? [nommee.f, nommee.f2] : [nommee.f]; if (nommee.f2) p2 = nommee.f2; }
  // « L'écrivain peint ce qu'il voit, le poète chante ce qu'il sent » : un plan comparatif, une fonction par membre.
  const comp = !imposee && !seconde && !nommee ? comparaison(citation, indices) : null;
  if (comp) { fonctions = comp; p2 = comp[1]; }
  if (!p2 && fonctions[0]) p2 = opposeePlan(fonctions[0], /\b(art|arts|artiste|beaute|beau|belle|style|forme|esthetique|poesie pure)\b/.test(normalize(citation)));
  // La fonction que l'auteur rejette clairement (plus rejetée qu'affirmée) ; un sentiment nié reste un sentiment.
  const rejet = imposee ? null : ([...rejets].filter(([f, n]) => f !== "Lyrique" && n >= 1 && n > (affirmes.get(f) ?? 0)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
  // Deux lectures presque aussi probables l'une que l'autre : on le dit, et l'élève peut voir l'autre plan.
  const second = classes[1];
  // Un sujet qui dit lui-même ce qui va en Partie 2 (« pas seulement… », une comparaison) ne laisse pas de doute.
  const doute = !imposee && !rejet && !seconde && !comp && !nommee && second && second[1] >= meilleur * SEUIL_DOUTE ? second[0] : null;
  const faible = !imposee && !nommee && meilleur < SEUIL_FAIBLE && !trouves.length;

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

  const genres = genresDuSujet(texte);
  // De qui ou de quoi parle la citation (« L'écrivain… ») ; l'élève peut le corriger.
  const lu = objetDuSujet(citation);
  const objet = objetChoisi ?? lu.objet, objetSur = lu.sur;
  // Sans thème reconnu : les œuvres au programme qui illustrent la fonction attendue.
  const avecThemes = oeuvresPour(themes, fonctions, combien, 2, genres, argumentsTrouves);
  // Trop peu d'œuvres sur ces thèmes : on complète avec celles qui illustrent la même fonction.
  const oeuvres = avecThemes.length >= combien ? avecThemes
    : [...avecThemes, ...oeuvresPour([], fonctions, combien, 1.5, genres, argumentsTrouves).filter(w => !avecThemes.includes(w))].slice(0, combien);

  // « La poésie ne sert à rien » : l'auteur attaque la littérature, le plan suit sa critique puis la discute.
  const devalorise = DEVALORISE.test(normalize(sansAuteur(c0)).replace(/[^a-z]+/g, " ").trim());
  // Sujet presque identique à un sujet corrigé : le plan du professeur passe avant le plan automatique.
  const corrigeProche = sujetCorrigeProche(c0);
  const plan = corrigeProche && "axe1" in corrigeProche ? planDuCorrige(corrigeProche)
    : planDuSujet({ citation: brute, f, f2: fonctions[1], consigne: type, discussion, themes, annonces: argumentsTrouves, oeuvres, genres, rejet, liste: enumeration(brute), objet, sur: !!objetChoisi || objetSur, devalorise: devalorise && !imposee, p2: imposee ? null : p2, precision: precisionDe(f, c0), auteur: ecrivain ? ecrivain.cle : auteur });
  const corrige = corrigeProche ? { num: corrigeProche.num, ouvert: "axe1" in corrigeProche } : null;
  // Un sujet corrigé reconnu ne sort jamais du cadre : son plan est celui du professeur.
  const horsCadre = corrige ? null : horsCadreDu(c0);

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
    genres, doute, faible, rejet, corrige, objet, objetSur,
    // Plan montré d'emblée seulement si la lecture est sûre ; sinon l'élève choisit sa piste dans le guide.
    sure: !!corrige?.ouvert || !!imposee || (!horsCadre && !inconnue && ((!doute && !faible && fonctions.length > 0) || devalorise)),
    horsCadre, devalorise: devalorise && !corrige, precision: precisionDe(fonctions[0], c0), planLibre: planLibreDu(brute, discussion),
    comprendre: f && !horsCadre && !corrige?.ouvert ? comprendreDu(c0, rejet && f === rejet ? (fonctions[1] && fonctions[1] !== rejet ? fonctions[1] : OPPOSE[rejet]) : f,
      rejet && rejet !== f ? rejet : p2 && p2 !== f ? p2 : OPPOSE[f], objet, themes, rejet, devalorise, discussion, precisionDe(f, c0), plan.problematique) : null,
    nature: natureDuSujet(texte, citation, !!auteur || !!auteurConnu(texteTape) || CITE_ENTRE_PARENTHESES.test(texteTape))
  };
}
