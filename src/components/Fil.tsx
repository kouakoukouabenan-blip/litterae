import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { Texte } from "./Texte";
import { Icon, type BaseName } from "./Icon";
import { copyText } from "./Toast";
import { TOUS_LES_PAYS, carteDemandee, decouvrirPays, dePays, paysDecouverts, dejaGlisse, ecarterCarte, filDuJour, nouveauteOuverte, noterReponse, reponsesDuJour, type CarteFil } from "../lib/fil";
import { suggestionOuverte, suggestionsVues } from "../lib/interets";
import { noter } from "../lib/stats";
import { parseHash } from "../lib/router";
import { proposerNotifs } from "./DemandeNotifs";
import { marquer } from "../lib/progres";
import { ajouterCarte, cleOeuvre } from "../lib/revisions";
import { categorie } from "../lib/formules";
import { Partie, FormuleExemple, FormuleTexte } from "./Formule";
import { badgeVu, carteAuteur, ouvrirSurprise, repondreEclair, type Surprise } from "../lib/collection";

const PREMIERES = 3;
const PAR_PAGE = 5;
/** « de Molière », « d'Amadou Koné ». */
const de = (nom: string) => /^[AEÉÈIOUY]/i.test(nom) ? `d'${nom}` : `de ${nom}`;
/** « une généralité », « un bilan », « une insertion du sujet ». */
const un = (nom: string) => `${/^(Généralité|Insertion|Problématique|Annonce|Phrase|Transition|Ouverture|Belle)/.test(nom) ? "une" : "un"} ${nom.charAt(0).toLowerCase()}${nom.slice(1)}`;
const NOM: Record<string, string> = { Engagement: "d'engagement", Sociale: "sociale", Esthétique: "esthétique", Évasion: "d'évasion", Lyrique: "lyrique" };

/** Compte, sans rien savoir de l'élève, les cartes montrées (une fois par jour) et celles qui sont ouvertes ou jouées. */
function montrees(liste: CarteFil[]) {
  const nouvelles = new Set(suggestionsVues(liste.map(c => c.cle)));
  for (const c of liste) if (nouvelles.has(c.cle)) noter({ t: "suggestion", ref: `vue:${c.type}` });
}
function ouverte(c: CarteFil) {
  suggestionOuverte(c.cle);
  if (c.t === "nouveau") nouveauteOuverte(c.cle);
  noter({ t: "suggestion", ref: `clic:${c.type}` });
}

/** Retire la carte du fil (glissée, ou « Suivante » après une réponse). */
const Retirer = createContext<() => void>(() => {});

