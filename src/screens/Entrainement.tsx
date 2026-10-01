import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { SUJETS } from "../lib/data";
import { avancement, lireBrouillon } from "../lib/atelier";

/** Tous les sujets, sans corrigé ni orientation : l'élève les rédige seul dans l'atelier, comme le jour de l'examen. */
export function EntrainementScreen() {
  return (
    <Page title="Sujets d'entraînement" back="#/carnet">
      <PageHeader eyebrow="S'entraîner" title="Sujets d'entraînement" compact>
        {SUJETS.length} sujets à rédiger seul, pas à pas.
      </PageHeader>
      <ol class="list" aria-label="Sujets d'entraînement">
        {SUJETS.map(s => {
          const b = lireBrouillon(s.num);
          const pct = avancement(b);
          return (
            <li key={s.num}>
              <a class="row row-top" href={`#/entrainement/${s.num}`}>
                <span class="sujet-num" aria-hidden="true">{s.num}</span>
                <span class="row-body">
                  <span class="sr-only">Sujet {s.num}</span>
                  <span class="row-quote">« {s.citation} »</span>
                  <span class="meta">{s.auteur}</span>
                  <span class={`entrainement-etat ${pct === 100 ? "entrainement-fini" : pct ? "entrainement-encours" : ""}`}>
                    {pct === 100 ? "Terminé" : pct ? `Fait à ${pct} %` : "À commencer"}{b?.envoye ? " · copie envoyée" : ""}
                  </span>
                </span>
                <Icon name="chevron_right" />
              </a>
            </li>
          );
        })}
      </ol>
    </Page>
  );
}
