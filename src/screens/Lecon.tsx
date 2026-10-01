import { useEffect } from "preact/hooks";
import { extrait } from "../components/Partager";
import { LECONS } from "../lib/lecons";
import type { BlocLecon } from "../data/types";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { useStored } from "../lib/storage";
import { NotFound } from "./NotFound";
import { QuizLecon } from "../components/Quiz";
import { LockPanel } from "../components/LockPanel";
import { useAccess } from "../lib/access";
import { LigneContact } from "../components/LigneContact";
import { noter } from "../lib/stats";

function Bloc({ b }: { b: BlocLecon }) {
  if ("p" in b) return <p>{b.p}</p>;
  if ("h" in b) return <h2 class="section-title">{b.h}</h2>;
  if ("liste" in b) return <ul class="bullets">{b.liste.map(x => <li key={x}>{x}</li>)}</ul>;
  if ("astuce" in b) return <aside class="callout"><p class="callout-label">Astuce</p><p>{b.astuce}</p></aside>;
  if ("etapes" in b)
    return (
      <ol class="steps">
        {b.etapes.map(([t, d]) => <li key={t}><strong>{t}</strong><span>{d}</span></li>)}
      </ol>
    );
  if ("sujet" in b) return <blockquote class="citation">{b.sujet}</blockquote>;
  if ("def" in b)
    return (
      <dl class="def">
        {b.def.map(([k, v]) => [<dt key={k}>{k}</dt>, <dd key={k + "d"}>{v}</dd>])}
      </dl>
    );
  if ("modele" in b) return <figure class="model"><figcaption>Exemple rédigé</figcaption><p>{b.modele}</p></figure>;
  if ("plan" in b) return <ol class="outline">{b.plan.map(x => <li key={x}>{x}</li>)}</ol>;
  // Lien venu du serveur : seulement vers une page de l'appli ou un site https.
  if ("lien" in b) return /^(https:\/\/|#\/)/.test(b.lien.href) && <a class="btn btn-secondary align-start" href={b.lien.href}><Icon name="local_library" size={20} />{b.lien.texte}</a>;
  return null;
}

export function LeconScreen({ id }: { id: string }) {
  const i = LECONS.findIndex(l => l.id === id);
  useEffect(() => { if (i > -1) noter({ t: "lecon", ref: id }); }, [id]);
  const [lues, setLues] = useStored<string[]>("lecons-lues", []);
  const { premium } = useAccess();
  const verrouillee = i > -1 && !!LECONS[i].payante && !premium;
  useEffect(() => {
    if (i > -1 && !verrouillee && !lues.includes(id)) setLues([...lues, id]);
  }, [id]);
  if (i < 0) return <NotFound what="Cette leçon n'existe pas." back="#/cours" />;
  const l = LECONS[i], prev = LECONS[i - 1], next = LECONS[i + 1];

  return (
    <Page title={`Leçon ${i + 1}`} back="#/cours" partage={{
      type: "lecon", cle: l.id, titre: l.titre, chemin: `#/cours/${l.id}`,
      texte: [`Leçon ${i + 1} : « ${l.titre} » (${l.duree} de lecture).`,
        !l.payante && extrait((l.blocs.find(b => "p" in b) as { p: string } | undefined)?.p),
        "À lire sur Litterae, la dissertation littéraire pas à pas :"].filter(Boolean).join("\n\n")
    }}>
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Leçon {i + 1} sur {LECONS.length} · {l.duree}</p>
          <h1 class="page-title">{l.titre}</h1>
        </header>
        {verrouillee ? (
          <LockPanel reason="Cette leçon fait partie de l'accès complet." />
        ) : (
          <div class="prose">{l.blocs.map((b, k) => <Bloc key={k} b={b} />)}</div>
        )}
        <QuizLecon id={l.id} />
        {!verrouillee && <LigneContact page={`#/cours/${l.id}`} objet={`la leçon « ${l.titre} »`} quoi="cette leçon" />}
        <nav class="pager" aria-label="Leçons">
          {prev ? <a class="pager-link" href={`#/cours/${prev.id}`}><span class="meta">Précédente</span>{prev.titre}</a> : <span />}
          {next ? (
            <a class="pager-link pager-next" href={`#/cours/${next.id}`}><span class="meta">Suivante</span>{next.titre}</a>
          ) : (
            <a class="pager-link pager-next" href="#/sujets"><span class="meta">Et maintenant</span>Les sujets corrigés</a>
          )}
        </nav>
      </article>
    </Page>
  );
}
