import type { Fonction, MotDico, Oeuvre, Sujet, SujetApercu } from "../data/types";
import { OEUVRES, SUJETS } from "./data";
import { contenuLibre } from "./libre";
import { motsPublics } from "./dictionnaire";
import { fonctionsDuSujet, oeuvresPour } from "./defi";
import { normalize } from "./text";

/**
 * « J'ai un devoir » : l'élève colle l'énoncé de son sujet, l'appli le lit sur le téléphone
 * (thèmes, fonction littéraire, mots difficiles) et propose un plan, des œuvres et des sujets corrigés proches.
 */

/** Mots qui trahissent la fonction de la littérature dont parle la citation : début de mot, mot exact (« $ ») ou expression. */
const INDICES: [Fonction, string[]][] = [
  ["Engagement", ["engag", "denonc", "combat", "lutt", "arme", "militant", "changer le monde", "eveill", "conscien", "revolt", "liberer", "liberation", "injustice", "oppress", "servir", "peuple", "responsab", "mission", "temoign"]],
  ["Sociale", ["societe", "social", "miroir", "realite", "reel", "realis", "peindre", "reflet", "moeurs", "epoque", "vie quotidienne"]],
  ["Esthétique", ["beau$", "beaute", "belle$", "art$", "arts$", "artist", "forme$", "formes$", "style", "langage", "mots$", "poesie pure", "createur", "creation", "gratuit"]],
  ["Évasion", ["evasion", "evader", "reve$", "reves$", "rever", "reveur", "imaginaire", "imagination", "divert", "distraire", "fuir", "fuite", "ailleurs", "plaisir", "amuser", "oubli", "fiction"]],
  ["Lyrique", ["sentiment", "emotion", "coeur", "ame$", "ames$", "moi$", "intime", "souffrance", "douleur", "amour", "joie", "tristesse", "confid", "emouv", "toucher"]]
];

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

export interface Analyse {
  themes: string[];
  fonctions: Fonction[];
  mots: MotDico[];
  discussion: boolean;
  plan: { axe1: string; axe2: string };
  oeuvres: Oeuvre[];
  proches: (Sujet | SujetApercu)[];
}

let themesConnus: string[] | null = null;
function tousLesThemes() {
  if (!themesConnus) {
    const n = new Map<string, string>();
    const ajouter = (t: string) => { const k = normalize(t); if (k && !n.has(k)) n.set(k, t); };
    for (const w of OEUVRES) w.themes.forEach(ajouter);
    for (const s of SUJETS) (s.themes ?? []).forEach(ajouter);
    for (const e of contenuLibre()?.entrainement ?? []) (e.themes ?? []).forEach(ajouter);
    themesConnus = [...n.values()];
  }
  return themesConnus;
}

/** « souffrances » trouve « Souffrance », « femmes » trouve « Femme » : on compare les débuts de mots. */
const racine = (m: string) => (m.length > 6 ? m.slice(0, m.length - 2) : m);
/** Mots présents dans presque tous les sujets : ils ne disent rien du thème. */
const TROP_COURANTS = new Set(["litterature", "litteraire", "ecriture", "ecrivain", "auteur", "lecteur", "lecture", "livre", "oeuvre", "roman", "poesie", "theatre", "art"]);

/** L'énoncé collé : la citation, puis la consigne si elle commence par un verbe de consigne. */
export function decouperSujet(texte: string) {
  const net = texte.replace(/\s+/g, " ").trim();
  const m = net.match(/^(.*?)\s*((?:Expliquez|Commentez|Discutez|Analysez|Vous expliquerez|Vous commenterez|Vous discuterez|Que pensez-vous|Pensez-vous|Dans quelle mesure)[^]*)$/i);
  const citation = (m?.[1] || net).replace(/^[«"“\s]+|[»"”\s]+$/g, "");
  return { citation, consigne: m?.[2]?.trim() || "" };
}

export function analyserSujet(texte: string): Analyse {
  const { citation } = decouperSujet(texte);
  // Thèmes, fonction et mots difficiles : dans la citation seulement (pas dans « Expliquez et discutez »).
  const t = ` ${normalize(citation).replace(/[^a-z' -]/g, " ")} `;
  const mots = t.split(/[\s'-]+/).filter(m => m.length > 2);
  const contient = (m: string) => { const r = racine(m); return mots.some(x => x === m || x.startsWith(r)); };
  /** « ARME DE COMBAT / INSTRUMENT DE LUTTE » : une des formes, avec tous ses mots importants. */
  const formePresente = (texteForme: string) => normalize(texteForme).split(/\s*[\/(),]\s*/).some(f => {
    const parts = f.split(/[\s'-]+/).filter(m => m.length > 3 && !["dans", "pour", "avec", "sans"].includes(m));
    return parts.length > 0 && parts.every(contient);
  });

  // Thèmes : tous les mots du thème se retrouvent dans le sujet (« Condition féminine » demande les deux).
  const themes = tousLesThemes().filter(th => !TROP_COURANTS.has(normalize(th)) && formePresente(th)).slice(0, 6);

  const trouve = (i: string) => i.includes(" ") ? t.includes(` ${i}`) : i.endsWith("$") ? mots.includes(i.slice(0, -1)) : mots.some(m => m.startsWith(i));
  const scores = INDICES.map(([f, indices]) => [f, indices.filter(trouve).length] as [Fonction, number]);
  const fonctions = scores.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([f]) => f).slice(0, 2);

  // Mots du dictionnaire présents dans l'énoncé (« ENGAGEMENT (ENGAGÉ) » : chaque forme compte).
  const dico = motsPublics().filter(e => formePresente(e.mot) && !TROP_COURANTS.has(normalize(e.mot).split(/[^a-z]/)[0])).slice(0, 6);

  const discussion = /discut|nuanc|partag|apprecie|pensez-vous|pensez vous|etes-vous|etes vous|dans quelle mesure/.test(normalize(texte));
  const f = fonctions[0];
  const plan = f
    ? { axe1: `Explique la thèse : pour l'auteur, la littérature est ${IDEE[f]}.`,
        axe2: discussion ? `Nuance : la littérature peut aussi être ${IDEE[OPPOSE[f]]}.` : `Approfondis : montre d'autres façons dont les œuvres le prouvent.` }
    : { axe1: "Explique la citation : ce que l'auteur veut dire, avec des exemples d'œuvres.",
        axe2: discussion ? "Discute : montre les limites de cette idée, avec d'autres exemples." : "Approfondis : montre d'autres façons dont les œuvres le prouvent." };

  // Sans thème reconnu : les œuvres au programme qui illustrent la fonction attendue.
  const oeuvres = oeuvresPour(themes, fonctions, 6, 2).length ? oeuvresPour(themes, fonctions, 6, 2) : oeuvresPour([], fonctions, 4, 1.5);
  const proches = SUJETS.map(s => {
    const ts = new Set((s.themes ?? []).map(normalize));
    const fs = fonctionsDuSujet(s.num);
    const communs = normalize(`${s.citation} ${s.notion ?? ""}`).split(/[^a-z]+/).filter(m => m.length >= 5 && !TROP_COURANTS.has(m) && mots.includes(m)).length;
    return { s, score: themes.filter(x => ts.has(normalize(x))).length * 2 + fonctions.filter(x => fs.includes(x)).length * 1.5 + communs };
  }).filter(x => x.score >= 2.5).sort((a, b) => b.score - a.score).slice(0, 2).map(x => x.s);

  return { themes, fonctions, mots: dico, discussion, plan, oeuvres, proches };
}
