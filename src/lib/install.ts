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
/**
 * Où en est l'installation lancée depuis Litterae : après « Installer » dans la fenêtre de Chrome,
 * l'ajout à l'écran d'accueil prend quelques secondes sans que rien ne bouge à l'écran.
 */
export type EtatInstallation = "aucune" | "en-cours" | "faite";
let installation: EtatInstallation = "aucune";
const terminer = () => {
  deferred = null;
  installation = "faite";
  write("installee", true);
  notify();
};
window.addEventListener("appinstalled", terminer);

export type Platform = "ios" | "android" | "desktop";

export function platform(): Platform {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme un Mac avec écran tactile.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/**
 * Sur iPhone, trois cas pour ajouter Litterae à l'écran d'accueil :
 * - « safari » : Safari (bouton Partager) ;
 * - « autre » : Chrome, Edge, Firefox… qui passent aussi par Partager depuis iOS 16.4 ;
 * - « integre » : le navigateur caché de Facebook, Instagram, TikTok, Snapchat… qui ne sait pas installer :
 *   il faut d'abord ouvrir la page dans Safari.
 */
export type NavigateurIos = "safari" | "autre" | "integre";
export function navigateurIos(): NavigateurIos {
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB|Instagram|musical_ly|BytedanceWebview|TikTok|Snapchat|Twitter|LinkedInApp|Line\/|GSA\//.test(ua)) return "integre";
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(ua)) return "autre";
  // Une app qui affiche le site sans le nom « Safari » dans son identité est un navigateur intégré.
  if (!/Safari\//.test(ua)) return "integre";
  return "safari";
}

/**
 * Sur Android, quatre cas :
 * - « chrome » : Chrome lui-même (il propose l'installation, parfois quelques secondes après l'ouverture) ;
 * - « samsung » : Samsung Internet (menu en bas de l'écran) ;
 * - « integre » : la fenêtre intégrée de Facebook, Instagram, TikTok, Snapchat… qui ne sait pas installer ;
 * - « autre » : Firefox, Opera, Edge, un navigateur de marque…
 */
export type NavigateurAndroid = "chrome" | "samsung" | "integre" | "autre";
export function navigateurAndroid(): NavigateurAndroid {
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB|Instagram|musical_ly|BytedanceWebview|TikTok|Snapchat|Twitter|LinkedInApp|Line\/|; wv\)/.test(ua)) return "integre";
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Chrome\/\d/.test(ua) && !/EdgA|OPR|Opera|YaBrowser|UCBrowser|Firefox|MiuiBrowser|HeyTapBrowser|Puffin|Silk/.test(ua)) return "chrome";
  return "autre";
}

/**
 * Chrome ne propose l'installation qu'une fois la page prête (souvent 1 à 3 secondes après l'ouverture).
 * Si l'élève touche « Installer » trop tôt, on attend un peu l'invitation avant de montrer la marche à suivre.
 */
export function attendreInvite(ms: number): Promise<boolean> {
  if (deferred) return Promise.resolve(true);
  return new Promise(resolve => {
    const fin = (ok: boolean) => { clearTimeout(t); listeners.delete(ecoute); resolve(ok); };
    const ecoute = () => { if (deferred) fin(true); };
    const t = setTimeout(() => fin(!!deferred), ms);
    listeners.add(ecoute);
  });
}

export function isInstalled() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Ouverte comme application : on le note, pour reconnaître ensuite le téléphone dans le navigateur
// (sur Android, l'application et Chrome partagent le même stockage).
if (isInstalled()) write("installee", true);

/**
 * Litterae est-elle déjà installée sur ce téléphone, alors qu'on est dans le navigateur ?
 * Chrome sur Android sait répondre de façon sûre ; sinon on se fie à ce qui a été noté à l'installation.
 */
export async function dejaInstallee(): Promise<boolean> {
  if (isInstalled()) return false;
  const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
  if (nav.getInstalledRelatedApps) {
    try {
      const apps = await nav.getInstalledRelatedApps();
      // Réponse sûre : si l'application a été supprimée, on l'oublie.
      write("installee", apps.length > 0);
      return apps.length > 0;
    } catch { /* on se fie à ce qui a été noté */ }
  }
  return read<boolean>("installee", false);
}

const SNOOZE_DAYS = 7;

/** L'élève a ouvert une première leçon, fiche ou sujet : il sait ce qu'il installerait. */
export function marquerDecouverte() {
  if (read<boolean>("decouverte", false)) return;
  write("decouverte", true);
  notify();
}
export const aDecouvert = () => read<boolean>("decouverte", false);

// Nombre de visites (une par session du navigateur) : le bandeau n'apparaît qu'à partir de la deuxième,
// pour laisser l'élève découvrir l'app avant de lui proposer de l'installer.
const VISITES = (() => {
  let n = read<number>("visites", 0);
  try {
    if (!sessionStorage.getItem("litterae.visite")) {
      sessionStorage.setItem("litterae.visite", "1");
      write("visites", ++n);
    }
  } catch {
    // Stockage de session indisponible : on compte cette visite comme la première.
  }
  return n;
})();

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
    /** Le bandeau d'invitation apparaît dès la deuxième visite et revient une semaine après « Plus tard ». */
    showBanner: !isInstalled() && VISITES >= 2 && Date.now() > snoozedUntil,
    snooze: () => { write("installation-plus-tard", Date.now() + SNOOZE_DAYS * 864e5); notify(); },
    /** Ouvre la fenêtre native ; renvoie false s'il faut montrer la marche à suivre. */
    installation,
    prompt: async () => {
      // Installation déjà acceptée : un second appui ne doit pas ouvrir la marche à suivre.
      if (installation !== "aucune") return true;
      if (!deferred && platform() !== "ios") await attendreInvite(4000);
      if (!deferred) return false;
      const e = deferred;
      deferred = null;
      await e.prompt();
      const choix = await e.userChoice;
      if (choix.outcome === "accepted" && installation === "aucune") {
        installation = "en-cours";
        // Certains téléphones ne signalent pas la fin : on la considère faite au bout de 20 secondes.
        setTimeout(() => { if (installation === "en-cours") terminer(); }, 20000);
      }
      notify();
      return true;
    }
  };
}
