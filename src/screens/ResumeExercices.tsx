import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { Texte } from "../components/Texte";
import { TexteCrayon } from "../components/Crayon";
import { NotFound } from "./NotFound";
import { useStored, read } from "../lib/storage";
import { compterMots } from "../lib/mots";
import { NOMS_VERBES, phrasesEssentielles, type ExerciceRS } from "../data/resume-types";
import { EXERCICES_RS, RS_COMPLET, exerciceRS } from "../data/resume-donnees";
import { Cadenas } from "./Commentaire";
import { AchatLien } from "../components/Achat";
import { licence } from "../lib/licence";
import { BILANS_PE, CONNECTEURS_ATELIER, DEBUTS_REPONSES, INTRO_PE, JUGEMENT_PE, PHRASES_INTRO_PE, TECHNIQUES_RS, TRANSITION_PE } from "../data/resume-outils";
import type { TexteEtudie } from "../data/cc-types";
import { CarteTexte, VerrouRS } from "./Resume";
import { Segments } from "../components/SujetsOnglets";

// Exercices du résumé de texte : textes corrigés pas à pas, et atelier où l'élève fait tout le sujet, de A à Z.
// Adresses : #/rs/sujets, #/rs/corrige/<id>, #/rs/atelier/<id>. Tout le travail de l'atelier reste sur l'appareil.

const fourchette = (e: ExerciceRS) => {
  const cible = Math.round(e.mots / e.fraction), marge = Math.round(cible / 10);
  return { cible, min: cible - marge, max: cible + marge };
};
const nomFraction = (e: ExerciceRS) => e.fraction === 4 ? "au quart" : "au tiers";

/** Le texte de l'exercice, sous la forme qu'attend la carte « Texte support » (avec le crayon). */
const texteEtudie = (e: ExerciceRS, id = `rs-ex-${e.id}`): TexteEtudie => ({
  id, titre: e.titre, auteur: e.auteur || "Auteur non indiqué", source: e.source, prose: true, texte: e.texte, note: e.note,
  consigne: `Résumez ce texte de ${e.mots} mots ${nomFraction(e)} de son volume.`
});

// ——— Atelier : ce que l'élève a écrit ———

interface ArgEleve { a: string; e: string; x: string }
interface AtelierRS {
  hypotheses: string; theme: string; these: string; visee: string;
  reponses: string[];
  choisies: number[]; verifie: boolean;
  reformulations: Record<string, string>;
  connecteurs: Record<string, string>;
  resume: string;
  peTheme: string; peThese: string; peBut: string;
  intro: string; phrase: string; args: ArgEleve[]; transition: string;
  bilan: string; jugement: string; ouverture: string;
}
const VIDE: AtelierRS = {
  hypotheses: "", theme: "", these: "", visee: "", reponses: [], choisies: [], verifie: false, reformulations: {}, connecteurs: {},
  resume: "", peTheme: "", peThese: "", peBut: "", intro: "", phrase: "", args: [], transition: "", bilan: "", jugement: "", ouverture: ""
};

const ETAPES: { nom: string; phase: number }[] = [
  { nom: "Lire le texte", phase: 0 },
  { nom: "Thème, thèse, visée", phase: 0 },
  { nom: "Répondre aux questions", phase: 0 },
  { nom: "Choisir les idées essentielles", phase: 1 },
  { nom: "Reformuler", phase: 1 },
  { nom: "Enchaîner", phase: 1 },
  { nom: "Rédiger le résumé", phase: 1 },
  { nom: "Comprendre le sujet", phase: 2 },
  { nom: "L'introduction", phase: 2 },
  { nom: "Le développement", phase: 2 },
  { nom: "La conclusion", phase: 2 },
  { nom: "Ma copie", phase: 3 }
];
const PHASES = ["Comprendre", "Résumé", "Production", "Ma copie"];
const nbArguments = (e: ExerciceRS) => e.pe.verbe === "discuter" ? 4 : 3;
const plein = (s?: string) => !!s && s.trim().length > 0;

/** Les blocs à reformuler : une idée essentielle (ses phrases choisies), ou une phrase choisie qui n'en porte pas. */
function blocsAReformuler(e: ExerciceRS, choisies: number[]) {
  const { phrases, idee } = phrasesEssentielles(e);
  const blocs: { cle: string; phrases: number[]; idee?: number }[] = [];
  [...choisies].sort((a, b) => a - b).forEach(i => {
    if (!phrases[i]) return;
    const k = idee.get(i);
    const cle = k != null ? `i${k}` : `p${i}`;
    const deja = blocs.find(b => b.cle === cle);
    if (deja) deja.phrases.push(i); else blocs.push({ cle, phrases: [i], idee: k });
  });
  return { blocs, phrases };
}

