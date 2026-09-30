import { LECONS } from "../lib/lecons";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { InstallBanner } from "../components/Install";
import { Annonces, InvitationNotifs } from "../components/Annonces";
import { useStored } from "../lib/storage";
import { NB_DETAILLEES, OEUVRES, SUJETS } from "../lib/data";
import { lienContact } from "../lib/contact";

const MINUTES = LECONS.reduce((n, l) => n + (parseInt(l.duree) || 0), 0);

export function CoursScreen() {
  const [lues] = useStored<string[]>("lecons-lues", []);
  const suivante = LECONS.find(l => !lues.includes(l.id));
  const iSuivante = suivante ? LECONS.indexOf(suivante) : -1;
  const nbLues = LECONS.filter(l => lues.includes(l.id)).length;

  return (
    <Page>
      <header class="home-header">
        <p class="eyebrow">Français · Terminale</p>
        <h1 class="home-title">La dissertation <em>littéraire</em>, pas à pas</h1>
        <p class="lede">{LECONS.length} leçons, {SUJETS.length} sujets corrigés, {OEUVRES.length} œuvres dont {NB_DETAILLEES} fiches détaillées.</p>
      </header>

      <Annonces />
      <InstallBanner />
      <InvitationNotifs />

      <section class="resume-card" aria-labelledby="resume-title">
        <p class="eyebrow">{nbLues === 0 ? "Commencer" : suivante ? "Reprendre" : "Cours terminé"}</p>
        <p id="resume-title" class="resume-title">
          {suivante ? `Leçon ${iSuivante + 1} · ${suivante.titre}` : "Passe aux sujets corrigés pour t'entraîner"}
        </p>
        <div class="progress-bar" role="progressbar" aria-label="Leçons lues" aria-valuemin={0} aria-valuemax={LECONS.length} aria-valuenow={nbLues}>
          <span style={{ width: `${(nbLues / LECONS.length) * 100}%` }} />
        </div>
        <p class="resume-meta">{nbLues === 0 ? `${LECONS.length} leçons, ${MINUTES} minutes de lecture` : `${nbLues} leçon${nbLues > 1 ? "s" : ""} lue${nbLues > 1 ? "s" : ""} sur ${LECONS.length}`}</p>
        <a class="btn btn-primary align-start" href={suivante ? `#/cours/${suivante.id}` : "#/sujets"}>
          {nbLues === 0 ? "Commencer le cours" : suivante ? "Continuer" : "Voir les sujets"}<Icon name="arrow_forward" size={20} />
        </a>
      </section>

      <section aria-labelledby="cours-title">
        <h2 id="cours-title" class="section-title home-section-title">Les leçons</h2>
        <ol class="list" aria-label="Leçons">
          {LECONS.map((l, i) => {
            const lue = lues.includes(l.id);
            return (
              <li key={l.id}>
                <a class="row" href={`#/cours/${l.id}`}>
                  <span class={`step-num ${lue ? "done" : ""}`} aria-hidden="true">{lue ? <Icon name="check" size={18} /> : i + 1}</span>
                  <span class="row-body">
                    <span class="row-title">{l.titre}</span>
                    <span class="meta">{l.duree}{lue ? " · lue" : ""}{l.payante ? " · accès complet" : ""}</span>
                  </span>
                  <Icon name="chevron_right" />
                </a>
              </li>
            );
          })}
        </ol>
        <p class="signaler">Une leçon te manque ? <a href={lienContact("lecon")}>Propose-la</a></p>
      </section>
    </Page>
  );
}
