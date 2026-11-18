import { useEffect, useState } from "preact/hooks";
import { Icon } from "./Icon";
import { androidInstallee, cleRecue, rester, codePassage, iphoneInstallee, lienPassage, lienPassageChrome, oublierCleRecue } from "../lib/passage";
import { read } from "../lib/storage";
import { ESSAI, PASSAGE_VERS, lienAidePassage } from "../lib/site";
import { BoutonVideo } from "./VideoInstallation";
import { platform } from "../lib/install";
import { activer } from "../lib/licence";

const logo = <svg class="install-gate-logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#FFF3DC"/><path fill="#0F3D2E" d="M18 14h14v3h-4v28h9.5l3-8H44l-1.5 13H18v-3h4V17h-4z"/><circle cx="50" cy="47.5" r="3.5" fill="#C4562B"/></svg>;
const nom = () => (PASSAGE_VERS || "https://litterae.app/").replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Site d'essai : #/passage-demo montre l'écran de passage (?iphone : version iPhone, ?gratuit : sans accès complet), le lien revient sur l'essai. */
export const demoPassage = () => ESSAI && location.hash.startsWith("#/passage-demo");

/** Bien visible : l'élève peut garder l'ancienne appli (elle reste à jour). L'écran ne revient plus. */
const Rester = () => (
  <button type="button" class="passage-rester" onClick={() => {
    if (!demoPassage()) rester();
    location.hash = "#/accueil";
    location.reload();
  }}>Je reste sur l'ancienne adresse</button>
);

const Aide = () => (
  <a class="passage-aide" href={lienAidePassage()} target="_blank" rel="noopener">Un souci ? Écris-nous sur WhatsApp</a>
);

/**
 * Ancienne adresse : l'élève est emmené sur la nouvelle avec sa clé et sa progression.
 * Sur iPhone (appli installée), le navigateur ne peut pas les emporter : on donne un code à coller.
 */
