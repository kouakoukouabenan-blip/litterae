import { noter, noterFiche } from "../lib/stats";
import { noterVue } from "../lib/historique";
import { extrait } from "../components/Partager";
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
import { Highlight } from "../components/Highlight";
import { queryTerms } from "../lib/search";
import { normalize } from "../lib/text";
import { fichesGratuites, ouvrirFiche, useFichesOuvertes, type EchecFiche } from "../lib/fiches";
import { AchatLien } from "../components/Achat";

function Note({ id }: { id: string }) {
  const { notes, setNote } = useNotes();
  const saved = notes[id] ?? "";
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [id]);
  const dirty = text !== saved;

  // Repliée tant que l'élève n'a rien noté : la fiche reste légère.
  return (
    <details class="repli note-repli" open={!!saved}>
      <summary>{saved ? "Ma note" : "Ajouter une note"}</summary>
      <label class="sr-only" for="note">Ma note sur cette œuvre</label>
      <textarea id="note" class="textarea" rows={4} value={text} onInput={e => setText((e.target as HTMLTextAreaElement).value)}
        placeholder="Une citation, l'argument où l'utiliser… (visible par toi seulement)" />
      <div class="note-actions">
        <button type="button" class="btn btn-primary" disabled={!dirty} onClick={() => { setNote(id, text); toast(text.trim() ? "Note enregistrée." : "Note supprimée."); }}>
          Enregistrer la note
        </button>
        {dirty && <button type="button" class="btn btn-secondary" onClick={() => setText(saved)}>Annuler</button>}
      </div>
    </details>
  );
}

