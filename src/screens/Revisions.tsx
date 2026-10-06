import { useMemo, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Texte } from "../components/Texte";
import { Icon } from "../components/Icon";
import { EmptyState } from "../components/EmptyState";
import { LECONS } from "../lib/lecons";
import { CARTES_PAR_SEANCE, cartesDuJour, reviser, seanceTerminee, type Carte } from "../lib/revisions";

/** Révisions du jour : mots du dictionnaire et questions de quiz qui reviennent au bon moment. */
export function RevisionsScreen() {
  const cartes = useMemo(() => cartesDuJour().slice(0, CARTES_PAR_SEANCE), []);
  const [n, setN] = useState(0);
  const [sues, setSues] = useState(0);
  const fini = n >= cartes.length;

  function suivante(reussie: boolean) {
    reviser(cartes[n].cle, reussie);
    if (reussie) setSues(sues + 1);
    if (n + 1 >= cartes.length) seanceTerminee();
    setN(n + 1);
  }

  return (
    <Page title="Révisions" back="#/progres">
      <div class="reading revisions">
        {!cartes.length ? (
          <EmptyState title="Rien à revoir aujourd'hui">
            <p>Les mots du dictionnaire que tu ouvres et les questions de quiz reviennent ici le lendemain, puis quelques jours plus tard.</p>
          </EmptyState>
        ) : fini ? (
          <div class="quiz-card quiz-fin" role="status">
            <p class="quiz-score">{sues} / {cartes.length}</p>
            <p>{sues === cartes.length ? "Tout retenu. Ces cartes reviendront dans quelques jours." : "Les cartes oubliées reviendront demain."}</p>
            <a class="btn btn-secondary align-start" href="#/progres">Voir ma progression</a>
          </div>
        ) : (
          <>
            <p class="small muted revisions-compte">Carte {n + 1} sur {cartes.length}</p>
            <span class="progress-bar" aria-hidden="true"><span style={{ width: `${(n / cartes.length) * 100}%` }} /></span>
            <CarteRevision key={cartes[n].cle} carte={cartes[n]} suivante={suivante} />
          </>
        )}
      </div>
    </Page>
  );
}

function CarteRevision({ carte, suivante }: { carte: Carte; suivante: (reussie: boolean) => void }) {
  const [vu, setVu] = useState(false);
  const [choix, setChoix] = useState<number | null>(null);

  if (carte.type === "mot") {
    const e = carte.entree;
    return (
      <div class="quiz-card carte-revision">
        <p class="eyebrow">Dictionnaire</p>
        <p class="carte-mot">{e.mot}</p>
        <p class="small muted">{e.nature}. Que veut dire ce mot dans un sujet de dissertation ?</p>
        {!vu ? (
          <button type="button" class="btn btn-primary align-start" onClick={() => setVu(true)}>Voir le sens</button>
        ) : (
          <>
            <p class="carte-sens"><Texte text={e.sens} /></p>
            <div class="carte-actions">
              <button type="button" class="btn btn-secondary" onClick={() => suivante(false)}>Je ne savais pas</button>
              <button type="button" class="btn btn-primary" onClick={() => suivante(true)}><Icon name="check" size={20} />Je savais</button>
            </div>
          </>
        )}
      </div>
    );
  }

  const q = carte.question;
  const lecon = LECONS.find(l => l.id === carte.lecon);
  return (
    <div class="quiz-card carte-revision">
      <p class="eyebrow">Quiz{lecon ? ` · ${lecon.titre}` : ""}</p>
      <p class="quiz-q">{q.q}</p>
      <ul class="quiz-choix">
        {q.choix.map((c, i) => {
          const etat = choix === null ? "" : i === q.bonne ? "ok" : i === choix ? "faux" : "";
          return (
            <li key={c}>
              <button type="button" class={`quiz-option ${etat}`} disabled={choix !== null} onClick={() => setChoix(i)}>
                <span>{c}</span>
                {etat === "ok" && <Icon name="check" size={20} />}
                {etat === "faux" && <Icon name="close" size={20} />}
              </button>
            </li>
          );
        })}
      </ul>
      {choix !== null && (
        <div class="quiz-correction" role="status">
          <p><strong>{choix === q.bonne ? "Bonne réponse." : "Pas tout à fait."}</strong> {q.pourquoi}</p>
          <button type="button" class="btn btn-primary align-start" onClick={() => suivante(choix === q.bonne)}>Carte suivante</button>
        </div>
      )}
    </div>
  );
}
