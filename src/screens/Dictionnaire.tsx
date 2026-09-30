import { Fragment } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import dico from "../data/dictionnaire.json";
import type { Dictionnaire, EntreeDico, Fonction, MotDico } from "../data/types";
import { FONCTIONS } from "../data/types";
import { Icon } from "../components/Icon";
import { Highlight } from "../components/Highlight";
import { EmptyState } from "../components/EmptyState";
import { OEUVRES } from "../lib/data";
import { fnClass } from "../lib/fonctions";
import { normalize, plural } from "../lib/text";
import { queryTerms } from "../lib/search";
import { href } from "../lib/router";
import { AchatLien } from "../components/Achat";
import { useAccess } from "../lib/access";
import { DICO_GRATUITS, consulter, dicoComplet, useConsultes, type EchecConsultation } from "../lib/dictionnaire";
import { lienContact } from "../lib/contact";
import { useVerrou } from "../components/LockPanel";
import { noter, noterRecherche } from "../lib/stats";
import { contenuLibre } from "../lib/libre";

const D = dico as Dictionnaire;

/** Liste publique des mots, avec ceux ajoutés ou modifiés depuis le tableau de bord. */
function motsPublics(): MotDico[] {
  const changes = contenuLibre()?.mots;
  if (!changes?.length) return D.entrees;
  const parMot = new Map(D.entrees.map(m => [m.mot, m]));
  for (const m of changes) parMot.set(m.mot, m);
  return [...parMot.values()].sort((a, b) => a.mot.localeCompare(b.mot, "fr"));
}

type Mot = MotDico | EntreeDico;
const complete = (e: Mot): e is EntreeDico => "sens" in e;

interface Indexe { e: Mot; mot: string; mots: string[]; texte: string; exemples: string }

function indexer(entrees: Mot[]): Indexe[] {
  return entrees.map(e => {
    const mot = normalize(e.mot);
    const c = complete(e) ? e : null;
    return {
      e,
      mot,
      mots: mot.split(/[^a-z-]+/).filter(Boolean),
      texte: c ? normalize([c.sens, c.fonction, c.note, ...(c.oeuvres ?? [])].join(" ")) : e.cles ?? "",
      exemples: c ? normalize((c.exemples ?? []).join(" ")) : ""
    };
  });
}

const TITRES = new Map(OEUVRES.map(w => [normalize(w.titre), w.id]));

/** Le mot vedette pèse bien plus que la définition ; « opprimés » trouve « OPPRIMÉ ». */
function score(x: Indexe, terms: string[]) {
  let total = 0;
  for (const t of terms) {
    const r = t.length > 4 ? t.replace(/(e?s|x)$/, "") : t;
    const s = x.mots.includes(t) || x.mots.includes(r) ? 100
      : x.mots.some(m => m.startsWith(r)) ? 60
      : x.mot.includes(r) ? 40
      : x.texte.includes(t) ? 8
      : x.exemples.includes(t) ? 3 : 0;
    if (!s) return 0;
    total += s;
  }
  return total;
}

export function chercher(INDEX: Indexe[], q: string, fonction: string | null): Mot[] {
  const n = normalize(q);
  const terms = queryTerms(q);
  const parFonction = (x: Indexe) => !fonction || (x.e.fonctions ?? []).includes(fonction as Fonction);
  // Une seule lettre : les mots qui commencent par cette lettre.
  if (n.length === 1) return INDEX.filter(x => x.mot.startsWith(n) && parFonction(x)).map(x => x.e);
  if (!terms.length) return INDEX.filter(parFonction).map(x => x.e);
  return INDEX
    .map(x => ({ x, s: score(x, terms) }))
    .filter(r => r.s > 0 && parFonction(r.x))
    .sort((a, b) => b.s - a.s || a.x.mot.localeCompare(b.x.mot, "fr"))
    .map(r => r.x.e);
}

