// Vérifie les données avant chaque build : un contenu cassé ne doit jamais partir en ligne.
import { readFileSync } from "node:fs";

const load = f => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), "utf8"));
const oeuvres = load("oeuvres.json");
const sujets = load("sujets.json");
const FONCTIONS = ["Engagement", "Esthétique", "Évasion", "Lyrique", "Sociale"];
const errors = [];
const err = (where, msg) => errors.push(`${where} : ${msg}`);

const ids = new Set();
for (const w of oeuvres) {
  const at = `œuvre « ${w.titre ?? w.id} »`;
  if (!w.id || !/^[a-z0-9-]+$/.test(w.id)) err(at, `identifiant invalide (${w.id})`);
  if (ids.has(w.id)) err(at, "identifiant en double");
  ids.add(w.id);
  if (w.pays?.length && !w.paysTexte?.trim()) err(at, "paysTexte manquant");
  for (const k of ["titre", "auteur", "genre"]) if (!w[k]?.trim()) err(at, `${k} manquant`);
  for (const k of ["pays", "aires", "fonctions", "themes", "motsCles", "idees"]) if (!Array.isArray(w[k])) err(at, `${k} doit être une liste`);
  if (!w.fonctions?.length) err(at, "aucune fonction littéraire");
  for (const f of [...(w.fonctions ?? []), ...(w.idees ?? []).map(i => i.fonction)]) if (!FONCTIONS.includes(f)) err(at, `fonction inconnue « ${f} »`);
  // Le site est public : une fiche payante ne doit contenir ni résumé ni texte d'illustration.
  if (!w.libre && (w.resume || w.idees?.some(i => i.texte))) err(at, "contenu payant présent dans les données publiques");
}
if (oeuvres.filter(w => w.libre).length !== 10) err("œuvres", "il faut exactement 10 fiches gratuites");

const nums = new Set();
for (const s of sujets) {
  const at = `sujet ${s.num}`;
  if (nums.has(s.num)) err(at, "numéro en double");
  nums.add(s.num);
  for (const k of ["citation", "auteur", "orientation"]) if (!s[k]?.trim()) err(at, `${k} manquant`);
  const complet = "intro" in s;
  if (complet !== sujets.indexOf(s) < 3) err(at, complet ? "corrigé payant présent dans les données publiques" : "corrigé gratuit incomplet");
  if (complet) {
    for (const k of ["intro", "transition", "conclu"]) if (!s[k]?.trim()) err(at, `${k} manquant`);
    for (const axe of ["axe1", "axe2"]) if (!s[axe]?.args?.length) err(at, `${axe} sans argument`);
  }
}

if (errors.length) {
  console.error(`${errors.length} problème(s) dans les données :\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Données valides : ${oeuvres.length} œuvres, ${sujets.length} sujets.`);
