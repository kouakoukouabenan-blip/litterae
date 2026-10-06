import { useEffect, useMemo, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { useStored, write } from "../lib/storage";
import { normalize } from "../lib/text";
import { FONCTIONS, type Fonction } from "../data/types";
import { analyserSujet, decouperSujet } from "../lib/devoir";
import { fnClass } from "../lib/fonctions";
import { ajouterSujetPerso, CONSIGNE } from "../lib/entrainement";
import { brouillonVide, lireBrouillon } from "../lib/atelier";
import { marquer } from "../lib/progres";
import { noter } from "../lib/stats";
import { estGarde, garderDevoir, retirerDevoir, useDevoirs, type DevoirGarde } from "../lib/devoirs";
import { EmptyState } from "../components/EmptyState";
import { toast } from "../components/Toast";

/** J'ai un devoir : l'élève colle son sujet, l'appli propose un plan, des œuvres, des mots et des sujets corrigés proches. */
export function DevoirScreen() {
  const [texte, setTexte] = useStored<string>("devoir-texte", "");
  const [auteur, setAuteur] = useStored<string>("devoir-auteur", "");
  const [lu, setLu] = useState(() => texte.trim().length >= 20);
  // Fonction corrigée par l'élève, gardée sur le téléphone pour ce sujet (rien n'est envoyé).
  const [choisies, setChoisies] = useStored<Record<string, Fonction>>("devoir-fonctions", {});
  const cleSujet = normalize(texte);
  const choisie = choisies[cleSujet];
  const [corriger, setCorriger] = useState(false);
  const analyse = useMemo(() => (lu ? analyserSujet(texte, 6, choisie) : null), [lu, texte, choisie]);
  function choisir(f: Fonction | null) {
    const suite = { ...choisies };
    delete suite[cleSujet];
    if (f) suite[cleSujet] = f;
    // Les 50 derniers sujets suffisent.
    setChoisies(Object.fromEntries(Object.entries(suite).slice(-50)));
    setCorriger(false);
  }
  // Arrivée avec le sujet déjà tapé sur l'accueil : on montre directement les résultats.
  useEffect(() => { if (lu) setTimeout(() => {
    // Sous la barre du haut, qui reste affichée.
    const el = document.querySelector(".devoir-resultat");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90 });
  }, 50); }, []);

  function analyser(e: Event) {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    setLu(true);
    marquer("devoir");
    noter({ t: "progres", ref: "devoir" });
  }

  const [devoirs] = useDevoirs();
  const garde = estGarde(devoirs, texte);

  function garder() {
    garderDevoir(texte, auteur || analyse?.auteur || "");
    toast("Devoir gardé dans Mon espace.");
  }

  /** Page vide pour taper le sujet suivant (le devoir précédent reste dans Mon espace s'il a été gardé). */
  function autreDevoir() {
    setTexte("");
    setAuteur("");
    setLu(false);
    window.scrollTo({ top: 0 });
    setTimeout(() => (document.querySelector(".devoir-form textarea") as HTMLTextAreaElement | null)?.focus(), 50);
  }

  /** L'atelier reprend le sujet avec les thèmes, la fonction et le plan proposés (si l'élève ne l'a pas déjà commencé). */
  function rediger() {
    if (!analyse) return;
    const { citation, consigne } = decouperSujet(texte);
    const num = ajouterSujetPerso(citation, auteur.trim() || analyse.auteur || "Sujet de mon devoir", consigne || CONSIGNE);
    if (!lireBrouillon(num)) {
      const b = brouillonVide();
      b.theme = analyse.themes.slice(0, 3).join(", ");
      b.orientations = analyse.fonctions.slice(0, 1);
      b.axe1.titre = analyse.plan.axe1;
      b.axe2.titre = analyse.plan.axe2;
      // Les arguments proposés deviennent les arguments du plan (l'élève écrit l'explication et l'exemple).
      analyse.plan.args1.forEach((a, i) => { if (b.axe1.args[i]) b.axe1.args[i].arg = a; });
      analyse.plan.args2.forEach((a, i) => { if (b.axe2.args[i]) b.axe2.args[i].arg = a; });
      write(`atelier:${num}`, { ...b, modifie: Date.now() });
    }
    location.hash = `#/entrainement/${num}`;
  }

  return (
    <Page title="J'ai un devoir" back="#/accueil">
      <PageHeader title="J'ai un devoir" compact>Colle ton sujet : on te donne de quoi bien démarrer.</PageHeader>

      <form class="devoir-form" onSubmit={analyser}>
        <label class="devoir-champ">
          <span class="field-label">Ton sujet</span>
          <textarea class="textarea" rows={4} value={texte} placeholder="« La littérature doit être une arme au service du peuple. » Expliquez et discutez."
            onInput={e => { setTexte((e.target as HTMLTextAreaElement).value); setLu(false); }} />
        </label>
        <label class="devoir-champ">
          <span class="field-label">Auteur de la citation (facultatif)</span>
          <input class="input input-texte" value={auteur} placeholder="Ex. : Mongo Beti" onInput={e => setAuteur((e.target as HTMLInputElement).value)} />
        </label>
        <button type="submit" class="btn btn-primary btn-block" disabled={texte.trim().length < 20}>Analyser mon sujet</button>
      </form>

      {analyse && (
        <div class="devoir-resultat" aria-live="polite">
          <p class="devoir-avertissement"><Icon name="info" size={18} />Ce sont des propositions faites par l'appli : elles peuvent contenir des erreurs. Vérifie-les avec ton cours et ton professeur.</p>
          <section>
            <h2 class="section-title">Ce que dit ton sujet</h2>
            {analyse.themes.length || analyse.fonctions.length ? (
              <p class="tags">
                {analyse.fonctions.map(f => <span key={f} class={`tag ${fnClass(f)}`}>{f}</span>)}
                {analyse.themes.map(t => <span key={t} class="tag">{t}</span>)}
              </p>
            ) : <p class="small muted">Pas de thème reconnu : vérifie que tu as bien collé toute la citation.</p>}
            {corriger ? (
              <div class="devoir-corriger">
                <p class="small">Quelle fonction de la littérature ton sujet évoque-t-il ?</p>
                <p class="tags">
                  {FONCTIONS.map(f => (
                    <button key={f} type="button" class={`tag tag-link ${fnClass(f)}`} aria-pressed={analyse.fonctions[0] === f} onClick={() => choisir(f)}>{f}</button>
                  ))}
                </p>
                <button type="button" class="link-btn devoir-changer" onClick={() => (choisie ? choisir(null) : setCorriger(false))}>
                  {choisie ? "Revenir à la proposition de l'appli" : "Annuler"}
                </button>
              </div>
            ) : (
              <button type="button" class="link-btn devoir-changer" onClick={() => setCorriger(true)}>
                {choisie ? "Fonction choisie par toi · Changer" : analyse.fonctions.length ? "Ce n'est pas la bonne fonction ?" : "Choisir la fonction"}
              </button>
            )}
            <p class="small muted devoir-consigne">Consigne : {analyse.travail.toLowerCase()}{!auteur.trim() && analyse.auteur ? ` · Auteur : ${analyse.auteur}` : ""}</p>
          </section>

          <section>
            <h2 class="section-title">Un plan pour démarrer</h2>
            <ol class="devoir-plan">
              <li><strong>Partie 1.</strong> {analyse.plan.axe1}<Arguments liste={analyse.plan.args1} /></li>
              <li><strong>Partie 2.</strong> {analyse.plan.axe2}<Arguments liste={analyse.plan.args2} /></li>
            </ol>
          </section>

          {analyse.oeuvres.length > 0 && (
            <section>
              <h2 class="section-title">Des œuvres pour l'illustrer</h2>
              <ul class="devoir-liste">
                {analyse.oeuvres.map(w => (
                  <li key={w.id}><a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a><span class="muted"> · {w.auteur}</span></li>
                ))}
              </ul>
            </section>
          )}

          {analyse.mots.length > 0 && (
            <section>
              <h2 class="section-title">Des mots à bien comprendre</h2>
              <p class="tags">{analyse.mots.map(m => <a key={m.mot} class="tag tag-link" href={`#/outils?mot=${encodeURIComponent(m.mot)}`}>{m.mot}</a>)}</p>
            </section>
          )}

          {analyse.proches.length > 0 && (
            <section>
              <h2 class="section-title">Des sujets corrigés proches</h2>
              <ul class="devoir-liste">
                {analyse.proches.map(s => (
                  <li key={s.num}><a href={`#/sujets/${s.num}`}>Sujet {s.num}</a><span class="muted"> · « {s.citation.length > 70 ? s.citation.slice(0, 68).trimEnd() + "…" : s.citation} »</span></li>
                ))}
              </ul>
            </section>
          )}

          <button type="button" class="btn btn-primary btn-block" onClick={rediger}><Icon name="edit" size={20} />Rédiger ce sujet dans l'atelier</button>
          <div class="devoir-actions">
            <button type="button" class="btn btn-secondary" onClick={garder} disabled={garde} aria-pressed={garde}>
              <Icon name="bookmark" filled={garde} size={20} />{garde ? "Gardé dans Mon espace" : "Garder dans Mon espace"}
            </button>
            <button type="button" class="btn btn-secondary" onClick={autreDevoir}><Icon name="add" size={20} />Saisir un autre devoir</button>
          </div>
        </div>
      )}
    </Page>
  );
}

