import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";

type Trace = { f: "cadre" | "cercle" | "souligne"; b: [number, number, number, number] };
type Etape = { texte: string; traces: Trace[]; clic?: [number, number] };

/**
 * Les étapes de l'achat, en captures d'écran (données personnelles masquées). Images dans public/comment-payer/.
 * Les repères (cadre, cercle, soulignement) et le point touché par le curseur sont en pixels de l'image d'origine (1080 × 2209).
 */
const ETAPES: Etape[] = [
  { texte: "Dans Litterae, va dans « Mon espace » et touche « Acheter l'accès complet ».", traces: [{ f: "souligne", b: [371, 584, 947, 646] }], clic: [689, 619] },
  { texte: "La page de Chariow s'ouvre. Touche « Obtenir la licence ».", traces: [{ f: "cadre", b: [44, 1449, 1036, 1557] }], clic: [541, 1504] },
  { texte: "Écris ton prénom, ton nom, ton e-mail et ton numéro, puis touche « Payer maintenant ». Mets un e-mail que tu consultes : ta clé arrive là.", traces: [{ f: "souligne", b: [46, 913, 1034, 1042] }, { f: "cadre", b: [44, 1888, 1036, 2025] }], clic: [541, 1959] },
  { texte: "Choisis ton moyen de paiement Mobile Money (ici, Wave).", traces: [{ f: "cercle", b: [68, 1242, 1012, 1408] }], clic: [295, 1326] },
  { texte: "Ton application de paiement s'ouvre. Vérifie le montant et confirme.", traces: [{ f: "cadre", b: [68, 1991, 1012, 2122] }], clic: [541, 2058] },
  { texte: "Paiement reçu ! Touche « Retour vers Livres Faciles ».", traces: [{ f: "souligne", b: [271, 668, 812, 748] }, { f: "cadre", b: [66, 1230, 1012, 1338] }], clic: [541, 1284] },
  { texte: "Ta clé d'accès s'affiche : copie-la. Tu la reçois aussi par e-mail.", traces: [{ f: "cercle", b: [90, 1330, 990, 1471] }], clic: [918, 1401] },
  { texte: "Reviens dans Litterae, va dans « Mon espace » et touche « Accès complet ».", traces: [{ f: "cadre", b: [46, 358, 1034, 555] }], clic: [541, 456] },
  { texte: "Colle ta clé dans la case, puis touche « Valider ma clé ».", traces: [{ f: "cadre", b: [46, 871, 1034, 1003] }, { f: "souligne", b: [300, 1047, 780, 1178] }], clic: [369, 936] },
  { texte: "C'est fait : tout Litterae est débloqué sur ton téléphone.", traces: [{ f: "cercle", b: [46, 764, 1034, 956] }] }
];
const DUREE = 5500;
const DEBUT = 300, ECART = 550;
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
            <div class="demo-tel" key={etape}>
              <img src={image(etape)} width={420} height={859} alt={`Étape ${etape + 1} : ${ETAPES[etape].texte}`} decoding="async" />
              <Reperes etape={ETAPES[etape]} />
            </div>
          </div>
          <div class="demo-texte" aria-live="polite">
            <p class="demo-num">Étape {etape + 1} sur {ETAPES.length}</p>
            <p class="demo-legende">{ETAPES[etape].texte}</p>
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

/** Repères animés dessinés sur la capture : cadre, cercle ou soulignement, puis le curseur qui vient toucher. */
function Reperes({ etape }: { etape: Etape }) {
  const retard = (i: number) => `--d:${DEBUT + i * ECART}ms`;
  return (
    <svg class="demo-reperes" viewBox="0 0 1080 2209" aria-hidden="true">
      {etape.traces.map(({ f, b: [x1, y1, x2, y2] }, i) => {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        if (f === "cadre") return <rect key={i} class="trace" style={retard(i)} pathLength={1} x={x1 - 10} y={y1 - 10} width={x2 - x1 + 20} height={y2 - y1 + 20} rx={26} />;
        if (f === "cercle") return <ellipse key={i} class="trace" style={retard(i)} pathLength={1} cx={cx} cy={cy} rx={(x2 - x1) / 2 + 34} ry={(y2 - y1) / 2 + 40} transform={`rotate(-2 ${cx} ${cy})`} />;
        return <path key={i} class="trace trace-souligne" style={retard(i)} pathLength={1} d={`M${x1} ${y2 + 8} Q${cx} ${y2 + 26} ${x2} ${y2 + 4}`} />;
      })}
      {etape.clic && (
        <g style={`--x:${etape.clic[0]};--y:${etape.clic[1]};${retard(etape.traces.length)}`}>
          <circle class="demo-onde" cx={etape.clic[0]} cy={etape.clic[1]} r={46} />
          <path class="demo-curseur" d="M0 0V92L23 71L38 104L55 96L40 64H69Z" />
        </g>
      )}
    </svg>
  );
}
