import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { EmptyState } from "../components/EmptyState";
import { SUJETS } from "../lib/data";
import { FREE_SUBJECTS, PRICE, useAccess } from "../lib/access";
import { href, replaceRoute } from "../lib/router";
import { fnClass } from "../lib/fonctions";
import { AchatLien } from "../components/Achat";
import { SujetsOnglets } from "../components/SujetsOnglets";

const ORIENTATIONS = ["Engagement", "Esthétique", "Évasion", "Lyrique", "Social"];

export function SujetsScreen({ params }: { params: URLSearchParams }) {
  const access = useAccess();
  const choix = params.get("orientation") ?? "";
  const liste = SUJETS.map((s, i) => ({ s, i })).filter(({ s }) => !choix || s.orientation.includes(choix));

  return (
    <Page>
      <SujetsOnglets actif="corriges" />
      <PageHeader title="Sujets corrigés" compact>
        {access.premium ? `${SUJETS.length} sujets type bac, tous corrigés.` : <>{FREE_SUBJECTS} gratuits sur {SUJETS.length}. <AchatLien label="Tout débloquer" /></>}
      </PageHeader>

      <div class="sticky-bar">
      <div class="chips" role="group" aria-label="Filtrer par orientation">
        <button type="button" class="chip" aria-pressed={!choix} onClick={() => replaceRoute(href(["sujets"]))}>Tous</button>
        {ORIENTATIONS.map(o => (
          <button key={o} type="button" class="chip" aria-pressed={choix === o}
            onClick={() => replaceRoute(href(["sujets"], choix === o ? undefined : { orientation: o }))}>
            {o}
          </button>
        ))}
      </div>
      </div>

      {liste.length ? (
        <ol class="list" aria-label="Sujets">
          {liste.map(({ s, i }) => {
            const libre = access.canOpenSubject(i);
            return (
              <li key={s.num}>
                <a class="row row-top" href={`#/sujets/${s.num}`}>
                  <span class="sujet-num" aria-hidden="true">{s.num}</span>
                  <span class="row-body">
                    <span class="row-quote">« {s.citation} »</span>
                    <span class="meta">{s.auteur}</span>
                    <span class="tags">{s.orientation.split(" / ").map(o => <span key={o} class={`tag ${fnClass(o)}`}>{o}</span>)}</span>
                  </span>
                  {libre ? <Icon name="chevron_right" /> : <span class="row-lock" title={`Accès complet, ${PRICE}`}><Icon name="lock" size={18} /><span class="sr-only">Réservé à l'accès complet</span></span>}
                </a>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState title="Aucun sujet pour cette orientation.">
          <button type="button" class="btn btn-secondary" onClick={() => replaceRoute(href(["sujets"]))}>Voir tous les sujets</button>
        </EmptyState>
      )}
    </Page>
  );
}
