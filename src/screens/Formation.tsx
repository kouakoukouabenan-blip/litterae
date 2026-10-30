import { Fragment } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { Texte } from "../components/Texte";
import { Segments } from "../components/SujetsOnglets";
import { LockPanel } from "../components/LockPanel";
import { NotFound } from "./NotFound";
import { href } from "../lib/router";
import { useStored } from "../lib/storage";
import { useAccess } from "../lib/access";
import { BANQUE, numero } from "../lib/entrainement";
import { ETAPES, etapeParId, type BlocFormation, type ContenuEtape, type EtapeFormation, type QuestionFormation } from "../data/formation";
import { licence, rechargerContenu } from "../lib/licence";
import {
  COUT_INDICE, GAIN_DEFI, GAIN_PREMIER, GAIN_SECOND, PERTE_ERREUR, POINTS_DEPART, POINTS_REPRISE, SEUIL,
  ajouterPoints, commencerFormation, finirSerie, rang, reprendreAvecPoints, useFormation, validerDefi, type EtatFormation
} from "../lib/formation";

// Formation à la dissertation : #/formation (entrée, puis parcours), #/formation/regles,
// #/formation/{étape}?partie=comprendre|exemples|entrainer|defi, #/formation/{étape}/reussite?m=…&g=…

const PARTIES = [
  { id: "comprendre", label: "Comprendre" },
  { id: "exemples", label: "Exemples" },
  { id: "entrainer", label: "S'entraîner" },
  { id: "defi", label: "Défi" }
] as const;
type Partie = (typeof PARTIES)[number]["id"];

const CONTENU_FORMATION = "Avec ta clé d'accès, les 13 étapes de la formation s'ouvrent, de la reformulation à la copie entière, en plus de tout le reste de Litterae.";

/** Écrans « autre univers » (entrée, réussite) : fond vert profond sur toute la page. */
function useUnivers() {
  useEffect(() => {
    document.documentElement.dataset.univers = "formation";
    return () => { delete document.documentElement.dataset.univers; };
  }, []);
}

/** Étapes gratuites : dans le site ; étapes payantes : reçues avec la clé d'accès. */
const contenuDe = (e: EtapeFormation): ContenuEtape | undefined => e.contenu ?? licence()?.contenu.formation?.etapes[e.id];

const nbReussies = (f: EtatFormation) => ETAPES.filter(e => f.etapes[e.id]?.reussie).length;
/** Une étape s'ouvre quand la précédente est réussie. */
// Avec la clé, toutes les étapes sont ouvertes ; sans clé, chacune s'ouvre quand la précédente est réussie.
const ouverte = (f: EtatFormation, e: EtapeFormation, premium = false) => premium || e.num === 1 || !!f.etapes[ETAPES[e.num - 2].id]?.reussie;

/** Texte avec **gras** et titres d'œuvres en italique. */
function Gras({ text }: { text: string }) {
  return <>{text.split("**").map((t, i) => i % 2 ? <strong key={i}><Texte text={t} /></strong> : <Fragment key={i}><Texte text={t} /></Fragment>)}</>;
}

function melanger<T>(liste: T[]): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function FormationScreen({ path, params }: { path: string[]; params: URLSearchParams }) {
  const [, id, sous] = path;
  const [f] = useFormation();
  if (!id) return f.commencee ? <Parcours /> : <Entree />;
  if (id === "regles") return <Entree />;
  const etape = etapeParId(id);
  if (!etape) return <NotFound />;
  if (sous === "reussite") return <Reussite etape={etape} params={params} />;
  return <Etape etape={etape} partie={(params.get("partie") as Partie) || "comprendre"} />;
}