/** Texte avec renvois « voir COMBAT » cliquables et termes cherchés surlignés. */
function Texte({ text, terms, onVoir }: { text: string; terms: string[]; onVoir: (mot: string) => void }) {
  const parts = text.split(/((?:[Vv]oir) (?:[A-ZÀÂÇÉÈÊËÎÏÔÛÙÜ'-]{2,}(?: [A-ZÀÂÇÉÈÊËÎÏÔÛÙÜ'-]{2,})*))/);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <Highlight key={i} text={p} terms={terms} />;
        const [voir, ...mot] = p.split(" ");
        const cible = mot.join(" ");
        return (
          <Fragment key={i}>
            {voir}{" "}
            <button type="button" class="dico-renvoi" onClick={() => onVoir(cible.toLowerCase())}>{cible}</button>
          </Fragment>
        );
      })}
    </>
  );
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** La nuance est affichée seulement si elle dit plus que les étiquettes de fonction. */
function nuance(e: EntreeDico) {
  if (!e.fonction) return null;
  const brut = normalize(e.fonction).replace(/\bsocial\b/, "sociale");
  const simple = (e.fonctions ?? []).map(normalize).join(", ");
  return brut === simple ? null : e.fonction;
}

type Etat = EchecConsultation | "chargement";

/** Détails d'un mot, affichés dans la carte qui s'ouvre au toucher. */
function Details({ e, onVoir, onFonction }: { e: EntreeDico; onVoir: (m: string) => void; onFonction: (f: string) => void }) {
  const detail = nuance(e);
  return (
    <div class="dico-details">
      <p class="dico-sens"><Texte text={majuscule(e.sens)} terms={[]} onVoir={onVoir} /></p>
      {(e.fonctions?.length || detail) && (
        <div class="dico-fonctions">
          {e.fonctions?.map(f => (
            <button key={f} type="button" class={`tag tag-link ${fnClass(f)}`} onClick={() => onFonction(f)}
              aria-label={`Voir les mots de la fonction ${f}`}>{f}</button>
          ))}
          {detail && <span class="small muted">Fonction : {detail}</span>}
        </div>
      )}
      {e.note && <p class="small"><Texte text={e.note} terms={[]} onVoir={onVoir} /></p>}
      {e.oeuvres && (
        <p class="small">
          <span class="dico-label">Œuvres</span>{" "}
          {e.oeuvres.map((t, i) => {
            const id = TITRES.get(normalize(t));
            return <Fragment key={t}>{i > 0 && ", "}{id ? <a href={href(["oeuvres", id])}><em>{t}</em></a> : <em>{t}</em>}</Fragment>;
          })}
        </p>
      )}
      {e.exemples?.map(x => (
        <p key={x} class="dico-exemple"><span class="dico-label">Exemple</span><Texte text={x} terms={[]} onVoir={onVoir} /></p>
      ))}
      <p class="meta"><a href={lienContact("erreur", "#/outils", `le mot « ${e.mot} » du dictionnaire`)}>Signaler une erreur</a></p>
    </div>
  );
}

function Verrou() {
  useVerrou("dico");
  return (
    <div class="dico-verrou">
      <p><Icon name="lock" size={16} /> Tu as consulté tes {DICO_GRATUITS} mots gratuits. L'accès complet ouvre tout le dictionnaire.</p>
      <p class="dico-verrou-actions"><AchatLien /><a class="link-btn" href="#/acces">J'ai une clé d'accès</a></p>
    </div>
  );
}

function Guide({ onVoir }: { onVoir: (m: string) => void }) {
  return (
    <div class="dico-guide" id="dico-guide">
      {D.guide.map(g => (
        <section key={g.titre}>
          <h3 class="sub-title">{g.titre}</h3>
          {g.blocs.map((b, i) => Array.isArray(b)
            ? <ul key={i}>{b.map(li => <li key={li}><Texte text={li} terms={[]} onVoir={onVoir} /></li>)}</ul>
            : b.startsWith("Astuce : ")
              ? <p key={i} class="dico-astuce"><span class="dico-label">Astuce</span><Texte text={b.slice(9)} terms={[]} onVoir={onVoir} /></p>
              : <p key={i}><Texte text={b} terms={[]} onVoir={onVoir} /></p>)}
        </section>
      ))}
    </div>
  );
}

