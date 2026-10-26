import { useMemo, useState } from "preact/hooks";
import type { BaseName } from "./Icon";
import { Icon } from "./Icon";
import { Texte } from "./Texte";
import { Flamme } from "./Flamme";
import { copyText } from "./Toast";
import { read, useStored } from "../lib/storage";
import { OBJECTIF_DU_JOUR, jourLocal, marquer, useBilan } from "../lib/progres";
import { cartesDuJour } from "../lib/revisions";
import { erreursQuiz } from "../lib/interets";
import { CORRIGES_CC, FORMULES_CC, GENRES_CC, LECONS_CC, SUJETS_CC, genreDe, type TexteEtudie } from "../data/commentaire";
import { ETUDES_CC } from "../data/commentaire-etudes";
import { FAMILLES } from "../data/figures";
import { TEST_TONALITES } from "../data/tonalites";

// « Pour toi » du commentaire composé : quelques suggestions personnelles,
// puis des cartes courtes qui changent chaque jour. Tout est calculé sur le téléphone.

const JOUR = 86_400_000;
const TEXTES: TexteEtudie[] = [...CORRIGES_CC, ...SUJETS_CC];

/** Tirage stable pour la journée : même jour, mêmes cartes. */
function tirage(graine: string) {
  let h = 2166136261;
  for (const c of graine) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function melanger<T>(liste: T[], r: () => number) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

interface Suggestion { cle: string; icone: BaseName; titre: string; detail: string; lien: string }

/** Ateliers commencés sur ce téléphone et pas encore rédigés, du plus récent au plus ancien. */
function ateliersEnCours(): TexteEtudie[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const m = /^litterae\.cc-atelier:(.+)$/.exec(localStorage.key(i) ?? "");
    if (m) ids.push(m[1]);
  }
  return ids.map(id => TEXTES.find(t => t.id === id)).filter((t): t is TexteEtudie =>
    !!t && read<number>(`cc-atelier-etape:${t.id}`, 0) < 5);
}

function suggestions(): Suggestion[] {
  const s: Suggestion[] = [];
  const enCours = ateliersEnCours();
  const a = enCours[0];
  if (a) s.push({ cle: `atelier:${a.id}`, icone: "edit", titre: `Reprendre l'atelier : ${a.titre}`, detail: `Étape ${read<number>(`cc-atelier-etape:${a.id}`, 0) + 1} sur 6`, lien: `#/cc/atelier/${a.id}` });
  const maintenant = Date.now();
  const ratee = Object.entries(erreursQuiz()).filter(([k, t]) => k.startsWith("cc:") && maintenant - t < 21 * JOUR).sort((x, y) => y[1] - x[1])[0];
  const lecon = ratee && LECONS_CC.find(l => `cc:${l.id}` === ratee[0]);
  if (lecon) s.push({ cle: `revoir:${lecon.id}`, icone: "menu_book", titre: `Revoir : ${lecon.titre}`, detail: "Une question du quiz t'a posé problème", lien: `#/cc/cours/${lecon.id}` });
  const lues = read<string[]>("cc-lecons-lues", []);
  const suivante = LECONS_CC.find(l => !lues.includes(l.id));
  if (suivante && suivante !== lecon) s.push({ cle: `lecon:${suivante.id}`, icone: "menu_book", titre: `Leçon ${LECONS_CC.indexOf(suivante) + 1} : ${suivante.titre}`, detail: suivante.duree, lien: `#/cc/cours/${suivante.id}` });
  const dus = cartesDuJour().length;
  if (dus) s.push({ cle: "revisions", icone: "quiz", titre: "Tes révisions du jour", detail: `${dus} carte${dus > 1 ? "s" : ""} à revoir`, lien: "#/revisions" });
  // Un texte du même genre que le dernier atelier, pas encore commencé.
  if (a) {
    const g = genreDe(a);
    const autre = SUJETS_CC.find(t => genreDe(t) === g && !enCours.some(x => x.id === t.id) && !read(`cc-atelier:${t.id}`, null));
    if (autre) s.push({ cle: `genre:${autre.id}`, icone: "history_edu", titre: `Un autre texte (${g.toLowerCase()}) : ${autre.titre}`, detail: autre.auteur, lien: `#/cc/entrainement/${autre.id}` });
  }
  return s.slice(0, 3);
}

type CarteCC =
  | { t: "choix"; cle: string; etiquette: string; icone: BaseName; avant: string; source?: string; question: string; choix: string[]; bonne: number; apres: string; lien?: [string, string] }
  | { t: "indice"; cle: string; c: string; a: string; i: string; titre: string; id: string }
  | { t: "formule"; cle: string; moment: string; texte: string };

