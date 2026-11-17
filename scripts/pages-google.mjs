// Pages publiques pour Google, écrites dans dist/ après « vite build ».
//
// L'appli est une seule page (#/…) : Google n'y voit pas les fiches. Ce script fabrique de vraies pages HTML,
// légères et sans JavaScript : une par œuvre (aperçu court + thèmes, JAMAIS le résumé ni les arguments rédigés),
// une par thème, une par fonction littéraire, la liste des œuvres au programme, puis sitemap.xml et robots.txt.
//
// Seules les données déjà publiques servent : src/data/oeuvres.json et, si le serveur répond,
// les fiches ajoutées ou corrigées depuis le tableau de bord (route /contenu-libre, sans texte payant).
//
// Sur Cloudflare Pages (litterae.app, variable CF_PAGES) les pages sont ouvertes à Google.
// Ailleurs (site d'essai, ancienne adresse github.io) elles portent « noindex » pour ne pas faire doublon.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(RACINE, "dist");
const SITE = "https://litterae.app";
const INDEXER = !!process.env.CF_PAGES;
const SERVEUR = process.env.VITE_SERVEUR_URL ?? "https://litterae-serveur.kouakoukouabenan.workers.dev";
const AUJOURDHUI = new Date().toISOString().slice(0, 10);

if (!existsSync(join(DIST, "index.html"))) {
  console.error("pages-google : dist/index.html introuvable, lance d'abord vite build.");
  process.exit(1);
}

// ---------- Données ----------

/** Champs qu'une page publique a le droit de montrer. Rien d'autre ne sort de ce script. */
const CHAMPS = ["id", "titre", "auteur", "pays", "paysTexte", "genre", "precision", "annee", "themes", "fonctions", "niveaux", "editeur"];
const garder = o => Object.fromEntries(CHAMPS.filter(k => o[k] != null).map(k => [k, o[k]]));

let oeuvres = JSON.parse(readFileSync(join(RACINE, "src/data/oeuvres.json"), "utf8")).map(garder);

