import { Icon } from "../components/Icon";
import type { Argument } from "../data/types";
import { Page } from "../components/Page";
import { LockPanel } from "../components/LockPanel";
import { SUJETS, estComplet, oeuvresCitees } from "../lib/data";
import { useAccess } from "../lib/access";
import { NotFound } from "./NotFound";
import { LigneContact } from "../components/LigneContact";
import { useEffect } from "preact/hooks";
import { noter } from "../lib/stats";
import { noterVue } from "../lib/historique";

function Args({ args }: { args: Argument[] }) {
  return (
    <ol class="args">
      {args.map((a, k) => (
        <li key={k}>
          <h4 class="arg-title">{a.titre}</h4>
          <p>{a.expl}</p>
          <p class="arg-ex"><span class="arg-ex-label">Illustration</span>{a.ex}</p>
        </li>
      ))}
    </ol>
  );
}

export function SujetScreen({ num }: { num: string }) {
  const access = useAccess();
  const i = SUJETS.findIndex(s => s.num === num);
  useEffect(() => { if (i > -1) { noter({ t: "sujet", ref: num }); noterVue("sujet", num); } }, [num]);
  if (i < 0) return <NotFound what="Ce sujet n'existe pas." back="#/sujets" />;
  const s = SUJETS[i], prev = SUJETS[i - 1], next = SUJETS[i + 1];
  const libre = access.canOpenSubject(i) && estComplet(s);
  const citees = oeuvresCitees(s);

  return (
    <Page title={`Sujet ${s.num}`} back="#/sujets" partage={{
      type: "sujet", cle: s.num, titre: `Sujet ${s.num}`, chemin: `#/sujets/${s.num}`,
      texte: `Sujet de dissertation ${s.num} :\n« ${s.citation} »\n${s.auteur}. Expliquez et discutez.\n\nLe corrigé (plan détaillé, introduction, conclusion) est sur Litterae :`
    }}>
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Sujet {s.num} · {s.orientation}</p>
          <blockquote class="citation citation-lg">« {s.citation} »</blockquote>
          <p class="meta">{s.auteur}. Expliquez et discutez.</p>
          <a class="btn btn-secondary align-start sujet-atelier" href={`#/entrainement/${s.num}`}><Icon name="edit" size={20} />M'entraîner sur ce sujet</a>
        </header>

        {!libre || !estComplet(s) ? (
          <LockPanel reason="Ce corrigé fait partie de l'accès complet." />
        ) : (
          <div class="prose">
            <h2 class="section-title">Comprendre le sujet</h2>
            <dl class="def">
              <dt>Thème</dt><dd>{s.compreh.theme}</dd>
              <dt>Thèse</dt><dd>{s.compreh.these}</dd>
              <dt>Reformulation</dt><dd>{s.compreh.reformulation}</dd>
              <dt>Orientation</dt><dd>{s.compreh.orientation}</dd>
            </dl>
            <h3 class="sub-title">Mots-clés</h3>
            <dl class="def">
              {s.compreh.motscles.map(m => [<dt key={m.mot}>{m.mot}</dt>, <dd key={m.mot + "d"}>{m.def}</dd>])}
            </dl>

            <h2 class="section-title">Introduction</h2>
            <p>{s.intro}</p>

            <h2 class="section-title"><span class="part-num">I.</span> {s.axe1.titre}</h2>
            <Args args={s.axe1.args} />

            <aside class="callout"><p class="callout-label">Transition</p><p>{s.transition}</p></aside>

            <h2 class="section-title"><span class="part-num">II.</span> {s.axe2.titre}</h2>
            <Args args={s.axe2.args} />

            <h2 class="section-title">Conclusion</h2>
            <p>{s.conclu}</p>

            {citees.length > 0 && (
              <section aria-labelledby="citees">
                <h2 id="citees" class="section-title">Œuvres citées dans ce corrigé</h2>
                <ul class="list list-compact">
                  {citees.map(w => (
                    <li key={w.id}>
                      <a class="row" href={`#/oeuvres/${w.id}`}>
                        <span class="row-body"><span class="row-title work-title">{w.titre}</span><span class="meta">{w.auteur}</span></span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        {libre && estComplet(s) && (
          <LigneContact page={`#/sujets/${s.num}`} objet={`le sujet ${s.num}`} quoi="ce corrigé" />
        )}

        <nav class="pager" aria-label="Sujets">
          {prev ? <a class="pager-link" href={`#/sujets/${prev.num}`}><span class="meta">Précédent</span>Sujet {prev.num}</a> : <span />}
          {next ? <a class="pager-link pager-next" href={`#/sujets/${next.num}`}><span class="meta">Suivant</span>Sujet {next.num}</a> : <span />}
        </nav>
      </article>
    </Page>
  );
}
