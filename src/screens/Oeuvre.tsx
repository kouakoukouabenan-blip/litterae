import { noter, noterFiche } from "../lib/stats";
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
import { argumentsDe } from "../lib/arguments";
import { LigneContact } from "../components/LigneContact";

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

/** Tous les arguments que l'œuvre peut illustrer ; sur une fiche ouverte, avec les idées qui les appuient. */
function ArgumentsListe({ w, ouvert }: { w: Oeuvre; ouvert: boolean }) {
  const liste = argumentsDe(w);
  return (
    <section aria-labelledby="arguments" class="arguments">
      <h2 id="arguments" class="section-title">Arguments que cette œuvre illustre</h2>
      <ul class="ideas">
        {liste.map(a => (
          <li key={a.texte}>
            <p class="argument-texte">{a.texte}</p>
            {ouvert && a.appuis.length > 0 && (
              <ul class="argument-appuis">{a.appuis.map(t => <li key={t}>{t}</li>)}</ul>
            )}
            <p class="meta">
              Fonction {a.fonction.toLowerCase()}
              {a.cle && <> · <a href={href(["oeuvres"], { argument: a.cle })}>autres œuvres pour cet argument</a></>}
            </p>
          </li>
        ))}
      </ul>
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
  useEffect(() => { if (w) { noter({ t: "oeuvre", ref: id }); noterFiche(id); } }, [id]);
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
          <>
            <LockPanel reason="Cette fiche fait partie de l'accès complet." contenu={contenuFiche(w)} />
            <ArgumentsListe w={w} ouvert={false} />
          </>
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
              {w.resume ? w.resume.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>) : <p class="muted">Le résumé de cette œuvre n'est pas encore rédigé. Les thèmes et mots-clés ci-dessous indiquent déjà comment l'utiliser.</p>}

              <ArgumentsListe w={w} ouvert />

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
                {w.niveaux?.length ? <><dt>Au programme en Côte d'Ivoire</dt><dd class="tags">{w.niveaux.map(n => <a key={n} class="tag tag-link" href={href(["oeuvres"], { programme: n })}>{n}</a>)}{w.editeur && <span class="meta"> · {w.editeur}</span>}</dd></> : null}
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
        <LigneContact page={`#/oeuvres/${id}`} objet={`la fiche « ${w.titre} »`} quoi="cette fiche" />
      </article>
    </Page>
  );
}
