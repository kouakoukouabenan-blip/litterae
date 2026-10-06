import { Texte } from "../components/Texte";
import type { RefObject } from "preact";
import { useRef, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { numero, sujetsEntrainement } from "../lib/entrainement";
import { avancement, lireBrouillon } from "../lib/atelier";
import { read, write } from "../lib/storage";
import { SujetsOnglets } from "../components/SujetsOnglets";

const GUIDE_VU = "atelier-guide-vu";

const GUIDE: [string, string][] = [
  ["Comprendre le sujet", "Thème, thèse, orientation et mots-clés."],
  ["Faire le plan", "Une thèse, une antithèse, chacune avec ses arguments et ses œuvres."],
  ["Rédiger", "L'introduction, le développement, puis la conclusion."],
  ["Relire ta copie", "Tout s'assemble à la dernière étape. Avec l'accès complet, tu l'envoies au prof pour correction."]
];

/** Petit guide montré avant le premier exercice, et à la demande. */
function Guide({ dialogue, cible }: { dialogue: RefObject<HTMLDialogElement>; cible: string | null }) {
  const fermer = () => dialogue.current?.close();
  return (
    <dialog ref={dialogue} class="sheet" aria-labelledby="guide-titre"
      onClick={e => e.target === dialogue.current && fermer()}>
      <div class="sheet-head">
        <h2 id="guide-titre" class="section-title">Comment traiter un exercice</h2>
        <button type="button" class="icon-btn" onClick={fermer} aria-label="Fermer"><Icon name="close" /></button>
      </div>
      <div class="sheet-body">
        <ol class="guide-etapes">
          {GUIDE.map(([titre, texte], i) => (
            <li key={titre}>
              <span class="step-num" aria-hidden="true">{i + 1}</span>
              <span><strong>{titre}</strong><span class="guide-texte">{texte}</span></span>
            </li>
          ))}
        </ol>
        <p class="small muted">Ton travail reste sur ce téléphone. Bloqué ? Touche « Aide » sous la consigne.</p>
      </div>
      <div class="sheet-foot sheet-foot-single">
        {cible
          ? <a class="btn btn-primary" href={`#/entrainement/${cible}`} onClick={fermer}>Traiter le sujet {numero(cible)}</a>
          : <button type="button" class="btn btn-primary" onClick={fermer}>J'ai compris</button>}
      </div>
    </dialog>
  );
}

/** Tous les sujets, sans corrigé ni orientation : l'élève les rédige seul dans l'atelier, comme le jour de l'examen. */
export function EntrainementScreen() {
  const sujets = sujetsEntrainement();
  const dialogue = useRef<HTMLDialogElement>(null);
  const [cible, setCible] = useState<string | null>(null);
  const ouvrirGuide = (num: string | null) => {
    write(GUIDE_VU, true);
    setCible(num);
    dialogue.current?.showModal();
  };

  return (
    <Page title="Sujets d'entraînement">
      <SujetsOnglets actif="entrainement" />
      <PageHeader title="Sujets d'entraînement" compact>
        {sujets.length} sujets à rédiger seul, pas à pas.{" "}
        <button type="button" class="link-btn guide-lien" onClick={() => ouvrirGuide(null)}>Comment ça marche ?</button>
      </PageHeader>
      <ol class="list" aria-label="Sujets d'entraînement">
        {sujets.map(s => {
          const b = lireBrouillon(s.num);
          const pct = avancement(b);
          return (
            <li key={s.num}>
              <a class="row row-top" href={`#/entrainement/${s.num}`}
                onClick={e => { if (!read(GUIDE_VU, false)) { e.preventDefault(); ouvrirGuide(s.num); } }}>
                <span class="sujet-num" aria-hidden="true">{numero(s.num)}</span>
                <span class="row-body">
                  <span class="sr-only">Sujet {numero(s.num)}</span>
                  <span class="row-quote">« <Texte text={s.citation} /> »</span>
                  <span class="meta">{s.auteur}</span>
                  {pct ? (
                    <span class={`entrainement-etat ${pct === 100 ? "entrainement-fini" : "entrainement-encours"}`}>
                      {pct === 100 ? "Terminé" : `Fait à ${pct} %`}{b?.envoye ? " · copie envoyée" : ""}
                    </span>
                  ) : (
                    <span class="btn btn-secondary entrainement-traiter">Traiter cet exercice</span>
                  )}
                </span>
                <Icon name="chevron_right" />
              </a>
            </li>
          );
        })}
      </ol>
      <Guide dialogue={dialogue} cible={cible} />
    </Page>
  );
}