/** Barre de recherche, placée dans la barre figée de la boîte à outils. */
export function DicoRecherche({ q, onChange }: { q: string; onChange: (q: string) => void }) {
  return (
    <div class="search-bar dico-search" role="search">
      <label class="field">
        <Icon name="search" />
        <span class="sr-only">Chercher un mot du sujet</span>
        <input type="search" value={q} placeholder="Un mot du sujet : écho, voix, beau…" enterkeyhint="search" autocomplete="off"
          autocapitalize="off" spellcheck={false} onInput={e => onChange((e.target as HTMLInputElement).value)} />
        {q && (
          <button type="button" class="icon-btn dico-effacer" onClick={() => onChange("")} aria-label="Effacer la recherche">
            <Icon name="close" size={20} />
          </button>
        )}
      </label>
    </div>
  );
}

export function DicoResultats({ q, fonction, onChange }: { q: string; fonction: string | null; onChange: (q: string, fonction: string | null) => void }) {
  const terms = queryTerms(q);
  const access = useAccess();
  const vus = useConsultes();
  const complet = access.premium ? dicoComplet() : null;
  // Sans le dictionnaire complet : liste des mots, avec le sens de ceux déjà consultés.
  const entrees = useMemo<Mot[]>(() => complet ?? motsPublics().map(m => vus[m.mot] ?? m), [complet, vus]);
  const INDEX = useMemo(() => indexer(entrees), [entrees]);
  const resultats = chercher(INDEX, q, fonction);
  const restants = Math.max(0, DICO_GRATUITS - Object.keys(vus).length);
  const [guide, setGuide] = useState(false);
  const [tous, setTous] = useState(false);
  const compte = (f: Fonction) => entrees.filter(e => e.fonctions?.includes(f)).length;

  // Carte du mot ouvert.
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [etat, setEtat] = useState<Etat | null>(null);
  const entreeOuverte = ouvert ? entrees.find(e => e.mot === ouvert) : undefined;
  // Position dans la liste, retrouvée en refermant la carte.
  const position = useRef(0);
  useEffect(() => noterRecherche("dico", q, resultats.length), [q]);
  const ouvrir = async (mot: string) => {
    noter({ t: "mot", ref: mot });
    if (!ouvert) position.current = scrollY;
    setOuvert(mot);
    scrollTo(0, 0);
    const e = entrees.find(x => x.mot === mot);
    if (!e || complete(e)) { setEtat(null); return; }
    setEtat("chargement");
    const r = await consulter(mot);
    setEtat(typeof r === "string" ? r : null);
  };
  const fermer = () => {
    setOuvert(null);
    requestAnimationFrame(() => scrollTo(0, position.current));
  };
  // Une nouvelle recherche (lien, retour) referme la carte.
  useEffect(() => setOuvert(null), [q, fonction]);
  // Renvoi « voir COMBAT » : ouvre directement la carte du mot quand il existe.
  const voir = (mot: string) => {
    const n = normalize(mot);
    const cible = entrees.find(e => normalize(e.mot).split(/\s*\/\s*| et /).includes(n));
    if (cible) { ouvrir(cible.mot); return; }
    fermer(); onChange(mot, null); scrollTo(0, 0);
  };
  const filtrer = (f: string) => { fermer(); onChange("", f === fonction ? null : f); scrollTo(0, 0); };

  const parcours = !normalize(q) && !fonction;
  const liste = !parcours || tous;

  // Carte d'un mot : elle prend la place de la liste, sous la recherche qui reste visible.
  if (entreeOuverte) return (
    <div class="reading reading-left dico">
      <article class={`dico-carte ${entreeOuverte.fonctions?.[0] ? fnClass(entreeOuverte.fonctions[0]) : ""}`} aria-labelledby="dico-carte-titre">
        <div class="dico-carte-tete">
          <button type="button" class="link-btn dico-retour" onClick={fermer}><Icon name="arrow_back" size={18} />Retour aux mots</button>
          <h2 id="dico-carte-titre" class="dico-tete">
            <span class="dico-mot">{entreeOuverte.mot}</span>{" "}
            <span class="dico-nature">{entreeOuverte.nature}</span>
          </h2>
        </div>
        <div class="dico-carte-corps">
          {complete(entreeOuverte) ? <Details e={entreeOuverte} onVoir={voir} onFonction={filtrer} />
            : etat === "limite" ? <Verrou />
            : etat === "chargement" ? <p class="muted">Un instant…</p>
            : etat === "hors-ligne" ? <p class="muted">Connecte-toi à Internet pour voir ce mot.</p>
            : <p class="dico-ouvrir"><span class="muted">Le serveur ne répond pas.</span><button type="button" class="btn btn-secondary" onClick={() => ouvrir(entreeOuverte.mot)}>Réessayer</button></p>}
        </div>
      </article>
    </div>
  );

  return (
    <div class="reading reading-left dico">
      <div class="dico-outils">
        <label class="dico-fonction">
          <span class="sr-only">Fonction littéraire</span>
          <select class={`select ${fonction ? fnClass(fonction) + " dico-select-actif" : ""}`} value={fonction ?? ""}
            onChange={e => { const v = (e.target as HTMLSelectElement).value; onChange(q, v || null); }}>
            <option value="">Toutes les fonctions</option>
            {FONCTIONS.map(f => <option key={f} value={f}>{f} ({compte(f)})</option>)}
          </select>
        </label>
        <button type="button" class="link-btn" aria-expanded={guide} aria-controls="dico-guide" onClick={() => setGuide(!guide)}>
          {guide ? "Fermer le mode d'emploi" : "Mode d'emploi"}
        </button>
      </div>

      {!complet && !access.premium && (
        <p class="small muted quota">
          {restants ? `${plural(restants, "mot gratuit", "mots gratuits")} à consulter sur ${DICO_GRATUITS}.` : `Tes ${DICO_GRATUITS} mots gratuits sont consultés.`}{" "}
          <AchatLien label="Tout débloquer" />
        </p>
      )}

      {guide && <Guide onVoir={m => { setGuide(false); voir(m); }} />}

      {!liste ? (
        <button type="button" class="link-btn dico-tous" onClick={() => setTous(true)}>Voir tous les mots ({entrees.length})</button>
      ) : resultats.length ? (
        <>
          {!parcours && <p class="small muted" aria-live="polite">{plural(resultats.length, "mot")}{fonction ? ` · ${fonction}` : ""}</p>}
          <ul class="dico-liste">
            {resultats.map((e, i) => {
              const lettre = normalize(e.mot)[0].toUpperCase();
              const nouvelle = parcours && (i === 0 || normalize(resultats[i - 1].mot)[0].toUpperCase() !== lettre);
              const fn = e.fonctions?.[0];
              return (
                <Fragment key={e.mot}>
                  {nouvelle && <li class="dico-lettre" aria-hidden="true">{lettre}</li>}
                  <li class={fn ? fnClass(fn) : ""}>
                    <button type="button" class="dico-ligne" onClick={() => ouvrir(e.mot)} >
                      <span class="dico-ligne-texte">
                        <span class="dico-mot"><Highlight text={e.mot} terms={terms} /></span>{" "}
                        <span class="dico-nature">{e.nature}</span>
                      </span>
                      <Icon name="chevron_right" size={20} />
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ul>
          {parcours && <button type="button" class="link-btn dico-tous" onClick={() => { setTous(false); scrollTo(0, 0); }}>Replier la liste</button>}
        </>
      ) : (
        <EmptyState title="Aucun mot trouvé">
          <p>Essaie un mot voisin, ou un seul mot à la fois.</p>
          <button type="button" class="btn btn-secondary" onClick={() => { onChange("", null); setTous(true); }}>Voir tous les mots</button>
        </EmptyState>
      )}

    </div>
  );
}
