/** Minuscules sans accents, pour comparer et chercher. */
export const normalize = (s: string | null | undefined) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n > 1 ? many : one}`;

/** Découpe un texte en morceaux pour surligner les termes cherchés. */
export function splitHighlight(text: string, terms: string[]): { t: string; hit: boolean }[] {
  if (!terms.length) return [{ t: text, hit: false }];
  // normalize() peut changer la longueur : on travaille caractère par caractère.
  const base = [...text].map(c => normalize(c) || " ").join("");
  const marks: [number, number][] = [];
  for (const term of terms) {
    let i = base.indexOf(term);
    while (i > -1) {
      marks.push([i, i + term.length]);
      i = base.indexOf(term, i + term.length);
    }
  }
  if (!marks.length) return [{ t: text, hit: false }];
  marks.sort((a, b) => a[0] - b[0]);
  const chars = [...text];
  const parts: { t: string; hit: boolean }[] = [];
  let pos = 0;
  for (const [a, b] of marks) {
    if (a < pos) continue;
    if (a > pos) parts.push({ t: chars.slice(pos, a).join(""), hit: false });
    parts.push({ t: chars.slice(a, b).join(""), hit: true });
    pos = b;
  }
  if (pos < chars.length) parts.push({ t: chars.slice(pos).join(""), hit: false });
  return parts;
}
