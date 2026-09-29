// Produit les données publiques du site à partir du dépôt privé litterae-contenu.
// Usage : npm run import-contenu -- ../litterae-contenu
// Seule la partie gratuite est copiée : les résumés et corrigés payants restent sur le serveur.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "../litterae-contenu", "contenu");
const load = f => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
const oeuvres = load("oeuvres.json");
const sujets = load("sujets.json");
const gratuites = load("gratuites.json");
const quiz = load("quiz.json");
const libres = new Set(gratuites.oeuvres);

for (const id of libres) if (!oeuvres.some(w => w.id === id)) throw new Error(`Œuvre gratuite inconnue : ${id}`);

const publiques = oeuvres.map(w =>
  libres.has(w.id)
    ? { ...w, libre: true }
    // Œuvre payante : on garde de quoi chercher et filtrer, pas le texte.
    : { ...w, resume: null, idees: w.idees.map(i => ({ texte: "", fonction: i.fonction, argument: i.argument })) }
);
const sujetsPublics = sujets.map((s, i) =>
  i < gratuites.sujets ? s : { num: s.num, auteur: s.auteur, citation: s.citation, orientation: s.orientation }
);

const out = new URL("../src/data/", import.meta.url);
writeFileSync(new URL("oeuvres.json", out), JSON.stringify(publiques));
writeFileSync(new URL("sujets.json", out), JSON.stringify(sujetsPublics, null, 1));
// Quiz : payants, seul le nombre de questions par leçon est public.
writeFileSync(new URL("quiz-apercu.json", out), JSON.stringify(Object.fromEntries(Object.entries(quiz).map(([id, q]) => [id, q.length]))));
console.log(`${publiques.length} œuvres (${libres.size} gratuites), ${sujetsPublics.length} sujets (${gratuites.sujets} gratuits).`);