/** Le fil « Pour toi » : trois cartes, puis cinq de plus à chaque « Voir plus », jusqu'à la fin du jour. */
export function Fil() {
  const [fil, demandee] = useMemo(() => {
    const tous = filDuJour();
    // Ouvert depuis une notification qui posait une question : cette carte passe en tête.
    const c = carteDemandee(parseHash().params.get("carte"));
    return [c ? [c, ...tous.filter(x => x.cle !== c.cle)] : tous, c] as const;
  }, []);
  const [n, setN] = useState(PREMIERES);
  const [partis, setPartis] = useState<string[]>([]);
  const [astuce] = useState(() => !dejaGlisse());
  const restants = fil.filter(c => !partis.includes(c.cle));
  const visibles = restants.slice(0, n);
  useEffect(() => montrees(visibles), [n, partis.length]);
  // Après « Voir plus », un léger fondu en bas de l'écran laisse deviner les cartes suivantes, jusqu'à la fin du fil.
  const fin = useRef<HTMLDivElement>(null);
  const [finVisible, setFinVisible] = useState(true);
  useEffect(() => {
    const el = fin.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const o = new IntersectionObserver(([e]) => setFinVisible(e.isIntersecting), { rootMargin: "0px 0px -40px 0px" });
    o.observe(el);
    return () => o.disconnect();
  }, [fil.length]);
  // Voile du fil : il couvre les cartes sous la première, puis s'efface à mesure que l'élève descend, et revient s'il remonte.
  const liste = useRef<HTMLUListElement>(null);
  const voile = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let attente = 0;
    const placer = () => {
      attente = 0;
      const ul = liste.current, v = voile.current;
      if (!ul || !v) return;
      const nav = document.querySelector<HTMLElement>(".bottom-nav");
      const bas = nav ? nav.getBoundingClientRect().top : innerHeight;
      const r = ul.getBoundingClientRect();
      const premiere = ul.firstElementChild?.getBoundingClientRect();
      const haut = Math.max(premiere ? premiere.bottom - 24 : r.top, 0);
      // 0 quand le fil arrive en bas de l'écran, 1 quand il est remonté de presque tout l'écran.
      const p = Math.min(1, Math.max(0, (bas - r.top) / (innerHeight * 0.9)));
      const visible = haut < bas - 40 && p < 1;
      v.style.top = `${haut}px`;
      v.style.bottom = `${innerHeight - bas}px`;
      v.style.opacity = visible ? String(1 - p * p * (3 - 2 * p)) : "0";
    };
    const demander = () => { if (!attente) attente = requestAnimationFrame(placer); };
    placer();
    addEventListener("scroll", demander, { passive: true });
    addEventListener("resize", demander);
    return () => { removeEventListener("scroll", demander); removeEventListener("resize", demander); cancelAnimationFrame(attente); };
  }, [n, partis.length, fil.length]);
  // L'élève arrive pour répondre à la question de la notification : on l'amène à la carte.
  useEffect(() => {
    if (demandee) setTimeout(() => liste.current?.firstElementChild?.scrollIntoView({ block: "center" }), 300);
  }, []);
  if (!fil.length) return null;
  const retirer = (c: CarteFil) => { ecarterCarte(c.cle); noter({ t: "suggestion", ref: `passe:${c.type}` }); setPartis(p => [...p, c.cle]); };
  return (
    <>
      <ul ref={liste} class="pour-toi-liste fil">
        {visibles.map(c => <Glissable key={c.cle} onPart={() => retirer(c)}><Carte c={c} /></Glissable>)}
      </ul>
      {astuce && visibles.length > 0 && !partis.length && <p class="fil-astuce"><Icon name="swipe" size={16} />Glisse une carte sur le côté pour la passer.</p>}
      {n < restants.length
        ? <button type="button" class="btn btn-secondary btn-block fil-plus" onClick={() => setN(n + PAR_PAGE)}><Icon name="expand_more" size={20} />Voir plus</button>
        : <p class="fil-fin">Tu as tout vu pour aujourd'hui. Reviens demain pour de nouvelles cartes.</p>}
      <div ref={fin} aria-hidden="true" />
      <div ref={voile} class="fil-voile" aria-hidden="true" />
      {n > PREMIERES && !finVisible && <div class="fil-fondu" aria-hidden="true" />}
    </>
  );
}

/**
 * Carte qu'on fait passer en la glissant vers la gauche ou la droite, comme sur les réseaux.
 * Le défilement vertical reste libre ; un simple toucher garde son effet (lien, bouton).
 */
