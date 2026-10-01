import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { EmptyState } from "../components/EmptyState";
import { FacetPanel } from "../components/Facets";
import { WorkItem } from "../components/WorkItem";
import { OEUVRES } from "../lib/data";
import { FONCTIONS } from "../data/types";
import { FREE_WORKS, useAccess } from "../lib/access";
import { useSaved } from "../lib/carnet";
import { href, replaceRoute } from "../lib/router";
import {
  FACETS, EMPTY_FILTERS, buildIndex, countFilters, facetCounts, filtersFromParams, paramsFrom, queryTerms, search,
  type FacetKey, type Filters
} from "../lib/search";
import { plural } from "../lib/text";
import { fnClass } from "../lib/fonctions";
import { AchatLien } from "../components/Achat";
import { lienContact } from "../lib/contact";
import { noterRecherche } from "../lib/stats";
import { OeuvresOnglets } from "../components/SujetsOnglets";

const INDEX = buildIndex(OEUVRES);
const PAGE = 30;

export function OeuvresScreen({ params }: { params: URLSearchParams }) {
  const q = params.get("q") ?? "";
  const filters = filtersFromParams(params);
  const nbFiltres = countFilters(filters);
  const terms = queryTerms(q);
  const access = useAccess();
  const { isSaved } = useSaved();
  const [limit, setLimit] = useState(PAGE);
  const sheet = useRef<HTMLDialogElement>(null);
  const key = params.toString();

  const gratuites = params.get("gratuites") === "1" && !access.premium;
  // Sans clé, les fiches gratuites passent en tête, dans l'ordre habituel à l'intérieur de chaque groupe.
  const results = useMemo(() => {
    const r = search(INDEX, q, filters).filter(w => !gratuites || w.libre);
    return access.premium ? r : [...r.filter(w => w.libre), ...r.filter(w => !w.libre)];
  }, [key, access.premium]);
  const counts = useMemo(() => new Map(FACETS.map(f => [f.key, facetCounts(INDEX, q, filters, f)])), [key]);
  useEffect(() => setLimit(PAGE), [key]);
  useEffect(() => noterRecherche("oeuvres", q, results.length), [q]);

  const go = (nq: string, nf: Filters, libres = gratuites) => {
    const p = paramsFrom(nq, nf);
    if (libres) p.set("gratuites", "1");
    replaceRoute(href(["oeuvres"], p));
  };
  const toggle = (k: FacetKey, v: string) => {
    const cur = filters[k];
    go(q, { ...filters, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };
  const accueil = !q && !nbFiltres && !gratuites;
  // Ce que l'élève cherche (mots tapés, argument ou thème choisi) suit jusqu'à la fiche.
  const suite = new URLSearchParams([
    ...(q.trim() ? [["q", q.trim()]] : []),
    ...filters.argument.slice(0, 1).map(a => ["argument", a]),
    ...filters.theme.slice(0, 1).map(t => ["theme", t])
  ] as [string, string][]).toString();
  // À l'accueil, la liste complète reste repliée derrière un bouton discret.
  const [toutVoir, setToutVoir] = useState(false);
  const listeVisible = !accueil || toutVoir;

  return (
    <Page wide title="Œuvres">
      <OeuvresOnglets actif="chercher" />
      <PageHeader eyebrow="Moteur de recherche" title="Résumés d'œuvres" compact>
        {OEUVRES.length} œuvres pour illustrer tes arguments.
      </PageHeader>

      <div class="sticky-bar">
      <div class="search-bar" role="search">
        <label class="field">
          <Icon name="search" />
          <span class="sr-only">Rechercher une œuvre</span>
          <input type="search" value={q} placeholder="Titre, auteur, thème, mot-clé…" enterkeyhint="search" autocomplete="off"
            onInput={e => go((e.target as HTMLInputElement).value, filters)} />
        </label>
        <button type="button" class="btn btn-secondary filter-btn" onClick={() => sheet.current?.showModal()} aria-haspopup="dialog">
          <Icon name="tune" size={20} />
          <span class="filter-btn-label">Filtres</span>
          {nbFiltres > 0 && <span class="count-badge">{nbFiltres}</span>}
        </button>
      </div>
      </div>

      {!access.premium && (
        <p class="quota">
          <button type="button" class={`chip chip-libres${gratuites ? " chip-on" : ""}`} aria-pressed={gratuites} onClick={() => go(q, filters, !gratuites)}>
            {gratuites && <Icon name="check" size={16} />}{FREE_WORKS} fiches gratuites
          </button>
          <AchatLien label="Tout débloquer" />
        </p>
      )}

      <div class="search-layout">
        <aside class="facets-side" aria-label="Filtres">
          <FacetPanel facets={FACETS} counts={counts} filters={filters} onToggle={toggle} />
        </aside>

        <section class="results" aria-labelledby="results-title">
          {nbFiltres > 0 && (
            <div class="active-filters">
              {FACETS.flatMap(f => filters[f.key].map(v => (
                <button key={f.key + v} type="button" class="chip chip-remove" onClick={() => toggle(f.key, v)} aria-label={`Retirer le filtre ${v}`}>
                  {v}<Icon name="close" size={16} />
                </button>
              )))}
              <button type="button" class="link-btn" onClick={() => go(q, EMPTY_FILTERS)}>Tout effacer</button>
            </div>
          )}

          {accueil && (
            <section class="explorer" aria-labelledby="browse-title">
              <h2 id="browse-title" class="explorer-titre">Par fonction littéraire</h2>
              <div class="explorer-fonctions">
                {FONCTIONS.map(f => (
                  <a key={f} class={`fn-chip ${fnClass(f)}`} href={href(["oeuvres"], { fonction: f })}>{f}</a>
                ))}
              </div>

              {(counts.get("programme")?.some(([, n]) => n > 0) ?? false) && (
                <>
                  <h2 class="explorer-titre"><label for="programme">Au programme en Côte d'Ivoire</label></h2>
                  <select id="programme" class="select explorer-select" value="" onChange={e => {
                    const v = (e.target as HTMLSelectElement).value;
                    if (v) location.hash = href(["oeuvres"], { programme: v });
                  }}>
                    <option value="">Choisir une classe</option>
                    {counts.get("programme")!.filter(([, n]) => n > 0).map(([niveau, n]) => (
                      <option key={niveau} value={niveau}>{niveau} ({n})</option>
                    ))}
                  </select>
                </>
              )}

              <button type="button" class="btn btn-secondary explorer-tout" aria-expanded={toutVoir} onClick={() => setToutVoir(!toutVoir)}>
                {toutVoir ? "Masquer la liste" : `Voir toutes les œuvres (${OEUVRES.length})`}
                <Icon name={toutVoir ? "expand_less" : "expand_more"} size={18} />
              </button>
            </section>
          )}

          {listeVisible && (
          <h2 id="results-title" class="results-count" aria-live="polite">
            {accueil ? `Toutes les œuvres (${OEUVRES.length})` : results.length ? plural(results.length, "œuvre trouvée", "œuvres trouvées") : "Aucune œuvre trouvée"}
          </h2>
          )}

          {!listeVisible ? null : results.length ? (
            <>
              <ul class="works">
                {results.slice(0, limit).map(w => (
                  <li key={w.id}><WorkItem w={w} terms={terms} suite={suite} saved={isSaved(w.id)} open={access.canOpenWork(w.id)} free={!access.premium && !!w.libre} /></li>
                ))}
              </ul>
              {results.length > limit && (
                <button type="button" class="btn btn-secondary btn-block" onClick={() => setLimit(limit + PAGE)}>
                  Afficher {Math.min(PAGE, results.length - limit)} œuvres de plus
                </button>
              )}
            </>
          ) : (
            <EmptyState title="Rien ne correspond à cette recherche.">
              <p>Vérifie l'orthographe, essaie un mot plus général (« colonisation » plutôt que « colon ») ou retire un filtre.</p>
              {nbFiltres > 0 && <button type="button" class="btn btn-secondary" onClick={() => go(q, EMPTY_FILTERS)}>Retirer les filtres</button>}
              <p>Une œuvre manque ? <a href={lienContact("oeuvre")}>Propose-la</a></p>
            </EmptyState>
          )}
        </section>
      </div>

      <dialog ref={sheet} class="sheet" aria-labelledby="sheet-title" onClick={e => e.target === sheet.current && sheet.current?.close()}>
        <div class="sheet-head">
          <h2 id="sheet-title" class="section-title">Filtres</h2>
          <button type="button" class="icon-btn" onClick={() => sheet.current?.close()} aria-label="Fermer"><Icon name="close" /></button>
        </div>
        <div class="sheet-body">
          <FacetPanel facets={FACETS} counts={counts} filters={filters} onToggle={toggle} />
        </div>
        <div class="sheet-foot">
          <button type="button" class="btn btn-secondary" disabled={!nbFiltres} onClick={() => go(q, EMPTY_FILTERS)}>Effacer</button>
          <button type="button" class="btn btn-primary" onClick={() => sheet.current?.close()}>
            Voir {plural(results.length, "œuvre")}
          </button>
        </div>
      </dialog>
    </Page>
  );
}