/** Cinq cartes du jour : figure, tonalité, genre, indice à interpréter, formule. */
function cartesDuJourCC(jour: string): CarteCC[] {
  const r = tirage(`cc:${jour}`);
  const cartes: CarteCC[] = [];

  const figures = FAMILLES.flatMap(f => f.figures.map(x => ({ ...x, famille: f.id })));
  const f = figures[Math.floor(r() * figures.length)];
  const exemple = f.exemples.map(e => e.replace(/\s*\((=|C'est|On a)[^)]*\)/g, "").replace(/\s*:\s*pour dire.*$/, "")).filter(e => e.length < 160)[0];
  if (exemple) {
    const autres = melanger(figures.filter(x => x.nom !== f.nom), r).sort((x, y) => Number(y.famille === f.famille) - Number(x.famille === f.famille)).slice(0, 3);
    const choix = melanger([f.nom, ...autres.map(x => x.nom)], r);
    cartes.push({ t: "choix", cle: `figure:${f.nom}`, etiquette: "Figure du jour", icone: "style", avant: exemple, question: "Quelle figure de style ?", choix, bonne: choix.indexOf(f.nom), apres: f.retenir, lien: [`#/cc/figures/${f.famille}`, "Revoir la figure"] });
  }

  const q = TEST_TONALITES[Math.floor(r() * TEST_TONALITES.length)];
  const src = TEXTES.find(t => t.id === q.texte);
  const choixT = q.choix.map(c => c[0].toUpperCase() + c.slice(1));
  cartes.push({ t: "choix", cle: `tonalite:${q.texte}`, etiquette: "Quelle tonalité ?", icone: "format_quote", avant: q.extrait, source: src && `${src.auteur}`, question: "Quelle est la tonalité dominante ?", choix: choixT, bonne: q.choix.indexOf(q.bonne), apres: q.pourquoi, lien: ["#/cc/tonalites", "Revoir les tonalités"] });

  const etudies = CORRIGES_CC.filter(c => ETUDES_CC[c.id]);
  const corr = etudies[Math.floor(r() * etudies.length)];
  const indices = ETUDES_CC[corr.id].centres.flatMap(c => c.sousTitres.flatMap(s => s.indices));
  const ind = indices[Math.floor(r() * indices.length)];
  if (ind) cartes.push({ t: "indice", cle: `indice:${corr.id}:${ind.c}`, c: ind.c, a: ind.a, i: ind.i, titre: `${corr.titre}, ${corr.auteur}`, id: corr.id });

  const t = SUJETS_CC[Math.floor(r() * SUJETS_CC.length)];
  const premiere = t.texte.split("\n").find(l => l.trim())!.replace(/^[A-ZÉ ]+\.\s*(\([^)]*\)\s*)?/, "");
  const extrait = premiere.length > 180 ? `${premiere.slice(0, 180).replace(/\s\S*$/, "")}…` : premiere;
  const choixG = [...GENRES_CC];
  cartes.push({ t: "choix", cle: `genre:${t.id}`, etiquette: "Quel genre ?", icone: "account_tree", avant: extrait, source: t.auteur, question: "À quel genre appartient ce texte ?", choix: choixG, bonne: choixG.indexOf(genreDe(t)), apres: `C'est un texte de genre ${genreDe(t).toLowerCase()} : ${t.titre}.`, lien: [`#/cc/entrainement/${t.id}`, "Commenter ce texte"] });

  const groupe = FORMULES_CC[Math.floor(r() * FORMULES_CC.length)];
  const formule = groupe.formules[Math.floor(r() * groupe.formules.length)];
  cartes.push({ t: "formule", cle: `formule:${formule}`, moment: groupe.moment, texte: formule });

  return melanger(cartes, r);
}

export function PourToiCC() {
  const b = useBilan();
  const faites = Math.min(b.faitesAujourdhui, OBJECTIF_DU_JOUR);
  const jour = jourLocal();
  const liste = useMemo(() => suggestions(), []);
  const cartes = useMemo(() => cartesDuJourCC(jour), [jour]);
  return (
    <section class="pour-toi" aria-labelledby="pour-toi-cc-titre">
      <div class="pour-toi-tete">
        <h2 id="pour-toi-cc-titre" class="pour-toi-titre">Pour toi</h2>
        <a class="pour-toi-serie" href="#/progres" aria-label={`Ma progression : série de ${b.serie} jour${b.serie > 1 ? "s" : ""}, objectif du jour ${faites} sur ${OBJECTIF_DU_JOUR}`}>
          {b.serie > 0 && <span class="serie-badge"><Flamme taille={14} />{b.serie} j</span>}
          <span class="objectif-points" aria-hidden="true">
            {Array.from({ length: OBJECTIF_DU_JOUR }, (_, i) => <span key={i} class={i < faites ? "fait" : ""} />)}
          </span>
          <span class="pour-toi-lien">Ma progression</span>
          <Icon name="chevron_right" size={18} />
        </a>
      </div>
      <ul class="pour-toi-liste fil">
        {liste.map(s => (
          <li key={s.cle}>
            <a class="pour-toi-ligne" href={s.lien}>
              <span class="pour-toi-icone" aria-hidden="true"><Icon name={s.icone} size={20} /></span>
              <span class="pour-toi-texte"><span class="pour-toi-nom">{s.titre}</span><span class="pour-toi-detail">{s.detail}</span></span>
              <Icon name="chevron_right" size={20} />
            </a>
          </li>
        ))}
        {cartes.map(c => <li key={c.cle}><Carte c={c} jour={jour} /></li>)}
      </ul>
      <p class="fil-fin">De nouvelles cartes demain.</p>
    </section>
  );
}

function Carte({ c, jour }: { c: CarteCC; jour: string }) {
  if (c.t === "choix") return <Choix c={c} jour={jour} />;
  if (c.t === "indice") return <Indice c={c} />;
  return (
    <div class="fil-carte">
      <p class="fil-etiquette"><Icon name="edit" size={16} />Pour ta copie · {c.moment}</p>
      <p class="fil-texte fil-formule">{c.texte}</p>
      <div class="fil-actions">
        <button type="button" class="btn btn-secondary fil-copier" onClick={() => { marquer("fil-cc:formule"); copyText(c.texte, "Formule copiée."); }}><Icon name="content_copy" size={18} />Copier</button>
        <a class="link-strong" href="#/cc/outils">Autres formules</a>
      </div>
    </div>
  );
}

function Choix({ c, jour }: { c: Extract<CarteCC, { t: "choix" }>; jour: string }) {
  const [reponses, setReponses] = useStored<{ jour: string; r: Record<string, number> }>("cc-fil-reponses", { jour, r: {} });
  const r = reponses.jour === jour ? reponses.r[c.cle] ?? null : null;
  function choisir(i: number) {
    if (r !== null) return;
    setReponses({ jour, r: { ...(reponses.jour === jour ? reponses.r : {}), [c.cle]: i } });
    marquer(`fil-cc:${c.cle}`);
  }
  return (
    <div class="fil-carte">
      <p class="fil-etiquette"><Icon name={c.icone} size={16} />{c.etiquette}</p>
      <p class="fil-citation">{c.avant.split("\n").map((l, k) => <span key={k} class="cc-ligne"><Texte text={l} /></span>)}{c.source && <span class="fil-auteur">{c.source}</span>}</p>
      <p class="fil-question">{c.question}</p>
      <ul class="fil-choix">
        {c.choix.map((x, i) => {
          const etat = r === null ? "" : i === c.bonne ? "ok" : i === r ? "faux" : "";
          return <li key={x}><button type="button" class={`quiz-option ${etat}`} disabled={r !== null} onClick={() => choisir(i)}>
            <span>{x}</span>{etat === "ok" && <Icon name="check" size={18} />}{etat === "faux" && <Icon name="close" size={18} />}
          </button></li>;
        })}
      </ul>
      {r !== null && (
        <p class="fil-retour" role="status">
          <strong>{r === c.bonne ? "Bonne réponse." : `Non : ${c.choix[c.bonne].toLowerCase()}.`}</strong> <Texte text={c.apres} />{" "}
          {c.lien && <a href={c.lien[0]}>{c.lien[1]}</a>}
        </p>
      )}
    </div>
  );
}

/** Un indice d'exercice corrigé : l'élève réfléchit à l'effet, puis découvre l'interprétation. */
function Indice({ c }: { c: Extract<CarteCC, { t: "indice" }> }) {
  const [vu, setVu] = useState(false);
  return (
    <div class="fil-carte">
      <p class="fil-etiquette"><Icon name="lightbulb" size={16} />Quel effet ?</p>
      <p class="fil-citation"><Texte text={c.c} /><span class="fil-auteur">{c.titre}</span></p>
      <p class="fil-texte"><strong>Procédé :</strong> <Texte text={c.a} /></p>
      <p class="fil-question">Quel effet produit ce passage ? Réfléchis, puis vérifie.</p>
      {vu
        ? <p class="fil-retour" role="status"><strong>Interprétation :</strong> <Texte text={c.i} /> <a href={`#/cc/corriges/${c.id}`}>Voir le corrigé</a></p>
        : <button type="button" class="btn btn-secondary align-start" onClick={() => { setVu(true); marquer("fil-cc:indice"); }}>Voir l'interprétation</button>}
    </div>
  );
}
