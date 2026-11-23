// COMPOSA (devoirs en ligne du professeur) ouvert dans Litterae, espace « Devoirs ».
// COMPOSA reste un site à part (sa base, l'espace professeur) : Litterae l'affiche dans un cadre
// et retient les devoirs en cours qu'il lui envoie, pour la case de l'accueil.
import { useEffect } from "preact/hooks";
import { read, useStored, write } from "./storage";
import { licence, titulaire } from "./licence";
import { contenuLibre } from "./libre";

/** Adresse de COMPOSA, sans barre finale. */
export const COMPOSA_URL: string = import.meta.env.VITE_COMPOSA_URL
  ?? "https://composa-eyb.pages.dev";
const ORIGINE = new URL(COMPOSA_URL).origin;

export interface DevoirComposa {
  id: string;
  titre: string;
  matiere: string;
  etat: "en_cours" | "a_venir" | "a_terminer";
  ouverture_at: string;
  fermeture_at: string;
}
interface Memo { devoirs: DevoirComposa[]; maj: number }
const CLE = "composa-devoirs";

const texte = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
const date = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : "";

/** Ne garde que des devoirs bien formés (le message vient d'un autre site). */
export function lireDevoirs(donnees: unknown): DevoirComposa[] | null {
  if (!donnees || typeof donnees !== "object" || (donnees as { type?: unknown }).type !== "composa:devoirs") return null;
  const liste = (donnees as { devoirs?: unknown }).devoirs;
  if (!Array.isArray(liste)) return null;
  return liste.slice(0, 10).flatMap((d): DevoirComposa[] => {
    if (!d || typeof d !== "object") return [];
    const o = d as Record<string, unknown>;
    const etat = o.etat === "en_cours" || o.etat === "a_venir" || o.etat === "a_terminer" ? o.etat : null;
    const id = texte(o.id, 40);
    if (!etat || !/^[0-9a-f-]{36}$/.test(id) || !date(o.ouverture_at) || !date(o.fermeture_at)) return [];
    return [{ id, titre: texte(o.titre, 120) || "Devoir", matiere: texte(o.matiere, 60), etat, ouverture_at: date(o.ouverture_at), fermeture_at: date(o.fermeture_at) }];
  });
}

// ---------------------------------------------------------------------------
// Notes publiées par le professeur
// ---------------------------------------------------------------------------
export interface NoteComposa { id: string; titre: string; note: number; sur: number; publiee_at: string }
const CLE_NOTES = "composa-notes";
const CLE_VUES = "composa-notes-vues";
/** Une note reste sur l'accueil 7 jours, ou jusqu'à ce que l'élève l'ouvre. */
const DUREE_NOTE = 7 * 864e5;

export function lireNotes(donnees: unknown): NoteComposa[] | null {
  const liste = donnees && typeof donnees === "object" ? (donnees as { notes?: unknown }).notes : undefined;
  if (!Array.isArray(liste)) return null;
  return liste.slice(0, 3).flatMap((d): NoteComposa[] => {
    const o = (d ?? {}) as Record<string, unknown>;
    const id = texte(o.id, 40);
    const note = Number(o.note), sur = Number(o.sur);
    if (!/^[0-9a-f-]{36}$/.test(id) || !Number.isFinite(note) || !Number.isFinite(sur) || sur < 0 || !date(o.publiee_at)) return [];
    return [{ id, titre: texte(o.titre, 120) || "Devoir", note, sur, publiee_at: date(o.publiee_at) }];
  });
}

/** Dernière note pas encore ouverte, publiée il y a moins de 7 jours. */
export function useNoteAVoir(): NoteComposa | null {
  const [notes] = useStored<NoteComposa[]>(CLE_NOTES, []);
  const [vues] = useStored<string[]>(CLE_VUES, []);
  return notes.find(n => !vues.includes(n.id) && Date.now() - Date.parse(n.publiee_at) < DUREE_NOTE) ?? null;
}
export const marquerNoteVue = (id: string) => write(CLE_VUES, [id, ...read<string[]>(CLE_VUES, []).filter(x => x !== id)].slice(0, 30));