/** Tous les arguments que l'œuvre peut illustrer ; sur une fiche ouverte, avec les idées qui les appuient. */
function ArgumentsListe({ w, ouvert, trouve, terms }: { w: Oeuvre; ouvert: boolean; trouve: number; terms: string[] }) {
  const liste = argumentsDe(w);
  return (
    <section aria-labelledby="arguments" class="arguments">
      <h2 id="arguments" class="section-title">Arguments illustrés</h2>
      <ul class="args">
        {liste.map((a, i) => (
          <li key={a.texte} id={i === trouve ? "argument-trouve" : undefined} class={`arg${i === trouve ? " argument-trouve" : ""}`}>
            <p class="arg-haut">
              <a class={`tag tag-link ${fnClass(a.fonction)}`} href={href(["oeuvres"], { fonction: a.fonction })}>{a.fonction}</a>
              {i === trouve && <span class="argument-trouve-label">Ta recherche</span>}
            </p>
            <p class="argument-texte"><Highlight text={a.texte} terms={terms} /></p>
            {ouvert && a.appuis.map(t => <p key={t} class="arg-appui"><Highlight text={t} terms={terms} /></p>)}
            {a.cle && <a class="arg-autres" href={href(["oeuvres"], { argument: a.cle })}>Autres œuvres pour cet argument</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Argument de la fiche qui correspond le mieux à la recherche de l'élève, ou -1. */
function argumentCherche(w: Oeuvre, params: URLSearchParams, terms: string[]) {
  const liste = argumentsDe(w);
  const cle = params.get("argument");
  if (cle) { const i = liste.findIndex(a => a.cle === cle); if (i > -1) return i; }
  const mots = [...terms, ...queryTerms(params.get("theme") ?? "")];
  if (!mots.length) return -1;
  let best = -1, score = 0;
  liste.forEach((a, i) => {
    const texte = normalize([a.texte, ...a.appuis].join(" "));
    const s = mots.filter(m => texte.includes(m)).length;
    if (s > score) { score = s; best = i; }
  });
  return best;
}

/** Barre de rubriques en haut de la fiche : un geste pour aller droit aux arguments. */
function Rubriques({ items }: { items: [string, string][] }) {
  const aller = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav class="sticky-bar rubriques" aria-label="Rubriques de la fiche">
      {items.map(([id, label]) => <button key={id} type="button" class="rubrique" onClick={() => aller(id)}>{label}</button>)}
    </nav>
  );
}

/** Le résumé : le premier paragraphe, puis la suite sur demande. */
function Resume({ texte, ouvrir }: { texte: string; ouvrir: boolean }) {
  const paras = texte.split(/\n\s*\n/);
  const [tout, setTout] = useState(ouvrir);
  return (
    <>
      {(tout ? paras : paras.slice(0, 1)).map((para, i) => <p key={i}>{para}</p>)}
      {paras.length > 1 && !tout && (
        <button type="button" class="lien-suite" onClick={() => setTout(true)}>Lire tout le résumé<Icon name="expand_more" size={20} /></button>
      )}
    </>
  );
}

/** Ce que contient la fiche, annoncé avant l'achat. */
function contenuFiche(w: Oeuvre) {
  if (!w.detaillee) return "Fiche courte : un résumé bref, les thèmes et les fonctions de l'œuvre.";
  const n = w.idees.length;
  return `Cette fiche contient un résumé complet, ${n} idée${n > 1 ? "s" : ""} d'illustration reliée${n > 1 ? "s" : ""} aux fonctions de la littérature et une phrase d'exemple prête à recopier.`;
}

/** Ouverture d'une fiche gratuite : un court message pendant l'envoi, ou ce qui bloque. */
function OuvertureFiche({ echec, reessayer }: { echec: EchecFiche | null; reessayer: () => void }) {
  if (!echec) return <p class="muted fiche-chargement" role="status">Ouverture de la fiche…</p>;
  return (
    <div class="fiche-echec" role="alert">
      <p>{echec === "hors-ligne" ? "Connecte-toi à Internet pour ouvrir cette fiche. Elle restera ensuite sur ton téléphone."
        : echec === "trop" ? "Trop de fiches ouvertes depuis cette connexion. Réessaie dans une heure."
        : "La fiche n'a pas pu s'ouvrir."}</p>
      <button type="button" class="btn btn-secondary" onClick={reessayer}>Réessayer</button>
    </div>
  );
}

export function OeuvreScreen({ id, params }: { id: string; params: URLSearchParams }) {
  const base = oeuvre(id);
  const access = useAccess();
  const ouvertes = useFichesOuvertes();
  // Fiche ouverte gratuitement pendant cette visite : son texte vient d'arriver sur l'appareil.
  const texte = !access.premium ? ouvertes[id] : undefined;
  const w = base && texte && !base.resume ? { ...base, ...texte, exemple: texte.exemple ?? base.exemple } : base;
  const libre = !!w && access.canOpenWork(id);
  const aOuvrir = !!w && libre && !access.premium && !texte;
  const [echec, setEchec] = useState<EchecFiche | null>(null);
  const [essai, setEssai] = useState(0);
  // Sans clé, ouvrir la fiche la compte dans les 10 gratuites (comme un mot du dictionnaire).
  useEffect(() => {
    if (!aOuvrir) return;
    let actif = true;
    setEchec(null);
    ouvrirFiche(id).then(r => { if (actif && typeof r === "string") setEchec(r); });
    return () => { actif = false; };
  }, [id, aOuvrir, essai]);
  const terms = queryTerms(params.get("q") ?? "");
  const trouve = w ? argumentCherche(w, params, terms) : -1;
  // Arrivé depuis une recherche : la fiche s'ouvre sur l'argument qui correspond.
  useEffect(() => {
    if (trouve < 0) return;
    const t = setTimeout(() => document.getElementById("argument-trouve")?.scrollIntoView({ block: "start" }), 120);
    return () => clearTimeout(t);
  }, [id, trouve]);
  useEffect(() => { if (w) { noter({ t: "oeuvre", ref: id }); noterFiche(id); noterVue("oeuvre", id); } }, [id]);
  const { isSaved, toggle } = useSaved();
  const lisible = libre && !aOuvrir && echec !== "limite";
  if (!w) return <NotFound what="Cette œuvre n'existe pas." back="#/oeuvres" />;

  const saved = isSaved(id);
  const sujets = sujetsCitant(id);

  return (
    <Page title={w.titre} back="#/oeuvres" actions={lisible && (
      <button type="button" class="icon-btn" aria-pressed={saved} aria-label={saved ? "Retirer de mon carnet" : "Enregistrer dans mon carnet"}
        onClick={() => { toggle(id); toast(saved ? "Retirée du carnet." : "Enregistrée dans ton carnet."); }}>
        <Icon name="bookmark" filled={saved} />
      </button>
    )} partage={{
      type: "oeuvre", cle: id, titre: w.titre, chemin: `#/oeuvres/${encodeURIComponent(id)}`,
      texte: [`${w.titre}, ${/^[aeiouyàâéèêëîïôöùûü]/i.test(w.auteur) ? "d'" : "de "}${w.auteur}`,
        [w.genre, w.paysTexte].filter(Boolean).join(" · "),
        w.themes.length ? `Thèmes : ${w.themes.slice(0, 5).join(", ")}.` : "",
        w.fonctions.length ? `Fonctions littéraires : ${w.fonctions.join(", ")}.` : "",
        // Début du résumé seulement pour une fiche ouverte gratuitement : le reste fait partie de l'accès complet.
        texte ? extrait(w.resume) : "",
        "Fiche complète sur Litterae :"].filter(Boolean).join("\n")
    }}>
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">{w.genre}{w.precision ? ` · ${w.precision}` : ""}</p>
          <h1 class="page-title work-page-title">{w.titre}</h1>
          <p class="lede">{w.auteur}{w.paysTexte && ` · ${w.paysTexte}`}</p>
          {texte && (
            <p class="small muted fiche-quota">Fiche gratuite {access.nbOuvertes} sur {fichesGratuites()}. <AchatLien label="Tout débloquer" /></p>
          )}
        </header>

        {aOuvrir && echec !== "limite" ? (
          <OuvertureFiche echec={echec} reessayer={() => setEssai(essai + 1)} />
        ) : !lisible ? (
          <>
            <LockPanel reason={`Tu as ouvert tes ${fichesGratuites()} fiches gratuites.`} contenu={contenuFiche(w)} />
            <ArgumentsListe w={w} ouvert={false} trouve={trouve} terms={terms} />
          </>
        ) : (
          <>
            <Rubriques items={[
              ["resume", "Résumé"], ["arguments", "Arguments"], ["copie", "Pour ta copie"],
              ...(sujets.length ? [["sujets-citant", "Sujets"] as [string, string]] : [])
            ]} />

            <div class="prose">
              {w.detaillee === false && (
                <p class="notice-court small">Fiche courte : résumé bref et repères pour trouver l'œuvre par thème.</p>
              )}
              <h2 id="resume" class="section-title">Résumé</h2>
              {w.resume ? <Resume key={id} texte={w.resume} ouvrir={terms.length > 0} /> : <p class="muted">Le résumé de cette œuvre n'est pas encore rédigé. Les thèmes ci-dessous indiquent déjà comment l'utiliser.</p>}

              <ArgumentsListe w={w} ouvert trouve={trouve} terms={terms} />

              {/* Ce que l'élève recopie : la phrase d'exemple et la référence de l'œuvre. */}
              <section aria-labelledby="copie">
                <h2 id="copie" class="section-title">Pour ta copie</h2>
                {w.exemple && <blockquote class="exemple">{w.exemple}</blockquote>}
                <div class="actions copie-actions">
                  {w.exemple && (
                    <button type="button" class="btn btn-secondary" onClick={() => copyText(w.exemple!, "Phrase copiée.")}>
                      <Icon name="content_copy" size={20} />Copier la phrase
                    </button>
                  )}
                  <button type="button" class="btn btn-secondary" onClick={() => copyText(reference(w), "Référence copiée.")}>
                    <Icon name="content_copy" size={20} />Copier la référence
                  </button>
                </div>
              </section>

              <dl class="facts">
                {w.niveaux?.length ? <><dt>Au programme en Côte d'Ivoire</dt><dd class="tags">{w.niveaux.map(n => <a key={n} class="tag tag-link" href={href(["oeuvres"], { programme: n })}>{n}</a>)}{w.editeur && <span class="meta"> · {w.editeur}</span>}</dd></> : null}
                <dt>Thèmes</dt>
                <dd class="tags">{w.themes.map(t => <a key={t} class="tag tag-link" href={href(["oeuvres"], { theme: t })}>{t}</a>)}</dd>
                {w.motsCles.length > 0 && <dd class="meta">Mots-clés : {w.motsCles.join(", ")}</dd>}
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