/** Entrée dans la formation : objectif, règles du jeu et risques. */
function Entree() {
  useUnivers();
  const [f] = useFormation();
  const commencer = () => { commencerFormation(); location.hash = f.commencee ? "#/formation" : "#/formation/theme"; };
  return (
    <Page title="Formation" back="#/accueil">
      <div class="univers">
        <p class="univers-sur">Nouveau dans Litterae</p>
        <h1 class="univers-titre">Formation à la dissertation littéraire</h1>
        <p class="univers-lede">Un cours complet en {ETAPES.length} étapes pour apprendre à faire une dissertation, du sujet jusqu'à la conclusion. Chaque étape t'apprend une seule chose : une leçon, des exemples corrigés, des exercices, puis un sujet à rédiger.</p>
        <ol class="univers-points">
          <li><span class="univers-num">1</span><div><strong>Ton objectif</strong><p>Savoir traiter seul un sujet de bac, sans oublier une étape.</p></div></li>
          <li><span class="univers-num">2</span><div><strong>Les règles</strong><p>Tu pars avec {POINTS_DEPART} points. Une bonne réponse du premier coup rapporte {GAIN_PREMIER} points, {GAIN_SECOND} au deuxième essai. Un défi rédigé rapporte {GAIN_DEFI} points.</p></div></li>
          <li><span class="univers-num univers-risque">!</span><div><strong>Les risques</strong><p>Une erreur coûte {PERTE_ERREUR} points, un indice {COUT_INDICE}. Sous {SEUIL} % de maîtrise, l'étape suivante reste fermée. À 0 point, tu reprends l'étape.</p></div></li>
        </ol>
        <p class="univers-note">Étapes 1 à 3 gratuites · Ta progression reste sur ce téléphone</p>
        <div class="univers-actions">
          <button type="button" class="btn univers-btn" onClick={commencer}>{f.commencee ? "Retour au parcours" : "Commencer l'étape 1"}</button>
          {!f.commencee && <a class="univers-lien" href="#/formation" onClick={() => commencerFormation()}>Voir les {ETAPES.length} étapes</a>}
        </div>
      </div>
    </Page>
  );
}

/** Bandeau vert du haut : points, rang, étapes réussies. */
function Tableau({ f }: { f: EtatFormation }) {
  const n = nbReussies(f);
  return (
    <div class="formation-tableau">
      <div><span>Points</span><strong class="formation-points">{f.points}</strong></div>
      <div><span>Rang</span><strong>{rang(n)}</strong></div>
      <div><span>Étapes</span><strong>{n} / {ETAPES.length}</strong></div>
    </div>
  );
}

function Parcours() {
  const [f] = useFormation();
  const { premium } = useAccess();
  return (
    <Page title="Formation" back="#/accueil">
      <header class="formation-tete">
        <p class="formation-sur">Formation à la dissertation</p>
        <h1 class="formation-titre">Mon parcours</h1>
        <Tableau f={f} />
      </header>
      <ol class="formation-etapes">
        {ETAPES.map(e => {
          const etat = f.etapes[e.id];
          const libre = ouverte(f, e, premium);
          const payante = !e.gratuite && !premium;
          const ferme = !libre || payante;
          const statut = etat?.reussie ? `Réussie · ${etat.maitrise} %` : payante ? "Accès complet" : !libre ? `Réussis d'abord l'étape ${e.num - 1}` : etat ? `En cours · meilleur score ${etat.maitrise} %` : e.court;
          const classe = `formation-etape ${etat?.reussie ? "est-reussie" : ""} ${!ferme && !etat?.reussie ? "est-ouverte" : ""} ${ferme ? "est-fermee" : ""}`;
          const corps = <>
            <span class="formation-etape-num">{etat?.reussie ? <Icon name="check" size={18} /> : e.num}</span>
            <span class="formation-etape-texte"><span class="formation-etape-titre">{e.titre}</span><span class="formation-etape-statut">{statut}</span></span>
            {ferme ? <Icon name="lock" size={18} /> : <Icon name="chevron_right" size={20} />}
          </>;
          // Une étape payante reste cliquable : elle montre ce qu'elle contient et comment l'ouvrir.
          return <li key={e.id}>{!libre ? <div class={classe} aria-disabled="true">{corps}</div> : <a class={classe} href={href(["formation", e.id])}>{corps}</a>}</li>;
        })}
      </ol>
      <a class="link-strong formation-regles" href="#/formation/regles">Revoir les règles du jeu</a>
    </Page>
  );
}