function avecConnecteur(connecteur: string | undefined, phrase: string) {
  const p = phrase.trim();
  // L'élève a déjà commencé sa phrase par ce connecteur : on ne le répète pas.
  if (!connecteur || p.toLowerCase().startsWith(connecteur.toLowerCase())) return p;
  // « Mais » + « Le touriste… » → « Mais le touriste… » ; on garde les majuscules des noms propres et des sigles.
  const debut = /^[A-ZÀ-Ý][a-zà-ÿ]/.test(p) && !/^(L'|D')/.test(p) ? p[0].toLowerCase() + p.slice(1) : p.replace(/^(L'|D')/, m => m.toLowerCase());
  // Pas de virgule après « mais », « car », « donc », « c'est pourquoi ».
  return `${connecteur}${["Mais", "Car", "Donc", "C'est pourquoi"].includes(connecteur) ? "" : ","} ${debut}`;
}

function etatAtelier(e: ExerciceRS, a: AtelierRS) {
  const { blocs } = blocsAReformuler(e, a.choisies);
  const n = nbArguments(e);
  return [
    plein(a.hypotheses),
    plein(a.theme) && plein(a.these) && plein(a.visee),
    e.questions.every((_, k) => plein(a.reponses[k])),
    a.choisies.length > 0 && a.verifie,
    blocs.length > 0 && blocs.every(b => plein(a.reformulations[b.cle])),
    blocs.length > 1 && blocs.slice(1).some(b => !!a.connecteurs[b.cle]),
    plein(a.resume),
    plein(a.peTheme) && plein(a.peThese),
    plein(a.intro),
    plein(a.phrase) && Array.from({ length: n }, (_, k) => a.args[k]).every(x => x && plein(x.a) && plein(x.e) && plein(x.x)),
    plein(a.bilan) && plein(a.jugement) && plein(a.ouverture)
  ];
}

export function progressionAtelier(e: ExerciceRS) {
  const a = { ...VIDE, ...read<AtelierRS>(`rs-atelier:${e.id}`, VIDE) };
  const faites = etatAtelier(e, a);
  return Math.round(100 * faites.filter(Boolean).length / faites.length);
}

// ——— Liste des exercices ———