async function nouveautesDuTableauDeBord() {
  try {
    const r = await fetch(SERVEUR + "/contenu-libre", { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const c = await r.json();
    const parId = new Map(oeuvres.map(o => [o.id, o]));
    for (const [id, corr] of Object.entries(c.corrections ?? {})) {
      const o = parId.get(id);
      if (o) Object.assign(o, garder({ ...corr, id }));
    }
    let ajoutees = 0;
    for (const a of c.ajouts?.oeuvres ?? []) {
      if (!a?.id || !a.titre || parId.has(a.id)) continue;
      const o = garder(a);
      oeuvres.push(o);
      parId.set(o.id, o);
      ajoutees++;
    }
    console.log(`pages-google : ${ajoutees} fiche(s) ajoutée(s) depuis le tableau de bord.`);
  } catch (e) {
    console.log("pages-google : serveur injoignable (" + e.message + "), seules les fiches du dépôt sont publiées.");
  }
}
await nouveautesDuTableauDeBord();
oeuvres = oeuvres.filter(o => /^[a-z0-9-]+$/.test(o.id) && o.titre && o.auteur);

// ---------- Petits outils ----------

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sansAccents = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const slug = s => sansAccents(s).toLowerCase().replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const tri = (a, b) => sansAccents(a).localeCompare(sansAccents(b), "fr", { sensitivity: "base" });
const liste = mots => mots.length < 2 ? mots.join("") : mots.slice(0, -1).join(", ") + " et " + mots[mots.length - 1];
const de = nom => /^[aeiouyàâéèêëîïôöûüœ]/i.test(sansAccents(nom).trim()) ? "d’" + nom : "de " + nom;
/** Thèmes en minuscule dans une phrase, sauf les noms propres. */
const NOMS_PROPRES = new Set(["afrique", "europe", "occident", "amerique", "dieu", "france", "paris", "orient", "antiquite"]);
const minus = t => NOMS_PROPRES.has(slug(t).split("-")[0]) ? t : t.charAt(0).toLowerCase() + t.slice(1);

const FONCTIONS = {
  Engagement: { slug: "engagement", nom: "la fonction d’engagement", texte: "Dénoncer, éveiller les consciences, défendre une cause.", couleur: "#C4562B" },
  Esthétique: { slug: "esthetique", nom: "la fonction esthétique", texte: "Travailler la beauté de la forme, l’art pour l’art.", couleur: "#2E5E8C" },
  Évasion: { slug: "evasion", nom: "la fonction d’évasion", texte: "Faire rêver, divertir, transporter ailleurs.", couleur: "#B07A14" },
  Lyrique: { slug: "lyrique", nom: "la fonction lyrique", texte: "Exprimer les sentiments, le moi, l’intime.", couleur: "#8E3B5F" },
  Sociale: { slug: "sociale", nom: "la fonction sociale", texte: "Peindre la société, transmettre, éduquer.", couleur: "#0F3D2E" }
};
const NIVEAUX = ["Terminale", "Première", "Seconde", "3e", "4e", "5e", "6e"];

/** « un roman (dystopie) », « une pièce de théâtre »… ; null : formulation neutre (contes, nouvelles : souvent des recueils). */
function nature(o) {
  const p = o.precision ? ` (${o.precision.charAt(0).toLowerCase() + o.precision.slice(1)})` : "";
  switch (o.genre) {
    case "Roman": return "un roman" + p;
    case "Théâtre": return "une pièce de théâtre" + p;
    case "Poésie": return "une œuvre poétique" + p;
    case "Essai": return "un essai" + p;
    default: return null;
  }
}

function presentation(o) {
  const ital = `<i>${esc(o.titre)}</i>`;
  const ou = o.paysTexte ? ` (${esc(o.paysTexte)})` : "";
  const quand = o.annee ? `, paru en ${o.annee}` : "";
  const n = nature(o);
  const phrases = [n
    ? `${ital} est ${esc(n)} ${esc(de(o.auteur))}${ou}${quand}.`
    : `${ital} est une œuvre ${esc(de(o.auteur))}${ou}${quand}, classée parmi les ${o.genre === "Conte" ? "contes" : "nouvelles"}.`];
  if (o.themes?.length) phrases.push(`Elle aborde ${o.themes.length > 1 ? "les thèmes" : "le thème"} suivant${o.themes.length > 1 ? "s" : ""} : ${esc(liste(o.themes.map(minus)))}.`);
  const fns = (o.fonctions ?? []).filter(f => FONCTIONS[f]);
  if (fns.length) phrases.push(`En dissertation, elle permet surtout d’illustrer ${esc(liste(fns.map(f => FONCTIONS[f].nom)))} de la littérature.`);
  if (o.niveaux?.length) phrases.push(`Elle est au programme en Côte d’Ivoire (${esc(liste(o.niveaux))}).`);
  return phrases.join(" ");
}

// ---------- Gabarit commun ----------

const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#FFF3DC"/><path fill="#0F3D2E" d="M18 14h14v3h-4v28h9.5l3-8H44l-1.5 13H18v-3h4V17h-4z"/><circle cx="50" cy="47.5" r="3.5" fill="#C4562B"/></svg>`;

/** chemin : adresse de la page sans « / » au début (« oeuvres/1984/ »). */
/** Espace insécable avant « : ; ? ! » (typographie française : pas de « : » seul en début de ligne). */
const insecable = html => html.replace(/ ([:;?!»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");

function page({ chemin, titre, description, h1, chapeau = "", corps, jsonld = [] }) {
  [h1, chapeau, corps] = [h1, chapeau, corps].map(insecable);
  const prof = chemin.split("/").filter(Boolean).length;
  const r = "../".repeat(prof) || "./";
  const url = SITE + "/" + chemin;
  const fil = [{ "@type": "ListItem", position: 1, name: "Litterae", item: SITE + "/" }];
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
${INDEXER ? "" : '<meta name="robots" content="noindex">\n'}<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0F3D2E">
<link rel="icon" href="${r}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${r}pages/site.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Litterae">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/apercu-partage.png">
<meta name="twitter:card" content="summary_large_image">
${[...jsonld, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: fil.concat(prof > 1 ? [{ "@type": "ListItem", position: 2, name: h1.replace(/<[^>]+>/g, ""), item: url }] : []) }]
    .map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>
<header class="barre">
  <a class="marque" href="${r}">${LOGO}<span>Litter<b>ae</b></span></a>
  <a class="ouvrir" href="${r}">Ouvrir l’appli</a>
</header>
<div class="frise"></div>
<nav class="menu"><a href="${r}oeuvres/">Œuvres</a><a href="${r}themes/">Thèmes</a><a href="${r}programme/">Au programme</a></nav>
<main>
<h1>${h1}</h1>
${chapeau}
${corps}
</main>
<footer>
  <p><b>Litterae</b>, la dissertation littéraire facile : le cours pas à pas, des sujets corrigés et plus de ${Math.floor(oeuvres.length / 10) * 10} fiches d’œuvres.</p>
  <a class="bouton" href="${r}">Ouvrir Litterae</a>
  <p class="petit"><a href="${r}oeuvres/">Toutes les œuvres</a> · <a href="${r}themes/">Tous les thèmes</a> · <a href="${r}programme/">Œuvres au programme</a></p>
</footer>
</body>
</html>
`;
}

const ecrire = (chemin, html) => {
  const f = join(DIST, chemin, "index.html");
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, html);
};

const pastilleFn = (f, r) => FONCTIONS[f] ? `<a class="fn" style="--c:${FONCTIONS[f].couleur}" href="${r}fonctions/${FONCTIONS[f].slug}/">${esc(f)}</a>` : "";

/** Une ligne de liste d'œuvres (page thème, fonction, programme, toutes les œuvres). */
const ligne = (o, r, extra = "") => `<li><a href="${r}oeuvres/${o.id}/"><i>${esc(o.titre)}</i></a><span class="meta">${esc(o.auteur)} · ${esc(o.genre)}${o.paysTexte ? " · " + esc(o.paysTexte) : ""}${extra}</span></li>`;

// ---------- Thèmes ----------

const themes = new Map(); // slug → { noms: Map(nom → nb), oeuvres: [] }
for (const o of oeuvres) for (const t of new Set(o.themes ?? [])) {
  const s = slug(t);
  if (!s) continue;
  if (!themes.has(s)) themes.set(s, { noms: new Map(), oeuvres: [] });
  const th = themes.get(s);
  th.noms.set(t, (th.noms.get(t) ?? 0) + 1);
  th.oeuvres.push(o);
}
const MIN_THEME = 3;
const themesPublies = [...themes.entries()]
  .filter(([, th]) => th.oeuvres.length >= MIN_THEME)
  .map(([s, th]) => ({ slug: s, nom: [...th.noms.entries()].sort((a, b) => b[1] - a[1])[0][0], oeuvres: th.oeuvres.sort((a, b) => tri(a.titre, b.titre)) }));
const themeParSlug = new Map(themesPublies.map(t => [t.slug, t]));

// ---------- Pages des œuvres ----------

const cleThemes = o => new Set((o.themes ?? []).map(slug));
function proches(o) {
  const mes = cleThemes(o);
  return oeuvres
    .filter(x => x.id !== o.id)
    .map(x => {
      let score = 0;
      for (const t of cleThemes(x)) if (mes.has(t)) score += 2;
      for (const f of x.fonctions ?? []) if (o.fonctions?.includes(f)) score += 1;
      if (x.genre === o.genre) score += 0.5;
      return { x, score };
    })
    .filter(s => s.score >= 2)
    .sort((a, b) => b.score - a.score || tri(a.x.titre, b.x.titre))
    .slice(0, 6)
    .map(s => s.x);
}

for (const o of oeuvres) {
  const r = "../../";
  const themesHtml = (o.themes ?? []).map(t => themeParSlug.has(slug(t))
    ? `<a class="theme" href="${r}themes/${slug(t)}/">${esc(t)}</a>`
    : `<span class="theme">${esc(t)}</span>`).join("");
  const infos = [
    ["Auteur", esc(o.auteur)],
    ["Genre", esc(o.genre + (o.precision ? " (" + o.precision + ")" : ""))],
    o.paysTexte && ["Pays", esc(o.paysTexte)],
    o.annee && ["Parution", esc(o.annee)],
    o.niveaux?.length && ["Au programme", `<a href="${r}programme/">${esc(liste(o.niveaux))}</a>${o.editeur ? " · " + esc(o.editeur) : ""}`]
  ].filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  const voisins = proches(o);
  const t3 = (o.themes ?? []).slice(0, 3).map(minus);
  const corps = `
<p class="presentation">${presentation(o)}</p>
<dl class="infos">${infos}</dl>
${themesHtml ? `<h2>Thèmes</h2><p class="pastilles">${themesHtml}</p>` : ""}
${o.fonctions?.length ? `<h2>Fonctions de la littérature</h2><p class="pastilles">${o.fonctions.map(f => pastilleFn(f, r)).join("")}</p>` : ""}
<section class="fiche">
  <h2>La fiche complète dans Litterae</h2>
  <ul><li>le résumé de l’œuvre ;</li><li>les arguments qu’elle permet d’illustrer dans une dissertation ;</li><li>une phrase d’exemple prête pour ta copie.</li></ul>
  <a class="bouton" href="${r}#/oeuvres/${o.id}">Lire la fiche complète</a>
  <p class="petit">Tu peux ouvrir 10 fiches gratuitement, au choix.</p>
</section>
${voisins.length ? `<h2>Œuvres proches</h2><ul class="liste">${voisins.map(x => ligne(x, r)).join("")}</ul>` : ""}`;
  ecrire(`oeuvres/${o.id}`, page({
    chemin: `oeuvres/${o.id}/`,
    titre: `${o.titre} (${o.auteur}) : résumé, thèmes et dissertation | Litterae`,
    description: `${o.titre}, ${nature(o) ?? (o.genre === "Conte" ? "contes" : "nouvelles")} ${de(o.auteur)}${o.paysTexte ? " (" + o.paysTexte + ")" : ""}`
      + (t3.length ? ` : ${liste(t3)}.` : ".") + " Fiche pour la dissertation littéraire : résumé, arguments et exemple dans Litterae.",
    h1: `<i>${esc(o.titre)}</i><small>${esc(o.auteur)}</small>`,
    corps,
    jsonld: [{
      "@context": "https://schema.org", "@type": "Book", name: o.titre,
      author: { "@type": "Person", name: o.auteur }, genre: o.genre,
      ...(o.annee ? { datePublished: String(o.annee) } : {}),
      ...(o.themes?.length ? { keywords: o.themes.join(", ") } : {}),
      url: `${SITE}/oeuvres/${o.id}/`
    }]
  }));
}

// ---------- Pages des thèmes ----------

for (const t of themesPublies) {
  const r = "../../";
  const parGenre = Object.groupBy ? Object.groupBy(t.oeuvres, o => o.genre) : t.oeuvres.reduce((m, o) => ((m[o.genre] ??= []).push(o), m), {});
  const genres = Object.keys(parGenre).sort((a, b) => parGenre[b].length - parGenre[a].length);
  ecrire(`themes/${t.slug}`, page({
    chemin: `themes/${t.slug}/`,
    titre: `Œuvres sur le thème « ${t.nom} » pour la dissertation | Litterae`,
    description: `${t.oeuvres.length} œuvres qui parlent ${minus(t.nom) === t.nom ? "de " + t.nom : "de « " + minus(t.nom) + " »"} : ${liste(t.oeuvres.slice(0, 4).map(o => o.titre))}… Des exemples pour illustrer ta dissertation littéraire.`,
    h1: `Thème : ${esc(t.nom)}`,
    chapeau: `<p class="chapeau">${t.oeuvres.length} œuvres pour illustrer une dissertation sur ce thème.</p>`,
    corps: genres.map(g => `<h2>${esc(g)}</h2><ul class="liste">${parGenre[g].map(o => ligne(o, r)).join("")}</ul>`).join("")
  }));
}
const themesTries = [...themesPublies].sort((a, b) => b.oeuvres.length - a.oeuvres.length || tri(a.nom, b.nom));
ecrire("themes", page({
  chemin: "themes/",
  titre: "Thèmes des œuvres pour la dissertation littéraire | Litterae",
  description: `${themesPublies.length} thèmes (colonisation, amour, liberté, pouvoir, condition féminine…) et les œuvres qui permettent de les illustrer dans une dissertation.`,
  h1: "Tous les thèmes",
  chapeau: `<p class="chapeau">Choisis un thème pour voir les œuvres qui en parlent.</p>`,
  corps: `<p class="pastilles grandes">${themesTries.map(t => `<a class="theme" href="./${t.slug}/">${esc(t.nom)} <span>${t.oeuvres.length}</span></a>`).join("")}</p>`
}));

// ---------- Pages des fonctions ----------

for (const [f, info] of Object.entries(FONCTIONS)) {
  const r = "../../";
  const liste_ = oeuvres.filter(o => o.fonctions?.includes(f)).sort((a, b) => tri(a.titre, b.titre));
  if (!liste_.length) continue;
  const parGenre = liste_.reduce((m, o) => ((m[o.genre] ??= []).push(o), m), {});
  const genres = Object.keys(parGenre).sort((a, b) => parGenre[b].length - parGenre[a].length);
  const nomCourt = info.nom.replace(/^la /, "");
  ecrire(`fonctions/${info.slug}`, page({
    chemin: `fonctions/${info.slug}/`,
    titre: `Œuvres pour illustrer ${info.nom} de la littérature | Litterae`,
    description: `${info.texte} ${liste_.length} romans, pièces et poèmes pour illustrer ${info.nom} dans une dissertation littéraire.`,
    h1: `${nomCourt.charAt(0).toUpperCase() + nomCourt.slice(1)}`,
    chapeau: `<p class="chapeau">${esc(info.texte)} Voici ${liste_.length} œuvres pour l’illustrer dans ta dissertation.</p>`,
    corps: `<p class="pastilles">${Object.keys(FONCTIONS).filter(x => x !== f).map(x => pastilleFn(x, r)).join("")}</p>`
      + genres.map(g => `<h2>${esc(g)}</h2><ul class="liste">${parGenre[g].map(o => ligne(o, r)).join("")}</ul>`).join("")
  }));
}

// ---------- Œuvres au programme ----------

{
  const r = "../";
  const blocs = NIVEAUX.map(n => [n, oeuvres.filter(o => o.niveaux?.includes(n)).sort((a, b) => tri(a.titre, b.titre))]).filter(([, l]) => l.length);
  const total = new Set(blocs.flatMap(([, l]) => l.map(o => o.id))).size;
  ecrire("programme", page({
    chemin: "programme/",
    titre: "Œuvres au programme en Côte d’Ivoire, de la 6e à la Terminale | Litterae",
    description: `Les ${total} œuvres au programme officiel en Côte d’Ivoire, classe par classe (Terminale, Première, Seconde, collège), avec une fiche pour chacune.`,
    h1: "Œuvres au programme en Côte d’Ivoire",
    chapeau: `<p class="chapeau">${total} œuvres au programme officiel, classe par classe.</p>`,
    corps: blocs.map(([n, l]) => `<h2>${esc(n)}</h2><ul class="liste">${l.map(o => ligne(o, r, o.editeur ? " · " + esc(o.editeur) : "")).join("")}</ul>`).join("")
  }));
}

// ---------- Toutes les œuvres ----------

{
  const r = "../";
  const triees = [...oeuvres].sort((a, b) => tri(a.titre, b.titre));
  const lettres = new Map();
  for (const o of triees) {
    const l = (sansAccents(o.titre).match(/[A-Za-z0-9]/)?.[0] ?? "#").toUpperCase();
    if (!lettres.has(l)) lettres.set(l, []);
    lettres.get(l).push(o);
  }
  ecrire("oeuvres", page({
    chemin: "oeuvres/",
    titre: `${oeuvres.length} résumés d’œuvres pour la dissertation littéraire | Litterae`,
    description: `Romans, pièces de théâtre et poèmes d’Afrique et d’ailleurs : ${oeuvres.length} fiches d’œuvres classées par titre, avec leurs thèmes, pour illustrer ta dissertation.`,
    h1: "Toutes les œuvres",
    chapeau: `<p class="chapeau">${oeuvres.length} œuvres, de A à Z. Tu peux aussi chercher <a href="../themes/">par thème</a> ou par fonction : ${Object.keys(FONCTIONS).map(f => pastilleFn(f, r)).join(" ")}</p>`
      + `<p class="lettres">${[...lettres.keys()].map(l => `<a href="#${l}">${l}</a>`).join("")}</p>`,
    corps: [...lettres.entries()].map(([l, liste_]) => `<h2 id="${l}">${l}</h2><ul class="liste">${liste_.map(o => ligne(o, r)).join("")}</ul>`).join("")
  }));
}

// ---------- Style, polices, carte du site ----------

mkdirSync(join(DIST, "pages"), { recursive: true });
const POLICES = [
  ["@fontsource-variable/literata/files/literata-latin-wght-normal.woff2", "literata.woff2"],
  ["@fontsource-variable/literata/files/literata-latin-wght-italic.woff2", "literata-italique.woff2"],
  ["@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2", "dm-sans.woff2"]
];
for (const [src, dest] of POLICES) copyFileSync(join(RACINE, "node_modules", src), join(DIST, "pages", dest));
copyFileSync(join(RACINE, "scripts/pages-google.css"), join(DIST, "pages/site.css"));

const adresses = ["", "oeuvres/", "themes/", "programme/",
  ...Object.values(FONCTIONS).map(f => `fonctions/${f.slug}/`),
  ...themesPublies.map(t => `themes/${t.slug}/`),
  ...oeuvres.map(o => `oeuvres/${o.id}/`)];
writeFileSync(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adresses.map(a => `<url><loc>${SITE}/${a}</loc><lastmod>${AUJOURDHUI}</lastmod></url>`).join("\n")}
</urlset>
`);
writeFileSync(join(DIST, "robots.txt"), INDEXER
  ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
  : "User-agent: *\nDisallow: /\n");

// L'appli elle-même : pas de doublon de litterae.app dans Google depuis le site d'essai ou l'ancienne adresse.
if (!INDEXER) {
  const f = join(DIST, "index.html");
  writeFileSync(f, readFileSync(f, "utf8").replace("<head>", '<head>\n    <meta name="robots" content="noindex" />'));
}

console.log(`pages-google : ${oeuvres.length} œuvres, ${themesPublies.length} thèmes, ${adresses.length} adresses dans sitemap.xml${INDEXER ? "" : " (noindex : pas litterae.app)"}.`);
