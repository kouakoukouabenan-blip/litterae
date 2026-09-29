import { useEffect, useState } from "preact/hooks";
import { read, write } from "./storage";

/**
 * Installation de Litterae sur l'écran d'accueil.
 * Chrome et Edge (Android, ordinateur) proposent une fenêtre d'installation native ;
 * Safari sur iPhone ne le permet pas : on montre alors la marche à suivre.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

// Écouté dès le chargement : l'événement peut arriver avant l'affichage de l'écran.
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  notify();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  write("installee", true);
  notify();
});

export type Platform = "ios" | "android" | "desktop";

export function platform(): Platform {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme un Mac avec écran tactile.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** Sur iPhone, seul Safari (ou un navigateur récent via Partager) sait ajouter à l'écran d'accueil. */
export const isIosSafari = () => platform() === "ios" && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

export function isInstalled() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const SNOOZE_DAYS = 7;

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(n => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const snoozedUntil = read<number>("installation-plus-tard", 0);

  return {
    installed: isInstalled(),
    /** Vrai quand le navigateur peut ouvrir sa propre fenêtre d'installation. */
    canPrompt: !!deferred,
    /** Le bandeau d'invitation revient une semaine après « Plus tard ». */
    showBanner: !isInstalled() && Date.now() > snoozedUntil,
    snooze: () => { write("installation-plus-tard", Date.now() + SNOOZE_DAYS * 864e5); notify(); },
    /** Ouvre la fenêtre native ; renvoie false s'il faut montrer la marche à suivre. */
    prompt: async () => {
      if (!deferred) return false;
      const e = deferred;
      deferred = null;
      await e.prompt();
      await e.userChoice;
      notify();
      return true;
    }
  };
}
