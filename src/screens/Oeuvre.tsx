import { useEffect, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { LockPanel } from "../components/LockPanel";
import { copyText, toast } from "../components/Toast";
import { oeuvre, reference, sujetsCitant } from "../lib/data";
import { useAccess } from "../lib/access";
import { useNotes, useSaved } from "../lib/carnet";
import { href } from "../lib/router";
import { NotFound } from "./NotFound";
import { fnClass } from "../lib/fonctions";
import type { Oeuvre } from "../data/types";

function Note({ id }: { id: string }) {
  const { notes, setNote } = useNotes();
  const saved = notes[id] ?? "";
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [id]);
  const dirty = text !== saved;

  return (
    <section aria-labelledby="note-title">
      <h2 id="note-title" class="section-title">Ma note</h2>
            <label class="sr-only" for="note">Ma note sur cette œuvre</label>
      <textarea id="note" class="textarea" rows={4} value={text} onInput={e => setText((e.target as HTMLTextAreaElement).value)}
        placeholder="Une citation, l'argument où l'utiliser… (visible par toi seulement)" />
      <div class="note-actions">
        <button type="button" class="btn btn-primary" disabled={!dirty} onClick={() => { setNote(id, text); toast(text.trim() ? "Note enregistrée." : "Note supprimée."); }}>
          Enregistrer la note
        </button>
        {dirty && <button type="button" class="btn btn-secondary" onClick={() => setText(saved)}>Annuler</button>}
      </div>
    </section>
  );
}

/** Ce que contient la fiche, annoncé avant l'achat. */
function contenuFiche(w: Oeuvre) {
  if (!w.detaillee) return "Fiche courte : un résumé bref, les thèmes et les fonctions de l'œuvre.";
  const n = w.idees.length;
  return `Cette fiche contient un résumé complet, ${n} idée${n > 1 ? "s" : ""} d'illustration reliée${n > 1 ? "s" : ""} aux fonctions de la littérature et une phrase d'exemple prête à recopier.`;
}

export function OeuvreScreen({ id }: { id: string }) {
  const w = oeuvre(id);
  const access = useAccess();
  const { isSaved, toggle } = useSaved();
  const libre = !!w && access.canOpenWork(id);
  if (!w) return <NotFound what="Cette œuvre n'existe pas." back="#/oeuvres" />;

  const saved = isSaved(id);
  const sujets = sujetsCitant(id);

  return (
    <Page title={w.titre} back="#/oeuvres">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">{w.genre}{w.precision ? ` · ${w.precision}` : ""}</p>
          <h1 class="page-title work-page-title">{w.titre}</h1>
          <p class="lede">{w.auteur}{w.paysTexte && ` · ${w.paysTexte}`}</p>
        </header>

        {!libre ? (
          <LockPanel reason="Cette fiche fait partie de l'accès complet." contenu={contenuFiche(w)} />
        ) : (
          <>
            <div class="actions">
              <button type="button" class="btn btn-secondary" aria-pressed={saved}
                onClick={() => { toggle(id); toast(saved ? "Retirée du carnet." : "Enregistrée dans ton carnet."); }}>
                <Icon name="bookmark" filled={saved} size={20} />{saved ? "Enregistrée" : "Enregistrer"}
              </button>
              <button type="button" class="btn btn-secondary" onClick={() => copyText(reference(w), "Référence copiée.")}>
                <Icon name="content_copy" size={20} />Copier la référence
              </button>
            </div>

            <div class="prose">
              {w.detaillee === false && (
                <p class="notice-court small">Fiche courte : résumé bref et repères pour trouver l'œuvre par thème. Pour citer une œuvre en détail, préfère une fiche détaillée.</p>
              )}
              <h2 class="section-title">Résumé</h2>
              {w.resume ? <p>{w.resume}</p> : <p class="muted">Le résumé de cette œuvre n'est pas encore rédigé. Les thèmes et mots-clés ci-dessous indiquent déjà comment l'utiliser.</p>}

              {w.idees.length > 0 && (
                <section aria-labelledby="idees">
                  <h2 id="idees" class="section-title">Pour illustrer un argument</h2>
                  <ul class="ideas">
                    {w.idees.map((i, k) => (
                      <li key={k}>
                        <p>{i.texte}</p>
                        <p class="meta">{i.argument} · fonction {i.fonction.toLowerCase()}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {w.exemple && (
                <section aria-labelledby="exemple">
                  <h2 id="exemple" class="section-title">Phrase d'exemple</h2>
                  <blockquote class="exemple">{w.exemple}</blockquote>
                  <button type="button" class="btn btn-secondary" onClick={() => copyText(w.exemple!, "Phrase copiée.")}>
                    <Icon name="content_copy" size={20} />Copier la phrase
                  </button>
                </section>
              )}

              <dl class="facts">
                <dt>Fonction littéraire</dt>
                <dd class="tags">{w.fonctions.map(f => <a key={f} class={`tag tag-link ${fnClass(f)}`} href={href(["oeuvres"], { fonction: f })}>{f}</a>)}</dd>
                <dt>Thèmes</dt>
                <dd class="tags">{w.themes.map(t => <a key={t} class="tag tag-link" href={href(["oeuvres"], { theme: t })}>{t}</a>)}</dd>
                {w.motsCles.length > 0 && <><dt>Mots-clés</dt><dd>{w.motsCles.join(", ")}</dd></>}
              </dl>

              {sujets.length > 0 && (
                <section aria-labelledby="sujets-citant">
                  <h2 id="sujets-citant" class="section-title">Citée dans les sujets corrigés</h2>
                  <ul class="list list-compact">
                    {sujets.map(s => (
                      <li key={s.num}>
                        <a class="row" href={`#/sujets/${s.num}`}>
                          <span class="row-body"><span class="row-quote">« {s.citation} »</span><span class="meta">Sujet {s.num}</span></span>
                          <Icon name="chevron_right" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Note id={id} />
            </div>
          </>
        )}
      </article>
    </Page>
  );
}
