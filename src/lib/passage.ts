/**
 * Passage de l'ancienne adresse (kouakoukouabenan-blip.github.io/litterae/) vers la nouvelle (litterae.app).
 *
 * Pour le téléphone, la nouvelle adresse est un autre site : il n'y voit ni la clé, ni la progression.
 * L'ancienne adresse emporte donc tout dans le lien (après le #, jamais envoyé à un serveur) :
 * la clé, l'identifiant de l'appareil (le serveur reconnaît le même téléphone, aucune place n'est prise)
 * et tout ce que l'élève a fait. Sur iPhone, l'appli installée est isolée de Safari : le même contenu
 * sert de « code de passage » à copier puis coller dans la nouvelle appli.
 *
 * Ce module est chargé avant tous les autres (main.tsx) : il range les données reçues
 * avant que l'appli ne lise quoi que ce soit.
 */
import { read, write } from "./storage";
import { PASSAGE_VERS } from "./site";

const PREFIX = "litterae.";
const RECU = "passage-recu";
/** Clé reçue, à valider auprès du serveur (avec l'identifiant d'appareil reçu). */
export const CLE_RECUE = "passage-cle";

/**
 * Valeurs qui ne voyagent pas : contenu rechargé depuis le serveur, état propre à l'icône installée
 * ou aux notifications (abonnement lié à l'ancienne adresse), marqueurs d'un seul affichage.
 */
const RESTENT = new Set([
  "licence", "appareil", "contenu-libre", "annonces", "installee", "installation-plus-tard",
  "notif-abonne", "notif-acces", "rappels-actifs", "rappel-cible", "bienvenue-acces", RECU, CLE_RECUE
]);

interface Paquet {
  v: 1;
  /** Identifiant de l'appareil. */
  a: string;
  /** Clé d'accès complet (sans le contenu payant, rechargé depuis le serveur). */
  c: string | null;
  /** Le reste, tel qu'enregistré (texte JSON). */
  d: Record<string, string>;
}

function enBase64(texte: string) {
  const octets = new TextEncoder().encode(texte);
  let b = "";
  // Par morceaux : un seul appel avec des centaines de milliers d'octets dépasserait la pile.
  for (let i = 0; i < octets.length; i += 8192) b += String.fromCharCode.apply(null, Array.from(octets.subarray(i, i + 8192)));
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function depuisBase64(code: string) {
  const b = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0)));
}

/** Tout ce que l'élève a sur cet appareil, prêt à voyager (ancienne adresse). */
export function codePassage(): string {
  const d: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const nom = k.slice(PREFIX.length);
      const v = localStorage.getItem(k);
      if (!RESTENT.has(nom) && v !== null) d[nom] = v;
    }
  } catch { /* stockage bloqué : seule la clé voyage */ }
  const licence = read<{ cle?: string } | null>("licence", null);
  const paquet: Paquet = { v: 1, a: read<string>("appareil", ""), c: licence?.cle ?? null, d };
  return enBase64(JSON.stringify(paquet));
}

/** Lien qui ouvre la nouvelle adresse avec tout ce que l'élève a (ancienne adresse). */
export const lienPassage = () => `${PASSAGE_VERS}#passage=${codePassage()}`;

/** Appli installée sur Android : un lien normal s'ouvrirait dans une fenêtre de l'ancienne appli, pas dans Chrome. */
export const androidInstallee = () =>
  /Android/i.test(navigator.userAgent) && typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches;

/**
 * Lien qui demande à Chrome lui-même d'ouvrir la nouvelle adresse (là où l'élève peut installer la nouvelle icône).
 * Les données passent dans « ?passage= » (le # sert au lien Android). Sans Chrome, ou si elles sont trop longues,
 * on revient au lien normal.
 */
export function lienPassageChrome(vers = PASSAGE_VERS) {
  const code = codePassage();
  const repli = `${vers}#passage=${code}`;
  if (code.length > 12000) return repli;
  const u = new URL(vers);
  return `intent://${u.host}${u.pathname}?passage=${code}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(repli)};end`;
}

/**
 * Range sur cet appareil ce que l'ancienne adresse a envoyé.
 * Rien n'est écrasé : ce que l'élève a déjà fait ici, et une clé déjà active ici, sont gardés.
 * Renvoie false si le code est illisible.
 */
export function recevoir(code: string): boolean {
  let p: Paquet;
  try {
    p = JSON.parse(depuisBase64(code.trim().replace(/^.*#passage=/, "")));
    if (p?.v !== 1 || typeof p.d !== "object") return false;
  } catch {
    return false;
  }
  for (const [nom, valeur] of Object.entries(p.d)) {
    if (RESTENT.has(nom) || typeof valeur !== "string") continue;
    try {
      if (localStorage.getItem(PREFIX + nom) === null) localStorage.setItem(PREFIX + nom, valeur);
    } catch { /* stockage plein : on garde ce qui est passé */ }
  }
  // Même identifiant d'appareil : le serveur reconnaît le téléphone, aucune place de la clé n'est prise.
  if (p.c && !read("licence", null)) {
    if (p.a) write("appareil", p.a);
    write(CLE_RECUE, p.c);
  }
  write(RECU, Date.now());
  return true;
}

// Arrivée par le lien de passage : les données sont rangées avant que l'appli ne démarre.
const depuisChrome = new URLSearchParams(location.search).get("passage");
if (location.hash.startsWith("#passage=") || depuisChrome) {
  const code = depuisChrome ?? location.hash.slice("#passage=".length);
  // Une seule fois : si l'ancienne icône renvoie encore ici, la progression faite depuis n'est pas mélangée.
  if (!read<number>(RECU, 0)) recevoir(code);
  history.replaceState(null, "", location.pathname + "#/accueil");
}

/** Clé reçue de l'ancienne adresse, pas encore validée sur cet appareil. */
export const cleRecue = () => (read("licence", null) ? null : read<string | null>(CLE_RECUE, null));
export const oublierCleRecue = () => write(CLE_RECUE, null);

/** Ancienne adresse (le site principal, pas le site d'essai sauf réglage), avec une nouvelle adresse prévue. */
export function surAncienneAdresse() {
  if (!PASSAGE_VERS) return false;
  try {
    return new URL(PASSAGE_VERS).origin !== location.origin && location.hostname.endsWith("github.io");
  } catch {
    return false;
  }
}

/**
 * La nouvelle adresse répond bien avec Litterae (fichier passage.json, lisible depuis l'ancienne adresse).
 * Tant que ce n'est pas le cas (nom pas encore branché, pas de connexion), l'ancienne adresse marche comme avant.
 */
export async function nouvelleAdressePrete(): Promise<boolean> {
  if (!navigator.onLine) return false;
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const minuteur = setTimeout(() => ctrl?.abort(), 6000);
  try {
    const r = await fetch(`${PASSAGE_VERS}passage.json`, { cache: "no-store", signal: ctrl?.signal });
    const d = await r.json();
    return r.ok && d?.litterae === true;
  } catch {
    return false;
  } finally {
    clearTimeout(minuteur);
  }
}

/** Appli installée sur iPhone : isolée de Safari, il faut le code de passage. */
export const iphoneInstallee = () => (navigator as { standalone?: boolean }).standalone === true;
