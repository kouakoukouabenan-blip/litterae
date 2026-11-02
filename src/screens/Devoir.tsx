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
  const [, setCorrigerObjet] = useState(false);
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
  // Le parcours en conversation : l'appli lit le sujet, dit ce qu'elle a compris, puis répond à chaque demande de l'élève, à la suite.
  const [fil, setFil] = useState<Tour[]>([]);
  const [ecrit, setEcrit] = useState(false);
  const [brouillonFil, setBrouillonFil] = useState("");
  const [lecture2, setLecture2] = useState(() => lu);
  const [etapeLecture, setEtapeLecture] = useState(0);
  const court = () => !!matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  useEffect(() => {
    if (!lecture2) return;
    const pas = court() ? 150 : 600;
    const t = [1, 2].map(k => setTimeout(() => setEtapeLecture(k), pas * k));
    const fin = setTimeout(() => {
      setLecture2(false); setEtapeLecture(0);
      // Le sujet en bulle en haut de l'écran, sous la barre : l'élève voit la réponse de l'appli et « C'est bien ça ? ».
      setTimeout(() => { const el = document.querySelector(".devoir-resultat"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); }, 50);
    }, pas * 3);
    return () => { t.forEach(clearTimeout); clearTimeout(fin); };
  }, [lecture2]);
  /** L'élève répond ou demande quelque chose : sa bulle s'ajoute, l'appli « écrit » un instant, puis répond. */
  function demander(t: Tour) {
    setFil(f => [...f, t]);
    setBrouillonFil("");
    setEcrit(true);
    setTimeout(() => setEcrit(false), court() ? 100 : 700);
    setTimeout(() => {
      const bulles = document.querySelectorAll(".bulle-eleve");
      const el = bulles[bulles.length - 1];
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
    }, 60);
  }
  const autreExercice = !!analyse && analyse.nature !== "dissertation" && !quandMeme && !choisie;
  // L'appli n'est pas sûre de sa lecture : pas de plan tout de suite, l'élève passe par le guide et choisit sa piste.
  const guide = !!analyse && !autreExercice && !analyse.sure && !libre;
  const plan = analyse && libre && !choisie ? analyse.planLibre : analyse?.plan;
  // Le parcours en questions quand l'appli a compris le sujet ; sinon le guide, ou la piste « autre chose », comme avant.
  const parcours = !!analyse && !autreExercice && !guide && !(libre && !choisie);
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
    setFil([]);
    setLecture2(true);
    // Sous la barre du haut : l'élève voit son sujet en bulle et l'appli qui lit.
    setTimeout(() => { const el = document.querySelector(".devoir-resultat"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); }, 60);
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
    setFil([]);
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

  /** Les mots du dictionnaire à vérifier, en une ligne. */
  const motsDico = () => analyse && analyse.mots.length > 0 && <p class="small devoir-mots">À vérifier dans le dictionnaire :{" "}
    {analyse.mots.map((m, i) => <span key={m.mot}>{i ? ", " : ""}<a href={`#/outils?mot=${encodeURIComponent(m.mot)}`}>{m.mot}</a></span>)}</p>;

  /** La réponse de l'appli à une demande de l'élève. */
  function reponseA(t: Tour) {
    if (!analyse || !plan) return null;
    const c = analyse.comprendre;
    switch (t.quoi) {
      case "oui": return <p>Très bien. Que veux-tu faire maintenant ?</p>;
      case "comprendre": return <>
        <p>D'accord. Commence par me dire, avec tes mots : <strong>pour toi, que veut dire l'auteur ?</strong></p>
        {lecture.motsCles.length > 0 && <p class="small">Aide-toi des mots clés : {lecture.motsCles.join(", ")}.</p>}
      </>;
      case "idee": return <>
        {c && <p><strong>Voici ce que j'ai compris :</strong> {c.these}</p>}
        <p class="small">{t.texte ? "Compare avec ta phrase : dites-vous la même chose ?" : "Ce n'est pas grave : relis le sujet avec cette phrase en tête."}</p>
        <p>Maintenant, <strong>écris ta problématique</strong>, en une question (« Dans quelle mesure… ? ») ou en deux questions : une pour la thèse (pourquoi l'auteur a raison), une pour l'antithèse (ce qui le nuance).</p>
      </>;
      case "question": return <>
        {c && <p><strong>La vraie question :</strong> {c.question}</p>}
        {c?.contraire && <p><strong>L'idée contraire, pour la partie 2 :</strong> {c.contraire}</p>}
        {c && <><p><strong>En une question :</strong> {insecable(c.uneQuestion)}</p><p><strong>En deux questions (thèse, puis antithèse) :</strong></p><ul class="devoir-liste">{c.problematiques.map(q => <li key={q}>{insecable(q)}</li>)}</ul></>}
        {motsDico()}
      </>;
      case "arguments": case "illustrer": {
        const ex = t.quoi === "illustrer";
        return <>
          <p>{ex ? "Voici des arguments, chacun avec une œuvre pour l'illustrer." : "Voici des arguments pour ton devoir."} Ce sont des pistes, pas la seule bonne réponse.</p>
          <p class="bulle-titre">Pour défendre l'idée de l'auteur</p>
          <Arguments liste={plan.args1} exemples={ex ? plan.ex1 : []} explications={plan.expl1} />
          {plan.transition && <p class="small devoir-transition"><strong>Pour passer à l'autre point de vue.</strong> {plan.transition}</p>}
          {plan.args2.length > 0 && <><p class="bulle-titre">{analyse.discussion ? "Pour nuancer" : "Pour aller plus loin"}</p>
            <Arguments liste={plan.args2} exemples={ex ? plan.ex2 : []} explications={plan.expl2} /></>}
          {ex && plan.autres && plan.autres.length > 0 && <p class="small devoir-autres">Tu n'as pas lu ces œuvres ? D'autres conviennent aussi :{" "}
            {plan.autres.map((w, i) => <span key={w.id}>{i ? ", " : ""}<a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a> ({w.auteur})</span>)}.</p>}
          <p class="small"><strong>À toi de rédiger.</strong> Explique chaque argument avec tes mots{ex ? " et vérifie tes exemples dans ton cours" : ", puis cherche une œuvre que tu connais pour chacun"}.</p>
        </>;
      }
      case "plan": return <>
        <p>Voici un plan possible. Ce sont des pistes : à toi de rédiger.</p>
        {analyse.devalorise && !choisie && <p class="small devoir-indice">L'auteur dit que {OBJETS[analyse.objet].nom} ne sert à rien : explique d'abord son point de vue, puis montre ce qui le contredit.</p>}
        {plan.problematique && <p><strong>Problématique en deux questions.</strong> {insecable(plan.problematique)}</p>}
        {c && !choisie && <p><strong>Ou en une question :</strong> {insecable(c.uneQuestion)}</p>}
        {c && !choisie && <details class="devoir-plus">
          <summary>D'autres problématiques et une idée d'amorce</summary>
          <ul>{c.problematiques.slice(1).map(q => <li key={q}>{q}</li>)}</ul>
          <p><strong>Pour commencer ton introduction :</strong> {c.amorce}</p>
        </details>}
        <ol class="devoir-plan">
          <li><strong>Partie 1.</strong> {enPiste(plan.axe1)}<Arguments liste={plan.args1} exemples={plan.ex1} explications={plan.expl1} /></li>
          {plan.transition && <li class="devoir-transition"><strong>Pour passer à la partie 2.</strong> {plan.transition}</li>}
          <li><strong>Partie 2.</strong> {enPiste(plan.axe2)}<Arguments liste={plan.args2} exemples={plan.ex2} explications={plan.expl2} /></li>
        </ol>
        {plan.autres && plan.autres.length > 0 && <p class="small devoir-autres">D'autres œuvres conviennent aussi pour la partie 1 :{" "}
          {plan.autres.map((w, i) => <span key={w.id}>{i ? ", " : ""}<a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a> ({w.auteur})</span>)}.</p>}
        {motsDico()}
      </>;
    }
  }

  /** Ce que l'élève peut demander ensuite : ce qu'il n'a pas encore vu. */
  function suites() {
    const vus = new Set(fil.map(t => t.quoi));
    return CHOIX.filter(ch => !vus.has(ch.id) && !(ch.id === "comprendre" && vus.has("idee"))).map(ch => ({ ...ch, texte: ch.id === "illustrer" && vus.has("arguments") ? "Ajoute des œuvres" : ch.texte }));
  }

  function conversation() {
    if (!analyse) return null;
    const dernier = fil[fil.length - 1];
    // L'appli attend une phrase de l'élève (« Comprendre le sujet »).
    const attente = dernier?.quoi === "comprendre" ? "idee" : dernier?.quoi === "idee" ? "question" : null;
    const prochaines = suites();
    const fonction = choisie ?? (analyse.devalorise ? null : analyse.fonctions[0]);
    return (
      <div class="devoir-fil">
        <div class="bulle bulle-eleve"><p>{sujetCourt(texte)}</p></div>
        <div class="bulle bulle-appli devoir-compris-carte">
          <p>J'ai lu ton sujet.{fonction ? <> Il parle de la <strong>fonction {NOM[fonction]}{!choisie && analyse.precision ? ` (${analyse.precision})` : ""}</strong>.</> : null}</p>
          {analyse.comprendre && <p>{analyse.comprendre.these}</p>}
          <p>Tu dois : {analyse.travail.replace(/ \(.*\)$/, "").toLowerCase()}.</p>
          {analyse.rejet && <p class="small devoir-indice">L'auteur rejette la fonction {NOM[analyse.rejet]} : mes pistes défendent ce qu'il pense vraiment.</p>}
          {analyse.doute && <p class="small devoir-indice">Ton sujet peut aussi parler de la fonction {NOM[analyse.doute]}.</p>}
          {!analyse.doute && analyse.faible && !analyse.devalorise && <p class="small devoir-indice">Ton sujet donne peu d'indices : vérifie la fonction avec ton cours.</p>}
          {fil.length === 0 && !corriger && <p><strong>C'est bien ça ?</strong></p>}
          {corriger && (
            <div class="devoir-corriger">
              <p class="small"><strong>De qui ou de quoi parle ton sujet ?</strong></p>
              <p class="tags">
                {(Object.keys(OBJETS) as Objet[]).map(o => (
                  <button key={o} type="button" class="tag tag-link" aria-pressed={analyse.objet === o} onClick={() => { choisirObjet(o); setCorriger(true); }}>{OBJETS[o].choix}</button>
                ))}
              </p>
              <p class="small"><strong>Quelle fonction de la littérature évoque-t-il ?</strong></p>
              <p class="tags">
                {FONCTIONS.map(f => (
                  <button key={f} type="button" class={`tag tag-link ${fnClass(f)}`} aria-pressed={fonction === f} onClick={() => choisir(f)}>{f}</button>
                ))}
              </p>
              <p class="small devoir-changer">
                <button type="button" class="link-btn" onClick={() => setCorriger(false)}>Fermer</button>
                {(choisie || objetChoisi) && <>{" · "}<button type="button" class="link-btn" onClick={() => { choisir(null); choisirObjet(null); }}>Reprendre ce que l'appli avait trouvé</button></>}
              </p>
            </div>
          )}
          {fil.length > 0 && !corriger && <p class="small"><button type="button" class="link-btn" onClick={() => setCorriger(true)}>Ce n'est pas ça ? Corriger</button></p>}
        </div>
        {fil.length === 0 && !corriger && (
          <div class="devoir-reponses">
            <button type="button" class="tag tag-link" onClick={() => demander({ quoi: "oui", texte: "Oui, c'est ça" })}>Oui, c'est ça</button>
            <button type="button" class="tag tag-link" onClick={() => setCorriger(true)}>Non, corriger</button>
          </div>
        )}
        {fil.map((t, i) => {
          const enCours = ecrit && i === fil.length - 1;
          return [
            <div key={`e${i}`} class="bulle bulle-eleve"><p>{t.texte || "Je ne sais pas"}</p></div>,
            <div key={`a${i}`} class={`bulle bulle-appli${enCours ? " bulle-ecrit" : ""}`}>
              {enCours ? <span class="devoir-lecture-points" aria-label="L'appli écrit"><i /><i /><i /></span> : reponseA(t)}
            </div>
          ];
        })}
        {!ecrit && attente && (
          <form class="devoir-saisie" onSubmit={e => { e.preventDefault(); const v = brouillonFil.trim(); repondre(attente === "idee" ? { idee: v } : { question: v }); demander({ quoi: attente, texte: v }); }}>
            <textarea class="textarea" rows={2} value={brouillonFil} aria-label={attente === "idee" ? "Ce que veut dire l'auteur, avec tes mots" : "Ta problématique, avec tes mots"}
              placeholder={attente === "idee" ? `${lecture.debut}…` : "Ta problématique, avec tes mots…"} onInput={e => setBrouillonFil((e.target as HTMLTextAreaElement).value)} />
            <div class="devoir-saisie-actions">
              <button type="button" class="link-btn" onClick={() => demander({ quoi: attente, texte: "" })}>Je ne sais pas</button>
              <button type="submit" class="btn btn-primary" disabled={!brouillonFil.trim()}>Envoyer</button>
            </div>
          </form>
        )}
        {!ecrit && !attente && fil.length > 0 && (prochaines.length ? (
          <div class="devoir-reponses">
            {prochaines.map(ch => <button key={ch.id} type="button" class="tag tag-link" onClick={() => demander({ quoi: ch.id, texte: ch.texte })}>{ch.texte}</button>)}
          </div>
        ) : <div class="bulle bulle-appli"><p>Tu as tout ce qu'il faut. À toi de rédiger !</p></div>)}
      </div>
    );
  }

  return (
    <Page title="J'ai un devoir">
      <SujetsOnglets actif="devoir" />
      <PageHeader title="J'ai un devoir" compact>Colle ton sujet : on t'aide à le comprendre et à bâtir ton plan. La rédaction, c'est toi.</PageHeader>

      <form class="devoir-form" onSubmit={analyser}>
        <label class="devoir-champ">
          <span class="field-label">Ton sujet</span>
          <textarea class="textarea" rows={4} value={texte} placeholder="« La littérature doit être une arme au service du peuple. » Expliquez et discutez."
            onInput={e => { setTexte((e.target as HTMLTextAreaElement).value); setLu(false); setQuandMeme(false); setConfirme(false); setFil([]); }} />
        </label>
        <label class="devoir-champ">
          <span class="field-label">Auteur de la citation (facultatif)</span>
          <input class="input input-texte" value={auteur} placeholder="Ex. : Mongo Beti" onInput={e => setAuteur((e.target as HTMLInputElement).value)} />
        </label>
        <button type="submit" class="btn btn-primary btn-block" disabled={texte.trim().length < 20}>Analyser mon sujet</button>
      </form>

      {analyse && lecture2 && (
        <div class="devoir-resultat devoir-fil" aria-live="polite">
          <div class="bulle bulle-eleve"><p>{sujetCourt(texte)}</p></div>
          <div class="bulle bulle-appli bulle-ecrit">
            <span class="devoir-lecture-points" aria-hidden="true"><i /><i /><i /></span>
            <p>{["Je lis ton sujet…", "Je cherche ce que l'auteur veut dire…", "Je choisis des œuvres pour toi…"][etapeLecture]}</p>
          </div>
        </div>
      )}

      {analyse && !lecture2 && (
        <div class="devoir-resultat" aria-live="polite">
          {!parcours && <p class="devoir-avertissement"><Icon name="info" size={18} />Ce sont des propositions faites par l'appli : elles peuvent contenir des erreurs. Vérifie-les avec ton cours et ton professeur.</p>}
          {autreExercice && (
            <div class="devoir-note devoir-question">
              <p>{AUTRE_EXERCICE[analyse.nature].constat}</p>
              {confirme ? <p>{AUTRE_EXERCICE[analyse.nature].apresOui}</p> : <>
                <p><strong>{AUTRE_EXERCICE[analyse.nature].question}</strong></p>
                <div class="devoir-boutons">
                  <button type="button" class="btn btn-secondary" onClick={() => (analyse.nature === "pasSujet" ? autreDevoir() : setConfirme(true))}>{AUTRE_EXERCICE[analyse.nature].oui}</button>
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
          {parcours && conversation()}

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
                  <span>Écris ta problématique en deux questions : une pour la thèse (pourquoi l'auteur a raison), une pour l'antithèse (ce qui le nuance).</span>
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
                        <strong>Fonction {NOM[f]}{analyse.precision && f === analyse.fonctions[0] ? ` (${analyse.precision})` : ""}</strong>
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

          {!autreExercice && !guide && plan && !parcours && <section class="devoir-pistes">
            <h2 class="section-title">Des pistes pour ton plan</h2>
            <p class="small muted devoir-possible">Ce sont des pistes possibles, pas la seule bonne réponse.</p>
            {analyse.devalorise && !choisie && !libre && <p class="small devoir-indice">L'auteur dit que {OBJETS[analyse.objet].nom} ne sert à rien : explique d'abord son point de vue, puis montre ce qui le contredit.</p>}
            {!parcours && analyse.comprendre && !(libre && !choisie) && !choisie && <div class="devoir-compris">
              <p class="devoir-compris-titre">Ce que dit ton sujet</p>
              <p>{analyse.comprendre.these}</p>
              <p><strong>La vraie question :</strong> {analyse.comprendre.question}</p>
              {analyse.comprendre.contraire && <p><strong>L'idée contraire, pour la partie 2 :</strong> {analyse.comprendre.contraire}</p>}
            </div>}
            {plan.problematique && <p class="devoir-problematique"><strong>Problématique.</strong> {insecable(plan.problematique)}</p>}
            {analyse.comprendre && !(libre && !choisie) && !choisie && <p class="small"><strong>Ou en une question :</strong> {insecable(analyse.comprendre.uneQuestion)}</p>}
            {analyse.comprendre && !(libre && !choisie) && !choisie && <details class="devoir-plus">
              <summary>D'autres problématiques et une idée d'amorce</summary>
              <ul>{analyse.comprendre.problematiques.slice(1).map(q => <li key={q}>{q}</li>)}</ul>
              <p><strong>Pour commencer ton introduction :</strong> {analyse.comprendre.amorce}</p>
            </details>}
            <ol class="devoir-plan">
              <li><strong>Partie 1.</strong> {enPiste(plan.axe1)}<Arguments liste={plan.args1} exemples={plan.ex1} explications={plan.expl1} /></li>
              {plan.transition && <li class="devoir-transition"><strong>Pour passer à la partie 2.</strong> {plan.transition}</li>}
              <li><strong>Partie 2.</strong> {enPiste(plan.axe2)}<Arguments liste={plan.args2} exemples={plan.ex2} explications={plan.expl2} /></li>
            </ol>
            {plan.autres && plan.autres.length > 0 && <p class="small devoir-autres">Tu n'as pas lu ces œuvres ? D'autres conviennent aussi pour la partie 1 :{" "}
              {plan.autres.map((w, i) => <span key={w.id}>{i ? ", " : ""}<a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a> ({w.auteur})</span>)}.</p>}
            {libre && !choisie && analyse.horsCadre && <p class="small devoir-conseil"><strong>Piste à creuser.</strong> {analyse.horsCadre.conseil}</p>}
            {analyse.genres.length > 0 && !parcours && !analyse.corrige?.ouvert && !(libre && !choisie) && <p class="small muted">Ton sujet parle {genreDu(analyse.genres)} : les exemples sont choisis dans {analyse.genres.length > 1 ? "ces genres" : "ce genre"}.</p>}
            <p class="small devoir-base"><strong>À toi de rédiger.</strong> Ces pistes t'aident à démarrer : explique chaque argument avec tes mots et vérifie tes exemples dans ton cours.</p>
          </section>}

          {analyse.oeuvres.length > 0 && !guide && !parcours && !(autreExercice && analyse.nature === "pasSujet") && (
            <section>
              <h2 class="section-title">{libre && !choisie ? "Des œuvres qui peuvent t'aider" : "Des œuvres pour l'illustrer"}</h2>
              <ul class="devoir-liste">
                {analyse.oeuvres.map(w => (
                  <li key={w.id}><a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a><span class="muted"> · {w.auteur}</span></li>
                ))}
              </ul>
            </section>
          )}

          {analyse.mots.length > 0 && !guide && !parcours && !(autreExercice && analyse.nature === "pasSujet") && (
            <section>
              <h2 class="section-title">Des mots à bien comprendre</h2>
              <p class="tags">{analyse.mots.map(m => <a key={m.mot} class="tag tag-link" href={`#/outils?mot=${encodeURIComponent(m.mot)}`}>{m.mot}</a>)}</p>
            </section>
          )}


          {!autreExercice && !guide && (!parcours || fil.length > 0) && <button type="button" class="btn btn-primary btn-block" onClick={rediger}><Icon name="edit" size={20} />Rédiger ce sujet dans l'atelier</button>}
          {parcours && fil.length > 0 && <p class="small muted devoir-prudence">Ce sont des propositions de l'appli : vérifie-les avec ton cours et ton professeur.</p>}
          {(!parcours || fil.length > 0) && !(autreExercice && analyse.nature === "pasSujet") && analyse.proches.length > 0 && <details class="devoir-options">
            <summary>Des sujets corrigés proches</summary>
            <ul class="devoir-liste">
              {analyse.proches.map(s => (
                <li key={s.num}><a href={`#/sujets/${s.num}`}>Sujet {s.num}</a><span class="muted"> · « {s.citation.length > 70 ? s.citation.slice(0, 68).trimEnd() + "…" : s.citation} »</span></li>
              ))}
            </ul>
          </details>}
          {/* Toujours en bas, visibles mais discrets (Atikan). */}
          <p class="devoir-autre">
            {!autreExercice && <button type="button" class="link-btn" onClick={garder} disabled={garde} aria-pressed={garde}><Icon name="bookmark" filled={garde} size={18} />{garde ? "Gardé dans Mon espace" : "Garder dans Mon espace"}</button>}
            <button type="button" class="link-btn" onClick={autreDevoir}><Icon name="add" size={18} />Saisir un autre devoir</button>
          </p>
          {gardeLe && (
            <label class="devoir-date devoir-date-bas">
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
  Sociale: "l'auteur parle de montrer la réalité, la société, l'histoire ou les traditions d'un peuple, ou d'instruire et d'éduquer (fonction didactique).",
  Esthétique: "l'auteur parle de beauté, de style, de forme, d'art ou de bien écrire.",
  Évasion: "l'auteur parle de rêver, d'imaginer, de se divertir, de voyager ou de fuir la réalité.",
  Lyrique: "l'auteur parle de sentiments, d'émotions ou de la vie intime de l'écrivain (fonction autobiographique)."
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
  pasSujet: {
    constat: "Ce texte ne ressemble pas à un sujet de devoir : il n'y a ni citation entre guillemets, ni consigne (Discutez, Expliquez, Commentez…).",
    question: "As-tu collé le bon texte ?",
    oui: "Non, je colle mon vrai sujet",
    changer: "Si, c'est bien mon sujet",
    apresOui: "Efface ce texte et colle l'énoncé complet de ton devoir : la citation entre guillemets, puis la consigne (par exemple « Discutez »)."
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
function Arguments({ liste, exemples, explications }: { liste: string[]; exemples: Exemple[][]; explications?: string[] }) {
  return liste.length ? <ul class="devoir-args">{liste.map((a, i) => <li key={a}>{a}
    {explications?.[i] && <span class="devoir-expl">{explications[i]}</span>}
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

type Demande = "comprendre" | "arguments" | "illustrer" | "plan";
/** Un tour de la conversation : ce que l'élève a demandé ou écrit. */
type Tour = { quoi: Demande | "oui" | "idee" | "question"; texte: string };
/** Ce que l'élève peut demander, dans l'ordre où il le voit. */
const CHOIX: { id: Demande; texte: string }[] = [
  { id: "comprendre", texte: "Aide-moi à comprendre le sujet" },
  { id: "arguments", texte: "Donne-moi des arguments" },
  { id: "illustrer", texte: "Des arguments avec des œuvres" },
  { id: "plan", texte: "Fais-moi le plan complet" }
];

/** Une espace insécable avant « ? » : le point d'interrogation ne part jamais seul à la ligne. */
function insecable(t: string) {
  return t.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
}

/** Le sujet tel que l'élève l'a collé, raccourci s'il est très long. */
function sujetCourt(t: string) {
  const s = t.trim().replace(/\s+/g, " ");
  return s.length > 260 ? s.slice(0, 258).trimEnd() + "…" : s;
}
