import { useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { Texte } from "../components/Texte";
import { Segments } from "../components/SujetsOnglets";
import { useAccesCC as useAccess } from "../data/cc-donnees";
import { useStored } from "../lib/storage";
import { NotFound } from "./NotFound";
import { CORRIGES_CC, SUJETS_CC, type TexteEtudie } from "../data/commentaire";
import { ETUDES_CC } from "../data/commentaire-etudes";
import { GENRES, GENRES_SOURCE, GENRE_COMMENTAIRE, GENRE_DEFINITION } from "../data/genres";
import { TEST_TONALITES, TONALITES, TONALITES_SOURCE, TONALITE_COMMENTAIRE, TONALITE_DEFINITION } from "../data/tonalites";
import { Cadenas, TexteEtudieBloc, VerrouCC } from "./Commentaire";

// Commentaire composé : l'onglet « Genres » remplace « Œuvres ».
// Adresses : #/cc/genres, #/cc/genres/<id>, #/cc/tonalites, #/cc/tonalites/<id>, #/cc/tonalites/test.

const TEXTES: TexteEtudie[] = [...CORRIGES_CC, ...SUJETS_CC];
const texteDe = (id: string) => TEXTES.find(t => t.id === id);
const estCorrige = (id: string) => CORRIGES_CC.some(c => c.id === id);

function OngletsGenres({ actif }: { actif: "genres" | "tonalites" }) {
  return <Segments groupe="cc-genres" label="Genres et tonalités" items={[
    { label: "Genres littéraires", href: "#/cc/genres", actif: actif === "genres" },
    { label: "Tonalités", href: "#/cc/tonalites", actif: actif === "tonalites" }
  ]} />;
}

/** « À quoi ça sert dans mon commentaire ? », replié sous le titre. */
function DansTonCommentaire({ points }: { points: { titre: string; texte: string }[] }) {
  return (
    <details class="repli">
      <summary>À quoi ça sert dans mon commentaire ?</summary>
      <dl class="cc-notions">{points.map(p => <div key={p.titre}><dt>{p.titre}</dt><dd>{p.texte}</dd></div>)}</dl>
    </details>
  );
}

export function GenresCC() {
  const { premium } = useAccess();
  return (
    <Page>
      <OngletsGenres actif="genres" />
      <header class="page-header">
        <h1 class="page-title">Les genres littéraires</h1>
        <p class="lede">Roman, théâtre, poésie : savoir ce que tu commentes.</p>
      </header>
      <details class="repli cc-definition">
        <summary>Qu'est-ce qu'un genre littéraire ?</summary>
        <p>{GENRE_DEFINITION.texte}</p>
        <dl class="cc-notions">{GENRE_DEFINITION.familles.map(f => <div key={f.mot}><dt>{f.mot}</dt><dd>{f.sens}</dd></div>)}</dl>
      </details>
      <DansTonCommentaire points={GENRE_COMMENTAIRE} />
      <aside class="callout"><p class="callout-label">À retenir</p><p>{GENRE_DEFINITION.retenir}</p></aside>
      <ol class="list" aria-label="Genres">
        {GENRES.map((g, i) => (
          <li key={g.id}>
            <a class="row" href={`#/cc/genres/${g.id}`}>
              <span class="step-num" aria-hidden="true">{i + 1}</span>
              <span class="row-body"><span class="row-title">{g.nom}</span><span class="meta">{g.resume}</span></span>
              {premium ? <Icon name="chevron_right" /> : <Cadenas />}
            </a>
          </li>
        ))}
      </ol>
      <p class="small muted cc-source">D'après : {GENRES_SOURCE}.</p>
    </Page>
  );
}

export function GenreDetailCC({ id }: { id: string }) {
  const i = GENRES.findIndex(g => g.id === id);
  const { premium } = useAccess();
  if (i < 0) return <NotFound what="Cette partie n'existe pas." back="#/cc/genres" />;
  const g = GENRES[i], prev = GENRES[i - 1], next = GENRES[i + 1];
  const t = texteDe(g.exercice.texte);
  return (
    <Page title={g.nom} back="#/cc/genres">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Genres littéraires · {i + 1} sur {GENRES.length}</p>
          <h1 class="page-title">{g.nom}</h1>
          <p class="lede">{g.resume}</p>
        </header>
        {!premium ? <VerrouCC /> : <div class="prose">
          {g.definition.map(p => <p key={p}><Texte text={p} /></p>)}
          {g.notions.map(n => (
            <section key={n.titre} class="cc-carte">
              <h2 class="cc-carte-titre">{n.titre}</h2>
              <dl class="cc-notions">{n.liste.map(x => <div key={x.mot}><dt>{x.mot}</dt><dd><Texte text={x.sens} /></dd></div>)}</dl>
            </section>
          ))}
          {g.sousGenres.length > 0 && (
            <details class="repli">
              <summary>Les sous-genres ({g.sousGenres.length})</summary>
              <dl class="cc-notions">{g.sousGenres.map(x => <div key={x.mot}><dt>{x.mot}</dt><dd><Texte text={x.sens} /></dd></div>)}</dl>
            </details>
          )}
          <aside class="callout"><p class="callout-label">Dans ton commentaire</p><ul class="bullets">{g.commentaire.map(c => <li key={c}>{c}</li>)}</ul></aside>
          {t && (
            <section class="cc-exercice">
              <h2 class="section-title">Exercice</h2>
              <p>Lis ce texte, puis réponds aux questions.</p>
              <TexteEtudieBloc t={t} />
              <ol class="cc-phrases">
                {g.exercice.questions.map(q => (
                  <li key={q.q}>
                    <Texte text={q.q} />
                    <details class="repli cc-correction"><summary>Voir la correction</summary><p><Texte text={q.r} /></p></details>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>}
        <nav class="pager" aria-label="Genres">
          {prev ? <a class="pager-link" href={`#/cc/genres/${prev.id}`}><span class="meta">Précédent</span>{prev.nom}</a> : <span />}
          {next
            ? <a class="pager-link pager-next" href={`#/cc/genres/${next.id}`}><span class="meta">Suivant</span>{next.nom}</a>
            : <a class="pager-link pager-next" href="#/cc/tonalites"><span class="meta">Et maintenant</span>Les tonalités</a>}
        </nav>
      </article>
    </Page>
  );
}

export function TonalitesCC() {
  const { premium } = useAccess();
  const [meilleur] = useStored<number | null>("cc-test-tonalites", null);
  return (
    <Page>
      <OngletsGenres actif="tonalites" />
      <header class="page-header">
        <h1 class="page-title">Les tonalités</h1>
        <p class="lede">L'impression que le texte laisse au lecteur.</p>
      </header>
      <details class="repli cc-definition">
        <summary>Qu'est-ce qu'une tonalité ?</summary>
        {TONALITE_DEFINITION.texte.map(p => <p key={p}>{p}</p>)}
      </details>
      <DansTonCommentaire points={TONALITE_COMMENTAIRE} />
      <aside class="callout"><p class="callout-label">À retenir</p><p>{TONALITE_DEFINITION.retenir}</p></aside>
      <a class="btn btn-primary align-start" href="#/cc/tonalites/test">
        <Icon name="quiz" size={20} />Me tester : quelle tonalité ?
        {premium && meilleur !== null && <span class="cc-score"> · {meilleur}/{TEST_TONALITES.length}</span>}
      </a>
      <ol class="list" aria-label="Tonalités">
        {TONALITES.map((t, i) => (
          <li key={t.id}>
            <a class="row" href={`#/cc/tonalites/${t.id}`}>
              <span class="step-num" aria-hidden="true">{i + 1}</span>
              <span class="row-body"><span class="row-title">{t.nom}</span><span class="meta">{t.retenir}</span></span>
              {premium ? <Icon name="chevron_right" /> : <Cadenas />}
            </a>
          </li>
        ))}
      </ol>
      <p class="small muted cc-source">D'après : {TONALITES_SOURCE}.</p>
    </Page>
  );
}

/** Exercices corrigés dont la tonalité nommée commence par cet adjectif (ou le contient). */
function corrigesDe(adjectif: string) {
  return CORRIGES_CC.filter(c => {
    const ton = ETUDES_CC[c.id]?.tonalite.split(":")[0].toLowerCase() ?? "";
    return ton.includes(adjectif);
  });
}

export function TonaliteDetailCC({ id }: { id: string }) {
  const i = TONALITES.findIndex(t => t.id === id);
  const { premium } = useAccess();
  if (i < 0) return <NotFound what="Cette tonalité n'existe pas." back="#/cc/tonalites" />;
  const t = TONALITES[i], prev = TONALITES[i - 1], next = TONALITES[i + 1];
  const corriges = corrigesDe(t.adjectif);
  const ex = t.exemple;
  return (
    <Page title={t.nom} back="#/cc/tonalites">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Tonalités · {i + 1} sur {TONALITES.length}</p>
          <h1 class="page-title">{t.nom}</h1>
          <p class="lede">{t.retenir}</p>
        </header>
        {!premium ? <VerrouCC /> : <div class="prose">
          <p>{t.definition}</p>
          <section class="cc-carte">
            <h2 class="cc-carte-titre">Comment la reconnaître</h2>
            <ul class="bullets">{t.indices.map(x => <li key={x}>{x}</li>)}</ul>
            {t.themes && <p class="small"><strong>Thèmes fréquents :</strong> {t.themes}</p>}
          </section>
          <aside class="callout">
            <p class="callout-label">Dans ton commentaire</p>
            <p>{t.commentaire}</p>
            <p class="small"><strong>Centres d'intérêt possibles :</strong> {t.centres.join(" ; ")}.</p>
            <p class="small"><strong>Pour l'introduction :</strong> « {t.formule} »</p>
          </aside>
          <section class="cc-exercice">
            <h2 class="section-title">Un texte pour la reconnaître</h2>
            <TexteEtudieBloc t={{ id: t.id, consigne: "", ...ex }} />
            <details class="repli cc-correction">
              <summary>Ce qu'il faut repérer</summary>
              <ul class="bullets">{ex.reperes.map(r => <li key={r}><Texte text={r} /></li>)}</ul>
              {ex.remarque && <p class="small muted">{ex.remarque}</p>}
            </details>
          </section>
          {corriges.length > 0 && (
            <section>
              <h2 class="section-title">Dans les exercices corrigés</h2>
              <ul class="list">{corriges.map(c => (
                <li key={c.id}><a class="row" href={`#/cc/corriges/${c.id}`}><span class="row-body"><span class="row-title">{c.titre}</span><span class="meta">{c.auteur}</span></span><Icon name="chevron_right" /></a></li>
              ))}</ul>
            </section>
          )}
        </div>}
        <nav class="pager" aria-label="Tonalités">
          {prev ? <a class="pager-link" href={`#/cc/tonalites/${prev.id}`}><span class="meta">Précédente</span>{prev.nom}</a> : <span />}
          {next
            ? <a class="pager-link pager-next" href={`#/cc/tonalites/${next.id}`}><span class="meta">Suivante</span>{next.nom}</a>
            : <a class="pager-link pager-next" href="#/cc/tonalites/test"><span class="meta">Et maintenant</span>Me tester</a>}
        </nav>
      </article>
    </Page>
  );
}

export function TestTonalitesCC() {
  const { premium } = useAccess();
  const [n, setN] = useState(0);
  const [choix, setChoix] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [meilleur, setMeilleur] = useStored<number | null>("cc-test-tonalites", null);
  const total = TEST_TONALITES.length;
  const q = TEST_TONALITES[n];
  const source = q && texteDe(q.texte);

  function repondre(c: string) {
    if (choix !== null) return;
    setChoix(c);
    if (c === q.bonne) setScore(score + 1);
  }
  function suivante() {
    if (n + 1 >= total && score > (meilleur ?? -1)) setMeilleur(score);
    setN(n + 1); setChoix(null);
  }

  return (
    <Page title="Quelle tonalité ?" back="#/cc/tonalites">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Tonalités · test</p>
          <h1 class="page-title">Quelle tonalité ?</h1>
          <p class="lede">{total} extraits des textes de l'application.</p>
        </header>
        {!premium ? <VerrouCC /> : n >= total ? (
          <div class="quiz-card quiz-fin" role="status">
            <p class="quiz-score">{score} / {total}</p>
            <p>{score === total ? "Parfait, tu reconnais les tonalités." : score >= total / 2 ? "Bien. Relis les tonalités manquées, puis refais le test." : "Relis les fiches des tonalités, puis refais le test."}</p>
            {meilleur !== null && <p class="small muted">Meilleur score : {meilleur} / {total}</p>}
            <button type="button" class="btn btn-secondary align-start" onClick={() => { setN(0); setChoix(null); setScore(0); }}>Recommencer</button>
          </div>
        ) : (
          <div class="quiz-card">
            <p class="small muted">Extrait {n + 1} sur {total}</p>
            <blockquote class="cc-extrait">
              {q.extrait.split("\n").map(l => <span key={l} class="cc-ligne">{l}</span>)}
              {source && <footer class="small muted">{source.auteur}, <Texte text={source.source} /></footer>}
            </blockquote>
            <p class="quiz-q">Quelle est la tonalité dominante ?</p>
            <ul class="quiz-choix">
              {q.choix.map(c => {
                const etat = choix === null ? "" : c === q.bonne ? "ok" : c === choix ? "faux" : "";
                return (
                  <li key={c}>
                    <button type="button" class={`quiz-option ${etat}`} disabled={choix !== null} aria-pressed={choix === c} onClick={() => repondre(c)}>
                      <span>{c[0].toUpperCase() + c.slice(1)}</span>
                      {etat === "ok" && <Icon name="check" size={20} />}
                      {etat === "faux" && <Icon name="close" size={20} />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {choix !== null && (
              <div class="quiz-correction" role="status">
                <p><strong>{choix === q.bonne ? "Bonne réponse." : `Non : ${q.bonne}.`}</strong> <Texte text={q.pourquoi} /></p>
                {source && <a class="small" href={`#/cc/${estCorrige(q.texte) ? "corriges" : "entrainement"}/${q.texte}`}>Voir le texte en entier</a>}
                <button type="button" class="btn btn-primary align-start" onClick={suivante}>{n + 1 < total ? "Extrait suivant" : "Voir mon score"}</button>
              </div>
            )}
          </div>
        )}
      </article>
    </Page>
  );
}
