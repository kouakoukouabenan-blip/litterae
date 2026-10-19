/**
 * Compléments pour les anciens navigateurs (Chrome 64 à 91, souvent sur des téléphones jamais mis à jour).
 * Chargé en premier : sans eux, l'appli s'arrête net et l'élève reste bloqué sur l'écran d'ouverture.
 */
/* eslint-disable no-extend-native */
const def = (obj: object, nom: string, valeur: unknown) => {
  if (!(nom in obj)) Object.defineProperty(obj, nom, { value: valeur, writable: true, configurable: true });
};

def(Array.prototype, "at", function (this: unknown[], i: number) {
  const n = Math.trunc(i) || 0;
  return this[n < 0 ? this.length + n : n];
});
def(String.prototype, "at", function (this: string, i: number) {
  const n = Math.trunc(i) || 0;
  return this.charAt(n < 0 ? this.length + n : n) || undefined;
});
def(Array.prototype, "flat", function (this: unknown[], profondeur = 1): unknown[] {
  return profondeur < 1 ? this.slice() : this.reduce<unknown[]>((acc, v) => acc.concat(Array.isArray(v) ? (v as unknown[] & { flat(d: number): unknown[] }).flat(profondeur - 1) : [v]), []);
});
def(Array.prototype, "flatMap", function (this: unknown[], fn: (v: unknown, i: number, a: unknown[]) => unknown, ctx?: unknown) {
  return this.reduce<unknown[]>((acc, v, i, a) => acc.concat(fn.call(ctx, v, i, a) as unknown[]), []);
});
def(Object, "fromEntries", (entrees: Iterable<[PropertyKey, unknown]>) => {
  const o: Record<PropertyKey, unknown> = {};
  for (const [k, v] of entrees) o[k] = v;
  return o;
});
def(String.prototype, "matchAll", function* (this: string, re: RegExp) {
  const copie = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = copie.exec(this))) {
    yield m;
    if (m[0] === "") copie.lastIndex++;
  }
});
def(String.prototype, "trimEnd", String.prototype.trimRight);
def(String.prototype, "trimStart", String.prototype.trimLeft);