export function PassageDepart() {
  const demo = demoPassage();
  const iphone = iphoneInstallee() || (demo && location.hash.includes("iphone"));
  const [copie, setCopie] = useState(false);
  const partir = () => {
    // Démo (essai) : on revient sur l'essai, par Chrome si l'appli d'essai est installée sur Android.
    if (demo) {
      if (androidInstallee()) { location.href = lienPassageChrome(location.origin + location.pathname); return; }
      location.href = location.pathname + "#passage=" + codePassage(); location.reload(); return;
    }
    // Appli Android installée : Chrome ouvre la nouvelle adresse lui-même (il faut que l'élève touche le bouton).
    location.href = android ? lienPassageChrome() : lienPassage();
  };
  const android = androidInstallee();

  // Sans accès complet : pas de clé à faire suivre, l'écran est plus simple (le code ne sert qu'à garder la progression).
  const paye = demo ? !location.hash.includes("gratuit") : !!read("licence", null);
  const video = platform() === "ios" || iphone ? "ios" : "android";
  const copier = async () => {
    try { await navigator.clipboard.writeText(codePassage()); setCopie(true); }
    catch { setCopie(false); }
  };

  return (
    <div class="install-gate" role="dialog" aria-modal="true" aria-labelledby="passage-titre">
      <div class="install-gate-inner">
        {logo}
        <h1 id="passage-titre" class="install-gate-title">Litter<span>ae</span> change d'adresse</h1>
        <p class="passage-adresse">{nom()}</p>
        {iphone && !paye ? (
          <>
            <p class="install-gate-texte">Litterae continue à la nouvelle adresse. Ça prend une minute.</p>
            <ol class="install-gate-steps passage-etapes">
              <li>Ouvre <strong>Safari</strong> et va sur <strong>{nom()}</strong>.</li>
              <li>Installe la nouvelle appli sur ton écran d'accueil.</li>
              <li>Supprime cette ancienne icône.</li>
            </ol>
            <button type="button" class="video-aide-bouton" onClick={copier}>
              <Icon name={copie ? "check" : "content_copy"} size={22} />{copie ? "Code copié" : "Garder ma progression (copier un code)"}
            </button>
            {copie && <p class="install-gate-texte passage-note">Dans la nouvelle appli, va dans <strong>Mon espace › Accès complet</strong> et colle ce code.</p>}
            <BoutonVideo os="ios" />
            <Rester />
            <Aide />
          </>
        ) : iphone ? (
          <>
            <p class="install-gate-texte">Ta clé, tes fiches et ta progression viennent avec toi. Sur iPhone, il faut juste un code.</p>
            <button type="button" class="btn install-gate-btn" onClick={copier}>
              <Icon name={copie ? "check" : "content_copy"} size={24} />{copie ? "Code copié" : "Copier mon code de passage"}
            </button>
            <ol class="install-gate-steps passage-etapes">
              <li>Ouvre <strong>Safari</strong> et va sur <strong>{nom()}</strong>.</li>
              <li>Installe la nouvelle appli sur ton écran d'accueil.</li>
              <li>Ouvre-la, va dans <strong>Mon espace › Accès complet</strong> et colle ton code.</li>
            </ol>
            <p class="install-gate-texte passage-note">Ensuite, tu peux supprimer cette ancienne icône.</p>
            <BoutonVideo os="ios" passage />
            <Rester />
            <Aide />
          </>
        ) : (
          <>
            <p class="install-gate-texte">{paye ? "Ta clé, tes fiches et ta progression viennent avec toi. Tu n'as rien à retaper." : "Tes fiches et ta progression viennent avec toi."}</p>
            <button type="button" class="btn install-gate-btn" onClick={partir}>
              <Icon name="arrow_forward" size={24} />Continuer sur {nom()}
            </button>
            <p class="install-gate-texte passage-note">{android ? <>Installe la nouvelle icône, puis supprime l'ancienne. Si Litterae s'ouvre dans une fenêtre avec une croix <strong>✕</strong>, touche le menu <strong>⋮</strong> en haut à droite, puis <strong>Ouvrir dans Chrome</strong>.</> : "Là-bas, installe la nouvelle icône, puis supprime l'ancienne."}</p>
            <BoutonVideo os={video} passage />
            <Rester />
            <Aide />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Nouvelle adresse : la clé reçue est validée avec le même identifiant d'appareil
 * (aucune place prise), puis l'appli redémarre avec tout le contenu.
 */
export function PassageArrivee() {
  const [erreur, setErreur] = useState("");
  useEffect(() => {
    const cle = cleRecue();
    if (!cle) return;
    activer(cle).then(err => {
      if (err) { setErreur(err.message); return; }
      oublierCleRecue();
      location.hash = "#/accueil";
      location.reload();
    });
  }, []);
  // L'élève a sa clé par e-mail : il pourra la retaper, avec le même identifiant d'appareil (aucune place prise).
  const continuer = () => { oublierCleRecue(); location.hash = "#/accueil"; location.reload(); };

  return (
    <div class="install-gate" role="dialog" aria-modal="true" aria-labelledby="passage-titre">
      <div class="install-gate-inner">
        {logo}
        <h1 id="passage-titre" class="install-gate-title">Bienvenue sur la nouvelle adresse</h1>
        {erreur ? (
          <>
            <p class="install-gate-texte">Ta progression est bien arrivée. Ta clé n'a pas encore pu être validée : {erreur}</p>
            <button type="button" class="btn install-gate-btn" onClick={() => location.reload()}>
              <Icon name="arrow_forward" size={24} />Réessayer
            </button>
            <div class="install-gate-liens">
              <button type="button" class="install-gate-skip" onClick={continuer}>Continuer sans ma clé pour l'instant</button>
            </div>
            <Aide />
          </>
        ) : (
          <>
            <span class="install-gate-attente" role="progressbar" aria-label="Ta clé arrive" />
            <p class="install-gate-texte">Ta clé et ta progression arrivent. Ne touche à rien, ça prend quelques secondes.</p>
          </>
        )}
      </div>
    </div>
  );
}
