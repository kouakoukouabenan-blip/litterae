// Entraîne le modèle qui aide « J'ai un devoir » à reconnaître la fonction d'un sujet.
// Usage : node scripts/entrainer-modele.mjs <dossier des sujets classés> [--essai]
// Chaque fichier .json du dossier est une liste de { texte, fonctions: [principale, seconde?] }.
// Le modèle (src/data/modele-fonctions.json) donne à chaque mot du sujet un poids par fonction.
// Avec --essai : n'écrit rien, mesure seulement la justesse en mettant un sujet sur cinq de côté.
import { createServer } from "vite";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const [dossier, option] = process.argv.slice(2);
if (!dossier) { console.error("Indique le dossier des sujets classés."); process.exit(1); }

const memoire = {};
const rien = () => {};
const partout = new Proxy(rien, { get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : partout), apply: () => partout });
Object.assign(globalThis, {
  localStorage: { getItem: k => memoire[k] ?? null, setItem: (k, v) => { memoire[k] = String(v); }, removeItem: k => { delete memoire[k]; } },
  document: partout, addEventListener: rien, removeEventListener: rien, matchMedia: () => ({ matches: false, addEventListener: rien }),
  location: { hash: "", href: "http://localhost/" }, innerWidth: 400
});
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = globalThis;

// Réglages retenus après essais (MIN : un mot doit être vu au moins MIN fois ; SEUIL : écart minimal pour garder un mot).
const MIN = +(process.env.MIN ?? 1), LISSAGE = +(process.env.LISSAGE ?? 0.5), SEUIL = +(process.env.SEUIL ?? 2), REEL = +(process.env.REEL ?? 1);
const ORDRE = ["Engagement", "Sociale", "Esthétique", "Évasion", "Lyrique"];
const NOMS = { Social: "Sociale" };
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { traits, decouperSujet } = await vite.ssrLoadModule("/src/lib/devoir.ts");
  const { redresser } = await vite.ssrLoadModule("/src/lib/flou.ts");
  // Les sujets réels (BAC, devoirs, Facebook, sujets corrigés) comptent plus que les sujets fabriqués pour l'entraînement (« corpus-… »).
  const sujets = readdirSync(dossier).filter(f => f.endsWith(".json"))
    .map(f => [f, JSON.parse(readFileSync(`${dossier}/${f}`, "utf8"))])
    // Les autres fichiers du dossier (réponses en cours, notes) ne sont pas des listes de sujets.
    .flatMap(([f, l]) => Array.isArray(l) ? l.map(x => ({ ...x, poids: f.startsWith("corpus-") ? 1 : REEL })) : [])
    .map(x => ({ ...x, fonctions: (x.fonctions ?? []).map(y => NOMS[y] ?? y).filter(y => ORDRE.includes(y)) }))
    // Un sujet dont la fonction est douteuse (« sur »: false) n'est pas appris.
    .filter(x => x.texte && x.fonctions.length && x.sur !== false);
  // Un sujet qui revient plusieurs fois ne compte qu'une fois.
  const vus = new Set();
  const uniques = sujets.filter(x => { const k = x.texte.replace(/\s+/g, " ").trim().toLowerCase(); if (vus.has(k)) return false; vus.add(k); return true; });
  const exemples = uniques.map(x => ({ t: traits(redresser(decouperSujet(x.texte).citation)), f: x.fonctions, p: x.poids }));

  /** Bayes naïf : pour chaque mot, à quel point il est plus fréquent dans une fonction que dans les autres. */
  function entrainer(liste) {
    const parFonction = ORDRE.map(() => new Map()), total = ORDRE.map(() => 0);
    for (const { t, f, p: force } of liste) f.forEach((fn, rang) => {
      const i = ORDRE.indexOf(fn), poids = (rang === 0 ? 1 : 0.5) * force;
      total[i] += poids;
      for (const m of t) parFonction[i].set(m, (parFonction[i].get(m) ?? 0) + poids);
    });
    const mots = new Map();
    for (const { t } of liste) for (const m of t) mots.set(m, (mots.get(m) ?? 0) + 1);
    const poids = {};
    for (const [m, n] of mots) {
      if (n < MIN) continue; // un mot trop rare n'apprend rien de sûr
      // Pour chaque fonction : présence du mot dans ses sujets comparée à sa présence dans les sujets des autres fonctions.
      const tous = ORDRE.reduce((a, _, i) => a + (parFonction[i].get(m) ?? 0), 0), totalTous = total.reduce((a, b) => a + b, 0);
      const p = ORDRE.map((_, i) => {
        const dedans = ((parFonction[i].get(m) ?? 0) + LISSAGE) / (total[i] + 2 * LISSAGE);
        const ailleurs = (tous - (parFonction[i].get(m) ?? 0) + LISSAGE) / (totalTous - total[i] + 2 * LISSAGE);
        return Math.round(Math.log(dedans / ailleurs) * 10);
      });
      if (p.some(x => Math.abs(x) >= SEUIL)) poids[m] = p;
    }
    return poids;
  }
  const deviner = (poids, t) => {
    const s = ORDRE.map(() => 0);
    for (const m of t) if (poids[m]) poids[m].forEach((x, i) => (s[i] += x));
    return ORDRE[s.indexOf(Math.max(...s))];
  };

  if (option === "--essai") {
    let juste = 0, n = 0;
    for (let k = 0; k < 5; k++) {
      const app = exemples.filter((_, i) => i % 5 !== k), test = exemples.filter((_, i) => i % 5 === k);
      const p = entrainer(app);
      for (const x of test) { n++; if (x.f.includes(deviner(p, x.t))) juste++; }
    }
    console.log(`${uniques.length} sujets ; modèle seul, sur des sujets jamais vus : ${juste}/${n} (${Math.round(100 * juste / n)} %)`);
  } else {
    const poids = entrainer(exemples);
    const ancien = JSON.parse(readFileSync(new URL("../src/data/modele-fonctions.json", import.meta.url), "utf8"));
    writeFileSync(new URL("../src/data/modele-fonctions.json", import.meta.url), JSON.stringify({ echelle: +(process.env.ECHELLE ?? ancien.echelle ?? 0.5), sujets: uniques.length, poids }));
    console.log(`${uniques.length} sujets, ${Object.keys(poids).length} mots appris.`);
  }
} finally {
  await vite.close();
}