function Etape({ etape, partie }: { etape: EtapeFormation; partie: Partie }) {
  const [f] = useFormation();
  const { premium } = useAccess();
  // Passer d'une partie à l'autre (Comprendre → Exemples…) repart du haut de la page.
  const premiere = useRef(true);
  useEffect(() => {
    if (premiere.current) { premiere.current = false; return; }
    window.scrollTo(0, 0);
  }, [partie]);
  const tete = (
    <header class="formation-tete formation-tete-etape">
      <p class="formation-sur">Étape {etape.num} sur {ETAPES.length}</p>
      <h1 class="formation-titre">{etape.titre}</h1>
      <p class="formation-points-ligne"><strong>{f.points}</strong> points · {rang(nbReussies(f))}</p>
    </header>
  );
  if (!etape.gratuite && !premium)
    return <Page title={etape.titre} back="#/formation">{tete}<LockPanel reason={`L'étape ${etape.num}, « ${etape.titre} », est réservée à l'accès complet.`} contenu={CONTENU_FORMATION} /></Page>;
  if (!ouverte(f, etape, premium))
    return <Page title={etape.titre} back="#/formation">{tete}<p class="quiz-lock"><span><Icon name="lock" size={18} /> Réussis d'abord l'étape {etape.num - 1} avec au moins {SEUIL} % de maîtrise.</span></p></Page>;
  const c = contenuDe(etape);
  if (!c) return <Page title={etape.titre} back="#/formation">{tete}<RecevoirFormation /></Page>;
  const reussie = !!f.etapes[etape.id]?.reussie;
  return (
    <Page title={etape.titre} back="#/formation">
      {tete}
      <Segments groupe="formation" label="Parties de l'étape" items={PARTIES.map(p => ({
        label: p.id === "defi" && !reussie ? <><Icon name="lock" size={14} /> {p.label}</> : p.label,
        href: href(["formation", etape.id], { partie: p.id }),
        actif: p.id === partie
      }))} />
      {partie === "comprendre" && <Comprendre etape={etape} c={c} />}
      {partie === "exemples" && <Exemples etape={etape} c={c} />}
      {partie === "entrainer" && <Entrainer key={etape.id} etape={etape} c={c} />}
      {partie === "defi" && (reussie ? <Defi etape={etape} c={c} /> : (
        <div class="quiz-lock">
          <p><Icon name="lock" size={18} /> Le défi s'ouvre quand tu as réussi l'entraînement de cette étape (au moins {SEUIL} %). Tu pourras alors rédiger toi-même, sur un vrai sujet de bac.</p>
          <a class="btn btn-primary align-start" href={href(["formation", etape.id], { partie: "entrainer" })}>S'entraîner</a>
        </div>
      ))}
    </Page>
  );
}

function Bloc({ b }: { b: BlocFormation }) {
  if ("p" in b) return <p><Gras text={b.p} /></p>;
  if ("h" in b) return <h2 class="section-title">{b.h}</h2>;
  if ("liste" in b) return <ul class="bullets">{b.liste.map(x => <li key={x}><Gras text={x} /></li>)}</ul>;
  if ("etapes" in b) return <ol class="steps">{b.etapes.map(([t, d]) => <li key={t}><strong>{t}</strong><span><Gras text={d} /></span></li>)}</ol>;
  if ("def" in b) return <dl class="def">{b.def.map(([k, v]) => [<dt key={k}>{k}</dt>, <dd key={k + "d"}><Gras text={v} /></dd>])}</dl>;
  if ("regle" in b) return <aside class="callout"><p class="callout-label">À retenir</p><p><Gras text={b.regle} /></p></aside>;
  return <aside class="formation-piege"><p class="callout-label">Piège à éviter</p><p><Gras text={b.piege} /></p></aside>;
}

