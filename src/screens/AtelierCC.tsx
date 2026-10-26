import { useEffect, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { Texte } from "../components/Texte";
import { LockPanel } from "../components/LockPanel";
import { NotFound } from "./NotFound";
import { MiseAJourCC, TexteEtudieBloc } from "./Commentaire";
import { licence } from "../lib/licence";
import { noterCCUneFois } from "../lib/stats";
import { useStored } from "../lib/storage";
import { useAccesCC as useAccess } from "../data/cc-donnees";
import { CORRIGES_CC, SUJETS_CC, type TexteEtudie } from "../data/commentaire";

// Atelier du commentaire composé : l'élève refait lui-même, pas à pas, le travail des corrigés.
// Comprendre, trouver les centres d'intérêt, souligner les indices dans le texte, les grouper
// sous des sous-titres, analyser chaque indice, puis rédiger. Tout est gardé sur l'appareil.

type Centre = 0 | 1;
interface Soulignement { d: number; f: number; c: Centre }
interface Groupe { id: string; c: Centre; titre: string; indices: string[] }
/** Indices analysés ensemble (champ lexical, même figure…) : une seule analyse pour tous. */
interface Ensemble { id: string; cles: string[]; nature: string }
interface Atelier {
  paratexte: string; type: string; tonalite: string; theme: string; idee: string;
  centres: [string, string];
  soulignes: Soulignement[];
  groupes: Groupe[];
  analyses: Record<string, { a: string; i: string }>;
  ensembles: Ensemble[];
  intro: string; dev: string; conclusion: string;
}
const VIDE: Atelier = {
  paratexte: "", type: "", tonalite: "", theme: "", idee: "", centres: ["", ""],
  soulignes: [], groupes: [], analyses: {}, ensembles: [], intro: "", dev: "", conclusion: ""
};
const ETAPES = ["Comprendre", "Centres d'intérêt", "Souligner", "Grouper", "Analyser", "Rédiger"];
// Ce qui relie des indices analysés ensemble ; « Autre » : l'élève le dit lui-même.
const NATURES = ["Champ lexical", "Même figure de style", "Même temps des verbes", "Même classe de mots", "Ponctuation", "Sonorités", "Autre"];
const DEBUTS: Record<string, string> = {
  "Champ lexical": "Champ lexical de … :", "Même figure de style": "Figure répétée (…) :", "Même temps des verbes": "Verbes au … :",
  "Même classe de mots": "Série de … :", "Ponctuation": "Ponctuation :", "Sonorités": "Sonorités (…) :"
};
const cleEnsemble = (e: Ensemble) => `e:${e.id}`;

interface Mot { m: string; ligne: number; debutLigne: boolean; debutPar: boolean }

/** Le texte découpé en mots, avec le numéro du vers (0 en prose). */
function decouper(t: TexteEtudie): Mot[] {
  const mots: Mot[] = [];
  let vers = 0;
  t.texte.split("\n\n").forEach((par, p) => {
    par.split("\n").forEach((ligne, l) => {
      if (!t.prose) vers++;
      ligne.split(/\s+/).filter(Boolean).forEach((m, k) => mots.push({ m, ligne: t.prose ? 0 : vers, debutLigne: k === 0 && l > 0, debutPar: k === 0 && l === 0 && p > 0 }));
    });
  });
  return mots;
}

// Un même passage peut être souligné pour les deux centres : la clé garde le centre.
const cle = (s: Soulignement) => `${s.d}-${s.f}${s.c ? "-2" : ""}`;
function citation(mots: Mot[], s: { d: number; f: number }) {
  // Un signe de ponctuation souligné seul (« ! », « ? ») reste affiché tel quel.
  const brut = mots.slice(s.d, s.f + 1).map(x => x.m).join(" ");
  const texte = brut.replace(/^[,;:.!?)»\s ]+|[,;:.(«\s ]+$/g, "") || brut.trim();
  const a = mots[s.d].ligne, b = mots[s.f].ligne;
  return `« ${texte} »${a ? (a === b ? ` (v. ${a})` : ` (v. ${a}-${b})`) : ""}`;
}

function Champ({ label, aide, valeur, lignes = 2, onInput }: { label: string; aide?: string; valeur: string; lignes?: number; onInput: (v: string) => void }) {
  return (
    <label class="cc-champ">
      <span class="cc-champ-label">{label}</span>
      {aide && <span class="meta">{aide}</span>}
      <textarea class="textarea" rows={lignes} value={valeur} onInput={e => onInput((e.target as HTMLTextAreaElement).value)} />
    </label>
  );
}

/** Le texte où l'élève souligne : premier mot, puis dernier mot de l'indice. */
function TexteASouligner({ mots, soulignes, outil, debut, toucher }: { mots: Mot[]; soulignes: Soulignement[]; outil: Centre; debut: number | null; toucher: (i: number) => void }) {
  // 1 = centre 1, 2 = centre 2, 3 = les deux.
  const marque = new Map<number, number>();
  soulignes.forEach(s => { for (let k = s.d; k <= s.f; k++) marque.set(k, (marque.get(k) ?? 0) | (s.c + 1)); });
  const lignes: { n: number; par: boolean; mots: number[] }[] = [];
  mots.forEach((m, i) => {
    if (i === 0 || m.debutLigne || m.debutPar) lignes.push({ n: m.ligne, par: m.debutPar, mots: [] });
    lignes[lignes.length - 1].mots.push(i);
  });
  return (
    <div class={`cc-souligner outil-${outil + 1}`} onClick={e => {
      const i = (e.target as HTMLElement).dataset.i;
      if (i != null) toucher(Number(i));
    }}>
      {lignes.map((l, k) => (
        <p key={k} class={`cc-souligner-ligne${l.par ? " par" : ""}`}>
          {l.n > 0 && <span class="cc-num" aria-hidden="true">{l.n % 5 === 0 ? l.n : ""}</span>}
          {l.mots.map(i => {
            const c = marque.get(i);
            // L'espace entre deux mots d'un même indice est soulignée avec eux.
            const lie = c != null && marque.get(i + 1) === c && l.mots.includes(i + 1);
            const suite = l.mots.includes(i + 1) && marque.get(i + 1) != null ? c! & marque.get(i + 1)! : 0;
            return <span key={i}><span data-i={i} role="button" tabIndex={0}
              class={`cc-mot${c != null ? ` marque-${c}` : ""}${debut === i ? " debut" : ""}`}>{mots[i].m}</span><span class={lie ? `cc-espace marque-${c}` : suite ? `cc-espace marque-${suite}` : undefined}>{" "}</span></span>;
          })}
        </p>
      ))}
    </div>
  );
}

export function AtelierCC({ id }: { id: string }) {
  const t: TexteEtudie | undefined = CORRIGES_CC.find(x => x.id === id) ?? SUJETS_CC.find(x => x.id === id);
  const corrige = CORRIGES_CC.some(x => x.id === id);
  const { premium } = useAccess();
  const [a, setA] = useStored<Atelier>(`cc-atelier:${id}`, VIDE);
  const [etape, setEtape] = useStored<number>(`cc-atelier-etape:${id}`, 0);
  const [outil, setOutil] = useState<Centre>(0);
  const [debut, setDebut] = useState<number | null>(null);
  const [choisis, setChoisis] = useState<string[]>([]);
  // Étape « Analyser » : indices cochés pour être analysés ensemble.
  const [aRegrouper, setARegrouper] = useState<string[]>([]);
  // Tableau de bord : atelier commencé, puis arrivé à la dernière étape (une fois par appareil et par texte).
  useEffect(() => {
    if (!t || !premium) return;
    noterCCUneFois(`atelier:${id}`);
    if (etape === ETAPES.length - 1) noterCCUneFois(`fini:${id}`);
  }, [id, etape, premium]);
  if (!t) return <NotFound what="Ce texte n'existe pas." back="#/cc/entrainement" />;
  const retour = corrige ? `#/cc/corriges/${id}` : `#/cc/entrainement/${id}`;
  const at = { ...VIDE, ...a };
  const maj = (p: Partial<Atelier>) => setA({ ...at, ...p });
  const mots = decouper(t);
  const aller = (k: number) => { setEtape(k); setDebut(null); setChoisis([]); setARegrouper([]); scrollTo({ top: 0 }); };
  const nomCentre = (c: Centre) => at.centres[c].trim() || `Centre d'intérêt ${c + 1}`;

  const toucher = (i: number) => {
    // Seul l'outil du même centre efface : avec l'autre outil, on peut souligner le même passage.
    const deja = at.soulignes.find(s => s.c === outil && i >= s.d && i <= s.f);
    if (debut == null && deja) {
      // Toucher un indice déjà souligné l'efface (et le retire de son groupe).
      const k = cle(deja);
      maj({ soulignes: at.soulignes.filter(s => s !== deja), groupes: at.groupes.map(g => ({ ...g, indices: g.indices.filter(x => x !== k) })) });
      return;
    }
    if (debut == null) { setDebut(i); return; }
    const s: Soulignement = { d: Math.min(debut, i), f: Math.max(debut, i), c: outil };
    const gardes = at.soulignes.filter(x => x.c !== outil || x.f < s.d || x.d > s.f);
    const partis = new Set(at.soulignes.filter(x => !gardes.includes(x)).map(cle));
    maj({ soulignes: [...gardes, s].sort((x, y) => x.d - y.d), groupes: at.groupes.map(g => ({ ...g, indices: g.indices.filter(x => !partis.has(x)) })) });
    setDebut(null);
  };

  const parCle = new Map(at.soulignes.map(s => [cle(s), s]));
  const groupeDe = (k: string) => at.groupes.find(g => g.indices.includes(k));
  // Ensembles encore valables (au moins deux indices toujours soulignés) ; les autres indices s'analysent un à un.
  const ensembles = at.ensembles.map(e => ({ ...e, cles: e.cles.filter(k => parCle.has(k)) })).filter(e => e.cles.length >= 2);
  const ensembleDe = (k: string) => ensembles.find(e => e.cles.includes(k));
  /** Ce qui s'analyse dans un bloc : un ensemble à la place de ses indices, à la place du premier d'entre eux. */
  const unites = (cles: string[]) => cles.flatMap(k => {
    const e = ensembleDe(k);
    if (!e) return [{ cle: k, cles: [k], ensemble: null as Ensemble | null }];
    return e.cles.find(x => cles.includes(x)) === k ? [{ cle: cleEnsemble(e), cles: e.cles, ensemble: e as Ensemble | null }] : [];
  });
  const toutes = unites(at.soulignes.map(cle));
  const nbAnalyses = toutes.filter(u => { const x = at.analyses[u.cle]; return x && x.a.trim() && x.i.trim(); }).length;
  const citer = (cles: string[]) => cles.map(k => parCle.get(k)).filter(Boolean).map(s => citation(mots, s!)).join(", ");
  const faites = [
    !!(at.type.trim() && at.tonalite.trim() && at.theme.trim() && at.idee.trim()),
    !!(at.centres[0].trim() && at.centres[1].trim()),
    at.soulignes.some(s => s.c === 0) && at.soulignes.some(s => s.c === 1),
    at.groupes.filter(g => g.titre.trim() && g.indices.length).length >= 2,
    at.soulignes.length > 0 && nbAnalyses === toutes.length,
    !!(at.intro.trim() && at.dev.trim() && at.conclusion.trim())
  ];

  if (!premium) return (
    <Page title="Atelier" back={retour}>
      <header class="page-header"><p class="eyebrow">Atelier</p><h1 class="page-title">{t.titre}</h1></header>
      {licence() ? <MiseAJourCC /> : <LockPanel reason="Le Commentaire composé est réservé à l'accès complet." contenu="Avec ta clé d'accès, tout le Commentaire composé s'ouvre, atelier compris." />}
    </Page>
  );

  return (
    <Page title="Atelier" back={retour}>
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Atelier · Étape {etape + 1} sur {ETAPES.length}</p>
          <h1 class="page-title">{ETAPES[etape]}</h1>
          <p class="lede">{t.titre}, {t.auteur}</p>
        </header>
        <ol class="cc-etapes" aria-label="Étapes">
          {ETAPES.map((nom, k) => (
            <li key={nom}><button class={`cc-etape${k === etape ? " actif" : ""}${faites[k] ? " faite" : ""}`} onClick={() => aller(k)} aria-current={k === etape ? "step" : undefined}>
              <span class="sr-only">{nom}</span>{faites[k] ? <Icon name="check" size={16} /> : k + 1}
            </button></li>
          ))}
        </ol>

        {etape !== 2 && (
          <details class="cc-plie">
            <summary>Revoir le texte et la consigne</summary>
            <TexteEtudieBloc t={t} />
            <p><strong>Consigne.</strong> {t.consigne}</p>
          </details>
        )}

        <div class="prose">
          {etape === 0 && <>
            <p>Avant d'analyser, comprends le texte : interroge le paratexte, lis-le deux fois, puis pose ton diagnostic avec les 3 T.</p>
            <p class="meta">{t.auteur}, <Texte text={t.source} /></p>
            <Champ label="Le paratexte" aide="Ce que t'apprennent l'auteur, le titre, l'œuvre, la date. Tes hypothèses." lignes={3} valeur={at.paratexte} onInput={v => maj({ paratexte: v })} />
            <Champ label="Type" aide="Poème, récit, dialogue, scène de théâtre…" lignes={1} valeur={at.type} onInput={v => maj({ type: v })} />
            <Champ label="Tonalité" aide="Lyrique, pathétique, tragique, épique, satirique, réaliste…" lignes={1} valeur={at.tonalite} onInput={v => maj({ tonalite: v })} />
            <Champ label="Thème" lignes={1} valeur={at.theme} onInput={v => maj({ theme: v })} />
            <Champ label="L'idée générale" aide="Type + tonalité + thème, en une phrase." valeur={at.idee} onInput={v => maj({ idee: v })} />
          </>}

          {etape === 1 && <>
            <aside class="callout"><p class="callout-label">Consigne</p><p>{t.consigne}</p></aside>
            <p>La consigne te donne presque toujours les deux centres d'intérêt. Recopie-les ici, dans l'ordre.</p>
            <Champ label="Premier centre d'intérêt" lignes={1} valeur={at.centres[0]} onInput={v => maj({ centres: [v, at.centres[1]] })} />
            <Champ label="Second centre d'intérêt" lignes={1} valeur={at.centres[1]} onInput={v => maj({ centres: [at.centres[0], v] })} />
          </>}

          {etape === 2 && <>
            <p>Choisis un centre d'intérêt, puis souligne dans le texte chaque indice qui te fait penser à lui : touche le premier mot, puis le dernier. Touche un indice souligné pour l'effacer. Un même indice peut être souligné pour les deux centres.</p>
            <div class="cc-outils" role="radiogroup" aria-label="Centre d'intérêt">
              {([0, 1] as Centre[]).map(c => (
                <button key={c} role="radio" aria-checked={outil === c} class={`cc-outil outil-${c + 1}${outil === c ? " actif" : ""}`} onClick={() => { setOutil(c); setDebut(null); }}>
                  <span class="cc-outil-trait" aria-hidden="true" />{nomCentre(c)}
                </button>
              ))}
            </div>
            {debut != null && <p class="notice notice-court" role="status">Touche maintenant le dernier mot de l'indice.</p>}
            <figure class="cc-texte"><TexteASouligner mots={mots} soulignes={at.soulignes} outil={outil} debut={debut} toucher={toucher} /></figure>
            <h2 class="section-title">Mes indices</h2>
            {([0, 1] as Centre[]).map(c => {
              const liste = at.soulignes.filter(s => s.c === c);
              return <section key={c}>
                <p class={`cc-liste-titre outil-${c + 1}`}>{nomCentre(c)} · {liste.length}</p>
                {liste.length ? <ul class="bullets">{liste.map(s => <li key={cle(s)}>{citation(mots, s)}</li>)}</ul> : <p class="meta">Aucun indice souligné.</p>}
              </section>;
            })}
          </>}

          {etape === 3 && <>
            <p>Pour chaque centre d'intérêt, coche les indices qui se ressemblent, forme un groupe, puis donne-lui un titre : ce titre est un sous-titre. Il dit une idée, pas un procédé.</p>
            {([0, 1] as Centre[]).map(c => {
              const libres = at.soulignes.filter(s => s.c === c && !groupeDe(cle(s)));
              const groupes = at.groupes.filter(g => g.c === c);
              const coches = choisis.filter(k => libres.some(s => cle(s) === k));
              return <section key={c} class="cc-grouper">
                <h2 class="section-title">{nomCentre(c)}</h2>
                {groupes.map((g, n) => (
                  <div key={g.id} class="cc-groupe-carte">
                    <label class="cc-champ">
                      <span class="cc-champ-label">Sous-titre {n + 1}</span>
                      <input class="textarea cc-input" value={g.titre} placeholder="Une idée en quelques mots" onInput={e => maj({ groupes: at.groupes.map(x => x.id === g.id ? { ...x, titre: (e.target as HTMLInputElement).value } : x) })} />
                    </label>
                    <ul class="cc-groupe-indices">
                      {g.indices.map(k => parCle.get(k) && <li key={k}>
                        <span>{citation(mots, parCle.get(k)!)}</span>
                        <button class="icon-btn" aria-label="Retirer du groupe" onClick={() => maj({ groupes: at.groupes.map(x => x.id === g.id ? { ...x, indices: x.indices.filter(y => y !== k) } : x) })}><Icon name="close" size={18} /></button>
                      </li>)}
                    </ul>
                    <button class="btn cc-btn-discret align-start" onClick={() => maj({ groupes: at.groupes.filter(x => x.id !== g.id) })}><Icon name="delete" size={18} />Défaire ce groupe</button>
                  </div>
                ))}
                {libres.length > 0 ? <>
                  <p class="meta">{groupes.length ? "Indices pas encore groupés :" : "Coche les indices de ton premier groupe :"}</p>
                  <ul class="cc-cocher">
                    {libres.map(s => { const k = cle(s); return (
                      <li key={k}><label><input type="checkbox" checked={choisis.includes(k)} onChange={() => setChoisis(choisis.includes(k) ? choisis.filter(x => x !== k) : [...choisis, k])} /><span>{citation(mots, s)}</span></label></li>
                    ); })}
                  </ul>
                  <button class="btn btn-secondary align-start" disabled={!coches.length} onClick={() => {
                    maj({ groupes: [...at.groupes, { id: String(Date.now()), c, titre: "", indices: coches }] });
                    setChoisis(choisis.filter(k => !coches.includes(k)));
                  }}><Icon name="add" size={20} />Former un groupe{coches.length ? ` (${coches.length})` : ""}</button>
                </> : !at.soulignes.some(s => s.c === c)
                  ? <p class="meta">Souligne d'abord des indices pour ce centre d'intérêt, à l'étape 3.</p>
                  : <p class="meta">Tous les indices sont groupés.</p>}
              </section>;
            })}
          </>}

          {etape === 4 && <>
            <p>Pour chaque indice : comment l'auteur le dit (le procédé), et pourquoi il le dit ainsi (l'effet, le sens).</p>
            <p class="meta">Des indices vont ensemble (un champ lexical, une même figure, des verbes au même temps) ? Coche-les, puis analyse-les ensemble.</p>
            {!at.soulignes.length && <p class="meta">Souligne d'abord des indices, à l'étape 3.</p>}
            {([0, 1] as Centre[]).map(c => {
              const blocs = [...at.groupes.filter(g => g.c === c).map(g => ({ id: g.id, titre: g.titre.trim() || "Groupe sans titre", cles: g.indices.filter(k => parCle.has(k)) })),
                { id: `libres-${c}`, titre: "Indices sans groupe", cles: at.soulignes.filter(s => s.c === c && !groupeDe(cle(s))).map(cle) }].filter(b => b.cles.length);
              if (!blocs.length) return null;
              return <section key={c}>
                <h2 class="section-title">{nomCentre(c)}</h2>
                {blocs.map(b => {
                  const coches = aRegrouper.filter(k => b.cles.includes(k));
                  return <div key={b.id} class="cc-groupe">
                    <h3 class="cc-sous-titre">{b.titre}</h3>
                    <ul class="cc-fiches">{unites(b.cles).map(u => {
                      const x = at.analyses[u.cle] ?? { a: "", i: "" };
                      const ecrire = (p: Partial<{ a: string; i: string }>) => maj({ analyses: { ...at.analyses, [u.cle]: { ...x, ...p } } });
                      const e = u.ensemble;
                      if (!e) {
                        const coche = aRegrouper.includes(u.cle);
                        return <li key={u.cle} class={`cc-fiche${coche ? " cc-fiche-cochee" : ""}`}>
                          <div class="cc-fiche-tete">
                            <p class="cc-fiche-indice">{citer(u.cles)}</p>
                            {b.cles.length > 1 && <label class="cc-regrouper"><input type="checkbox" checked={coche}
                              onChange={() => setARegrouper(coche ? aRegrouper.filter(k => k !== u.cle) : [...aRegrouper, u.cle])} />Regrouper</label>}
                          </div>
                          <Champ label="Comment" valeur={x.a} lignes={2} onInput={v => ecrire({ a: v })} />
                          <Champ label="Pourquoi" valeur={x.i} lignes={2} onInput={v => ecrire({ i: v })} />
                        </li>;
                      }
                      const choisir = (nature: string) => {
                        const debutTexte = DEBUTS[nature];
                        // Le début proposé ne remplace jamais ce que l'élève a écrit : c'est une aide, il reste libre.
                        const a = !x.a.trim() && debutTexte ? `${debutTexte} ${citer(e.cles)}. ` : x.a;
                        maj({ ensembles: at.ensembles.map(y => y.id === e.id ? { ...y, nature } : y), analyses: { ...at.analyses, [u.cle]: { ...x, a } } });
                      };
                      return <li key={u.cle} class="cc-fiche cc-fiche-ensemble">
                        <p class="cc-fiche-label">{e.cles.length} indices analysés ensemble{e.nature && e.nature !== "Autre" ? ` · ${e.nature}` : ""}</p>
                        <p class="cc-fiche-indice">{citer(e.cles)}</p>
                        <div class="cc-natures" role="group" aria-label="Ce qui les relie">
                          {NATURES.map(n => <button key={n} type="button" class="chip" aria-pressed={e.nature === n} onClick={() => choisir(n)}>{n}</button>)}
                        </div>
                        <Champ label="Comment" aide={e.nature === "Autre" ? "Dis toi-même ce qui relie ces indices, puis le procédé." : "Ce qui les relie et le procédé. Complète ou réécris à ta façon."} valeur={x.a} lignes={3} onInput={v => ecrire({ a: v })} />
                        <Champ label="Pourquoi" valeur={x.i} lignes={3} onInput={v => ecrire({ i: v })} />
                        <button class="btn cc-btn-discret align-start" onClick={() => {
                          // Séparer : l'analyse écrite revient au premier indice s'il n'en avait pas.
                          const premier = e.cles[0], avant = at.analyses[premier];
                          const analyses = { ...at.analyses };
                          if (!avant || (!avant.a.trim() && !avant.i.trim())) analyses[premier] = x;
                          delete analyses[u.cle];
                          maj({ ensembles: at.ensembles.filter(y => y.id !== e.id), analyses });
                        }}><Icon name="call_split" size={18} />Séparer</button>
                      </li>;
                    })}</ul>
                    {coches.length > 0 && <button class="btn btn-secondary align-start cc-ensemble-btn" disabled={coches.length < 2} onClick={() => {
                      const ens: Ensemble = { id: String(Date.now()), cles: b.cles.filter(k => coches.includes(k)), nature: "" };
                      // Ce qui était déjà écrit pour ces indices est repris dans l'analyse commune.
                      const ecrits = ens.cles.map(k => at.analyses[k]).filter(v => v && (v.a.trim() || v.i.trim()));
                      const analyses = { ...at.analyses, [cleEnsemble(ens)]: { a: ecrits.map(v => v!.a.trim()).filter(Boolean).join(" "), i: ecrits.map(v => v!.i.trim()).filter(Boolean).join(" ") } };
                      maj({ ensembles: [...at.ensembles.filter(y => !y.cles.some(k => ens.cles.includes(k))), ens], analyses });
                      setARegrouper(aRegrouper.filter(k => !coches.includes(k)));
                    }}><Icon name="account_tree" size={20} />{coches.length < 2 ? "Coche au moins 2 indices" : `Analyser ensemble (${coches.length})`}</button>}
                  </div>;
                })}
              </section>;
            })}
          </>}

          {etape === 5 && <>
            <p>Mets ton brouillon en phrases. Un paragraphe par sous-titre, sans titres dans la copie, une transition entre les deux centres d'intérêt.</p>
            <details class="cc-plie">
              <summary>Mon plan</summary>
              {([0, 1] as Centre[]).map(c => <div key={c}>
                <p><strong>{nomCentre(c)}</strong></p>
                <ol class="outline">{at.groupes.filter(g => g.c === c).map(g => <li key={g.id}>{g.titre || "Groupe sans titre"}
                  <ul class="cc-plan-analyses">{unites(g.indices.filter(k => parCle.has(k))).map(u => { const x = at.analyses[u.cle];
                    return <li key={u.cle}>{citer(u.cles)}{x?.a.trim() ? ` : ${x.a.trim()}` : ""}{x?.i.trim() ? ` → ${x.i.trim()}` : ""}</li>; })}</ul>
                </li>)}</ol>
              </div>)}
            </details>
            <Champ label="Introduction" aide="Généralité, présentation du texte, annonce du plan." lignes={6} valeur={at.intro} onInput={v => maj({ intro: v })} />
            <Champ label="Développement" lignes={14} valeur={at.dev} onInput={v => maj({ dev: v })} />
            <Champ label="Conclusion" aide="Bilan, appréciation, ouverture." lignes={5} valeur={at.conclusion} onInput={v => maj({ conclusion: v })} />
            {corrige && <a class="btn btn-secondary align-start" href={`#/cc/corriges/${id}`}><Icon name="history_edu" size={20} />Comparer avec le corrigé</a>}
          </>}

          <nav class="cc-atelier-nav" aria-label="Étapes">
            {etape > 0 ? <button class="btn cc-btn-discret" onClick={() => aller(etape - 1)} aria-label={`Retour : ${ETAPES[etape - 1]}`}><Icon name="arrow_back" size={20} />Retour</button> : <span />}
            {etape < ETAPES.length - 1 && <button class="btn btn-primary" onClick={() => aller(etape + 1)}>Suivant : {ETAPES[etape + 1]}<Icon name="arrow_forward" size={20} /></button>}
          </nav>
          <p class="meta">Ton travail est gardé sur ce téléphone.</p>
        </div>
      </article>
    </Page>
  );
}
