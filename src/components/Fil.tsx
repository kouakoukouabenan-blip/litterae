import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { Texte } from "./Texte";
import { Icon, type BaseName } from "./Icon";
import { copyText } from "./Toast";
import { dejaGlisse, ecarterCarte, filDuJour, nouveauteOuverte, noterReponse, reponsesDuJour, type CarteFil } from "../lib/fil";
import { suggestionOuverte, suggestionsVues } from "../lib/interets";
import { noter } from "../lib/stats";
import { marquer } from "../lib/progres";
import { ajouterCarte, cleOeuvre } from "../lib/revisions";
import { badgeVu, carteAuteur, ouvrirSurprise, repondreEclair, type Surprise } from "../lib/collection";

const PREMIERES = 3;
const PAR_PAGE = 5;
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
  const fil = useMemo(() => filDuJour(), []);
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
  if (!fil.length) return null;
  const retirer = (c: CarteFil) => { ecarterCarte(c.cle); noter({ t: "suggestion", ref: `passe:${c.type}` }); setPartis(p => [...p, c.cle]); };
  return (
    <>
      <ul class="pour-toi-liste fil">
        {visibles.map(c => <Glissable key={c.cle} onPart={() => retirer(c)}><Carte c={c} /></Glissable>)}
      </ul>
      {astuce && visibles.length > 0 && !partis.length && <p class="fil-astuce"><Icon name="swipe" size={16} />Glisse une carte sur le côté pour la passer.</p>}
      {n < restants.length
        ? <button type="button" class="btn btn-secondary btn-block fil-plus" onClick={() => setN(n + PAR_PAGE)}><Icon name="expand_more" size={20} />Voir plus</button>
        : <p class="fil-fin">Tu as tout vu pour aujourd'hui. Reviens demain pour de nouvelles cartes.</p>}
      <div ref={fin} aria-hidden="true" />
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
    case "formule": return (
      <div class="fil-carte">
        <p class="fil-etiquette"><Icon name="edit" size={16} />Formule pour ta copie · {c.label}</p>
        <p class="fil-texte">{c.texte}</p>
        <button type="button" class="btn btn-secondary fil-copier" onClick={() => { ouverte(c); copyText(c.texte, "Formule copiée."); }}><Icon name="content_copy" size={18} />Copier</button>
      </div>
    );
    case "surprise": return <SurpriseCarte c={c} />;
  }
}

/** Carte à jouer d'un geste : le choix se colore, l'explication s'affiche, le fil continue. */
function Choix({ c, etiquette, icone, question, citation, auteur, choix, bonne, apres, repondu }: {
  c: CarteFil; etiquette: string; icone: BaseName; question: string; citation?: string; auteur?: string; choix: string[]; bonne: number;
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
  }
  const juste = r === bonne;
  const suivante = useContext(Retirer);
  return (
    <div class="fil-carte">
      <p class="fil-etiquette"><Icon name={icone} size={16} />{etiquette}</p>
      {citation && <p class="fil-citation">{citation}<span class="fil-auteur">{auteur}</span></p>}
      <p class="fil-question">{question}</p>
      <ul class="fil-choix">
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