function Comprendre({ etape, c }: { etape: EtapeFormation; c: ContenuEtape }) {
  return (
    <div class="prose formation-prose">
      {c.explication.map((b, i) => <Bloc key={i} b={b} />)}
      <a class="btn btn-primary align-start" href={href(["formation", etape.id], { partie: "exemples" })}>Voir des exemples<Icon name="arrow_forward" size={20} /></a>
    </div>
  );
}

function Exemples({ etape, c }: { etape: EtapeFormation; c: ContenuEtape }) {
  return (
    <div class="formation-exemples">
      {c.exemples.map((x, i) => (
        <article key={i} class="formation-exemple">
          <p class="formation-exemple-num">Exemple {i + 1}</p>
          <blockquote class="citation">« <Texte text={x.sujet} /> »<span class="formation-auteur">{x.auteur}</span></blockquote>
          <ol class="formation-demarche">{x.demarche.map(d => <li key={d}><Texte text={d} /></li>)}</ol>
          <p class="formation-reponse"><span>Réponse</span><strong><Texte text={x.reponse} /></strong></p>
        </article>
      ))}
      <a class="btn btn-primary align-start" href={href(["formation", etape.id], { partie: "entrainer" })}>Je m'entraîne<Icon name="arrow_forward" size={20} /></a>
    </div>
  );
}

type Tirage = { q: QuestionFormation; choix: { t: string; bon: boolean }[] };
const tirer = (qs: QuestionFormation[]): Tirage[] => melanger(qs).map(q => ({ q, choix: melanger(q.choix.map((t, i) => ({ t, bon: i === 0 }))) }));

