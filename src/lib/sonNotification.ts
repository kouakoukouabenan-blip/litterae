import { ouvrirMessages, rechargerAnnonces } from "./annonces";
import { toast } from "../components/Toast";

// Le téléphone n'autorise le son qu'après un premier toucher de l'élève dans l'appli.
let audio: AudioContext | null = null;
function preparer() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") audio.resume();
  } catch {
    // Pas de son possible sur ce navigateur.
  }
}

/** Petite clochette Litterae : deux notes douces, moins d'une seconde. */
function clochette() {
  if (!audio || audio.state !== "running") return;
  const t = audio.currentTime;
  [[880, 0], [1318.5, 0.14]].forEach(([freq, debut]) => {
    const osc = audio!.createOscillator();
    const vol = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    vol.gain.setValueAtTime(0.0001, t + debut);
    vol.gain.exponentialRampToValueAtTime(0.35, t + debut + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + debut + 0.7);
    osc.connect(vol).connect(audio!.destination);
    osc.start(t + debut);
    osc.stop(t + debut + 0.75);
  });
  navigator.vibrate?.([120, 60, 120]);
}

/** Notification reçue pendant que l'appli est ouverte : son, puis le message à l'écran. */
export function ecouterNotifications() {
  if (!("serviceWorker" in navigator)) return;
  ["pointerdown", "keydown"].forEach(e => window.addEventListener(e, preparer, { passive: true }));
  navigator.serviceWorker.addEventListener("message", e => {
    if (e.data?.type !== "litterae-notification") return;
    clochette();
    const a = e.data.annonce as { id?: unknown; titre?: string } | null;
    if (typeof a?.id === "number") rechargerAnnonces().then(() => ouvrirMessages(a.id as number));
    else toast(a?.titre ? `Nouveau : ${a.titre}` : "Un nouveau message t'attend sur l'accueil.");
  });
}
