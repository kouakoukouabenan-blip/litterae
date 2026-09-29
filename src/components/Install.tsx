import { useRef } from "preact/hooks";
import { isIosSafari, platform, useInstall } from "../lib/install";
import { Icon } from "./Icon";

let openGuide = () => {};

/** Lance l'installation : fenêtre du navigateur si possible, sinon la marche à suivre. */
export function useInstallAction() {
  const install = useInstall();
  return { ...install, start: async () => { if (!(await install.prompt())) openGuide(); } };
}

function Steps() {
  const p = platform();
  if (p === "ios")
    return isIosSafari() ? (
      <ol class="install-steps">
        <li>Touche le bouton <strong>Partager</strong> <Icon name="ios_share" size={18} /> en bas de Safari.</li>
        <li>Fais défiler et choisis <strong>Sur l'écran d'accueil</strong>.</li>
        <li>Touche <strong>Ajouter</strong> en haut à droite.</li>
      </ol>
    ) : (
      <ol class="install-steps">
        <li>Copie l'adresse de cette page.</li>
        <li>Ouvre-la dans <strong>Safari</strong> : c'est lui qui permet l'installation sur iPhone.</li>
        <li>Touche <strong>Partager</strong> <Icon name="ios_share" size={18} />, puis <strong>Sur l'écran d'accueil</strong>.</li>
      </ol>
    );
  if (p === "android")
    return (
      <ol class="install-steps">
        <li>Ouvre cette page dans <strong>Chrome</strong>.</li>
        <li>Touche le menu <Icon name="more_vert" size={18} /> en haut à droite.</li>
        <li>Choisis <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong>, puis confirme.</li>
      </ol>
    );
  return (
    <ol class="install-steps">
      <li>Ouvre cette page dans <strong>Chrome</strong> ou <strong>Edge</strong>.</li>
      <li>Clique sur l'icône d'installation <Icon name="install_mobile" size={18} /> à droite de la barre d'adresse, ou dans le menu <Icon name="more_vert" size={18} />, sur <strong>Installer Litterae</strong>.</li>
    </ol>
  );
}

/** Fenêtre « Comment installer », montée une seule fois dans l'application. */
export function InstallGuide() {
  const ref = useRef<HTMLDialogElement>(null);
  openGuide = () => ref.current?.showModal();
  return (
    <dialog ref={ref} class="sheet" aria-labelledby="install-title" onClick={e => e.target === ref.current && ref.current?.close()}>
      <div class="sheet-head">
        <h2 id="install-title" class="section-title">Installer Litterae</h2>
        <button type="button" class="icon-btn" onClick={() => ref.current?.close()} aria-label="Fermer"><Icon name="close" /></button>
      </div>
      <div class="sheet-body">
        <p>Une fois installée, Litterae s'ouvre depuis ton écran d'accueil comme une application, en plein écran, et le cours reste lisible sans connexion.</p>
        <Steps />
        <p class="small muted">Litterae ne prend presque pas de place : moins de 1 Mo, sans passer par le Play Store ni l'App Store.</p>
      </div>
      <div class="sheet-foot sheet-foot-single">
        <button type="button" class="btn btn-primary" onClick={() => ref.current?.close()}>J'ai compris</button>
      </div>
    </dialog>
  );
}

/** Invitation à installer, en tête de l'accueil, tant que l'app n'est pas installée. */
export function InstallBanner() {
  const { showBanner, snooze, start } = useInstallAction();
  const appareil = platform() === "desktop" ? "cet ordinateur" : "ton téléphone";
  if (!showBanner) return null;
  return (
    <aside class="install-banner" aria-label="Installer l'application">
      <Icon name="install_mobile" size={22} />
      <p class="install-banner-title">Installe Litterae sur {appareil}, elle marche même hors connexion.</p>
      <button type="button" class="btn btn-primary" onClick={start}>Installer</button>
      <button type="button" class="icon-btn" onClick={snooze} aria-label="Plus tard"><Icon name="close" size={20} /></button>
    </aside>
  );
}

/** Bouton discret dans la barre du haut, toujours présent tant que l'app n'est pas installée. */
export function InstallButton() {
  const { installed, start } = useInstallAction();
  if (installed) return null;
  return (
    <button type="button" class="icon-btn install-btn" onClick={start} aria-label="Installer l'application">
      <Icon name="install_mobile" size={22} /><span class="install-btn-label">Installer</span>
    </button>
  );
}
