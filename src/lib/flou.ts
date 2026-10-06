import { normalize } from "./text";

/**
 * Lecture tolérante aux fautes d'orthographe : chaque mot est ramené à une « clé » qui s'écrit
 * pareil quelle que soit l'orthographe (« sosiété », « societé », « sociétés » → même clé),
 * puis on accepte encore une ou deux lettres de différence sur les mots longs.
 */

/**
 * Mot → clé phonétique : le mot tel qu'il se prononce. Sans accents ni doubles lettres, chaque son écrit d'une seule façon
 * (« k » pour c, qu, q ; « s » pour ç, ss, c devant e ; « an » pour en, em ; « in » pour ain, ein, un ; « sion » pour tion…),
 * lettres muettes retirées. « Kel » vaut « quel », « santiman » vaut « sentiment », « fet » vaut « fait ».
 */
export function cle(mot: string, fin = true) {
  let s = mot.replace(/[^a-z]/g, "");
  s = s
    .replace(/^femm/, "fam").replace(/sh|sch/g, "ch").replace(/ph/g, "f").replace(/qu|q/g, "k").replace(/ch/g, "§").replace(/h/g, "").replace(/§/g, "ch")
    .replace(/c(?=[eiy])/g, "s").replace(/c/g, "k")
    .replace(/gu(?=[eiy])/g, "G").replace(/ge(?=[aou])/g, "j").replace(/g(?=[eiy])/g, "j").replace(/G/g, "g")
    .replace(/y/g, "i").replace(/z/g, "s").replace(/w/g, "v")
    .replace(/eau|au/g, "o").replace(/oeu/g, "eu")
    .replace(/(ai|ei)n(?=[^aeiou]|$)/g, "in").replace(/im(?=[^aeiou]|$)/g, "in")
    .replace(/[ea][nm](?=[^aeiou]|$)/g, "an").replace(/[u]m(?=[^aeiou]|$)/g, "un").replace(/un(?=[^aeiou]|$)/g, "in").replace(/om(?=[^aeiou]|$)/g, "on")
    .replace(/([^s])tion/g, "$1sion").replace(/([aeiou])il+(?=[aeiou]|$)/g, "$1y").replace(/ck/g, "k")
    .replace(/ai|ei/g, "e");
  if (fin) s = s.replace(/(er|ez|et|ai)$/, "e");
  // « ge » et « je » se prononcent pareil : une seule lettre (« engager », « engagé », « engajement »).
  s = s.replace(/j/g, "g").replace(/(.)\1+/g, "$1");
  // Fin muette : « sentiments », « faits », « grand » se lisent sans leurs dernières lettres.
  if (fin) {
    s = s.replace(/[sx]$/, "").replace(/e$/, "");
    // Seulement si le mot finissait vraiment par t, d ou p : « bonté » garde son t, pas « faits ».
    if (/[tdp]s?$/.test(mot)) s = s.replace(/(?<=[aeiou]n?)[tdp]$/, "");
  }
  return s;
}

