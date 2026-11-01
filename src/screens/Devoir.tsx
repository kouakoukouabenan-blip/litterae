import { useEffect, useMemo, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { useStored, write } from "../lib/storage";
import { normalize, sansEtoiles } from "../lib/text";
import { Texte } from "../components/Texte";
import { FONCTIONS, type Fonction } from "../data/types";
import { analyserSujet, decouperSujet, genreDu, lectureDuSujet, OBJETS, pisteDe, type Exemple, type Objet } from "../lib/devoir";
import { fnClass } from "../lib/fonctions";
import { ajouterSujetPerso, CONSIGNE } from "../lib/entrainement";
import { brouillonVide, lireBrouillon } from "../lib/atelier";
import { marquer } from "../lib/progres";
import { noter } from "../lib/stats";
import { devoirDe, estGarde, garderDevoir, majDevoir, retirerDevoir, useDevoirs, type DevoirGarde } from "../lib/devoirs";
import { jourLocal } from "../lib/progres";
import { EmptyState } from "../components/EmptyState";
import { toast } from "../components/Toast";
import { SujetsOnglets } from "../components/SujetsOnglets";

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
  // De qui parle le sujet (l'écrivain, la poésie…), corrigé par l'élève : gardé sur le téléphone, rien n'est envoyé.
  const [objetsChoisis, setObjetsChoisis] = useStored<Record<string, Objet>>("devoir-objets", {});
  const objetChoisi = objetsChoisis[cleSujet];
  const [corrigerObjet, setCorrigerObjet] = useState(false);
  // L'élève a choisi la piste « mon sujet parle d'autre chose que les fonctions » : gardé sur le téléphone, rien n'est envoyé.
  const [libres, setLibres] = useStored<Record<string, boolean>>("devoir-libres", {});
  const libre = !!libres[cleSujet];
  // Les réponses de l'élève aux questions du guide, gardées sur le téléphone et reprises dans l'atelier.
  const [reponses, setReponses] = useStored<Record<string, { idee: string; question: string }>>("devoir-guide", {});
  const reponse = reponses[cleSujet] ?? { idee: "", question: "" };
  function repondre(r: Partial<{ idee: string; question: string }>) {
    setReponses(Object.fromEntries(Object.entries({ ...reponses, [cleSujet]: { ...reponse, ...r } }).slice(-50)));
  }
  // L'élève confirme que c'est bien une dissertation littéraire, quand l'appli pense le contraire.
  const [quandMeme, setQuandMeme] = useState(false);
  // L'élève confirme que ce n'est pas une dissertation littéraire : la question disparaît.
  const [confirme, setConfirme] = useState(false);
  const analyse = useMemo(() => (lu ? analyserSujet(texte, 6, choisie, objetChoisi) : null), [lu, texte, choisie, objetChoisi]);
  const autreExercice = !!analyse && analyse.nature !== "dissertation" && !quandMeme && !choisie;
  // L'appli n'est pas sûre de sa lecture : pas de plan tout de suite, l'élève passe par le guide et choisit sa piste.
  const guide = !!analyse && !autreExercice && !analyse.sure && !libre;
  const plan = analyse && libre && !choisie ? analyse.planLibre : analyse?.plan;
  const lecture = useMemo(() => analyse ? lectureDuSujet(decouperSujet(texte).citation, analyse.objet) : { motsCles: [], debut: "" }, [analyse, texte]);
  function choisirLibre(oui: boolean) {
    const suite = { ...libres };
    delete suite[cleSujet];
    if (oui) suite[cleSujet] = true;
    setLibres(Object.fromEntries(Object.entries(suite).slice(-50)));
    if (oui && choisie) choisir(null);
    setTimeout(() => document.querySelector(".devoir-pistes")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function choisir(f: Fonction | null) {
    const suite = { ...choisies };
    delete suite[cleSujet];
    if (f) suite[cleSujet] = f;
    // Les 50 derniers sujets suffisent.
    setChoisies(Object.fromEntries(Object.entries(suite).slice(-50)));
    setCorriger(false);
    if (f && libres[cleSujet]) { const l = { ...libres }; delete l[cleSujet]; setLibres(l); }
  }
  function choisirObjet(o: Objet | null) {
    const suite = { ...objetsChoisis };
    delete suite[cleSujet];
    if (o) suite[cleSujet] = o;
    setObjetsChoisis(Object.fromEntries(Object.entries(suite).slice(-50)));
    setCorrigerObjet(false);
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
  const gardeLe = devoirDe(devoirs, texte);

  /** Date du devoir : l'atelier est préparé tout de suite, et l'accueil découpe le travail jour par jour. */
  function fixerDate(pour: string) {
    if (!gardeLe) return;
    majDevoir(gardeLe.id, { pour: pour || undefined, num: pour ? preparerAtelier() ?? gardeLe.num : gardeLe.num });
    if (pour) toast("C'est noté : l'accueil te dira quoi faire chaque jour.");
  }

  function garder() {
    garderDevoir(texte, auteur || analyse?.auteur || "");
    toast("Devoir gardé dans Mon espace.");
  }

  /** Page vide pour taper le sujet suivant (le devoir précédent reste dans Mon espace s'il a été gardé). */
  function autreDevoir() {
    setTexte("");
    setAuteur("");
    setLu(false);
    setQuandMeme(false);
    window.scrollTo({ top: 0 });
    setTimeout(() => (document.querySelector(".devoir-form textarea") as HTMLTextAreaElement | null)?.focus(), 50);
  }

  /** L'atelier reprend le sujet avec les thèmes, la fonction et le plan proposés (si l'élève ne l'a pas déjà commencé). */
  function rediger() {
    const num = preparerAtelier();
    if (num) location.hash = `#/entrainement/${num}`;
  }

  function preparerAtelier(): string | null {
    if (!analyse || !plan) return null;
    const { citation, consigne } = decouperSujet(texte);
    const num = ajouterSujetPerso(citation, auteur.trim() || analyse.auteur || "Sujet de mon devoir", consigne || CONSIGNE);
    if (!lireBrouillon(num)) {
      const b = brouillonVide();
      b.theme = analyse.themes.slice(0, 3).join(", ");
      b.orientations = libre && !choisie ? [] : analyse.fonctions.slice(0, 1);
      b.problematique = reponse.question.trim() || plan.problematique;
      if (reponse.idee.trim()) b.reformulation = reponse.idee.trim();
      if (lecture.motsCles.length) b.motscles = lecture.motsCles.slice(0, 4).map(mot => ({ mot, def: "" }));
      b.axe1.titre = plan.axe1;
      b.axe2.titre = plan.axe2;
      // Les arguments proposés deviennent les arguments du plan (l'élève écrit l'explication et l'exemple).
      // Un sujet qui énumère trois éléments donne trois arguments : l'atelier leur fait de la place.
      while (b.axe1.args.length < plan.args1.length) b.axe1.args.push({ arg: "", expl: "", ex: "" });
      plan.args1.forEach((a, i) => { if (b.axe1.args[i]) Object.assign(b.axe1.args[i], { arg: a, ex: enTexte(plan.ex1[i]) }); });
      plan.args2.forEach((a, i) => { if (b.axe2.args[i]) Object.assign(b.axe2.args[i], { arg: a, ex: enTexte(plan.ex2[i]) }); });
      write(`atelier:${num}`, { ...b, modifie: Date.now() });
    }
    return num;
  }

  return (
    <Page title="J'ai un devoir">
      <SujetsOnglets actif="devoir" />
      <PageHeader title="J'ai un devoir" compact>Colle ton sujet : on t'aide à le comprendre et à bâtir ton plan. La rédaction, c'est toi.</PageHeader>

      <form class="devoir-form" onSubmit={analyser}>
        <label class="devoir-champ">
          <span class="field-label">Ton sujet</span>
          <textarea class="textarea" rows={4} value={texte} placeholder="« La littérature doit être une arme au service du peuple. » Expliquez et discutez."
            onInput={e => { setTexte((e.target as HTMLTextAreaElement).value); setLu(false); setQuandMeme(false); setConfirme(false); }} />
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
          {autreExercice && (
            <div class="devoir-note devoir-question">
              <p>{AUTRE_EXERCICE[analyse.nature].constat}</p>
              {confirme ? <p>{AUTRE_EXERCICE[analyse.nature].apresOui}</p> : <>
                <p><strong>{AUTRE_EXERCICE[analyse.nature].question}</strong></p>
                <div class="devoir-boutons">
                  <button type="button" class="btn btn-secondary" onClick={() => setConfirme(true)}>{AUTRE_EXERCICE[analyse.nature].oui}</button>
                  <button type="button" class="btn btn-secondary" onClick={() => setQuandMeme(true)}>{AUTRE_EXERCICE[analyse.nature].changer}</button>
                </div>
              </>}
            </div>
          )}
          {analyse.corrige && (
            <div class="devoir-note devoir-note-corrige">
              <p>Ton sujet est presque le <strong>sujet corrigé {Number(analyse.corrige.num)}</strong>.{analyse.corrige.ouvert ? " Le plan ci-dessous est celui du corrigé." : ""}</p>
              <a class="link-btn" href={`#/sujets/${analyse.corrige.num}`}>Ouvrir le sujet corrigé {Number(analyse.corrige.num)}</a>
            </div>
          )}
          {guide && (
            <section class="devoir-guide">
              <h2 class="section-title">Comprends ton sujet</h2>
              <p class="small">{analyse.horsCadre
                ? <>Ton sujet ne porte pas d'abord sur les fonctions de la littérature, mais sur <strong>{analyse.horsCadre.nom}</strong>. Prends le temps de répondre à ces trois questions.</>
                : <>L'appli n'est pas sûre de bien lire ce sujet. Plutôt que de te proposer un plan qui pourrait être faux, elle te guide : réponds à ces trois questions.</>}</p>
              <ol class="devoir-etapes">
                <li>
                  <strong>Que dit l'auteur ?</strong>
                  <dl class="devoir-reperes">
                    <dt>Il parle de quoi ?</dt><dd><strong>{majuscule(analyse.horsCadre?.nom ?? OBJETS[analyse.objet].nom)}</strong></dd>
                    <dt>Les mots clés</dt><dd class="tags">{lecture.motsCles.map(m => <span key={m} class="tag">{m}</span>)}</dd>
                    {analyse.mots.length > 0 && <><dt>À vérifier dans le dictionnaire</dt><dd class="tags">{analyse.mots.map(m => <a key={m.mot} class="tag tag-link" href={`#/outils?mot=${encodeURIComponent(m.mot)}`}>{m.mot}</a>)}</dd></>}
                  </dl>
                  <span>Pour chaque mot clé, demande-toi ce qu'il veut dire ici. Puis redis l'idée de l'auteur en une phrase, avec tes mots :</span>
                  <textarea class="textarea devoir-reponse" rows={2} value={reponse.idee} placeholder={`${lecture.debut}…`}
                    onInput={e => repondre({ idee: (e.target as HTMLTextAreaElement).value })} />
                </li>
                <li>
                  <strong>Quelle question pose le sujet ?</strong>
                  <span>Transforme l'idée de l'auteur en une question à laquelle on peut répondre « oui… mais ». C'est ta problématique.</span>
                  <p class="devoir-exemple"><span>Par exemple :</span> {analyse.planLibre.problematique}</p>
                  <textarea class="textarea devoir-reponse" rows={2} value={reponse.question} placeholder="Ta problématique, avec tes mots…"
                    onInput={e => repondre({ question: (e.target as HTMLTextAreaElement).value })} />
                </li>
                <li>
                  <strong>Quelle piste retiens-tu ?</strong>
                  <span>Relis tes deux réponses, puis choisis la piste qui leur correspond le mieux. Tu verras ensuite des idées et des œuvres pour ton plan.</span>
                  <div class="devoir-choix">
                    {analyse.horsCadre && (
                      <button type="button" class="devoir-piste" onClick={() => choisirLibre(true)}>
                        <strong>Mon sujet parle {deNom(analyse.horsCadre.nom, false)}</strong>
                        <span>{analyse.horsCadre.conseil}</span>
                        <em>C'est la piste la plus probable pour ce sujet.</em>
                      </button>
                    )}
                    {[...analyse.fonctions, ...(analyse.doute && !analyse.fonctions.includes(analyse.doute) ? [analyse.doute] : [])].map(f => (
                      <button key={f} type="button" class={`devoir-piste ${fnClass(f)}`} onClick={() => choisir(f)}>
                        <strong>Fonction {NOM[f]}</strong>
                        <span>{pisteDe(f, analyse.objet)}</span>
                        <em>Choisis-la si {SI[f]}</em>
                      </button>
                    ))}
                    {!analyse.horsCadre && (
                      <button type="button" class="devoir-piste" onClick={() => choisirLibre(true)}>
                        <strong>Aucune de ces pistes</strong>
                        <span>Mon sujet ne parle pas des fonctions de la littérature.</span>
                        <em>Choisis-la si l'auteur parle d'autre chose : la langue, le lecteur, un genre, le personnage…</em>
                      </button>
                    )}
                  </div>
                  {corriger ? (
                    <div class="devoir-corriger">
                      <p class="small">Quelle fonction de la littérature ton sujet évoque-t-il ?</p>
                      <p class="tags">{FONCTIONS.map(f => <button key={f} type="button" class={`tag tag-link ${fnClass(f)}`} onClick={() => choisir(f)}>{f}</button>)}</p>
                      <button type="button" class="link-btn devoir-changer" onClick={() => setCorriger(false)}>Annuler</button>
                    </div>
                  ) : <p class="small devoir-changer">Aucune de ces pistes ne convient ? <button type="button" class="link-btn" onClick={() => setCorriger(true)}>Choisir parmi les cinq fonctions</button></p>}
                </li>
              </ol>
            </section>
          )}

          {!autreExercice && !guide && libre && !choisie && (
            <section>
              <h2 class="section-title">Ce que dit ton sujet</h2>
              <p class="small">{analyse.horsCadre ? <>Ton sujet parle {deNom(analyse.horsCadre.nom)} Le plan ne passe pas par les fonctions de la littérature.</> : <>Tu as choisi : ton sujet ne parle pas des fonctions de la littérature.</>}{" "}
                <button type="button" class="link-btn" onClick={() => choisirLibre(false)}>Choisir une autre piste</button></p>
              <p class="small muted devoir-consigne">Consigne : {analyse.travail.toLowerCase()}</p>
            </section>
          )}

          {!autreExercice && !guide && !(libre && !choisie) && <section>
            <h2 class="section-title">Ce que dit ton sujet</h2>
            {analyse.themes.length || analyse.fonctions.length ? (
              <p class="tags">
                {analyse.fonctions.map(f => <span key={f} class={`tag ${fnClass(f)}`}>{f}</span>)}
                {analyse.themes.map(t => <span key={t} class="tag">{t}</span>)}
              </p>
            ) : <p class="small muted">Pas de thème reconnu : vérifie que tu as bien collé toute la citation.</p>}
            {corrigerObjet ? (
              <div class="devoir-corriger">
                <p class="small"><strong>De qui ou de quoi parle ton sujet ?</strong> Touche la bonne réponse.</p>
                <p class="tags">
                  {(Object.keys(OBJETS) as Objet[]).map(o => (
                    <button key={o} type="button" class="tag tag-link" aria-pressed={analyse.objet === o} onClick={() => choisirObjet(o)}>{OBJETS[o].choix}</button>
                  ))}
                </p>
                <button type="button" class="link-btn devoir-changer" onClick={() => (objetChoisi ? choisirObjet(null) : setCorrigerObjet(false))}>
                  {objetChoisi ? "Reprendre ce que l'appli avait trouvé" : "Annuler"}
                </button>
              </div>
            ) : (
              <p class="small devoir-objet">{objetChoisi ? "Tu as indiqué que ton sujet parle " : `L'appli pense que ton sujet parle ${analyse.objetSur ? "" : "sans doute "}`}{deNom(OBJETS[analyse.objet].nom)}{" "}
                <button type="button" class="link-btn" onClick={() => setCorrigerObjet(true)}>{objetChoisi ? "Changer" : "Ce n'est pas ça ? Corriger"}</button></p>
            )}
            {corriger ? (
              <div class="devoir-corriger">
                <p class="small"><strong>Quelle fonction de la littérature ton sujet évoque-t-il ?</strong> Touche la bonne réponse.</p>
                <p class="tags">
                  {FONCTIONS.map(f => (
                    <button key={f} type="button" class={`tag tag-link ${fnClass(f)}`} aria-pressed={analyse.fonctions[0] === f} onClick={() => choisir(f)}>{f}</button>
                  ))}
                </p>
                <button type="button" class="link-btn devoir-changer" onClick={() => (choisie ? choisir(null) : setCorriger(false))}>
                  {choisie ? "Reprendre ce que l'appli avait trouvé" : "Annuler"}
                </button>
              </div>
            ) : (
              <p class="small devoir-changer">
                {choisie ? <>Tu as choisi la fonction <strong>{NOM[choisie]}</strong>. </> : analyse.fonctions.length ? <>L'appli pense que ton sujet parle de la fonction <strong>{NOM[analyse.fonctions[0]]}</strong>. </> : <>L'appli n'a pas reconnu de fonction. </>}
                <button type="button" class="link-btn" onClick={() => setCorriger(true)}>{choisie ? "Changer de fonction" : analyse.fonctions.length ? "Ce n'est pas ça ? Choisir une autre fonction" : "Choisir la fonction"}</button>
              </p>
            )}
            {!corriger && analyse.rejet && <p class="small devoir-indice">L'auteur rejette la fonction {NOM[analyse.rejet]} : le plan défend ce qu'il pense vraiment.</p>}
            {!corriger && analyse.doute && (
              <p class="small devoir-indice">L'appli hésite : ton sujet peut aussi parler de la fonction {NOM[analyse.doute]}.{" "}
                <button type="button" class="link-btn" onClick={() => choisir(analyse.doute)}>Voir le plan avec la fonction {NOM[analyse.doute]}</button></p>
            )}
            {!corriger && !analyse.doute && analyse.faible && !analyse.devalorise && <p class="small devoir-indice">Ton sujet donne peu d'indices : vérifie la fonction avec ton cours.</p>}
            <p class="small muted devoir-consigne">Consigne : {analyse.travail.toLowerCase()}{!auteur.trim() && analyse.auteur ? ` · Auteur : ${analyse.auteur}` : ""}</p>
          </section>}

          {!autreExercice && !guide && plan && <section class="devoir-pistes">
            <h2 class="section-title">Des pistes pour ton plan</h2>
            <p class="small muted devoir-possible">Ce sont des pistes possibles, pas la seule bonne réponse.</p>
            {analyse.devalorise && !choisie && !libre && <p class="small devoir-indice">L'auteur dit que {OBJETS[analyse.objet].nom} ne sert à rien : explique d'abord son point de vue, puis montre ce qui le contredit.</p>}
            {plan.problematique && <p class="devoir-problematique"><strong>Problématique.</strong> {plan.problematique}</p>}
            <ol class="devoir-plan">
              <li><strong>Partie 1.</strong> {enPiste(plan.axe1)}<Arguments liste={plan.args1} exemples={plan.ex1} /></li>
              <li><strong>Partie 2.</strong> {enPiste(plan.axe2)}<Arguments liste={plan.args2} exemples={plan.ex2} /></li>
            </ol>
            {libre && !choisie && analyse.horsCadre && <p class="small devoir-conseil"><strong>Piste à creuser.</strong> {analyse.horsCadre.conseil}</p>}
            {analyse.genres.length > 0 && !analyse.corrige?.ouvert && !(libre && !choisie) && <p class="small muted">Ton sujet parle {genreDu(analyse.genres)} : les exemples sont choisis dans {analyse.genres.length > 1 ? "ces genres" : "ce genre"}.</p>}
            <p class="small devoir-base"><strong>À toi de rédiger.</strong> Ces pistes t'aident à démarrer : explique chaque argument avec tes mots et vérifie tes exemples dans ton cours.</p>
          </section>}

          {analyse.oeuvres.length > 0 && !guide && (
            <section>
              <h2 class="section-title">{libre && !choisie ? "Des œuvres qui peuvent t'aider" : "Des œuvres pour l'illustrer"}</h2>
              <ul class="devoir-liste">
                {analyse.oeuvres.map(w => (
                  <li key={w.id}><a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a><span class="muted"> · {w.auteur}</span></li>
                ))}
              </ul>
            </section>
          )}

          {analyse.mots.length > 0 && !guide && (
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

          {!autreExercice && !guide && <button type="button" class="btn btn-primary btn-block" onClick={rediger}><Icon name="edit" size={20} />Rédiger ce sujet dans l'atelier</button>}
          <div class="devoir-actions">
            <button type="button" class="btn btn-secondary" onClick={garder} disabled={garde} aria-pressed={garde}>
              <Icon name="bookmark" filled={garde} size={20} />{garde ? "Gardé dans Mon espace" : "Garder dans Mon espace"}
            </button>
            <button type="button" class="btn btn-secondary" onClick={autreDevoir}><Icon name="add" size={20} />Saisir un autre devoir</button>
          </div>
          {gardeLe && (
            <label class="devoir-date">
              <span>À rendre le</span>
              <input type="date" class="input" min={jourLocal()} value={gardeLe.pour ?? ""} onChange={e => fixerDate((e.target as HTMLInputElement).value)} />
            </label>
          )}
        </div>
      )}
    </Page>
  );
}

/** « de l'écrivain », « du poète », « de la poésie », en gras (avec un point final, sauf `point` à faux). */
function deNom(nom: string, point = true) {
  const p = point ? "." : "";
  return nom.startsWith("le ") ? <>du <strong>{nom.slice(3)}</strong>{p}</> : <>de <strong>{nom}</strong>{p}</>;
}

/** Les consignes du plan dites comme des pistes : « Tu peux montrer que… » plutôt que « Montre que… ». */
function enPiste(t: string) {
  return t.replace(/^Montre /, "Tu peux montrer ").replace(/^Explique /, "Tu peux expliquer ").replace(/^Nuance : /, "Tu peux nuancer : ")
    .replace(/^Approfondis : /, "Tu peux approfondir : ").replace(/^Réponds d'abord /, "Tu peux répondre d'abord ").replace(/^Discute : /, "Tu peux discuter : ");
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Quand choisir chaque piste : les mots du sujet qui la trahissent. */
const SI: Record<Fonction, string> = {
  Engagement: "l'auteur parle de combattre, dénoncer, défendre, éveiller les consciences ou changer la société.",
  Sociale: "l'auteur parle de montrer la réalité, la société, l'histoire ou les traditions d'un peuple.",
  Esthétique: "l'auteur parle de beauté, de style, de forme, d'art ou de bien écrire.",
  Évasion: "l'auteur parle de rêver, d'imaginer, de se divertir, de voyager ou de fuir la réalité.",
  Lyrique: "l'auteur parle de sentiments, d'émotions ou de la vie intime de l'écrivain."
};

/** Nom de la fonction dans une phrase. */
const NOM: Record<Fonction, string> = { Engagement: "d'engagement", Sociale: "sociale", Esthétique: "esthétique", Évasion: "d'évasion", Lyrique: "lyrique" };

/** Quand l'énoncé n'est pas une dissertation littéraire. */
const AUTRE_EXERCICE: Record<string, { constat: string; question: string; oui: string; changer: string; apresOui: string }> = {
  commentaire: {
    constat: "D'après l'appli, ton sujet demande un commentaire de texte, pas une dissertation.",
    question: "Est-ce bien un commentaire de texte ?",
    oui: "Oui, c'est un commentaire",
    changer: "Non, c'est une dissertation littéraire",
    apresOui: "« J'ai un devoir » aide pour la dissertation littéraire. Pour un commentaire, appuie-toi sur le texte lui-même : choisis la méthode Commentaire composé en haut de l'écran."
  },
  resume: {
    constat: "D'après l'appli, ton sujet demande un résumé de texte, pas une dissertation.",
    question: "Est-ce bien un résumé de texte ?",
    oui: "Oui, c'est un résumé",
    changer: "Non, c'est une dissertation littéraire",
    apresOui: "« J'ai un devoir » aide pour la dissertation littéraire, pas pour le résumé."
  },
  generale: {
    constat: "D'après l'appli, ton sujet parle d'une question de société (la famille, le travail, l'école…), pas de littérature (l'écrivain, la poésie, le roman, la lecture…).",
    question: "Est-ce bien un sujet de société ?",
    oui: "Oui, c'est un sujet de société",
    changer: "Non, il parle de littérature",
    apresOui: "Les fonctions de la littérature ne s'appliquent pas ici, mais les œuvres ci-dessous peuvent te donner des exemples."
  }
};

/** Les œuvres d'un argument, en une ligne pour l'atelier : « Titre, Auteur : pourquoi ». */
function enTexte(ex: Exemple[] | undefined) {
  return (ex ?? []).map(e => e.titre ? `${e.titre}, ${e.auteur}${e.pourquoi ? ` : ${sansEtoiles(e.pourquoi)}` : ""}` : sansEtoiles(e.pourquoi)).join(" ; ");
}

/** Les arguments conseillés pour une partie du plan, un par ligne, chacun avec une ou deux œuvres pour l'illustrer. */
function Arguments({ liste, exemples }: { liste: string[]; exemples: Exemple[][] }) {
  return liste.length ? <ul class="devoir-args">{liste.map((a, i) => <li key={a}>{a}
    {(exemples[i] ?? []).map((e, k) => e.titre ? (
      <span key={e.id} class="devoir-ex">{k ? "Ou : " : "Par exemple : "}<a href={`#/oeuvres/${encodeURIComponent(e.id)}`}><cite>{e.titre}</cite></a>, {e.auteur}
        {e.pourquoi && <span class="devoir-pourquoi"><Texte text={e.pourquoi} /></span>}</span>
    ) : <span key={e.pourquoi} class="devoir-ex">Par exemple : <Texte text={e.pourquoi} /></span>)}</li>)}</ul> : null;
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
                <span class="meta">{[d.auteur, d.pour && d.pour >= jourLocal() ? `à rendre le ${date(Date.parse(d.pour + "T12:00:00"))}` : `gardé le ${date(d.garde)}`].filter(Boolean).join(" · ")}</span>
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
