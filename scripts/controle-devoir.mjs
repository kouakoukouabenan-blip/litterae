// Contrôle de « J'ai un devoir » avant chaque mise en ligne : l'appli lit les 31 sujets corrigés et quelques
// sujets pièges, et on vérifie qu'elle ne recule pas (fonction trouvée, exemples sûrs, consigne respectée…).
// Lancé par « npm run build » : si un seuil n'est pas atteint, la mise en ligne s'arrête.
import { createServer } from "vite";
import { readFileSync } from "node:fs";

// L'analyse tourne normalement dans le téléphone : on lui donne de quoi tourner ici, sans contenu payant.
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

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let echec = false;
try {
  const { analyserSujet } = await vite.ssrLoadModule("/src/lib/devoir.ts");
  const sujets = JSON.parse(readFileSync(new URL("../src/data/sujets.json", import.meta.url), "utf8"));
  const oeuvres = JSON.parse(readFileSync(new URL("../src/data/oeuvres.json", import.meta.url), "utf8"));
  const parId = new Map(oeuvres.map(w => [w.id, w]));
  const NOMS = { Social: "Sociale", Sociale: "Sociale", Engagement: "Engagement", Esthétique: "Esthétique", Évasion: "Évasion", Lyrique: "Lyrique" };

  let premiere = 0, dansListe = 0, reconnus = 0, exemplesSurs = 0, exemplesTotal = 0, doublons = 0, vides = 0;
  const problemes = [];
  const verifierPlan = (nom, a) => {
    const ex = [...a.plan.ex1, ...a.plan.ex2];
    const ids = ex.flat().map(e => e.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) { doublons++; problemes.push(`${nom} : la même œuvre revient deux fois`); }
    for (const e of ex.flat()) if (e.id) { exemplesTotal++; if (parId.get(e.id)?.detaillee !== false) exemplesSurs++; else problemes.push(`${nom} : fiche incomplète en exemple (${e.titre})`); }
    // Les éléments repris d'une énumération (« … ») peuvent rester sans exemple : mieux vaut rien qu'une œuvre au hasard.
    const args = [...a.plan.args1, ...a.plan.args2];
    if (ex.some((l, i) => !l.length && !String(args[i] ?? "").startsWith("« "))) { vides++; problemes.push(`${nom} : un argument sans exemple`); }
  };
  for (const s of sujets) {
    const a = analyserSujet(`« ${s.citation} » Expliquez et discutez.`, 6);
    const attendue = NOMS[s.orientation.split("/")[0].trim()];
    if (a.fonctions[0] === attendue || (a.rejet && a.fonctions.includes(attendue))) premiere++;
    else problemes.push(`Sujet ${s.num} : ${a.fonctions.join("/") || "aucune"} au lieu de ${attendue}`);
    if (a.fonctions.includes(attendue)) dansListe++;
    if (a.corrige?.num === s.num) reconnus++; else problemes.push(`Sujet ${s.num} : pas reconnu comme sujet corrigé`);
    if (a.nature !== "dissertation") problemes.push(`Sujet ${s.num} : pris pour « ${a.nature} »`);
    verifierPlan(`Sujet ${s.num}`, a);
  }

  // Sujets pièges : ce que l'appli doit comprendre de la consigne et de l'énoncé.
  const pieges = [
    ["« La littérature doit être une arme au service du peuple opprimé. » Expliquez.", a => !/^Nuance/.test(a.plan.axe2) && a.travail.startsWith("Expliquer (")],
    ["« La littérature doit être une arme au service du peuple opprimé. » Commentez.", a => /^Nuance/.test(a.plan.axe2)],
    ["« Le roman africain permet de découvrir les traditions du continent. » Expliquez et illustrez.", a => a.plan.ex1.every(l => l.length === 2)],
    ["« Le poète est celui qui fait rêver le lecteur loin des misères du monde. » Partagez-vous ce point de vue ?", a => a.fonctions[0] === "Évasion" && /^Nuance/.test(a.plan.axe2)],
    ["« Le poète chante la beauté du monde. » Expliquez et discutez.", a => [...a.plan.ex1, ...a.plan.ex2].flat().filter(e => parId.get(e.id)?.genre === "Poésie").length >= 2],
    ["Je ne crois pas à l'évasion par les livres. Je crois que la littérature doit réveiller les consciences. Discutez.", a => a.rejet === "Évasion" && !/^Nuance : la littérature peut aussi être un moyen/.test(a.plan.axe1)],
    ["Vous ferez le commentaire composé de ce poème de Senghor.", a => a.nature === "commentaire"],
    ["Résumez ce texte au quart de sa longueur.", a => a.nature === "resume"],
    ["« Le travail des enfants est un fléau pour nos sociétés africaines. » Discutez.", a => a.nature === "generale"],
    ["« La littérature doit être une arme au service du peuple opprimé. » Expliquez et discutez.", a => !!a.plan.problematique && a.plan.problematique.endsWith("?") && !a.corrige],
    ["« L'écrivain doit être la voix de ceux qui souffrent en silence. » Discutez.", a => !a.corrige],
    ["« La poésie est avant tout un jeu avec les mots. » Discutez.", a => !a.corrige],
    // Un sujet qui énumère : chaque élément devient un argument.
    ["« Les livres sont les amis les plus tranquilles et les plus constants ; ils sont les conseillers les plus accessibles et les plus sages, et les professeurs les plus patients. » Expliquez.", a => a.plan.args1.length === 3 && a.plan.args1[2].includes("professeurs")],
    // Un sujet corrigé tapé avec des fautes reste reconnu.
    ["faire de la literature cest sarmer pour se faire lecho de ceux qui nont pas de voix expliquer et discuter", a => a.corrige?.num === "01"]
  ];
  let piegesOk = 0;
  for (const [t, ok] of pieges) {
    const a = analyserSujet(t, 6);
    if (ok(a)) piegesOk++; else problemes.push(`Piège raté : ${t}`);
    if (a.nature === "dissertation") verifierPlan(`Piège « ${t.slice(0, 40)}… »`, a);
  }

  // Vrais sujets (BAC, devoirs, Facebook, envoyés par Atikan) : la fonction principale doit être trouvée en premier.
  const reels = JSON.parse(readFileSync(new URL("./sujets-reels.json", import.meta.url), "utf8"));
  let reelsJustes = 0;
  for (const [i, x] of reels.entries()) {
    const a = analyserSujet(x.texte, 6);
    if (a.fonctions[0] === x.fonctions[0] || (a.rejet && a.fonctions.includes(x.fonctions[0]))) reelsJustes++;
    if (a.nature !== "dissertation") problemes.push(`Vrai sujet ${i + 1} : pris pour « ${a.nature} »`);
    else verifierPlan(`Vrai sujet ${i + 1}`, a);
  }

  const n = sujets.length;
  console.log(`J'ai un devoir — fonction juste ${premiere}/${n}, dans la liste ${dansListe}/${n}, corrigés reconnus ${reconnus}/${n}, exemples sûrs ${exemplesSurs}/${exemplesTotal}, pièges ${piegesOk}/${pieges.length}, vrais sujets ${reelsJustes}/${reels.length}`);
  for (const p of problemes) console.log("  · " + p);
  // Seuils : ce que l'appli fait déjà. On ne publie pas en dessous.
  const seuils = [[premiere >= 27, "fonction juste ≥ 27"], [dansListe >= 30, "fonction dans la liste ≥ 30"], [reconnus === n, "tous les corrigés reconnus"],
    [exemplesSurs === exemplesTotal, "aucune fiche incomplète en exemple"], [doublons === 0, "pas d'œuvre en double"], [vides === 0, "un exemple par argument"], [piegesOk === pieges.length, "tous les pièges"],
    [reelsJustes >= Math.floor(reels.length * 0.9), "vrais sujets justes ≥ 90 %"]];
  for (const [ok, nom] of seuils) if (!ok) { echec = true; console.error(`Seuil non atteint : ${nom}`); }
} finally {
  await vite.close();
}
process.exit(echec ? 1 : 0);