/** Série de questions à choix, corrigées tout de suite, avec points gagnés et perdus. */
function Entrainer({ etape, c }: { etape: EtapeFormation; c: ContenuEtape }) {
  const [f] = useFormation();
  const [serie, setSerie] = useState(() => tirer(c.questions));
  const [i, setI] = useState(0);
  const [faux, setFaux] = useState<number[]>([]);
  const [juste, setJuste] = useState<number | null>(null);
  const [indice, setIndice] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [message, setMessage] = useState<{ t: string; ok: boolean } | null>(null);
  const [fin, setFin] = useState<null | "perdu" | number>(null);
  const debut = useRef(f.points);
  const zone = useRef<HTMLDivElement>(null);

  const recommencer = () => {
    setSerie(tirer(c.questions)); setI(0); setFaux([]); setJuste(null); setIndice(false); setScores([]); setMessage(null); setFin(null);
    debut.current = Math.max(f.points, POINTS_REPRISE);
  };

  const { q, choix: propositions } = serie[i];
  const termine = juste !== null || faux.length >= 2;

  function choisir(k: number) {
    if (termine || faux.includes(k)) return;
    const essai = faux.length;
    if (propositions[k].bon) {
      const gain = essai === 0 ? GAIN_PREMIER : GAIN_SECOND;
      ajouterPoints(gain);
      setJuste(k);
      setScores(s => [...s, essai === 0 ? 1 : 0.5]);
      setMessage({ t: `Juste ! +${gain} points`, ok: true });
    } else {
      const total = ajouterPoints(-PERTE_ERREUR);
      setFaux(fx => [...fx, k]);
      if (total <= 0) { setFin("perdu"); return; }
      if (essai === 1) { setScores(s => [...s, 0]); setMessage({ t: `Pas encore. −${PERTE_ERREUR} points. Voici la bonne réponse.`, ok: false }); }
      else setMessage({ t: `Pas tout à fait. −${PERTE_ERREUR} points. Essaie encore.`, ok: false });
    }
  }

  function voirIndice() {
    if (indice || termine) return;
    if (ajouterPoints(-COUT_INDICE) <= 0) { setFin("perdu"); return; }
    setIndice(true);
  }

  function suivante() {
    if (i + 1 < serie.length) {
      setI(i + 1); setFaux([]); setJuste(null); setIndice(false); setMessage(null);
      zone.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    const maitrise = Math.round((scores.reduce((a, b) => a + b, 0) / serie.length) * 100);
    finirSerie(etape.id, maitrise);
    if (maitrise >= SEUIL) location.hash = href(["formation", etape.id, "reussite"], { m: String(maitrise), g: String(f.points - debut.current) });
    else setFin(maitrise);
  }

  if (fin === "perdu") return (
    <div class="formation-fin" role="status">
      <h2 class="section-title">Tu n'as plus de points</h2>
      <p>Pas de panique : c'est le moment de relire l'explication. Tu reprends l'étape avec {POINTS_REPRISE} points.</p>
      <div class="formation-fin-actions">
        <a class="btn btn-primary" href={href(["formation", etape.id], { partie: "comprendre" })} onClick={reprendreAvecPoints}>Relire l'explication</a>
        <button type="button" class="btn btn-secondary" onClick={() => { reprendreAvecPoints(); recommencer(); }}>Recommencer la série</button>
      </div>
    </div>
  );
  if (typeof fin === "number") return (
    <div class="formation-fin" role="status">
      <p class="formation-fin-score">{fin} %</p>
      <h2 class="section-title">Encore un effort</h2>
      <p>Il faut au moins {SEUIL} % de maîtrise pour ouvrir le défi et l'étape suivante. Relis les pièges à éviter, puis recommence : les questions arrivent dans un autre ordre.</p>
      <div class="formation-fin-actions">
        <button type="button" class="btn btn-primary" onClick={recommencer}>Recommencer la série</button>
        <a class="btn btn-secondary" href={href(["formation", etape.id], { partie: "comprendre" })}>Relire l'explication</a>
      </div>
    </div>
  );

  return (
    <div class="formation-quiz" ref={zone}>
      <div class="formation-avance">
        <span>Question {i + 1} sur {serie.length}</span>
        <span class="progress-bar" aria-hidden="true"><span style={{ width: `${(i / serie.length) * 100}%` }} /></span>
        <strong class="formation-points-quiz">{f.points} pts</strong>
      </div>
      {q.sujet && <blockquote class="citation">{q.auteur ? <>« <Texte text={q.sujet} /> »<span class="formation-auteur">{q.auteur}</span></> : <Texte text={q.sujet} />}</blockquote>}
      <h2 class="formation-question">{q.q}</h2>
      <div class="formation-choix" role="group" aria-label="Réponses possibles">
        {propositions.map((p, k) => {
          const etat = (termine && p.bon) || juste === k ? "bon" : faux.includes(k) ? "faux" : "";
          return (
            <button key={k} type="button" class={`formation-choix-btn ${etat ? `est-${etat}` : ""}`} disabled={termine || faux.includes(k)} onClick={() => choisir(k)}>
              <Texte text={p.t} />
              {etat === "bon" && <Icon name="check" size={20} />}
              {etat === "faux" && <Icon name="close" size={20} />}
            </button>
          );
        })}
      </div>
      {message && <p class={`formation-retour ${message.ok ? "est-bon" : "est-faux"}`} role="status">{message.t}</p>}
      {indice && !termine && <p class="formation-indice"><Icon name="lightbulb" size={18} /><Texte text={q.indice} /></p>}
      {termine && <p class="formation-pourquoi"><Texte text={q.pourquoi} /></p>}
      <div class="formation-quiz-actions">
        {!termine && !indice && <button type="button" class="btn btn-secondary" onClick={voirIndice}>Indice (−{COUT_INDICE})</button>}
        {termine && <button type="button" class="btn btn-primary" onClick={suivante}>{i + 1 < serie.length ? "Question suivante" : "Voir mon résultat"}</button>}
      </div>
    </div>
  );
}

/** Défi : rédaction libre sur un sujet de la banque, sans correction, avec une grille pour se relire. */
function Defi({ etape, c }: { etape: EtapeFormation; c: ContenuEtape }) {
  const d = c.defi;
  const sujets = useMemo(() => d.sujets.map(n => BANQUE.find(s => s.num === n)).filter(Boolean) as typeof BANQUE, [etape.id]);
  const [k, setK] = useStored<number>(`formation-defi-sujet:${etape.id}`, 0);
  const s = sujets[k % sujets.length];
  const [texte, setTexte] = useStored<string>(`formation-defi:${etape.id}:${s.num}`, "");
  const [coche, setCoche] = useState<boolean[]>(d.grille.map(() => false));
  const [f] = useFormation();
  const [gagne, setGagne] = useState(false);
  const [manque, setManque] = useState(false);
  const suivante = ETAPES.find(e => e.num === etape.num + 1);
  const fait = !!f.etapes[etape.id]?.defi;
  const pret = texte.trim().length >= 15 && coche.every(Boolean);
  return (
    <div class="formation-defi">
      <p class="formation-defi-intro">Ici, pas de correction. 1. Tu écris ta réponse. 2. Tu te relis et tu coches les cases. 3. Tu appuies sur « J'ai terminé ».</p>
      <blockquote class="citation">« <Texte text={s.citation} /> »<span class="formation-auteur">{s.auteur} · {s.consigne}</span></blockquote>
      <button type="button" class="link-strong formation-autre" onClick={() => { setK((k + 1) % sujets.length); setCoche(d.grille.map(() => false)); }}>Un autre sujet ({numero(s.num)})</button>
      <label class="formation-defi-champ">
        <span class="formation-question"><Texte text={d.consigne} /></span>
        <textarea class="textarea" rows={5} value={texte} onInput={e => setTexte((e.target as HTMLTextAreaElement).value)} placeholder="Écris ta réponse ici. Elle reste sur ton téléphone." />
      </label>
      <fieldset class="formation-grille">
        <legend>Je me relis</legend>
        {d.grille.map((g, i) => (
          <label key={g} class="formation-grille-ligne">
            <input type="checkbox" checked={coche[i]} onChange={e => setCoche(coche.map((c, j) => j === i ? (e.target as HTMLInputElement).checked : c))} />
            <span>{g}</span>
          </label>
        ))}
      </fieldset>
      {manque && !pret && <p class="formation-retour est-faux" role="status">{texte.trim().length < 15
        ? "Ta réponse est trop courte. Écris le thème, puis une phrase complète pour expliquer comment tu l'as trouvé."
        : "Relis ta réponse avec la grille et coche chaque case avant de terminer."}</p>}
      {gagne ? <p class="formation-retour est-bon" role="status">Défi rédigé : +{GAIN_DEFI} points.</p>
        : fait ? <p class="small muted">Tu as déjà gagné les points du défi de cette étape. Tu peux t'entraîner sur d'autres sujets.</p> : null}
      {!fait && <button type="button" class="btn btn-primary align-start" onClick={() => pret ? setGagne(validerDefi(etape.id)) : setManque(true)}>J'ai terminé (+{GAIN_DEFI} points)</button>}
      {fait && <div class="formation-defi-suite">
        {suivante
          ? <a class="btn btn-primary align-start" href={href(["formation", suivante.id])}>Passer à l'étape {suivante.num}<Icon name="arrow_forward" size={20} /></a>
          : <a class="btn btn-primary align-start" href="#/formation">Retour au parcours</a>}
        <button type="button" class="link-strong formation-autre" onClick={() => { setK((k + 1) % sujets.length); setCoche(d.grille.map(() => false)); window.scrollTo(0, 0); }}>Rédiger sur un autre sujet</button>
      </div>}
      <a class="link-strong" href={href(["entrainement", s.num])}>Rédiger tout ce sujet dans l'atelier</a>
    </div>
  );
}

/** Écran de réussite entre deux étapes : ce que l'élève a appris, pourquoi c'est utile, et la suite. */
function Reussite({ etape, params }: { etape: EtapeFormation; params: URLSearchParams }) {
  useUnivers();
  const [f] = useFormation();
  const maitrise = Math.min(100, Math.max(0, Number(params.get("m")) || f.etapes[etape.id]?.maitrise || 0));
  const gain = Number(params.get("g")) || 0;
  const suivante = ETAPES[etape.num];
  const c = contenuDe(etape);
  // L'anneau se dessine jusqu'au pourcentage de maîtrise (circonférence 302 pour un rayon de 48).
  const reste = 302 - (302 * maitrise) / 100;
  return (
    <Page title="Étape réussie" back="#/formation">
      <div class="univers univers-reussite">
        <svg class="reussite-anneau" width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`Maîtrise ${maitrise} %`}>
          <circle cx="56" cy="56" r="48" fill="none" class="reussite-fond" stroke-width="4" />
          <circle cx="56" cy="56" r="48" fill="none" class="reussite-trait" stroke-width="4" stroke-linecap="round" transform="rotate(-90 56 56)" style={`--reste:${reste}`} />
          <path class="reussite-coche" d="M40 57l11 11 22-24" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p class="univers-sur">Étape {etape.num} réussie</p>
        <h1 class="univers-titre univers-titre-centre">{etape.id === "epreuve" ? "Tu as réussi l'épreuve finale" : `Tu sais ${etape.titre.charAt(0).toLowerCase() + etape.titre.slice(1)}`}</h1>
        <p class="reussite-badges">
          {gain > 0 && <span>+{gain} points</span>}
          <span>Maîtrise {maitrise} %</span>
          <span class="reussite-rang">Rang : {rang(nbReussies(f))}</span>
        </p>
        {c && <div class="reussite-cartes">
          <section><h2>Ce que tu viens d'apprendre</h2><p>{c.bilan.appris}</p></section>
          <section><h2>Pourquoi c'est important</h2><p>{c.bilan.importance}</p></section>
          {suivante && <section class="reussite-suite"><h2>Étape suivante : {suivante.titre.charAt(0).toLowerCase() + suivante.titre.slice(1)}</h2><p>{suivante.court}.{!suivante.gratuite ? " Elle s'ouvre avec l'accès complet." : ""}</p></section>}
        </div>}
        <div class="univers-actions">
          {suivante ? <a class="btn univers-btn" href={href(["formation", suivante.id])}>Passer à l'étape {suivante.num}</a>
            : <a class="btn univers-btn" href="#/formation">Retour au parcours</a>}
          <a class="univers-lien" href={href(["formation", etape.id], { partie: "defi" })}>Rédiger le défi de cette étape</a>
        </div>
      </div>
    </Page>
  );
}

/** Clé activée avant l'arrivée des étapes payantes, ou appareil resté hors ligne : on les fait venir. */
function RecevoirFormation() {
  const [etat, setEtat] = useState<"" | "envoi" | "echec">("");
  async function recevoir() {
    setEtat("envoi");
    if (await rechargerContenu() && licence()?.contenu.formation) location.reload(); else setEtat("echec");
  }
  return (
    <div class="quiz-lock">
      <p>Ta clé ouvre toutes les étapes de la formation. Connecte-toi à Internet pour les recevoir sur ce téléphone.</p>
      <button type="button" class="btn btn-primary align-start" disabled={etat === "envoi"} onClick={recevoir}>{etat === "envoi" ? "Réception…" : "Recevoir les étapes"}</button>
      {etat === "echec" && <p class="field-error" role="alert"><Icon name="error" size={18} />Les étapes n'ont pas pu être reçues. Vérifie ta connexion et réessaie.</p>}
    </div>
  );
}