/** Les arguments conseillés pour une partie du plan, un par ligne. */
function Arguments({ liste }: { liste: string[] }) {
  return liste.length ? <ul class="devoir-args">{liste.map(a => <li key={a}>{a}</li>)}</ul> : null;
}

/** Mon espace : les devoirs gardés, à rouvrir ou à retirer. */
export function MesDevoirsScreen() {
  const [devoirs] = useDevoirs();
  function ouvrir(d: DevoirGarde) {
    write("devoir-texte", d.texte);
    write("devoir-auteur", d.auteur);
    location.hash = "#/devoir";
  }
  function retirer(d: DevoirGarde) {
    retirerDevoir(d.id);
    toast("Devoir retiré.");
  }
  const date = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return (
    <Page title="Mes devoirs" back="#/carnet">
      <PageHeader title="Mes devoirs" compact>Les sujets que tu as gardés depuis « J'ai un devoir ».</PageHeader>
      {devoirs.length ? (
        <ul class="devoirs-gardes">
          {devoirs.map(d => (
            <li key={d.id} class="devoir-garde">
              <button type="button" class="devoir-garde-ouvrir" onClick={() => ouvrir(d)}>
                <span class="devoir-garde-texte">{d.texte.length > 140 ? d.texte.slice(0, 138).trimEnd() + "…" : d.texte}</span>
                <span class="meta">{[d.auteur, `gardé le ${date(d.garde)}`].filter(Boolean).join(" · ")}</span>
              </button>
              <button type="button" class="icon-btn" aria-label="Retirer ce devoir" onClick={() => retirer(d)}><Icon name="delete" size={20} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aucun devoir gardé">Analyse un sujet dans « J'ai un devoir », puis touche « Garder dans Mon espace ».</EmptyState>
      )}
      <a class="btn btn-primary btn-block devoirs-nouveau" href="#/devoir" onClick={() => { write("devoir-texte", ""); write("devoir-auteur", ""); }}><Icon name="add" size={20} />Saisir un devoir</a>
    </Page>
  );
}
