import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";

/** Les étapes de l'achat, en captures d'écran (données personnelles masquées). Images dans public/comment-payer/. */
const ETAPES = [
  "Dans Litterae, va dans « Mon espace » et touche « Acheter l'accès complet ».",
  "La page de Chariow s'ouvre. Touche « Obtenir la licence ».",
  "Écris ton prénom, ton nom, ton e-mail et ton numéro, puis touche « Payer maintenant ». Mets un e-mail que tu consultes : ta clé arrive là.",
  "Choisis ton moyen de paiement Mobile Money (ici, Wave).",
  "Ton application de paiement s'ouvre. Vérifie le montant et confirme.",
  "Paiement reçu ! Touche « Retour vers Livres Faciles ».",
  "Ta clé d'accès s'affiche : copie-la. Tu la reçois aussi par e-mail.",
  "Reviens dans Litterae, va dans « Mon espace » et touche « Accès complet ».",
  "Colle ta clé dans la case, puis touche « Valider ma clé ».",
  "C'est fait : tout Litterae est débloqué sur ton téléphone."
];
const DUREE = 4500;
const image = (i: number) => `comment-payer/etape-${i + 1}.webp`;

let ouvrir = () => {};

/** Bouton qui ouvre la démonstration de l'achat. */
export function CommentPayerBouton({ class: cls = "demo-lien" }: { class?: string }) {
  return (
    <button type="button" class={cls} onClick={() => ouvrir()} aria-haspopup="dialog">
      <Icon name="play_circle" size={20} />Voir comment payer
    </button>
  );
}

/** Fenêtre de démonstration, montée une seule fois dans l'application. Les images ne se chargent qu'à l'ouverture. */
export function CommentPayer() {
  const ref = useRef<HTMLDialogElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState(0);
  const [lecture, setLecture] = useState(true);
  const toucher = useRef<number | null>(null);

  ouvrir = () => {
    setEtape(0);
    setLecture(!matchMedia("(prefers-reduced-motion: reduce)").matches);
    setOuvert(true);
    ref.current?.showModal();
  };
  const fermer = () => ref.current?.close();
  const aller = (i: number) => setEtape(Math.max(0, Math.min(ETAPES.length - 1, i)));

  // Défilement automatique, qui s'arrête sur la dernière étape.
  useEffect(() => {
    if (!ouvert || !lecture) return;
    if (etape === ETAPES.length - 1) { setLecture(false); return; }
    const t = setTimeout(() => setEtape(e => e + 1), DUREE);
    return () => clearTimeout(t);
  }, [ouvert, lecture, etape]);

  // Charge l'image suivante à l'avance pour un passage sans attente.
  useEffect(() => {
    if (ouvert && etape + 1 < ETAPES.length) new Image().src = image(etape + 1);
  }, [ouvert, etape]);

  const derniere = etape === ETAPES.length - 1;
  const main = (fn: () => void) => () => { setLecture(false); fn(); };

  return (
    <dialog ref={ref} class="sheet demo" aria-labelledby="demo-title"
      onClose={() => setOuvert(false)}
      onClick={e => e.target === ref.current && fermer()}
      onKeyDown={e => { if (e.key === "ArrowRight") main(() => aller(etape + 1))(); if (e.key === "ArrowLeft") main(() => aller(etape - 1))(); }}>
      <div class="sheet-head">
        <h2 id="demo-title" class="section-title">Comment payer</h2>
        <button type="button" class="icon-btn" onClick={fermer} aria-label="Fermer"><Icon name="close" /></button>
      </div>
      {ouvert && (
        <div class="demo-body">
          <div class="demo-ecran"
            onTouchStart={e => { toucher.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (toucher.current === null) return;
              const dx = e.changedTouches[0].clientX - toucher.current;
              toucher.current = null;
              if (Math.abs(dx) > 40) main(() => aller(etape + (dx < 0 ? 1 : -1)))();
            }}>
            <img key={etape} src={image(etape)} width={420} height={859} alt={`Étape ${etape + 1} : ${ETAPES[etape]}`} decoding="async" />
          </div>
          <div class="demo-texte" aria-live="polite">
            <p class="demo-num">Étape {etape + 1} sur {ETAPES.length}</p>
            <p class="demo-legende">{ETAPES[etape]}</p>
          </div>
          <div class="demo-barre" aria-hidden="true">
            {ETAPES.map((_, i) => <span class={i < etape ? "fait" : i === etape ? (lecture ? "en-cours" : "fait") : ""} style={i === etape && lecture ? `--duree:${DUREE}ms` : undefined} key={i === etape ? `${i}-${lecture}` : i} />)}
          </div>
        </div>
      )}
      <div class="sheet-foot demo-foot">
        <button type="button" class="icon-btn" onClick={main(() => aller(etape - 1))} disabled={etape === 0} aria-label="Étape précédente"><Icon name="arrow_back" /></button>
        {derniere ? (
          <button type="button" class="btn btn-secondary" onClick={() => { setEtape(0); setLecture(true); }}>Revoir depuis le début</button>
        ) : (
          <button type="button" class="btn btn-secondary" onClick={() => setLecture(l => !l)}>
            <Icon name={lecture ? "pause" : "play_arrow"} size={20} />{lecture ? "Pause" : "Lecture"}
          </button>
        )}
        <button type="button" class="icon-btn" onClick={main(() => aller(etape + 1))} disabled={derniere} aria-label="Étape suivante"><Icon name="arrow_forward" /></button>
      </div>
    </dialog>
  );
}