function Glissable({ onPart, children }: { onPart: () => void; children: preact.ComponentChildren }) {
  const li = useRef<HTMLLIElement>(null);
  const geste = useRef<{ x: number; y: number; dx: number; sens: "?" | "h" | "v"; id: number } | null>(null);
  const bouge = useRef(false);
  const [sortie, setSortie] = useState<0 | 1 | -1>(0);
  const poser = (dx: number, anime: boolean) => {
    const el = li.current; if (!el) return;
    el.style.transition = anime ? "transform .22s ease, opacity .22s ease" : "none";
    el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : "";
    el.style.opacity = dx ? String(Math.max(0.2, 1 - Math.abs(dx) / (el.offsetWidth * 1.2))) : "";
  };
  const partir = (sens: 1 | -1) => {
    setSortie(sens);
    poser(sens * ((li.current?.offsetWidth ?? 400) + 60), true);
    setTimeout(onPart, 220);
  };
  return (
    <li ref={li} class={`fil-glissable${sortie ? " part" : ""}`}
      onPointerDown={e => { if (e.pointerType === "mouse" && e.button !== 0) return; geste.current = { x: e.clientX, y: e.clientY, dx: 0, sens: "?", id: e.pointerId }; bouge.current = false; }}
      onPointerMove={e => {
        const g = geste.current; if (!g || g.id !== e.pointerId) return;
        const dx = e.clientX - g.x, dy = e.clientY - g.y;
        if (g.sens === "?") {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          g.sens = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
          if (g.sens === "h") { bouge.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
        }
        if (g.sens !== "h") return;
        g.dx = dx; poser(dx, false);
      }}
      onPointerUp={e => {
        const g = geste.current; geste.current = null;
        if (!g || g.sens !== "h") return;
        const seuil = Math.min(110, (e.currentTarget as HTMLElement).offsetWidth * 0.3);
        if (Math.abs(g.dx) > seuil) partir(g.dx > 0 ? 1 : -1); else poser(0, true);
      }}
      onDragStart={e => e.preventDefault()}
      onPointerCancel={() => { const g = geste.current; geste.current = null; if (g?.sens === "h") poser(0, true); }}
      // Après un glissé, le relâchement ne doit pas ouvrir le lien ni choisir une réponse.
      onClickCapture={e => { if (bouge.current) { e.preventDefault(); e.stopPropagation(); bouge.current = false; } }}>
      <Retirer.Provider value={() => partir(-1)}>{children}</Retirer.Provider>
    </li>
  );
}

function Ligne({ c, icone, titre, detail, lien, etiquette }: { c: CarteFil; icone: BaseName; titre: string; detail: string; lien: string; etiquette?: string }) {
  return (
    <a class="pour-toi-ligne" href={lien} onClick={() => ouverte(c)}>
      <span class="pour-toi-icone" aria-hidden="true"><Icon name={icone} size={20} /></span>
      <span class="pour-toi-texte">
        <span class="pour-toi-nom">{etiquette && <span class="fil-nouveau">{etiquette}</span>}<Texte text={titre} /></span>
        <span class="pour-toi-detail"><Texte text={detail} /></span>
      </span>
      <Icon name="chevron_right" size={20} />
    </a>
  );
}

function Carte({ c }: { c: CarteFil }) {
  switch (c.t) {
    case "suggestion": return <Ligne c={c} icone={c.s.icone} titre={c.s.titre} detail={c.s.detail} lien={c.s.lien} />;
    case "nouveau": return <Ligne c={c} icone="star" titre={c.titre} detail={c.detail} lien={c.lien} etiquette="Nouveau" />;
    case "auteur": { const a = carteAuteur(c.nom); return <Ligne c={c} icone="style" titre={`Nouvelle carte d'auteur : ${c.nom}`} detail={a.pays || "Dans ta collection"} lien="#/collection" />; }
    case "collection": return <Ligne c={c} icone="style" titre={`Ta collection : ${c.n} auteur${c.n > 1 ? "s" : ""} sur ${c.total}`} detail="Chaque fiche lue débloque son auteur" lien="#/collection" />;
    case "duel": return <Ligne c={c} icone="groups" titre="Défie un ami" detail="5 questions sur les œuvres, envoie-lui ton score" lien="#/duel" />;
    case "badge": return c.gagne ? <BadgeGagne c={c} /> : <Ligne c={c} icone="emoji_events" titre={c.badge.reste(c.badge.objectif - c.badge.valeur)} detail={`${c.badge.valeur} sur ${c.badge.objectif}`} lien="#/collection" />;
    case "question": return <Choix c={c} etiquette="Question éclair" icone="bolt" question={c.q.q} choix={c.q.choix} bonne={c.q.bonne}
      apres={(juste) => <>{juste ? null : <>{c.q.pourquoi} </>}<a href={`#/oeuvres/${encodeURIComponent(c.w.id)}`} onClick={() => ouverte(c)}>Voir la fiche</a></>}
      repondu={juste => { const serie = repondreEclair(juste); if (c.w.detaillee) ajouterCarte(cleOeuvre(c.w.id), juste); return serie; }} />;
    case "citation": return <Choix c={c} etiquette="Classe la citation" icone="format_quote" citation={`« ${c.citation} »`} auteur={c.auteur} question="Quelle fonction de la littérature ?"
      choix={c.choix} bonne={c.choix.indexOf(c.bonne)} apres={() => <>Le sujet attend la fonction {NOM[c.bonne]}. <a href={`#/entrainement/${c.num}`} onClick={() => ouverte(c)}>Traiter ce sujet</a></>} />;
    case "mot": return <Choix c={c} etiquette="Mot de sujet" icone="lightbulb" question={`Dans un sujet, « ${c.mot} » renvoie surtout à quelle fonction ?`}
      choix={c.choix} bonne={c.choix.indexOf(c.bonne)} apres={() => <>Fonction {NOM[c.bonne]}. <a href={`#/outils?mot=${encodeURIComponent(c.mot)}`} onClick={() => ouverte(c)}>Voir tous les sens du mot</a></>} />;
    case "oeuvre": return (
      <div class="fil-carte">
        <p class="fil-etiquette"><Icon name="local_library" size={16} />Une œuvre en 30 secondes</p>
        <p class="fil-titre"><cite>{c.w.titre}</cite>, {c.w.auteur}</p>
        <p class="fil-texte">{c.extrait ?? [c.w.genre, c.w.paysTexte, c.w.themes.slice(0, 3).join(", ").toLowerCase()].filter(Boolean).join(" · ")}</p>
        {c.ouvrable && <a class="link-strong" href={`#/oeuvres/${encodeURIComponent(c.w.id)}`} onClick={() => ouverte(c)}>{c.extrait ? "Lire la suite" : "Ouvrir la fiche"}</a>}
      </div>
    );
    case "formule": {
      const cat = categorie(c.f.cat)!;
      return (
        <div class="fil-carte">
          <p class="fil-etiquette"><Icon name="edit" size={16} />Pour ta copie · {cat.nom}</p>
          <Partie cat={cat.id} />
          <p class="fil-texte fil-formule"><FormuleTexte texte={c.f.texte} /></p>
          <p class="fil-place">{cat.place}. {cat.role}</p>
          <FormuleExemple f={c.f} />
          <div class="fil-actions">
            <button type="button" class="btn btn-secondary fil-copier" onClick={() => { ouverte(c); copyText(c.f.texte, "Formule copiée."); }}><Icon name="content_copy" size={18} />Copier</button>
            <a class="link-strong" href={`#/outils?vue=formules&groupe=${cat.id}`} onClick={() => ouverte(c)}>Autres formules</a>
          </div>
        </div>
      );
    }
    case "placer": {
      const cat = categorie(c.f.cat)!;
      return <Choix c={c} etiquette="Où va cette phrase ?" icone="edit" avant={<p class="fil-phrase"><Texte text={c.f.exemple} /></p>} question="Dans une copie, cette phrase est…"
        choix={c.choix.map(id => categorie(id)?.nom ?? id)} bonne={c.bonne}
        apres={() => <>C'est {un(cat.nom)} : {cat.place.charAt(0).toLowerCase() + cat.place.slice(1)}. <a href={`#/outils?vue=formules&groupe=${cat.id}`} onClick={() => ouverte(c)}>Voir les formules</a></>}
        repondu={juste => repondreEclair(juste)} />;
    }
    case "devine": return <Choix c={c} etiquette="Devine l'œuvre" icone="quiz"
      avant={<ul class="fil-indices">{c.indices.map(x => <li key={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</li>)}</ul>}
      question="Quelle est cette œuvre ?" choix={c.choix.map(w => `« ${w.titre} »`)} bonne={c.choix.indexOf(c.w)}
      apres={() => <>C'était <cite>{c.w.titre}</cite> {de(c.w.auteur)}. <a href={`#/oeuvres/${encodeURIComponent(c.w.id)}`} onClick={() => ouverte(c)}>Voir la fiche</a></>}
      repondu={juste => repondreEclair(juste)} />;
    case "these": return <Choix c={c} etiquette="Thèse ou antithèse ?" icone="call_split" citation={`« ${c.citation} »`} auteur={c.auteur}
      avant={<p class="fil-argument">Argument : {c.argument}</p>}
      question="Dans ta dissertation, où ranges-tu cet argument ?" choix={["Première partie (thèse)", "Deuxième partie (antithèse)"]} bonne={c.partie - 1}
      apres={() => <>{c.partie === 1
        ? `Le sujet défend la fonction ${NOM[c.fonction]} : cet argument l'explique, il va dans la première partie.`
        : `Cet argument relève de la fonction ${NOM[c.argFonction]} : il montre les limites du sujet, il va dans la deuxième partie.`}{" "}
        <a href={`#/entrainement/${c.num}`} onClick={() => ouverte(c)}>Traiter ce sujet</a></>} />;
    case "vraifaux": return <Choix c={c} etiquette="Vrai ou faux ?" icone="fact_check" question={c.phrase} choix={["Vrai", "Faux"]} bonne={c.vrai ? 0 : 1} deux
      apres={() => <>{c.vrai ? "" : `${c.correction} `}<a href={`#/oeuvres/${encodeURIComponent(c.w.id)}`} onClick={() => ouverte(c)}>Voir la fiche</a></>}
      repondu={juste => repondreEclair(juste)} />;
    case "plan": return <Choix c={c} etiquette="Le bon plan" icone="account_tree" citation={`« ${c.citation} »`} auteur={c.auteur}
      question="Quel plan répond vraiment à ce sujet ?" choix={c.plans.map(([a, b], i) => `Plan ${i ? "B" : "A"}\nI. ${a}\nII. ${b}`)} bonne={c.bon}
      apres={() => <>Le sujet défend la fonction {NOM[c.fonction]} : la première partie l'explique, la seconde en montre les limites. <a href={`#/entrainement/${c.num}`} onClick={() => ouverte(c)}>Traiter ce sujet</a></>} />;
    case "pays": return <Choix c={c} etiquette="Tour du monde littéraire" icone="public" question={`De quel pays vient « ${c.w.titre} » ${de(c.w.auteur)} ?`} choix={c.choix} bonne={c.choix.indexOf(c.pays)}
      apres={juste => <>{juste ? `Pays ajouté à ton tour du monde : ${paysDecouverts().length} sur ${TOUS_LES_PAYS.length}.` : `C'est une œuvre ${dePays(c.pays)}.`} <a href="#/collection" onClick={() => ouverte(c)}>Voir mon tour du monde</a></>}
      repondu={juste => { if (juste) decouvrirPays(c.pays); return 0; }} />;
    case "surprise": return <SurpriseCarte c={c} />;
  }
}

/** Carte à jouer d'un geste : le choix se colore, l'explication s'affiche, le fil continue. */
function Choix({ c, etiquette, icone, question, citation, auteur, avant, choix, bonne, apres, repondu, deux }: {
  c: CarteFil; etiquette: string; icone: BaseName; question: string; citation?: string; auteur?: string; avant?: preact.ComponentChildren; choix: string[]; bonne: number; deux?: boolean;
  apres: (juste: boolean) => preact.ComponentChildren; repondu?: (juste: boolean) => number;
}) {
  const [r, setR] = useState<number | null>(() => reponsesDuJour()[c.cle] ?? null);
  const [serie, setSerie] = useState(0);
  function choisir(i: number) {
    if (r !== null) return;
    setR(i);
    noterReponse(c.cle, i);
    ouverte(c);
    marquer(`fil:${c.cle}`);
    if (repondu) setSerie(repondu(i === bonne));
    // Deuxième question jouée aujourd'hui : l'élève aime ça, on lui propose d'en recevoir une par jour.
    if (Object.keys(reponsesDuJour()).length >= 2) proposerNotifs("fil");
  }
  const juste = r === bonne;
  const suivante = useContext(Retirer);
  return (
    <div class="fil-carte">
      <p class="fil-etiquette"><Icon name={icone} size={16} />{etiquette}</p>
      {citation && <p class="fil-citation">{citation}<span class="fil-auteur">{auteur}</span></p>}
      {avant}
      <p class="fil-question">{question}</p>
      <ul class={`fil-choix${deux ? " fil-choix-deux" : ""}`}>
        {choix.map((x, i) => {
          const etat = r === null ? "" : i === bonne ? "ok" : i === r ? "faux" : "";
          return <li key={x}><button type="button" class={`quiz-option ${etat}`} disabled={r !== null} onClick={() => choisir(i)}>
            <span>{x}</span>{etat === "ok" && <Icon name="check" size={18} />}{etat === "faux" && <Icon name="close" size={18} />}
          </button></li>;
        })}
      </ul>
      {r !== null && (
        <p class="fil-retour" role="status">
          <strong>{juste ? (serie > 1 ? `Bonne réponse, ${serie} d'affilée !` : "Bonne réponse.") : "Pas tout à fait."}</strong> {apres(juste)}
        </p>
      )}
      {r !== null && <button type="button" class="btn btn-secondary fil-suivante" onClick={suivante}>Carte suivante<Icon name="arrow_forward" size={18} /></button>}
    </div>
  );
}

function BadgeGagne({ c }: { c: Extract<CarteFil, { t: "badge" }> }) {
  useEffect(() => badgeVu(c.badge.id), []);
  return (
    <a class="fil-carte fil-badge" href="#/collection" onClick={() => ouverte(c)}>
      <span class="fil-badge-icone" aria-hidden="true"><Icon name="emoji_events" size={28} /></span>
      <span><span class="fil-etiquette">Nouveau badge</span><span class="fil-titre">{c.badge.nom}</span><span class="fil-texte">{c.badge.texte}</span></span>
    </a>
  );
}

function SurpriseCarte({ c }: { c: CarteFil }) {
  const [s, setS] = useState<Surprise | null>(null);
  if (!s) return (
    <div class="fil-carte fil-surprise">
      <p class="fil-etiquette"><Icon name="cadeau" size={16} />Surprise</p>
      <p class="fil-question">Tu as gagné une carte surprise.</p>
      <button type="button" class="btn btn-primary" onClick={() => { ouverte(c); setS(ouvrirSurprise()); }}>Ouvrir</button>
    </div>
  );
  return s.t === "auteur" ? (
    <a class="fil-carte fil-surprise" href="#/collection">
      <p class="fil-etiquette"><Icon name="style" size={16} />Carte bonus</p>
      <p class="fil-titre">{s.nom}</p>
      <p class="fil-texte">{carteAuteur(s.nom).pays} · ajouté à ta collection</p>
    </a>
  ) : (
    <div class="fil-carte fil-surprise">
      <p class="fil-etiquette"><Icon name="format_quote" size={16} />Citation de sujet</p>
      <p class="fil-citation">« {s.citation} »<span class="fil-auteur">{s.auteur}</span></p>
      <a class="link-strong" href={`#/entrainement/${s.num}`}>Traiter ce sujet</a>
    </div>
  );
}
