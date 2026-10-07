import { useEffect, useState } from "preact/hooks";
import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import { isInstalled, platform } from "./install";

/**
 * Notifications de Litterae (promos, messages, astuces) sur le téléphone.
 * Android et ordinateur : dès que l'élève accepte. iPhone : seulement une fois Litterae installée
 * sur l'écran d'accueil, avec iOS 16.4 ou plus récent.
 */
export type EtatNotif = "abonne" | "possible" | "installer-iphone" | "refuse" | "impossible";

const supporte = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function etatNotif(): EtatNotif {
  if (read<boolean>("notif-abonne", false) && supporte() && Notification.permission === "granted") return "abonne";
  if (platform() === "ios" && !isInstalled()) return "installer-iphone";
  if (!supporte()) return "impossible";
  if (Notification.permission === "denied") return "refuse";
  return "possible";
}

function cleServeur(b64: string) {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

async function appel(chemin: string, corps?: object) {
  const r = await fetch(SERVEUR_URL + chemin, corps ? { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(corps) } : undefined);
  if (!r.ok) throw new Error("serveur");
  return r.json();
}

/** Demande l'autorisation puis inscrit le téléphone. Renvoie un message d'erreur, ou null si c'est fait. */
export async function activerNotifs(): Promise<string | null> {
  if (!navigator.onLine) return "Connecte-toi à Internet pour activer les notifications.";
  try {
    if ((await Notification.requestPermission()) !== "granted")
      return "Les notifications sont bloquées. Tu peux les autoriser dans les réglages de ton navigateur.";
    const { cle } = await appel("/push/cle");
    const reg = await navigator.serviceWorker.ready;
    const abonnement = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleServeur(cle) }));
    const systeme = { ios: "ios", android: "android", desktop: "ordinateur" }[platform()];
    await appel("/push/abonner", { abonnement: abonnement.toJSON(), systeme });
    write("notif-abonne", true);
    return null;
  } catch {
    return "L'activation n'a pas marché. Réessaie dans un moment.";
  }
}

export async function desactiverNotifs() {
  write("notif-abonne", false);
  try {
    const reg = await navigator.serviceWorker.ready;
    const abonnement = await reg.pushManager.getSubscription();
    if (abonnement) {
      await appel("/push/desabonner", { endpoint: abonnement.endpoint }).catch(() => {});
      await abonnement.unsubscribe();
    }
  } catch {
    // Rien à désinscrire.
  }
}

export function useNotifs() {
  const [etat, setEtat] = useState<EtatNotif>(etatNotif);
  const [plusTard, setPlusTard] = useState(() => read<number>("notif-plus-tard", 0) > Date.now());
  useEffect(() => {
    const maj = () => setEtat(etatNotif());
    document.addEventListener("visibilitychange", maj);
    return () => document.removeEventListener("visibilitychange", maj);
  }, []);
  return {
    etat,
    plusTard,
    reporter: () => { reporterNotifs(); setPlusTard(true); },
    activer: async () => { const e = await activerNotifs(); setEtat(etatNotif()); return e; },
    desactiver: async () => { await desactiverNotifs(); setEtat(etatNotif()); }
  };
}

/**
 * « Plus tard » : on redemande de plus en plus tard (2 jours, puis 4, 7, 14), jamais pour de bon.
 * Le refus du navigateur, lui, est définitif : on ne lance donc sa fenêtre qu'après un « Activer » de l'élève.
 */
const DELAIS = [2, 4, 7, 14];
export function reporterNotifs() {
  const n = read<number>("notif-refus", 0);
  write("notif-refus", n + 1);
  write("notif-plus-tard", Date.now() + DELAIS[Math.min(n, DELAIS.length - 1)] * 864e5);
}

/** Les notifications peuvent être proposées maintenant (pas déjà actives, pas reportées). */
export const peutProposerNotifs = () => etatNotif() === "possible" && read<number>("notif-plus-tard", 0) <= Date.now();