export function SujetsRS({ vue }: { vue?: string }) {
  const corriges = EXERCICES_RS.filter(e => e.corrige), entrainement = EXERCICES_RS.filter(e => !e.corrige);
  const ligne = (e: ExerciceRS, href: string) => {
    const p = RS_COMPLET ? progressionAtelier(e) : 0;
    return (
      <li key={e.id}>
        <a class="row" href={href}>
          <span class="row-body">
            <span class="row-title">{e.titre}</span>
            <span class="meta">{[e.auteur, NOMS_VERBES[e.pe.verbe], `${e.mots} mots`].filter(Boolean).join(" · ")}{p ? ` · atelier ${p} %` : ""}</span>
          </span>
          {RS_COMPLET ? <Icon name="chevron_right" /> : <Cadenas />}
        </a>
      </li>
    );
  };
  const corrige = vue !== "entrainement";
  return (
    <Page>
      <Segments groupe="rs-exercices" label="Exercices" items={[
        { label: "Corrigés", href: "#/rs/sujets", actif: corrige },
        { label: "Entraînement", href: "#/rs/entrainement", actif: !corrige }
      ]} />
      <header class="page-header">
        <h1 class="page-title">{corrige ? "Textes corrigés" : "Entraînement"}</h1>
        <p class="lede">{corrige
          ? "Tout le sujet pas à pas, de la lecture à la production écrite. Puis refais-le dans l'atelier."
          : "L'atelier te guide étape par étape, et te montre ce que tu as oublié."}</p>
      </header>
      {!RS_COMPLET && !licence() && <p class="quota cc-quota"><span class="muted quota-texte">Réservé à l'accès complet</span><AchatLien label="Débloquer" /></p>}
      {(() => {
        const liste = corrige ? corriges : entrainement, lien = (e: ExerciceRS) => corrige ? `#/rs/corrige/${e.id}` : `#/rs/atelier/${e.id}`;
        const debut = liste.filter(e => e.niveau === "debut"), bac = liste.filter(e => e.niveau !== "debut");
        // Textes courts de niveau 3e d'abord, pour apprendre la méthode ; puis les sujets du niveau bac.
        if (!debut.length) return <ol class="list">{bac.map(e => ligne(e, lien(e)))}</ol>;
        return <>
          <h2 class="rs-liste-titre">Pour commencer : textes courts</h2>
          <ol class="list">{debut.map(e => ligne(e, lien(e)))}</ol>
          <h2 class="rs-liste-titre">Niveau bac</h2>
          <ol class="list">{bac.map(e => ligne(e, lien(e)))}</ol>
        </>;
      })()}
    </Page>
  );
}

// ——— Corrigé ———

function Section({ n, titre, children }: { n: number; titre: string; children: ComponentChildren }) {
  return (
    <section class="rs-corrige-partie">
      <h2 class="rs-partie-titre"><span class="rs-partie-num">{n}</span>{titre}</h2>
      {children}
    </section>
  );
}

function Def({ lignes }: { lignes: [string, string][] }) {
  return <dl class="def">{lignes.map(([t, d]) => [<dt key={t}>{t}</dt>, <dd key={t + "d"}><Texte text={d} /></dd>])}</dl>;
}

/** La production écrite rédigée : introduction, développement (paragraphes), conclusion. */
function ProductionRedigee({ e }: { e: ExerciceRS }) {
  const pe = e.pe;
  if (!pe.arguments) return null;
  const pour = pe.verbe === "discuter" ? 2 : pe.arguments.length;
  return <>
    <h3 class="rs-sous-titre">Introduction</h3>
    <figure class="model"><p><Texte text={pe.intro} /></p></figure>
    <h3 class="rs-sous-titre">Développement</h3>
    <figure class="model rs-copie">
      <p class="rs-phrase-intro"><Texte text={pe.phrase ?? ""} /></p>
      {pe.arguments.map((x, k) => <>
        {k === pour && pe.transition && <p class="rs-transition"><Texte text={pe.transition} /></p>}
        <p key={k}><strong>{x.argument}</strong> <Texte text={x.explication} /> <Texte text={x.exemple} /></p>
      </>)}
    </figure>
    <p class="meta">En gras, l'argument. Puis l'explication, puis l'exemple.</p>
    <h3 class="rs-sous-titre">Conclusion</h3>
    <figure class="model"><p><Texte text={`${pe.bilan} ${pe.jugement} ${pe.ouverture}`} /></p></figure>
  </>;
}

/** Sans le contenu complet : le titre de l'exercice, puis le cadenas. */
function ExerciceVerrouille({ e, titre }: { e: ExerciceRS; titre: string }) {
  return (
    <Page title={titre} back="#/rs/sujets">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">{titre} · {NOMS_VERBES[e.pe.verbe]}</p>
          <h1 class="page-title"><Texte text={e.titre} /></h1>
          <p class="lede">{e.auteur ? `${e.auteur}, ` : ""}<Texte text={e.source} /></p>
        </header>
        <VerrouRS />
      </article>
    </Page>
  );
}

function CorrigeRS({ id }: { id: string }) {
  const e = exerciceRS(id);
  if (!e || !e.corrige) return <NotFound what="Ce corrigé n'existe pas." back="#/rs/sujets" />;
  if (!RS_COMPLET) return <ExerciceVerrouille e={e} titre="Corrigé" />;
  const { phrases } = phrasesEssentielles(e);
  const f = fourchette(e);
  return (
    <Page title="Corrigé" back="#/rs/sujets">
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Corrigé · {NOMS_VERBES[e.pe.verbe]}</p>
          <h1 class="page-title"><Texte text={e.titre} /></h1>
          <p class="lede">{e.auteur ? `${e.auteur}, ` : ""}<Texte text={e.source} /></p>
        </header>
        <CarteTexte t={texteEtudie(e)} />
        <aside class="callout">
          <p class="callout-label">Le sujet</p>
          <ol class="rs-sujet-liste">
            {e.questions.map((q, k) => <li key={k}><Texte text={q.q} /></li>)}
            <li>Résumez ce texte de {e.mots} mots {nomFraction(e)} de son volume. Une marge de 10 % en plus ou en moins est tolérée.</li>
            <li><Texte text={e.pe.consigne} /></li>
          </ol>
        </aside>

        <div class="prose">
          <Section n={1} titre="Comprendre le texte">
            <h3 class="rs-sous-titre">Le paratexte</h3>
            <p><Texte text={e.paratexte} /></p>
            <h3 class="rs-sous-titre">La lecture active</h3>
            <Def lignes={[["Thème", e.theme], ["Thèse", e.these], ["Visée argumentative", e.visee], ["Situation d'énonciation", e.enonciation]]} />
            <h3 class="rs-sous-titre">La structure logique</h3>
            <ol class="steps">{e.structure.map(([t, d]) => <li key={t}><strong>{t}</strong><span><Texte text={d} /></span></li>)}</ol>
          </Section>

          <Section n={2} titre="Répondre aux questions">
            {e.questions.map((q, k) => <div key={k} class="rs-question">
              <p class="rs-question-q">{k + 1}. <Texte text={q.q} /></p>
              <figure class="model"><p><Texte text={q.reponse} /></p></figure>
            </div>)}
          </Section>

          <Section n={3} titre="Rédiger le résumé">
            <h3 class="rs-sous-titre">Les idées essentielles, reformulées</h3>
            <p>Chaque idée retenue, avec les phrases du texte qui la portent. Tout le reste (exemples, explications, répétitions) a été écarté.</p>
            <details class="cc-plie">
              <summary>Voir les {e.idees.length} idées, une à une</summary>
              <ol class="rs-idees">
                {e.idees.map((d, k) => <li key={k}>
                  <p class="rs-idee-texte">{d.cles.map(c => phrases.find(p => p.phrase.startsWith(c))?.phrase).filter(Boolean).map(p => `« ${p} »`).join(" ")}</p>
                  <p class="rs-idee-reformulee"><Icon name="arrow_forward" size={16} /><span><Texte text={d.reformulation} /></span></p>
                </li>)}
              </ol>
            </details>
            <h3 class="rs-sous-titre">L'enchaînement logique</h3>
            <p><Texte text={e.enchainement} /></p>
            <h3 class="rs-sous-titre">Le résumé rédigé</h3>
            <figure class="model rs-resume-modele"><p><Texte text={e.resume} /></p></figure>
            <p class="meta">{compterMots(e.resume)} mots. Le texte en compte {e.mots} : {nomFraction(e)}, la fourchette va de {f.min} à {f.max} mots.</p>
          </Section>

          <Section n={4} titre="La production écrite">
            <h3 class="rs-sous-titre">Comprendre le sujet</h3>
            <Def lignes={[["Thème", e.pe.theme], ["Thèse reformulée", e.pe.these], ["Consigne", `${NOMS_VERBES[e.pe.verbe]} : ${e.pe.verbe === "étayer" ? "montrer que la thèse est juste." : e.pe.verbe === "réfuter" ? "montrer que la thèse est fausse ou insuffisante." : "montrer ce qui est juste dans la thèse, puis ses limites."}`]]} />
            <ProductionRedigee e={e} />
          </Section>
        </div>

        <a class="btn btn-primary align-start" href={`#/rs/atelier/${e.id}`}><Icon name="edit" size={20} />Refaire ce sujet dans l'atelier</a>
      </article>
    </Page>
  );
}

// ——— Atelier ———

function Champ({ label, aide, valeur, lignes = 2, place, onInput }: { label: string; aide?: string; valeur: string; lignes?: number; place?: string; onInput: (v: string) => void }) {
  return (
    <label class="cc-champ">
      <span class="cc-champ-label">{label}</span>
      {aide && <span class="meta">{aide}</span>}
      <textarea class="textarea" rows={lignes} value={valeur} placeholder={place} onInput={ev => onInput((ev.target as HTMLTextAreaElement).value)} />
    </label>
  );
}

function Voir({ titre = "Voir une réponse possible", children }: { titre?: string; children: ComponentChildren }) {
  return <details class="rs-voir"><summary>{titre}</summary><div class="rs-voir-corps">{children}</div></details>;
}

/** Le texte en phrases à toucher : l'élève choisit lui-même les idées essentielles. */
function TexteAChoisir({ e, choisies, verifie, toucher }: { e: ExerciceRS; choisies: number[]; verifie: boolean; toucher: (i: number) => void }) {
  const { phrases, idee } = phrasesEssentielles(e);
  const pars: number[][] = [];
  phrases.forEach((p, i) => { (pars[p.par] ??= []).push(i); });
  return (
    <figure class="rs-choisir">
      {pars.map((liste, k) => <p key={k}>{liste.map(i => {
        const choisie = choisies.includes(i), essentielle = idee.has(i);
        const etat = !verifie ? "" : choisie && essentielle ? " juste" : choisie ? " en-trop" : essentielle ? " oubliee" : "";
        return <span key={i}><button type="button" class={`rs-phrase${choisie ? " choisie" : ""}${etat}`} aria-pressed={choisie} onClick={() => toucher(i)}>{phrases[i].phrase}</button>{" "}</span>;
      })}</p>)}
    </figure>
  );
}

function AtelierRSScreen({ id }: { id: string }) {
  const e = exerciceRS(id);
  const [brut, setA] = useStored<AtelierRS>(`rs-atelier:${id}`, VIDE);
  const [etape, setEtape] = useStored<number>(`rs-atelier-etape:${id}`, 0);
  const [effacer, setEffacer] = useState(false);
  const [copie, setCopie] = useState(false);
  if (!e) return <NotFound what="Ce texte n'existe pas." back="#/rs/sujets" />;
  if (!RS_COMPLET) return <ExerciceVerrouille e={e} titre="Atelier" />;
  const a: AtelierRS = { ...VIDE, ...brut };
  const maj = (p: Partial<AtelierRS>) => setA({ ...a, ...p });
  const aller = (k: number) => { setEtape(k); setCopie(false); scrollTo({ top: 0 }); };
  const faites = etatAtelier(e, a);
  const { phrases, idee } = phrasesEssentielles(e);
  const { blocs } = blocsAReformuler(e, a.choisies);
  const f = fourchette(e);
  const n = nbArguments(e);
  const pour = e.pe.verbe === "discuter" ? 2 : n;
  const retour = e.corrige ? `#/rs/corrige/${id}` : "#/rs/entrainement";
  const phase = ETAPES[etape].phase;

  const relie = blocs.filter(b => plein(a.reformulations[b.cle])).map((b, k) => avecConnecteur(k ? a.connecteurs[b.cle] : undefined, a.reformulations[b.cle]));
  const resumeRelie = relie.join(" ").replace(/\s+([,.])/g, "$1").replace(/\.\s*([,:;])/g, "$1");
  const compte = compterMots(a.resume);
  const etatCompte = !compte ? "" : compte < f.min ? "court" : compte > f.max ? "long" : "ok";

  const choixJustes = a.choisies.filter(i => idee.has(i)).length;
  const enTrop = a.choisies.filter(i => !idee.has(i)).length;
  const oubliees = [...idee.keys()].filter(i => !a.choisies.includes(i)).length;
  const ideesTrouvees = e.idees.filter((_, k) => a.choisies.some(i => idee.get(i) === k)).length;

  const arg = (k: number): ArgEleve => a.args[k] ?? { a: "", e: "", x: "" };
  const majArg = (k: number, p: Partial<ArgEleve>) => {
    const args = Array.from({ length: n }, (_, j) => arg(j));
    args[k] = { ...args[k], ...p };
    maj({ args });
  };
  const paragrapheArg = (k: number) => [arg(k).a, arg(k).e, arg(k).x].map(s => s.trim()).filter(Boolean).join(" ");
  const developpement = [a.phrase.trim(), ...Array.from({ length: n }, (_, k) => k === pour && a.transition.trim() ? `${a.transition.trim()} ${paragrapheArg(k)}` : paragrapheArg(k))].filter(Boolean);
  const conclusion = [a.bilan, a.jugement, a.ouverture].map(s => s.trim()).filter(Boolean).join(" ");
  const copieTexte = [
    "I. Questions",
    ...e.questions.map((_, k) => `${k + 1}. ${a.reponses[k]?.trim() || "…"}`),
    "", "II. Résumé", `    ${a.resume.trim() || "…"}`, compte ? `(Nombre de mots : ${compte})` : "",
    "", "III. Production écrite", a.intro.trim() || "…", ...developpement, conclusion || "…"
  ].join("\n");

  return (
    <Page title="Atelier" back={retour}>
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Atelier · Étape {etape + 1} sur {ETAPES.length}</p>
          <h1 class="page-title">{ETAPES[etape].nom}</h1>
          <p class="lede"><Texte text={e.titre} />{e.auteur ? ` · ${e.auteur}` : ""}</p>
        </header>
        <nav class="rs-phases" aria-label="Parties du sujet">
          {PHASES.map((nom, p) => {
            const premiere = ETAPES.findIndex(x => x.phase === p);
            const etapesPhase = ETAPES.map((x, k) => ({ ...x, k })).filter(x => x.phase === p);
            const finie = etapesPhase.every(x => x.k >= faites.length || faites[x.k]);
            return <button key={nom} type="button" class={`rs-phase${p === phase ? " actif" : ""}${finie && p < 3 ? " faite" : ""}`} aria-current={p === phase ? "step" : undefined} onClick={() => aller(premiere)}>
              {finie && p < 3 && <Icon name="check" size={16} />}{nom}
            </button>;
          })}
        </nav>
        {phase < 3 && <div class="rs-points" aria-hidden="true">
          {ETAPES.map((x, k) => x.phase === phase && <button key={k} type="button" tabIndex={-1} class={`rs-point${k === etape ? " actif" : ""}${faites[k] ? " fait" : ""}`} onClick={() => aller(k)} />)}
        </div>}

        <div class="prose">
          {etape === 0 && <>
            <p>Commence par le paratexte : le titre, l'auteur, la source et la date. Fais tes suppositions, puis lis le texte crayon en main.</p>
            <Def lignes={[["Titre", `« ${e.titre} »`], ["Auteur", e.auteur || "Non indiqué"], ["Source", e.source]]} />
            <Champ label="Mes suppositions" aide="« Ce texte va sans doute parler de…, et l'auteur va probablement défendre… »" lignes={3} valeur={a.hypotheses} onInput={v => maj({ hypotheses: v })} />
            <Voir><p><Texte text={e.paratexte} /></p></Voir>
            <figure class="rs-atelier-texte"><TexteCrayon id={`rs-atelier-${e.id}`} texte={e.texte} note={e.note} /></figure>
          </>}

          {etape === 1 && <>
            <p>Après la lecture active, réponds avec les petites phrases du brouillon.</p>
            <CarteTexte t={texteEtudie(e, `rs-atelier-${e.id}`)} />
            <Champ label="Le thème" aide="Un groupe nominal." place="Dans ce texte, on parle de…" valeur={a.theme} onInput={v => maj({ theme: v })} />
            <Voir><p><Texte text={e.theme} /></p></Voir>
            <Champ label="La thèse" place="L'auteur pense que…" lignes={3} valeur={a.these} onInput={v => maj({ these: v })} />
            <Voir><p><Texte text={e.these} /></p></Voir>
            <Champ label="La visée argumentative" place="L'auteur voudrait que…" valeur={a.visee} onInput={v => maj({ visee: v })} />
            <Voir><p><Texte text={e.visee} /></p></Voir>
            <details class="cc-plie"><summary>La structure logique du texte</summary><ol class="steps">{e.structure.map(([t, d]) => <li key={t}><strong>{t}</strong><span><Texte text={d} /></span></li>)}</ol></details>
          </>}

          {etape === 2 && <>
            <p>Réponds par des phrases complètes. Pour un mot ou une expression, regarde la phrase où il se trouve, celle d'avant et celle d'après.</p>
            <CarteTexte t={texteEtudie(e, `rs-atelier-${e.id}`)} />
            {e.questions.map((q, k) => <div key={k} class="rs-question">
              <Champ label={`${k + 1}. ${q.q.replace(/\*/g, "")}`} lignes={4} valeur={a.reponses[k] ?? ""} onInput={v => { const r = [...a.reponses]; r[k] = v; maj({ reponses: r }); }} />
              <Voir><p><Texte text={q.reponse} /></p></Voir>
            </div>)}
            <details class="cc-plie"><summary>Les débuts de réponses</summary><Def lignes={DEBUTS_REPONSES} /></details>
          </>}

          {etape === 3 && <>
            <p>Touche dans le texte chaque phrase qui apporte une information nouvelle. Laisse les exemples, les explications, les répétitions et les chiffres. Touche une phrase choisie pour la retirer.</p>
            {a.verifie
              ? <p class="notice notice-court" role="status">Tu as retrouvé {ideesTrouvees} idée{ideesTrouvees > 1 ? "s" : ""} sur {e.idees.length}. {oubliees ? `En orange, ${oubliees} phrase${oubliees > 1 ? "s" : ""} oubliée${oubliees > 1 ? "s" : ""}. ` : ""}{enTrop ? `Barrée${enTrop > 1 ? "s" : ""}, ${enTrop} phrase${enTrop > 1 ? "s" : ""} à écarter.` : ""}{!oubliees && !enTrop ? "Tout est juste." : ""}</p>
              : <p class="meta">{a.choisies.length} phrase{a.choisies.length > 1 ? "s" : ""} choisie{a.choisies.length > 1 ? "s" : ""}.</p>}
            <TexteAChoisir e={e} choisies={a.choisies} verifie={a.verifie} toucher={i => maj({ choisies: a.choisies.includes(i) ? a.choisies.filter(x => x !== i) : [...a.choisies, i], verifie: false })} />
            <div class="rs-actions">
              {!a.verifie && <button type="button" class="btn btn-primary" disabled={!a.choisies.length} onClick={() => maj({ verifie: true })}><Icon name="fact_check" size={20} />Vérifier mon choix</button>}
              {a.verifie && (oubliees > 0 || enTrop > 0) && <button type="button" class="btn btn-secondary" onClick={() => maj({ choisies: [...idee.keys()].sort((x, y) => x - y), verifie: true })}>Corriger mon choix</button>}
            </div>
            {a.verifie && choixJustes > 0 && <p class="meta">Les phrases d'une même idée seront reformulées ensemble.</p>}
          </>}

          {etape === 4 && <>
            <p>Reformule chaque idée avec tes mots, phrase par phrase. Ne recopie pas, ne change pas seulement un mot : dis autrement ce que dit l'auteur, sans parler de lui.</p>
            <details class="cc-plie"><summary>Les techniques pour reformuler</summary><Def lignes={TECHNIQUES_RS} /></details>
            {!blocs.length && <p class="meta">Choisis d'abord les idées essentielles, à l'étape précédente.</p>}
            {blocs.map((b, k) => <div key={b.cle} class="rs-bloc">
              <p class="rs-bloc-num">Idée {k + 1}</p>
              <p class="rs-idee-texte">{b.phrases.map(i => `« ${phrases[i].phrase} »`).join(" ")}</p>
              <textarea class="textarea" rows={2} aria-label={`Reformulation de l'idée ${k + 1}`} value={a.reformulations[b.cle] ?? ""} placeholder="Avec tes mots…"
                onInput={ev => maj({ reformulations: { ...a.reformulations, [b.cle]: (ev.target as HTMLTextAreaElement).value } })} />
              {b.idee != null
                ? <Voir titre="Voir une reformulation possible"><p><Texte text={e.idees[b.idee].reformulation} /></p></Voir>
                : <p class="meta">Cette phrase ne fait pas partie des idées essentielles du corrigé.</p>}
            </div>)}
          </>}

          {etape === 5 && <>
            <p>Relie tes idées avec des connecteurs, pour retrouver le raisonnement de l'auteur : une opposition, une cause, une conséquence… Ne mets pas de connecteur partout.</p>
            {blocs.filter(b => plein(a.reformulations[b.cle])).map((b, k) => <div key={b.cle} class="rs-lien">
              {k > 0 && <label class="rs-connecteur">
                <span class="sr-only">Connecteur avant l'idée {k + 1}</span>
                <select class="select" value={a.connecteurs[b.cle] ?? ""} onChange={ev => maj({ connecteurs: { ...a.connecteurs, [b.cle]: (ev.target as HTMLSelectElement).value } })}>
                  <option value="">Sans connecteur</option>
                  {CONNECTEURS_ATELIER.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>}
              <p class="rs-lien-phrase">{avecConnecteur(k ? a.connecteurs[b.cle] : undefined, a.reformulations[b.cle])}</p>
            </div>)}
            {!blocs.some(b => plein(a.reformulations[b.cle])) && <p class="meta">Reformule d'abord tes idées, à l'étape précédente.</p>}
            <Voir titre="Voir l'enchaînement du corrigé"><p><Texte text={e.enchainement} /></p></Voir>
          </>}

          {etape === 6 && <>
            <p>Écris ton résumé au propre : un seul paragraphe, avec un alinéa, à la place de l'auteur. Corrige les reprises, puis compte tes mots.</p>
            <aside class="rs-calcul-resultat"><p class="rs-calcul-fourchette">Entre <strong>{f.min}</strong> et <strong>{f.max}</strong> mots</p><p class="meta">{e.mots} mots {nomFraction(e)} : environ {f.cible} mots, à 10 % près.</p></aside>
            {!plein(a.resume) && resumeRelie && <button type="button" class="btn btn-secondary align-start" onClick={() => maj({ resume: resumeRelie })}><Icon name="content_paste" size={20} />Partir de mes phrases reliées</button>}
            <label class="cc-champ">
              <span class="cc-champ-label">Mon résumé</span>
              <textarea class="textarea rs-alinea" rows={10} value={a.resume} onInput={ev => maj({ resume: (ev.target as HTMLTextAreaElement).value })} />
            </label>
            <div class="rs-calcul-ligne">
              <p class={`rs-calcul-compte ${etatCompte}`} role="status"><strong>{compte} mot{compte > 1 ? "s" : ""}</strong>
                {etatCompte === "ok" && " · dans la fourchette"}
                {etatCompte === "court" && ` · trop court de ${f.min - compte} mot${f.min - compte > 1 ? "s" : ""}`}
                {etatCompte === "long" && ` · trop long de ${compte - f.max} mot${compte - f.max > 1 ? "s" : ""}`}</p>
              {plein(a.resume) && resumeRelie && <button type="button" class="rs-calcul-effacer" onClick={() => maj({ resume: resumeRelie })}>Reprendre mes phrases</button>}
            </div>
            <Voir titre="Voir le résumé du corrigé"><p><Texte text={e.resume} /></p><p class="meta">{compterMots(e.resume)} mots</p></Voir>
          </>}

          {etape === 7 && <>
            <aside class="callout"><p class="callout-label">Le sujet</p><p><Texte text={e.pe.consigne} /></p></aside>
            <p>Avant de chercher des arguments, comprends la citation : son thème, et sa thèse redite avec tes mots.</p>
            <Champ label="Le thème de la citation" aide="Souvent celui du texte, mais pas toujours." place="Dans cette citation, on parle de…" valeur={a.peTheme} onInput={v => maj({ peTheme: v })} />
            <Voir><p><Texte text={e.pe.theme} /></p></Voir>
            <Champ label="La thèse, reformulée" place="L'auteur pense que…" lignes={3} valeur={a.peThese} onInput={v => maj({ peThese: v })} />
            <Voir><p><Texte text={e.pe.these} /></p></Voir>
            <Champ label="Ce que je dois faire" aide={`La consigne : ${e.pe.verbe}.`} place="Je dois montrer que…" valeur={a.peBut} onInput={v => maj({ peBut: v })} />
          </>}

          {etape === 8 && <>
            <p>Relève les éléments, puis place-les dans la phrase modèle.</p>
            <Def lignes={[["Titre", `« ${e.titre} »`], ["Source", e.source], ...(e.date ? [["Date", e.date] as [string, string]] : []), ["Auteur", e.auteur || "Non indiqué"], ["Thèse", `« ${e.pe.citation} »`], ["Verbe de consigne", e.pe.verbe]]} />
            {!plein(a.intro) && <button type="button" class="btn btn-secondary align-start" onClick={() => maj({ intro: INTRO_PE })}><Icon name="content_paste" size={20} />Partir de la phrase modèle</button>}
            <Champ label="Mon introduction" lignes={6} valeur={a.intro} onInput={v => maj({ intro: v })} />
            <Voir titre="Voir l'introduction rédigée"><p><Texte text={e.pe.intro} /></p></Voir>
          </>}

          {etape === 9 && <>
            <p>{e.pe.verbe === "discuter"
              ? "Pour discuter : une phrase introductive, deux arguments qui montrent ce que la thèse a de juste, une transition, puis deux arguments sur ses limites."
              : `Une phrase introductive, puis trois arguments pour ${e.pe.verbe} la thèse. Chaque argument : l'argument, son explication, un exemple.`}</p>
            <Champ label="Phrase introductive" valeur={a.phrase} onInput={v => maj({ phrase: v })} />
            <div class="rs-suggestions" role="group" aria-label="Phrases introductives">
              {PHRASES_INTRO_PE[e.pe.verbe].map(s => <button key={s} type="button" class="chip" onClick={() => maj({ phrase: s })}>{s}</button>)}
            </div>
            {Array.from({ length: n }, (_, k) => <>
              {e.pe.verbe === "discuter" && k === 0 && <h3 class="rs-sous-titre">Ce que la thèse a de juste</h3>}
              {e.pe.verbe === "discuter" && k === pour && <>
                <h3 class="rs-sous-titre">Ses limites</h3>
                <Champ label="Transition" lignes={1} place={TRANSITION_PE} valeur={a.transition} onInput={v => maj({ transition: v })} />
              </>}
              <div key={k} class="rs-bloc">
                <p class="rs-bloc-num">Argument {k + 1}</p>
                <Champ label="L'argument" lignes={2} valeur={arg(k).a} onInput={v => majArg(k, { a: v })} />
                <Champ label="L'explication" lignes={3} valeur={arg(k).e} onInput={v => majArg(k, { e: v })} />
                <Champ label="L'exemple" lignes={3} valeur={arg(k).x} onInput={v => majArg(k, { x: v })} />
                {e.pe.arguments?.[k] && <Voir titre="Voir l'argument du corrigé"><p><strong>{e.pe.arguments[k].argument}</strong> <Texte text={e.pe.arguments[k].explication} /> <Texte text={e.pe.arguments[k].exemple} /></p></Voir>}
              </div>
            </>)}
            {e.pe.pistes && <Voir titre="Besoin d'idées ? Des pistes"><ul class="bullets">{e.pe.pistes.map(p => <li key={p}><Texte text={p} /></li>)}</ul><p class="meta">À toi de les développer avec ton explication et ton exemple.</p></Voir>}
          </>}

          {etape === 10 && <>
            <p>Le bilan regarde en arrière, le jugement personnel donne ton avis, l'ouverture regarde plus loin.</p>
            <Champ label="Le bilan" lignes={3} place={BILANS_PE[e.pe.verbe]} valeur={a.bilan} onInput={v => maj({ bilan: v })} />
            <Champ label="Mon jugement personnel" lignes={2} place={JUGEMENT_PE} valeur={a.jugement} onInput={v => maj({ jugement: v })} />
            <Champ label="L'ouverture" aide="Une question sur un problème voisin." lignes={2} valeur={a.ouverture} onInput={v => maj({ ouverture: v })} />
            {e.pe.bilan && <Voir titre="Voir la conclusion du corrigé"><p><Texte text={`${e.pe.bilan} ${e.pe.jugement} ${e.pe.ouverture}`} /></p></Voir>}
          </>}

          {etape === 11 && <>
            <p>Voici ta copie entière. Relis-la : orthographe, accords, connecteurs. {faites.every(Boolean) ? "" : "Les parties encore vides sont marquées « … »."}</p>
            <figure class="rs-copie-finale">
              <h3 class="rs-sous-titre">I. Questions</h3>
              {e.questions.map((_, k) => <p key={k}><span class="meta">{k + 1}.</span> {a.reponses[k]?.trim() || "…"}</p>)}
              <h3 class="rs-sous-titre">II. Résumé</h3>
              <p class="rs-alinea-texte">{a.resume.trim() || "…"}</p>
              {compte > 0 && <p class="meta">Nombre de mots : {compte}{etatCompte === "ok" ? "" : ` (fourchette : ${f.min} à ${f.max})`}</p>}
              <h3 class="rs-sous-titre">III. Production écrite</h3>
              <p class="rs-alinea-texte">{a.intro.trim() || "…"}</p>
              {developpement.length ? developpement.map((p, k) => <p key={k} class="rs-alinea-texte">{p}</p>) : <p>…</p>}
              <p class="rs-alinea-texte">{conclusion || "…"}</p>
            </figure>
            <div class="rs-actions">
              <button type="button" class="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(copieTexte).then(() => setCopie(true), () => {}); }}>
                <Icon name={copie ? "check" : "content_copy"} size={20} />{copie ? "Copie copiée" : "Copier ma copie"}
              </button>
              {e.corrige && <a class="btn btn-secondary" href={`#/rs/corrige/${e.id}`}><Icon name="history_edu" size={20} />Voir le corrigé</a>}
            </div>
            {effacer
              ? <p class="rs-effacer">Tout effacer pour recommencer ? <button type="button" class="btn cc-btn-discret" onClick={() => { setA(VIDE); setEffacer(false); aller(0); }}>Oui, tout effacer</button> <button type="button" class="btn cc-btn-discret" onClick={() => setEffacer(false)}>Non</button></p>
              : <button type="button" class="btn cc-btn-discret align-start" onClick={() => setEffacer(true)}><Icon name="delete" size={18} />Recommencer ce sujet</button>}
          </>}

          <nav class="cc-atelier-nav" aria-label="Étapes">
            {etape > 0 ? <button class="btn cc-btn-discret" onClick={() => aller(etape - 1)} aria-label={`Retour : ${ETAPES[etape - 1].nom}`}><Icon name="arrow_back" size={20} />Retour</button> : <span />}
            {etape < ETAPES.length - 1 && <button class="btn btn-primary" onClick={() => aller(etape + 1)}>Suivant<Icon name="arrow_forward" size={20} /></button>}
          </nav>
          <p class="meta">Ton travail est gardé sur ce téléphone.</p>
        </div>
      </article>
    </Page>
  );
}

export { CorrigeRS, AtelierRSScreen as AtelierRS };
