import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { Texte } from "../components/Texte";
import { Segments } from "../components/SujetsOnglets";
import { ChoixMethode } from "../components/ChoixMethode";
import { InstallBanner } from "../components/Install";
import { Annonces } from "../components/Annonces";
import { read, useStored } from "../lib/storage";
import { NotFound } from "./NotFound";
import { LockPanel } from "../components/LockPanel";
import { AchatLien } from "../components/Achat";
import { useAccesCC as useAccess } from "../data/cc-donnees";
import { Bloc } from "./Lecon";
import { CORRIGES_CC, FORMULES_CC, GENRES_CC, LECONS_CC, SUJETS_CC, VERBES_CC, genreDe, type BlocCC, type CorrigeCC as CorrigeCCType, type TexteEtudie } from "../data/commentaire";
import { ETUDES_CC, type EtudeCC } from "../data/commentaire-etudes";
import { AtelierCC } from "./AtelierCC";
import { QUIZ_CC } from "../data/quiz-cc";
import { PourToiCC } from "../components/PourToiCC";
import { MessageALaUne } from "../components/Suggestions";
import type { QuestionQuiz } from "../data/types";
import { ajouterCarte, cleQuiz } from "../lib/revisions";
import { marquer } from "../lib/progres";
import { licence, rechargerContenu } from "../lib/licence";
import { noter } from "../lib/stats";
import { useMethode } from "../lib/methodes";
import { GenreDetailCC, GenresCC, TestTonalitesCC, TonaliteDetailCC, TonalitesCC } from "./GenresCC";
import { CORRECTIONS, FAMILLES, FIGURES_DEFINITION, FIGURES_SOURCE } from "../data/figures";

// Commentaire composé : cours, exercices corrigés, outils et sujets d'entraînement.
// Adresses : #/cc/cours, #/cc/corriges, #/cc/outils, #/cc/entrainement, suivies d'un identifiant pour le détail.

// Le commentaire composé s'ouvre avec la même clé que la dissertation (accès complet).
// Sans clé, l'élève voit les titres de tout ce qu'il y a dedans, mais aucun contenu.
const CONTENU_CC = "Avec ta clé d'accès, tout le Commentaire composé s'ouvre : les cours, les genres et les tonalités, les figures de style et leurs corrections, les exercices corrigés, les outils et les sujets d'entraînement. Une seule clé ouvre aussi toute la Dissertation littéraire.";
export function VerrouCC() {
  if (licence()) return <MiseAJourCC />;
  return <LockPanel reason="Le Commentaire composé est réservé à l'accès complet." contenu={CONTENU_CC} />;
}

/** Clé activée avant l'arrivée du commentaire composé, et appareil resté hors ligne : on le fait venir. */
export function MiseAJourCC() {
  const [etat, setEtat] = useState<"" | "envoi" | "echec">("");
  async function maj() {
    setEtat("envoi");
    if (await rechargerContenu()) location.reload(); else setEtat("echec");
  }
  return (
    <div class="quiz-lock">
      <p>Ta clé ouvre le Commentaire composé. Connecte-toi à Internet pour le recevoir sur ce téléphone.</p>
      <button type="button" class="btn btn-primary align-start" disabled={etat === "envoi"} onClick={maj}>{etat === "envoi" ? "Réception…" : "Recevoir le Commentaire composé"}</button>
      {etat === "echec" && <p class="field-error" role="alert"><Icon name="error" size={18} />Impossible de joindre le serveur. Vérifie ta connexion et réessaie.</p>}
    </div>
  );
}
/** Cadenas en bout de ligne, sans clé. */
export function Cadenas() {
  if (licence()) return null;
  return <span class="row-lock" title="Accès complet"><Icon name="lock" size={18} /><span class="sr-only">Réservé à l'accès complet</span></span>;
}

/** Les deux parties de l'onglet Cours du commentaire composé. */
function CoursOngletsCC({ actif }: { actif: "lecons" | "figures" | "outils" }) {
  return <Segments groupe="cc-cours" label="Cours" items={[
    { label: "Leçons", href: "#/cc/cours", actif: actif === "lecons" },
    { label: "Figures de style", href: "#/cc/figures", actif: actif === "figures" },
    { label: "Outils", href: "#/cc/outils", actif: actif === "outils" }
  ]} />;
}

