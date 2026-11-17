import { useState } from "preact/hooks";
import { Icon } from "./Icon";

/**
 * Vidéo qui montre l'installation pas à pas (moins de 1 Mo, chargée seulement quand l'élève la demande).
 * Android : depuis le lien dans Chrome. iPhone : depuis Safari, menu Partager.
 */
export function BoutonVideo({ os, onOuvrir }: { os: "android" | "ios"; onOuvrir?: () => void }) {
  const [ouverte, setOuverte] = useState(false);
  const fichier = os === "ios" ? "installer-iphone" : "installer-android";
  return (
    <>
      <button type="button" class="video-aide-bouton" onClick={() => { onOuvrir?.(); setOuverte(true); }}>
        <Icon name="play_circle" size={22} />Voir la vidéo : installer sur {os === "ios" ? "iPhone" : "Android"}
      </button>
      {ouverte && (
        <div class="video-aide" role="dialog" aria-modal="true" aria-label="Vidéo d'installation" onClick={e => { if (e.target === e.currentTarget) setOuverte(false); }}>
          <div class="video-aide-cadre">
            <video src={`videos/${fichier}.mp4`} poster={`videos/${fichier}.jpg`} controls autoplay playsInline preload="auto" />
            <button type="button" class="btn video-aide-fermer" onClick={() => setOuverte(false)}>Fermer la vidéo</button>
          </div>
        </div>
      )}
    </>
  );
}
