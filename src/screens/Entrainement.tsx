import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { SUJETS } from "../lib/data";

const CONSIGNE = "Expliquez et discutez cette affirmation en vous appuyant sur des œuvres lues ou étudiées.";

/** Tous les sujets, sans corrigé ni orientation : l'élève les traite seul, comme le jour de l'examen. */
export function EntrainementScreen() {
  return (
    <Page title="Sujets d'entraînement" back="#/carnet">
      <PageHeader eyebrow="S'entraîner" title="Sujets d'entraînement" compact>
        {SUJETS.length} sujets à traiter seul, sans corrigé. Trouve le thème, la thèse et l'orientation, puis rédige ton devoir.
      </PageHeader>
      <ol class="list entrainement" aria-label="Sujets d'entraînement">
        {SUJETS.map(s => (
          <li key={s.num} class="row row-top">
            <span class="sujet-num" aria-hidden="true">{s.num}</span>
            <span class="row-body">
              <span class="sr-only">Sujet {s.num}</span>
              <span class="row-quote">« {s.citation} »</span>
              <span class="meta">{s.auteur}</span>
              <span class="entrainement-consigne">{CONSIGNE}</span>
            </span>
          </li>
        ))}
      </ol>
    </Page>
  );
}
