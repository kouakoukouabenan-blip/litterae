import { useMemo, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { useStored, write } from "../lib/storage";
import { analyserSujet, decouperSujet } from "../lib/devoir";
import { fnClass } from "../lib/fonctions";
import { ajouterSujetPerso, CONSIGNE } from "../lib/entrainement";
import { brouillonVide, lireBrouillon } from "../lib/atelier";
import { marquer } from "../lib/progres";
import { noter } from "../lib/stats";

/** J'ai un devoir : l'élève colle son sujet, l'appli propose un plan, des œuvres, des mots et des sujets corrigés proches. */
export function DevoirScreen() {
  const [texte, setTexte] = useStored<string>("devoir-texte", "");
  const [auteur, setAuteur] = useStored<string>("devoir-auteur", "");
  const [lu, setLu] = useState(() => texte.trim().length >= 20);
  const analyse = useMemo(() => (lu ? analyserSujet(texte) : null), [lu, texte]);

  function analyser(e: Event) {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    setLu(true);
    marquer("devoir");
    noter({ t: "progres", ref: "devoir" });
  }

  /** L'atelier reprend le sujet avec les thèmes, la fonction et le plan proposés (si l'élève ne l'a pas déjà commencé). */
  function rediger() {
    if (!analyse) return;
    const { citation, consigne } = decouperSujet(texte);
    const num = ajouterSujetPerso(citation, auteur.trim() || "Sujet de mon devoir", consigne || CONSIGNE);
    if (!lireBrouillon(num)) {
      const b = brouillonVide();
      b.theme = analyse.themes.slice(0, 3).join(", ");
      b.orientations = analyse.fonctions.slice(0, 1);
      b.axe1.titre = analyse.plan.axe1;
      b.axe2.titre = analyse.plan.axe2;
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
          <section>
            <h2 class="section-title">Ce que dit ton sujet</h2>
            {analyse.themes.length || analyse.fonctions.length ? (
              <p class="tags">
                {analyse.fonctions.map(f => <span key={f} class={`tag ${fnClass(f)}`}>{f}</span>)}
                {analyse.themes.map(t => <span key={t} class="tag">{t}</span>)}
              </p>
            ) : <p class="small muted">Pas de thème reconnu : vérifie que tu as bien collé toute la citation.</p>}
          </section>

          <section>
            <h2 class="section-title">Un plan pour démarrer</h2>
            <ol class="devoir-plan">
              <li><strong>Partie 1.</strong> {analyse.plan.axe1}</li>
              <li><strong>Partie 2.</strong> {analyse.plan.axe2}</li>
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
        </div>
      )}
    </Page>
  );
}