/** Nombre de lettres à changer pour passer d'un mot à l'autre (une inversion compte pour une). */
export function distance(a: string, b: string, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let mini = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      mini = Math.min(mini, d[i][j]);
    }
    if (mini > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** Fautes tolérées selon la longueur : aucune sur les mots courts (« âme » ne doit pas devenir « arme »). */
export const tolerance = (n: number) => (n <= 5 ? 0 : n <= 9 ? 1 : 2);

/** Même mot, à quelques fautes près. La première lettre doit être la bonne (« mérite » n'est pas « vérité »). */
export const memeMot = (a: string, b: string) => a === b || (a[0] === b[0] && distance(a, b, 2) <= tolerance(Math.min(a.length, b.length)));

/** Le mot commence par ce début de mot, à quelques fautes près (« combat » trouve « conbattre »). */
export function commencePar(motCle: string, debut: string) {
  if (motCle.startsWith(debut)) return true;
  // « arracher » écrit en entier : le mot du texte a perdu sa fin muette (« arrache »).
  if (motCle.length >= 4 && debut.length - motCle.length <= 2 && debut.startsWith(motCle)) return true;
  // Fautes acceptées seulement sur les débuts de mot assez longs : « liber » ne doit pas trouver « littérature ».
  const tol = debut.length >= 6 ? tolerance(debut.length) : 0;
  if (!tol) return false;
  if (motCle[0] !== debut[0]) return false;
  for (let n = debut.length - 1; n <= debut.length + 1; n++) if (n >= 4 && n <= motCle.length && distance(motCle.slice(0, n), debut, tol) <= tol) return true;
  return false;
}

/** Terminaisons qui font passer d'un mot à sa famille (en clés) : « colonis-ation », « pauvr-eté », « révol-ution ». */
const SUFFIXES = ["isation", "ation", "ution", "ition", "sion", "tion", "isme", "iste", "itude", "emant", "aman", "man", "ite", "ete", "ik", "al", "el", "eur", "ans", "ens", "if", "iv", "abl", "ibl", "ie", "it", "et", "ir"];

/** Racine d'un mot (au moins 4 lettres) : sa clé sans sa terminaison. */
export function racine(c: string) {
  for (const s of SUFFIXES) if (c.endsWith(s) && c.length - s.length >= 4) return c.slice(0, -s.length);
  return c;
}

/**
 * Même famille de mots : « africaine » et « Afrique », « colonial » et « colonisation », « pauvre » et « pauvreté ».
 * La racine du thème doit ouvrir le mot du texte : « roman » ne donne pas « Romantisme », ni « envie » « Environnement ».
 */
export function memeFamille(motCle: string, themeCle: string) {
  if (memeMot(motCle, themeCle)) return true;
  const r = racine(themeCle);
  if (motCle === r && r.length >= 4) return true;
  if (r.length < 5) return false;
  return motCle.startsWith(r) && motCle.length - r.length <= 7 || (motCle.length >= 5 && r.startsWith(motCle) && r.length - motCle.length <= 1);
}

/** Mots qui ne disent rien du sens : jamais comparés. */
const VIDES = new Set("les des une dans pour avec sans par sur sous est sont son ses leur leurs que qui quoi dont mais ou donc car pas plus tout tous toute toutes elle elles ils nous vous lui eux cette ces cet aux comme meme etre avoir fait faire peut doit".split(" "));

export interface Jeton { brut: string; cle: string; colle?: boolean }

/**
 * Découpe un texte en mots comparables. « l'amour », « lamour » et « l amour » donnent tous « amour » :
 * quand l'élève a collé l'article, on garde aussi le mot sans sa première lettre.
 */
export function jetons(texte: string): Jeton[] {
  const net = normalize(texte.replace(/œ/gi, "oe").replace(/æ/gi, "ae")).replace(/[^a-z]+/g, " ");
  const out: Jeton[] = [];
  const bruts = net.split(" ").filter(Boolean);
  bruts.forEach((brut, i) => {
    // « litté rature », « dé noncer » : le mot coupé en deux est aussi lu en entier.
    const suivant = bruts[i + 1];
    if (suivant && brut.length >= 2 && suivant.length >= 3 && (brut.length <= 5 || suivant.length <= 4) && !VIDES.has(suivant)) {
      const joint = brut + suivant;
      out.push({ brut: joint, cle: cle(joint), colle: true });
    }
    if (brut.length < 3 || VIDES.has(brut)) return;
    out.push({ brut, cle: cle(brut) });
    // « lalitterature », « desinjustices » : l'article collé est retiré.
    for (const debut of ["la", "le", "les", "de", "du", "des", "une", "un", "sa", "son", "ses", "ce", "cette"])
      if (brut.length - debut.length >= 4 && brut.startsWith(debut)) out.push({ brut: brut.slice(debut.length), cle: cle(brut.slice(debut.length)), colle: true });
    const court = brut.match(/^(?:l|d|j|n|m|s|t|qu)([aeiouh].{2,})$/);
    if (court) out.push({ brut: court[1], cle: cle(court[1]), colle: true });
  });
  return out;
}

/** Clés phonétiques des mots d'un texte, pour chercher « par le son ». */
export const sonsDe = (texte: string) => [...new Set(normalize(texte.replace(/œ/gi, "oe")).split(/[^a-z]+/).filter(m => m.length >= 3).map(m => cle(m)))];

const clesTermes = new Map<string, string>();
/**
 * Le terme tapé se prononce comme un de ces mots (ou comme leur début) : « sengor » trouve « Senghor »,
 * « kourouma » trouve « Kourouma » écrit « couroma ». Seulement pour les termes d'au moins 4 lettres.
 */
export function sonProche(sons: string[], terme: string, souple = false) {
  if (terme.length < 4) return false;
  let k = clesTermes.get(terme);
  if (k === undefined) { k = cle(terme); clesTermes.set(terme, k); }
  if (k.length < 3) return false;
  // Le son fait déjà le gros du travail : une seule lettre de différence en plus, sur les mots longs.
  // « souple » (titres et auteurs) : une lettre de différence dès 5 lettres (« tropées » → « Trophées »).
  const min = souple ? 5 : 6;
  return sons.some(s => s === k || (k!.length >= 4 && s.startsWith(k!)) || (k!.length >= min && s[0] === k![0] && distance(s, k!, 1) <= 1));
}

/** Écriture SMS et mots courts écrits au son, remis en toutes lettres avant la lecture du sujet. */
const SMS: Record<string, string> = {
  ds: "dans", dan: "dans", pr: "pour", pou: "pour", ki: "qui", ke: "que", k: "que", kel: "quel", kele: "quelle", kelle: "quelle",
  bcp: "beaucoup", tjr: "toujours", tjrs: "toujours", qd: "quand", kan: "quand", kand: "quand", pk: "pourquoi", pq: "pourquoi",
  mm: "meme", mem: "meme", tt: "tout", ts: "tous", ns: "nous", nou: "nous", vs: "vous", vou: "vous", doi: "doit", dwa: "doit", doivt: "doivent",
  pe: "peut", o: "au", e: "et", nest: "n est", na: "n a", pa: "pas", otr: "autre", otre: "autre", kom: "comme", kome: "comme",
  lit: "litterature", litt: "litterature", litte: "litterature", ecriv: "ecrivain", ecrivin: "ecrivain", lecrivin: "l ecrivain", c: "c est",
  ya: "il y a", koi: "quoi", jms: "jamais", jamai: "jamais", ri1: "rien", bi1: "bien"
};

/** « la poézi na pa d otre but kel mème » → « la poezi n a pas d autre but qu elle meme ». */
export function redresser(texte: string) {
  return normalize(texte.replace(/œ/gi, "oe"))
    .replace(/\bk(?:el|elle|ele)\s+m[e]?mes?\b/g, "qu elle meme")
    .replace(/[a-z0-9]+/g, m => SMS[m] ?? m);
}
