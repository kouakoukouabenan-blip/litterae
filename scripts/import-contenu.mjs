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

// Fiche détaillée : résumé complet et au moins deux idées d'illustration rédigées.
const detaillee = w => (w.resume ?? "").length >= 300 && w.idees.filter(i => i.texte).length >= 2;

const publiques = oeuvres.map(w =>
  libres.has(w.id)
    ? { ...w, exemple: w.exemple ?? null, detaillee: detaillee(w), libre: true }
    // Œuvre payante : on garde de quoi chercher et filtrer, pas le texte.
    : { ...w, resume: null, exemple: null, detaillee: detaillee(w), idees: w.idees.map(i => ({ texte: "", fonction: i.fonction, argument: i.argument })) }
);
const sujetsPublics = sujets.map((s, i) =>
  i < gratuites.sujets ? s : { num: s.num, auteur: s.auteur, citation: s.citation, orientation: s.orientation }
);

const out = new URL("../src/data/", import.meta.url);
writeFileSync(new URL("oeuvres.json", out), JSON.stringify(publiques));
writeFileSync(new URL("sujets.json", out), JSON.stringify(sujetsPublics, null, 1));
// Quiz : le premier est offert pour découvrir l'entraînement ; des autres, seul le nombre de questions est public.
const QUIZ_LIBRE = "definition";
writeFileSync(new URL("quiz-libre.json", out), JSON.stringify({ [QUIZ_LIBRE]: quiz[QUIZ_LIBRE] ?? [] }));
writeFileSync(new URL("quiz-apercu.json", out), JSON.stringify(Object.fromEntries(Object.entries(quiz).map(([id, q]) => [id, q.length]))));
console.log(`${publiques.length} œuvres (${libres.size} gratuites), ${sujetsPublics.length} sujets (${gratuites.sujets} gratuits).`);
