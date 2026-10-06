import { OEUVRES } from "./data";

/**
 * Titres d'œuvres en italique, comme dans une copie bien tenue.
 *
 * Deux chemins :
 * - l'auteur du contenu encadre un passage d'étoiles (*Une si longue lettre*) ;
 * - sinon l'appli reconnaît toute seule les titres de la base, à condition que la citation
 *   garde les majuscules du titre (« la terre » reste un mot courant, « La Terre » est l'œuvre).
 */

const LETTRE = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/;

const echappe = (t: string) =>
  t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’]").replace(/\s+/g, "\\s+");

/** Les titres connus, les plus longs d'abord pour qu'un titre entier gagne sur un titre plus court. */
const TITRES = [...new Set(OEUVRES.map(w => w.titre.trim()).filter(t => t.length > 2))]
  .sort((a, b) => b.length - a.length);

const RE_TITRES = TITRES.length ? new RegExp(TITRES.map(echappe).join("|"), "gi") : null;
const PAR_MINUSCULES = new Map(TITRES.map(t => [t.toLowerCase(), t]));

/** Majuscule d'une lettre, et non un chiffre ou une apostrophe. */
const estMajuscule = (c: string) => !!c && c !== c.toLowerCase() && LETTRE.test(c);

/**
 * Un titre cité garde les majuscules du titre : « La Disparition » est l'œuvre,
 * « la disparition de son père » est une phrase ordinaire. L'article de tête peut rester
 * en minuscule (« dans l’Avare »), mais les autres majuscules doivent être là.
 */
function memesMajuscules(titre: string, cite: string) {
  const a = [...titre], b = [...cite];
  const autres = a.map((c, i) => [c, i] as [string, number]).filter(([c], i) => i > 0 && estMajuscule(c));
  if (autres.length) return autres.every(([, i]) => estMajuscule(b[i] ?? ""));
  return !estMajuscule(a[0]) || estMajuscule(b[0] ?? "");
}

/** Nom de famille de l'auteur, pour reconnaître « Le Cid de Corneille ». */
const AUTEURS = new Map(OEUVRES.map(w => [w.titre.toLowerCase(), w.auteur.trim().split(/\s+/).pop()!.toLowerCase()]));

/** Mots qui ne font pas d'un titre un nom de personnage : articles et titres de civilité. */
const PETITS_MOTS = /^(le|la|les|l|un|une|des|du|de|d|au|aux|dom|don|monsieur|madame|mademoiselle|maître|petit|petite|vieux|vieille)$/i;

/**
 * Titre qui est aussi le nom d'un personnage (Antigone, Dom Juan, Le Petit Prince) :
 * un mot unique, ou un titre fait seulement de noms propres.
 */
function nomDePersonnage(titre: string) {
  // Un titre fait de chiffres (1984) se confond avec une date : même prudence.
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(titre)) return true;
  const mots = titre.split(/\s+/).filter(m => !PETITS_MOTS.test(m.replace(/[’'].*$/, "")));
  return !mots.length || mots.every(m => estMajuscule(m[0] ?? ""));
}

/**
 * Pour ces titres-là, l'italique n'est mis que là où le texte parle de l'œuvre et non du
 * personnage : après « dans », entre guillemets, ou à côté du nom de l'auteur.
 */
function designeLOeuvre(titre: string, text: string, i: number, j: number) {
  if (!nomDePersonnage(titre)) return true;
  if (/(«\s*|\b[Dd]ans\s+|\b[Ll]ire\s+|\b[Rr]elire\s+)$/.test(text.slice(Math.max(0, i - 14), i))) return true;
  const nom = AUTEURS.get(titre.toLowerCase());
  return !!nom && (text.slice(j, j + 60) + " " + text.slice(Math.max(0, i - 60), i)).toLowerCase().includes(nom);
}

/** Positions des titres reconnus dans un texte, sans chevauchement. */
function titresCites(text: string): [number, number][] {
  if (!RE_TITRES) return [];
  const trouves: [number, number][] = [];
  RE_TITRES.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_TITRES.exec(text))) {
    const i = m.index, j = i + m[0].length;
    const borne = !LETTRE.test(text[i - 1] ?? "") && !LETTRE.test(text[j] ?? "");
    const titre = PAR_MINUSCULES.get(m[0].toLowerCase()) ?? m[0];
    if (borne && memesMajuscules(titre, m[0]) && designeLOeuvre(titre, text, i, j)) {
      trouves.push([i, j]);
      RE_TITRES.lastIndex = j;
    } else {
      RE_TITRES.lastIndex = i + 1;
    }
  }
  return trouves;
}

const CACHE = new Map<string, Morceau[]>();

export interface Morceau {
  t: string;
  /** Titre d'œuvre : affiché en italique. */
  ital: boolean;
}

/**
 * Découpe un texte en morceaux droits et en italiques : d'abord les passages marqués
 * d'étoiles par l'auteur, puis, dans le reste, les titres reconnus (si `auto`).
 */
export function morceaux(text: string, auto = true): Morceau[] {
  const cle = (auto ? "a" : "b") + text;
  const garde = CACHE.get(cle);
  if (garde) return garde;
  const out: Morceau[] = [];
  const pousser = (t: string, ital: boolean) => {
    if (!t) return;
    const dernier = out[out.length - 1];
    if (dernier && dernier.ital === ital) dernier.t += t;
    else out.push({ t, ital });
  };
  // Les étoiles de l'auteur sont prioritaires : ce qu'il a marqué reste marqué.
  for (const [i, part] of text.split(/\*([^*\n]+)\*/g).entries()) {
    if (i % 2 === 1) { pousser(part, true); continue; }
    if (!auto) { pousser(part, false); continue; }
    let pos = 0;
    for (const [a, b] of titresCites(part)) {
      pousser(part.slice(pos, a), false);
      pousser(part.slice(a, b), true);
      pos = b;
    }
    pousser(part.slice(pos), false);
  }
  // Une liste de recherche réaffiche les mêmes textes à chaque frappe : on garde le découpage.
  if (CACHE.size > 800) CACHE.clear();
  CACHE.set(cle, out);
  return out;
}