/** Les deux parties de l'onglet Sujets du commentaire composé. */
function SujetsOngletsCC({ actif }: { actif: "corriges" | "entrainement" }) {
  return <Segments groupe="cc-sujets" label="Sujets" items={[
    { label: "Exercices corrigés", href: "#/cc/corriges", actif: actif === "corriges" },
    { label: "M'entraîner", href: "#/cc/entrainement", actif: actif === "entrainement" }
  ]} />;
}

/** Accueil quand l'élève a choisi le commentaire composé. */
export function AccueilCommentaire() {
  const { premium } = useAccess();
  const [lues] = useStored<string[]>("cc-lecons-lues", []);
  const suivante = LECONS_CC.find(l => !lues.includes(l.id));
  const nbLues = LECONS_CC.filter(l => lues.includes(l.id)).length;
  return (
    <Page>
      <header class="home-header">
        <p class="eyebrow">Le commentaire composé, pas à pas</p>
        <h1 class="home-title">Que veux-tu faire ?</h1>
      </header>
      <ChoixMethode />
      <MessageALaUne />
      {!premium && licence() && <MiseAJourCC />}
      {!premium && !licence() && <p class="quota cc-quota"><span class="muted quota-texte">Réservé à l'accès complet</span><AchatLien label="Débloquer" /></p>}
      <nav class="choix" aria-label="Que veux-tu faire ?">
        <a class="choix-carte choix-methode" href={suivante && nbLues > 0 ? `#/cc/cours/${suivante.id}` : "#/cc/cours"}>
          <Icon name="menu_book" size={24} />
          <span class="choix-titre">{nbLues === 0 ? "Les cours" : suivante ? "Continuer les cours" : "Revoir les cours"}</span>
          <span class="choix-detail">{nbLues === 0 ? `${LECONS_CC.length} leçons` : suivante ? `Leçon ${LECONS_CC.indexOf(suivante) + 1} à lire` : "Tout est lu"}</span>
          {nbLues > 0 && <span class="progress-bar" aria-hidden="true"><span style={{ width: `${(nbLues / LECONS_CC.length) * 100}%` }} /></span>}
        </a>
        <a class="choix-carte choix-figures" href="#/cc/figures">
          <Icon name="style" size={24} />
          <span class="choix-titre">Figures de style</span>
          <span class="choix-detail">{FAMILLES.reduce((n, f) => n + f.figures.length, 0)} figures et leurs exercices</span>
        </a>
        <a class="choix-carte choix-genres" href="#/cc/genres">
          <Icon name="account_tree" size={24} />
          <span class="choix-titre">Genres et tonalités</span>
          <span class="choix-detail">Roman, théâtre, poésie et 13 tonalités</span>
        </a>
        <a class="choix-carte choix-corriges" href="#/cc/corriges">
          <Icon name="history_edu" size={24} />
          <span class="choix-titre">Exercices corrigés</span>
          <span class="choix-detail">{CORRIGES_CC.length} commentaires modèles</span>
        </a>
        <a class="choix-carte choix-entrainer" href="#/cc/entrainement">
          <Icon name="edit" size={24} />
          <span class="choix-titre">M'entraîner</span>
          <span class="choix-detail">{SUJETS_CC.length} textes à commenter</span>
        </a>
        <a class="choix-carte choix-outils" href="#/cc/outils">
          <Icon name="inventory_2" size={24} />
          <span class="choix-titre">Outils</span>
          <span class="choix-detail">Formules pour ta copie</span>
        </a>
      </nav>
      <Annonces />
      {premium && <PourToiCC />}
      <InstallBanner />
    </Page>
  );
}

/** Une ligne de prose : au théâtre, le nom du personnage en gras. */
function LigneProse({ l, theatre }: { l: string; theatre?: boolean }) {
  const m = theatre ? /^([^:]{1,30})\s:\s(.*)$/.exec(l) : null;
  return m ? <><strong class="cc-perso">{m[1]} :</strong> <Texte text={m[2]} /></> : <Texte text={l} />;
}

/** Le texte étudié, vers numérotés (ou paragraphes de prose), avec sa source. */
export function TexteEtudieBloc({ t }: { t: TexteEtudie }) {
  let n = 0;
  return (
    <figure class="cc-texte">
      {t.chapeau && <p class="cc-chapeau"><Texte text={t.chapeau} /></p>}
      {t.prose
        ? t.texte.split("\n\n").map((par, k) => (
          <p key={k} class={`cc-prose${t.theatre ? " cc-theatre" : ""}`}>
            {par.split("\n").map((l, j) => <span key={j} class="cc-ligne"><LigneProse l={l} theatre={t.theatre} /></span>)}
          </p>
        ))
        : t.texte.split("\n\n").map((strophe, k) => (
          <p key={k} class="cc-strophe">
            {strophe.split("\n").map(v => { n++; return <span key={n} class="cc-vers"><span class="cc-num" aria-hidden="true">{n % 5 === 0 ? n : ""}</span>{v}</span>; })}
          </p>
        ))}
      <figcaption>{t.auteur}, <Texte text={t.source} />{t.note && <span class="cc-note">{t.note}</span>}</figcaption>
    </figure>
  );
}

/** Liste des leçons. */
function CoursCC() {
  const [lues] = useStored<string[]>("cc-lecons-lues", []);
  const { premium } = useAccess();
  return (
    <Page>
      <CoursOngletsCC actif="lecons" />
      <header class="page-header">
        <h1 class="page-title">Le commentaire composé</h1>
        <p class="lede">{LECONS_CC.length} leçons, de la définition à la conclusion.</p>
      </header>
      <ol class="list" aria-label="Leçons">
        {LECONS_CC.map((l, i) => {
          const lue = lues.includes(l.id);
          return (
            <li key={l.id}>
              <a class="row" href={`#/cc/cours/${l.id}`}>
                <span class={`step-num ${lue ? "done" : ""}`} aria-hidden="true">{lue ? <Icon name="check" size={18} /> : i + 1}</span>
                <span class="row-body"><span class="row-title">{l.titre}</span><span class="meta">{l.duree}{lue ? " · lue" : ""}</span></span>
                {premium ? <Icon name="chevron_right" /> : <Cadenas />}
              </a>
            </li>
          );
        })}
      </ol>
    </Page>
  );
}

/** Un bloc de leçon : le texte étudié, une liste d'exemples repliée, ou un bloc ordinaire. */
function BlocLeconCC({ b }: { b: BlocCC }) {
  if ("texte" in b) return <TexteEtudieBloc t={b.texte} />;
  if ("plie" in b)
    return (
      <details class="cc-plie">
        <summary>{b.plie.titre}</summary>
        <ul class="bullets">{b.plie.liste.map(x => <li key={x}><Texte text={x} /></li>)}</ul>
      </details>
    );
  return <Bloc b={b} />;
}

/** Quiz en bas d'une leçon : les questions ratées reviennent dans les révisions. */
function QuizCC({ id, questions }: { id: string; questions: QuestionQuiz[] }) {
  const [n, setN] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [meilleurs, setMeilleurs] = useStored<Record<string, number>>("cc-quiz-meilleurs", {});
  const q = questions[n];
  function repondre(i: number) {
    if (choix !== null) return;
    setChoix(i);
    if (i === q.bonne) setScore(score + 1);
    ajouterCarte(cleQuiz(`cc:${id}`, n), i === q.bonne);
    marquer(`quiz:cc:${id}`);
  }
  function suivante() {
    if (n + 1 >= questions.length) noter({ t: "cc", ref: `quiz:${id}` });
    if (n + 1 >= questions.length && score > (meilleurs[id] ?? -1)) setMeilleurs({ ...meilleurs, [id]: score });
    setN(n + 1); setChoix(null);
  }
  return (
    <section class="quiz" aria-labelledby="quiz-cc-titre">
      <p class="eyebrow">Quiz · {questions.length} questions</p>
      <h2 id="quiz-cc-titre" class="section-title">Vérifie ce que tu as retenu</h2>
      {n >= questions.length ? (
        <div class="quiz-card quiz-fin" role="status">
          <p class="quiz-score">{score} / {questions.length}</p>
          <p>{score === questions.length ? "Parfait, tu maîtrises cette leçon." : score >= questions.length / 2 ? "Bien. Relis les points manqués, puis refais le quiz." : "Relis la leçon, puis refais le quiz."}</p>
          {meilleurs[id] !== undefined && <p class="small muted">Meilleur score : {meilleurs[id]} / {questions.length}</p>}
          <button type="button" class="btn btn-secondary align-start" onClick={() => { setN(0); setChoix(null); setScore(0); }}>Recommencer</button>
        </div>
      ) : (
        <div class="quiz-card">
          <p class="small muted">Question {n + 1} sur {questions.length}</p>
          <p class="quiz-q"><Texte text={q.q} /></p>
          <ul class="quiz-choix">
            {q.choix.map((c, i) => {
              const etat = choix === null ? "" : i === q.bonne ? "ok" : i === choix ? "faux" : "";
              return (
                <li key={c}>
                  <button type="button" class={`quiz-option ${etat}`} disabled={choix !== null} aria-pressed={choix === i} onClick={() => repondre(i)}>
                    <span>{c}</span>
                    {etat === "ok" && <Icon name="check" size={20} />}
                    {etat === "faux" && <Icon name="close" size={20} />}
                  </button>
                </li>
              );
            })}
          </ul>
          {choix !== null && (
            <div class="quiz-correction" role="status">
              <p><strong>{choix === q.bonne ? "Bonne réponse." : "Pas tout à fait."}</strong> <Texte text={q.pourquoi} /></p>
              <button type="button" class="btn btn-primary align-start" onClick={suivante}>{n + 1 < questions.length ? "Question suivante" : "Voir mon score"}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LeconCC({ id }: { id: string }) {
  const i = LECONS_CC.findIndex(l => l.id === id);
  const [lues, setLues] = useStored<string[]>("cc-lecons-lues", []);
  const { premium } = useAccess();
  if (i < 0) return <NotFound what="Cette leçon n'existe pas." back="#/cc/cours" />;
  if (premium && !lues.includes(id)) setTimeout(() => setLues([...lues, id]));
  const l = LECONS_CC[i], prev = LECONS_CC[i - 1], next = LECONS_CC[i + 1];
  return (
    <Page title={`Leçon ${i + 1}`} back="#/cc/cours">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Commentaire composé · Leçon {i + 1} sur {LECONS_CC.length} · {l.duree}</p>
          <h1 class="page-title"><Texte text={l.titre} /></h1>
        </header>
        {premium ? <div class="prose">{l.blocs.map((b, k) => <BlocLeconCC key={k} b={b} />)}</div> : <VerrouCC />}
        {premium && QUIZ_CC[l.id] && <QuizCC id={l.id} questions={QUIZ_CC[l.id]} />}
        <nav class="pager" aria-label="Leçons">
          {prev ? <a class="pager-link" href={`#/cc/cours/${prev.id}`}><span class="meta">Précédente</span>{prev.titre}</a> : <span />}
          {next
            ? <a class="pager-link pager-next" href={`#/cc/cours/${next.id}`}><span class="meta">Suivante</span>{next.titre}</a>
            : <a class="pager-link pager-next" href="#/cc/corriges"><span class="meta">Et maintenant</span>Les exercices corrigés</a>}
        </nav>
      </article>
    </Page>
  );
}

/** Une ligne de liste pour un texte étudié. */
function LigneTexte({ t, href }: { t: TexteEtudie; href: string }) {
  const { premium } = useAccess();
  return (
    <li>
      <a class="row" href={href}>
        <span class="row-body">
          <span class="row-title">{t.titre}</span>
          <span class="meta">{t.auteur} · <Texte text={t.source} /></span>
        </span>
        {premium ? <Icon name="chevron_right" /> : <Cadenas />}
      </a>
    </li>
  );
}

/** Filtre par genre en haut des listes de textes ; le choix reste gardé sur le téléphone. */
function useFiltreGenre<T extends TexteEtudie>(cle: string, textes: T[]) {
  const [choix, setChoix] = useStored<string>(cle, "");
  const presents = GENRES_CC.filter(g => textes.some(t => genreDe(t) === g));
  const actif = presents.includes(choix as never) ? choix : "";
  const barre = (
    <div class="sticky-bar">
      <div class="chips" role="group" aria-label="Filtrer par genre">
        <button type="button" class="chip" aria-pressed={!actif} onClick={() => setChoix("")}>Tous</button>
        {presents.map(g => (
          <button key={g} type="button" class="chip" aria-pressed={actif === g} onClick={() => setChoix(actif === g ? "" : g)}>{g}</button>
        ))}
      </div>
    </div>
  );
  return { barre, liste: actif ? textes.filter(t => genreDe(t) === actif) : textes };
}

function CorrigesCC() {
  const { barre, liste } = useFiltreGenre("cc-corriges-genre", CORRIGES_CC);
  return (
    <Page>
      <SujetsOngletsCC actif="corriges" />
      <header class="page-header">
        <h1 class="page-title">Exercices corrigés</h1>
        <p class="lede">Un texte, sa consigne et un commentaire rédigé en entier.</p>
      </header>
      {barre}
      <ul class="list" aria-label="Exercices corrigés">{liste.map(c => <LigneTexte key={c.id} t={c} href={`#/cc/corriges/${c.id}`} />)}</ul>
    </Page>
  );
}

const ETAPES_CORRIGE = ["Comprendre", "Sous-titres", "Indices", "Rédaction"];
const rang = (k: number) => (k === 0 ? "Premier" : "Second");
const minuscule = (t: string) => t[0].toLowerCase() + t.slice(1);

/** Étape 1 : le texte compris pas à pas. */
function EtapeComprendre({ e }: { e: EtudeCC }) {
  return <>
    <h2 class="section-title">1. Le paratexte</h2>
    <dl class="def">{e.paratexte.map(([k, v]) => [<dt key={k}>{k}</dt>, <dd key={k + "d"}><Texte text={v} /></dd>])}</dl>
    <p><strong>Ce qu'on peut attendre du texte.</strong> <Texte text={e.attentes} /></p>
    <h2 class="section-title">2. Les deux lectures</h2>
    <dl class="def">
      <dt>Lecture passive</dt><dd><Texte text={e.passive} /></dd>
      <dt>Lecture active</dt><dd><Texte text={e.active} /></dd>
    </dl>
    <h2 class="section-title">3. Les 3 T</h2>
    <dl class="def">
      <dt>Type</dt><dd>{e.type}</dd>
      <dt>Tonalité</dt><dd>{e.tonalite}</dd>
      <dt>Thème</dt><dd>{e.theme}</dd>
    </dl>
    <h2 class="section-title">4. L'idée générale</h2>
    <figure class="model"><figcaption>Idée générale</figcaption><p>{e.idee}</p></figure>
  </>;
}

/** Étape 2 : pour chaque centre d'intérêt, les indices relevés puis classés en groupes titrés. */
function EtapeSousTitres({ e }: { e: EtudeCC }) {
  return <>
    <p>La consigne donne les deux centres d'intérêt :</p>
    <ol class="outline">{e.centres.map(c => <li key={c.titre}>{c.titre}</li>)}</ol>
    {e.centres.map((c, k) => (
      <section key={c.titre}>
        <h2 class="section-title">{rang(k)} centre d'intérêt{"\u00a0"}: {minuscule(c.titre)}</h2>
        <p>On relit le texte avec cette seule idée en tête, et on relève les indices :</p>
        <ul class="bullets cc-releve">{c.sousTitres.flatMap(st => st.indices).map(x => <li key={x.c}><Texte text={x.c} /></li>)}</ul>
        <p>Puis on les classe en groupes, et on donne un titre à chaque groupe :</p>
        <ol class="steps">{c.sousTitres.map(st => (
          <li key={st.titre}><strong>{st.titre}</strong><span><Texte text={st.indices.map(x => x.c).join(" ; ")} /></span></li>
        ))}</ol>
      </section>
    ))}
  </>;
}

/** Étape 3 : le tableau du brouillon, une fiche par indice. */
function EtapeIndices({ e }: { e: EtudeCC }) {
  return <>
    <p>Pour chaque indice : ce que dit l'auteur, comment il le dit, pourquoi il le dit ainsi.</p>
    {e.centres.map((c, k) => (
      <section key={c.titre}>
        <h2 class="section-title">{rang(k)} centre d'intérêt{"\u00a0"}: {minuscule(c.titre)}</h2>
        {c.sousTitres.map(st => (
          <div key={st.titre} class="cc-groupe">
            <h3 class="cc-sous-titre">{st.titre}</h3>
            <ul class="cc-fiches">{st.indices.map(x => (
              <li key={x.c} class="cc-fiche">
                <p class="cc-fiche-indice"><Texte text={x.c} /></p>
                <p><span class="cc-fiche-label">Comment</span><Texte text={x.a} /></p>
                <p><span class="cc-fiche-label">Pourquoi</span><Texte text={x.i} /></p>
              </li>
            ))}</ul>
          </div>
        ))}
      </section>
    ))}
  </>;
}

/** Étape 4 : le commentaire rédigé en entier, sans titres, comme sur la copie. */
function EtapeRedaction({ c, e }: { c: CorrigeCCType; e?: EtudeCC }) {
  const r = e?.redaction;
  const intro = r?.intro ?? c.intro, axes = r?.axes ?? c.axes, transition = r ? r.transition : c.transition, conclusion = r?.conclusion ?? c.conclusion;
  return <>
    <p>Le devoir tel qu'il s'écrit sur la copie : sans titres, une ligne sautée entre les parties. Les repères en marge sont là pour t'aider à lire.</p>
    <article class="cc-copie">
      <p class="cc-repere">Introduction</p>
      <p><Texte text={intro} /></p>
      {axes.map((a, k) => <Fragment key={k}>
        <p class="cc-repere">{a.titre ? `${rang(k)} centre d'intérêt` : "Développement"}</p>
        {a.paragraphes.map((p, j) => <p key={j}><Texte text={p} /></p>)}
        {k === 0 && transition && <><p class="cc-repere">Transition</p><p><Texte text={transition} /></p></>}
      </Fragment>)}
      <p class="cc-repere">Conclusion</p>
      <p><Texte text={conclusion} /></p>
    </article>
  </>;
}

function CorrigeCC({ id }: { id: string }) {
  const c = CORRIGES_CC.find(x => x.id === id);
  const { premium } = useAccess();
  const [etape, setEtape] = useState(0);
  if (!c) return <NotFound what="Cet exercice n'existe pas." back="#/cc/corriges" />;
  const e = ETUDES_CC[c.id];
  const aller = (k: number) => { setEtape(k); scrollTo({ top: 0 }); };
  return (
    <Page title={c.titre} back="#/cc/corriges">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Exercice corrigé</p>
          <h1 class="page-title">{c.titre}</h1>
        </header>
        {!premium ? <><p class="lede">{c.auteur}, <Texte text={c.source} /></p><VerrouCC /></> : <div class="prose">
          {e && <Segments groupe={`cc-corrige`} label="Étapes du corrigé" items={ETAPES_CORRIGE.map((label, k) => ({ label, actif: etape === k, onClick: () => aller(k) }))} />}
          {etape === 0
            ? <><TexteEtudieBloc t={c} /><aside class="callout"><p class="callout-label">Consigne</p><p>{c.consigne}</p></aside></>
            : <details class="cc-plie"><summary>Revoir le texte et la consigne</summary><TexteEtudieBloc t={c} /><p><strong>Consigne.</strong> {c.consigne}</p></details>}
          {!e || etape === 3 ? <EtapeRedaction c={c} e={e} /> : etape === 0 ? <EtapeComprendre e={e} /> : etape === 1 ? <EtapeSousTitres e={e} /> : <EtapeIndices e={e} />}
          {e && etape < 3 && <button class="btn btn-primary align-start cc-suivant" onClick={() => aller(etape + 1)}>Étape suivante : {ETAPES_CORRIGE[etape + 1]}<Icon name="arrow_forward" size={20} /></button>}
          <aside class="cc-atelier-appel">
            <p><strong>À toi de jouer.</strong> Refais ce travail toi-même, étape par étape, avant ou après avoir lu le corrigé.</p>
            <a class="btn btn-secondary align-start" href={`#/cc/atelier/${c.id}`}><Icon name="edit" size={20} />Faire ce travail moi-même</a>
          </aside>
        </div>}
      </article>
    </Page>
  );
}

function OutilsCC() {
  const { premium } = useAccess();
  return (
    <Page>
      <CoursOngletsCC actif="outils" />
      <header class="page-header">
        <h1 class="page-title">Outils</h1>
        <p class="lede">Des phrases toutes prêtes pour chaque moment de ta copie.</p>
      </header>
      {!premium ? <><ul class="bullets">{FORMULES_CC.map(g => <li key={g.moment}>{g.moment}</li>)}<li>Verbes pour analyser</li></ul><VerrouCC /></> : <div class="cc-formules">
        {FORMULES_CC.map(g => (
          <section key={g.moment} class="cc-carte">
            <h2 class="cc-carte-titre">{g.moment}</h2>
            <ul class="bullets">{g.formules.map(f => <li key={f}>{f}</li>)}</ul>
          </section>
        ))}
        <section class="cc-carte">
          <h2 class="cc-carte-titre">Verbes pour analyser</h2>
          <p>Au lieu de « montre » partout : {VERBES_CC.join(", ")}.</p>
        </section>
      </div>}
    </Page>
  );
}

/** Les familles de figures de style (document de Cours de Renfo Français). */
function FiguresCC() {
  const { premium } = useAccess();
  return (
    <Page>
      <CoursOngletsCC actif="figures" />
      <header class="page-header">
        <h1 class="page-title">Figures de style</h1>
        <p class="lede">Six familles, chacune avec ses exercices.</p>
      </header>
      <details class="repli cc-definition">
        <summary>Qu'est-ce qu'une figure de style ?</summary>
        <ul class="bullets">{FIGURES_DEFINITION.phrases.map(p => <li key={p}>{p}</li>)}</ul>
        {FIGURES_DEFINITION.texte.map(p => <p key={p}>{p}</p>)}
      </details>
      <aside class="callout"><p class="callout-label">À retenir</p><p>{FIGURES_DEFINITION.retenir}</p></aside>
      <ol class="list" aria-label="Familles de figures">
        {FAMILLES.map((f, i) => (
          <li key={f.id}>
            <a class="row" href={`#/cc/figures/${f.id}`}>
              <span class="step-num" aria-hidden="true">{i + 1}</span>
              <span class="row-body">
                <span class="row-title">{f.titre}</span>
                <span class="meta">{f.figures.map(x => x.nom.replace(/^(La |Le |L')/, "")).join(", ")}</span>
              </span>
              {premium ? <Icon name="chevron_right" /> : <Cadenas />}
            </a>
          </li>
        ))}
      </ol>
      <p class="small muted cc-source">Source : {FIGURES_SOURCE}.</p>
    </Page>
  );
}

function FamilleCC({ id }: { id: string }) {
  const i = FAMILLES.findIndex(f => f.id === id);
  const { premium } = useAccess();
  if (i < 0) return <NotFound what="Cette partie n'existe pas." back="#/cc/figures" />;
  const f = FAMILLES[i], prev = FAMILLES[i - 1], next = FAMILLES[i + 1];
  if (!premium) return (
    <Page title={f.titre} back="#/cc/figures">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Figures de style · {i + 1} sur {FAMILLES.length}</p>
          <h1 class="page-title">{f.titre}</h1>
          <p class="lede">{f.figures.length} figures, {f.exercices.reduce((n, e) => n + e.phrases.length, 0)} phrases d'exercice corrigées.</p>
        </header>
        <ol class="outline">{f.figures.map(x => <li key={x.nom}>{x.nom}</li>)}</ol>
        <VerrouCC />
      </article>
    </Page>
  );
  return (
    <Page title={f.titre} back="#/cc/figures">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Figures de style · {i + 1} sur {FAMILLES.length}</p>
          <h1 class="page-title">{f.titre}</h1>
          <p class="lede">{f.intro}</p>
        </header>
        <div class="cc-figures">
          {f.figures.map((x, k) => (
            <section key={x.nom} class="cc-carte cc-figure">
              <h2 class="cc-carte-titre">{k + 1}. {x.nom}</h2>
              <p>{x.definition}</p>
              <ul class="cc-exemples" aria-label="Exemples">{x.exemples.map(e => <li key={e}><Texte text={e} /></li>)}</ul>
              {x.details && (
                <details class="repli">
                  <summary>En savoir plus</summary>
                  {x.details.map(d => <p key={d}><Texte text={d} /></p>)}
                </details>
              )}
              <p class="cc-retenir"><strong>À retenir :</strong> {x.retenir}</p>
            </section>
          ))}
        </div>
        {f.exercices.map((ex, e) => (
          <section key={ex.titre} class="cc-exercice">
            <h2 class="section-title">{ex.titre}</h2>
            <p>{ex.consigne}</p>
            <ol class="cc-phrases">
              {ex.phrases.map((p, k) => {
                const correction = CORRECTIONS[f.id]?.[e]?.[k];
                return (
                  <li key={p}>
                    <span style={{ whiteSpace: "pre-line" }}>{p.replace(/ \/ /g, "\n")}</span>
                    {correction && (
                      <details class="repli cc-correction">
                        <summary>Voir la correction</summary>
                        <p><Texte text={correction} /></p>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        <nav class="pager" aria-label="Familles de figures">
          {prev ? <a class="pager-link" href={`#/cc/figures/${prev.id}`}><span class="meta">Précédente</span>{prev.titre}</a> : <span />}
          {next
            ? <a class="pager-link pager-next" href={`#/cc/figures/${next.id}`}><span class="meta">Suivante</span>{next.titre}</a>
            : <a class="pager-link pager-next" href="#/cc/corriges"><span class="meta">Et maintenant</span>Les exercices corrigés</a>}
        </nav>
      </article>
    </Page>
  );
}

function EntrainementCC() {
  const commence = (id: string) => read<unknown>(`cc-atelier:${id}`, null) != null;
  const { barre, liste } = useFiltreGenre("cc-entrainement-genre", SUJETS_CC);
  return (
    <Page>
      <SujetsOngletsCC actif="entrainement" />
      <header class="page-header">
        <h1 class="page-title">M'entraîner</h1>
        <p class="lede">Un texte, une consigne, et l'atelier pour faire ton commentaire pas à pas.</p>
      </header>
      {barre}
      <ul class="list" aria-label="Textes à commenter">
        {liste.map(s => <LigneTexte key={s.id} t={{ ...s, titre: commence(s.id) ? `${s.titre} · commencé` : s.titre }} href={`#/cc/entrainement/${s.id}`} />)}
      </ul>
    </Page>
  );
}

function SujetCC({ id }: { id: string }) {
  const s = SUJETS_CC.find(x => x.id === id);
  const { premium } = useAccess();
  if (!s) return <NotFound what="Ce sujet n'existe pas." back="#/cc/entrainement" />;
  return (
    <Page title={s.titre} back="#/cc/entrainement">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Entraînement</p>
          <h1 class="page-title">{s.titre}</h1>
        </header>
        {!premium ? <><p class="lede">{s.auteur}, <Texte text={s.source} /></p><VerrouCC /></> : <div class="prose">
          <TexteEtudieBloc t={s} />
          <aside class="callout"><p class="callout-label">Consigne</p><p>{s.consigne}</p></aside>
          <a class="btn btn-primary align-start cc-suivant" href={`#/cc/atelier/${s.id}`}><Icon name="edit" size={20} />Commencer l'atelier</a>
          <p class="meta">Comprendre, trouver les centres d'intérêt, souligner les indices, les grouper, les analyser, rédiger.</p>
          <details class="repli">
            <summary>Voir des pistes</summary>
            <ol class="outline">{s.pistes.map(p => <li key={p}>{p}</li>)}</ol>
          </details>
        </div>}
      </article>
    </Page>
  );
}

/** Toutes les pages du commentaire composé, selon l'adresse #/cc/… */
/** Ce que l'élève ouvre dans le commentaire composé, compté sans savoir qui (tableau de bord › Chiffres). */
const STAT_CC: Record<string, string> = { cours: "lecon", corriges: "corrige", entrainement: "texte", figures: "figures", genres: "genre", tonalites: "tonalite" };

export function CommentaireScreen({ path }: { path: string[] }) {
  const [, partie, id] = path;
  const [methode, choisir] = useMethode();
  useEffect(() => {
    // Une page du commentaire ouverte depuis un message ou un lien partagé : l'appli passe en commentaire composé.
    if (partie && methode.id !== "commentaire") choisir("commentaire");
    if (partie === "outils") noter({ t: "cc", ref: "outils" });
    else if (partie === "tonalites" && id === "test") noter({ t: "cc", ref: "test" });
    else if (id && STAT_CC[partie]) noter({ t: "cc", ref: `${STAT_CC[partie]}:${id}` });
  }, [partie, id]);
  switch (partie) {
    case "cours": return id ? <LeconCC id={id} /> : <CoursCC />;
    case "corriges": return id ? <CorrigeCC id={id} /> : <CorrigesCC />;
    case "outils": return <OutilsCC />;
    case "figures": return id ? <FamilleCC id={id} /> : <FiguresCC />;
    case "entrainement": return id ? <SujetCC id={id} /> : <EntrainementCC />;
    case "atelier": return id ? <AtelierCC id={id} /> : <EntrainementCC />;
    case "genres": return id ? <GenreDetailCC id={id} /> : <GenresCC />;
    case "tonalites": return id === "test" ? <TestTonalitesCC /> : id ? <TonaliteDetailCC id={id} /> : <TonalitesCC />;
    default: return <AccueilCommentaire />;
  }
}