/** « 14,5/20 » */
export const noteLisible = (n: NoteComposa) =>
  `${n.note.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}/${n.sur.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// Sonde : de temps en temps, l'accueil demande à COMPOSA (dans un cadre invisible) les devoirs et les notes.
// Seulement pour l'élève qui a déjà ouvert l'espace Devoirs sur ce téléphone.
// ---------------------------------------------------------------------------
const CLE_SONDE = "composa-sonde";
const SONDE_TOUS_LES = 15 * 60e3;
export const adresseSonde = () => `${COMPOSA_URL}/litterae/sonde?dans=litterae`;
export function sondeAFaire() {
  return aDejaOuvertComposa() && Date.now() - read<number>(CLE_SONDE, 0) > SONDE_TOUS_LES;
}
export const noterSonde = () => write(CLE_SONDE, Date.now());

/** Écoute les nouvelles de COMPOSA (seulement de son adresse). */
export function useEcouteComposa() {
  useEffect(() => {
    const recevoir = (e: MessageEvent) => {
      if (e.origin !== ORIGINE) return;
      const devoirs = lireDevoirs(e.data);
      if (devoirs) write<Memo>(CLE, { devoirs, maj: Date.now() });
      const notes = lireNotes(e.data);
      if (notes) write(CLE_NOTES, notes);
      noterFaits([...(devoirs ?? []).map(d => d.id), ...(notes ?? []).map(n => n.id), ...lireInscrits(e.data)]);
      if (devoirs) window.dispatchEvent(new Event("composa-recu"));
    };
    window.addEventListener("message", recevoir);
    return () => window.removeEventListener("message", recevoir);
  }, []);
}

/** Devoirs encore ouverts, d'après le dernier passage dans l'espace Devoirs. */
export function devoirsOuverts(memo: Memo | null, maintenant = Date.now()): DevoirComposa[] {
  return (memo?.devoirs ?? []).filter(d => Date.parse(d.fermeture_at) > maintenant)
    .map(d => d.etat === "a_venir" && Date.parse(d.ouverture_at) <= maintenant ? { ...d, etat: "en_cours" as const } : d);
}

export const useDevoirsComposa = () => devoirsOuverts(useStored<Memo | null>(CLE, null)[0]);
export const aDejaOuvertComposa = () => read<Memo | null>(CLE, null) !== null;

/** Adresse à ouvrir dans le cadre : rejoindre avec un code, un devoir précis, sinon la liste des devoirs. */
export function adresseComposa(salle?: string | null, code?: string | null, vue?: string | null) {
  const chemin = code && CODE.test(code) ? `/eleve/rejoindre/${code}`
    : salle && /^[0-9a-f-]{36}$/.test(salle) ? `/eleve/salles/${salle}${vue === "resultat" ? "/resultat" : ""}` : "/eleve";
  const q = new URLSearchParams({ dans: "litterae" });
  const prenom = titulaire()?.prenom;
  if (prenom) q.set("prenom", prenom);
  return `${COMPOSA_URL}${chemin}?${q}`;
}

// ---------------------------------------------------------------------------
// Devoirs dont le professeur affiche le code sur l'accueil (lecture publique de COMPOSA).
// ---------------------------------------------------------------------------
/** Base de COMPOSA : adresse et clé publique (déjà visibles dans COMPOSA, elles ne donnent que ce que la base permet). */
const BASE_URL = "https://msipoithftgdijfliyjk.supabase.co";
const CLE_PUBLIQUE = "sb_publishable_WtBNqqmNPwU--y7E9zC9BA_YgV76tAj";
const CODE = /^[A-HJKMNP-Z2-9]{6}$/;

export interface DevoirAffiche { id: string; titre: string; code: string; ouverture_at: string; fermeture_at: string }
interface MemoPublic { devoirs: DevoirAffiche[]; maj: number }
const CLE_PUBLIC = "composa-codes";
const RAFRAICHIR = 5 * 60e3;

function lireAffiches(donnees: unknown): DevoirAffiche[] {
  if (!Array.isArray(donnees)) return [];
  return donnees.slice(0, 5).flatMap((d): DevoirAffiche[] => {
    const o = (d ?? {}) as Record<string, unknown>;
    const id = texte(o.id, 40), code = texte(o.code, 6);
    if (!/^[0-9a-f-]{36}$/.test(id) || !CODE.test(code) || !date(o.ouverture_at) || !date(o.fermeture_at)) return [];
    return [{ id, titre: texte(o.titre, 120) || "Devoir", code, ouverture_at: date(o.ouverture_at), fermeture_at: date(o.fermeture_at) }];
  });
}

let enCours = false;
/** Va chercher les codes affichés (au plus toutes les 5 minutes ; hors connexion, garde les derniers). */
export async function actualiserCodes(force = false) {
  const memo = read<MemoPublic | null>(CLE_PUBLIC, null);
  if (enCours || (!force && memo && Date.now() - memo.maj < RAFRAICHIR)) return;
  enCours = true;
  try {
    const r = await fetch(`${BASE_URL}/rest/v1/rpc/devoirs_litterae`, {
      method: "POST", headers: { apikey: CLE_PUBLIQUE, "Content-Type": "application/json" }, body: "{}",
    });
    // Base pas encore prête (migration non appliquée) : rien à afficher.
    write<MemoPublic>(CLE_PUBLIC, { devoirs: r.ok ? lireAffiches(await r.json()) : [], maj: Date.now() });
  } catch { /* hors connexion */ } finally { enCours = false; }
}

/** Codes à afficher sur l'accueil, encore valables. */
export function useCodesAffiches(): DevoirAffiche[] {
  const [memo] = useStored<MemoPublic | null>(CLE_PUBLIC, null);
  useEffect(() => { actualiserCodes(); }, []);
  return (memo?.devoirs ?? []).filter(d => Date.parse(d.fermeture_at) > Date.now());
}

/** « K7M-4QX » : le code tel que le professeur l'écrit. */
export const codeLisible = (c: string) => `${c.slice(0, 3)}-${c.slice(3)}`;

const heure = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
function jour(d: Date, maintenant: Date) {
  const j = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((j(d) - j(maintenant)) / 864e5);
  if (ecart === 0) return "aujourd'hui";
  if (ecart === 1) return "demain";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/** « fin à 18 h 00 » (aujourd'hui), « début demain à 08 h 00 ». */
export function quand(d: Pick<DevoirComposa, "ouverture_at" | "fermeture_at">, maintenant = new Date()) {
  const debut = Date.parse(d.ouverture_at) > maintenant.getTime();
  const t = new Date(debut ? d.ouverture_at : d.fermeture_at);
  const j = jour(t, maintenant);
  return `${debut ? "début" : "fin"} ${j === "aujourd'hui" ? "" : j + " "}à ${heure(t)}`;
}

// ---------------------------------------------------------------------------
// Devoirs gratuits : sans clé, l'élève fait un nombre limité de devoirs dans Litterae (compté sur ce téléphone).
// ---------------------------------------------------------------------------
const CLE_FAITS = "composa-faits";
const UUID = /^[0-9a-f-]{36}$/;
/** Nombre de devoirs gratuits sans clé : réglé dans le tableau de bord, 5 par défaut. */
export const devoirsGratuits = () => {
  const n = Number(contenuLibre()?.devoirsGratuits);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : 5;
};
function lireInscrits(donnees: unknown): string[] {
  const l = donnees && typeof donnees === "object" ? (donnees as { inscrits?: unknown }).inscrits : undefined;
  return Array.isArray(l) ? l.slice(0, 100).filter((x): x is string => typeof x === "string" && UUID.test(x)) : [];
}
function noterFaits(ids: string[]) {
  const avant = read<string[]>(CLE_FAITS, []);
  const nouveaux = ids.filter(id => !avant.includes(id));
  if (nouveaux.length) write(CLE_FAITS, [...avant, ...nouveaux].slice(-200));
}
/** Où en est l'élève : devoirs déjà faits, limite, et s'il peut encore en commencer un nouveau. */
export function useLimiteDevoirs() {
  const [faits] = useStored<string[]>(CLE_FAITS, []);
  const premium = !!licence();
  const limite = devoirsGratuits();
  return {
    premium, limite, faits,
    restants: premium ? Infinity : Math.max(0, limite - faits.length),
    /** Ce devoir peut-il être ouvert ? (déjà fait, ou il reste des devoirs gratuits) */
    peutOuvrir: (id?: string | null) => premium || (!!id && faits.includes(id)) || faits.length < limite,
  };
}
