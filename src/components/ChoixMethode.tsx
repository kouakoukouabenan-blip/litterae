import { render } from "preact";
import { useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";
import { MATIERES, METHODES, matiereDe, useMethode, type Methode } from "../lib/methodes";
import { read } from "../lib/storage";
import { ESSAI } from "../lib/site";
import { useAccess } from "../lib/access";
import { IconeMethode } from "./Marque";

/**
 * Petite transition quand l'élève change de méthode : l'icône de la méthode et son nom apparaissent
 * un instant par-dessus l'écran (moins d'une seconde), pendant que l'accueil de la nouvelle méthode se met en place.
 */
function animerMethode(m: Methode) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelector(".transition-methode")?.remove();
  const el = document.createElement("div");
  el.className = "transition-methode";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  render(
    <div class="transition-methode-contenu">
      <IconeMethode id={m.id} class="transition-methode-icone seulement-nouvelle" />
      <span class="transition-methode-point seulement-ancienne" style={{ background: m.couleur }} />
      <span class="transition-methode-nom">{m.nom}</span>
    </div>, el);
  setTimeout(() => { render(null, el); el.remove(); }, 1000);
}

/**
 * Propositions de présentation (site d'essai), choisies dans Mon espace › Apparence :
 * A = feuille avec les matières en onglets, B = liste de matières qui s'ouvrent, C = petit menu sous la barre du haut.
 */
export type Variante = "a" | "b" | "c";
export const varianteMatiere = (): Variante => (ESSAI ? read<Variante>("variante-matiere", "b") : "b");

/** Les méthodes d'une matière, côte à côte (trois par ligne). */
function TuilesMethodes({ matiere, active, statut, onChoisir }: {
  matiere: string; active: Methode; statut: (m: Methode) => string; onChoisir: (m: Methode) => void;
}) {
  return (
    <ul class="methode-tuiles">
      {METHODES.filter(m => m.matiere === matiere).map(m => {
        const est = m.id === active.id;
        return (
          <li key={m.id}>
            <button type="button" class={`methode-tuile ${est ? "is-active" : ""} ${m.prete ? "" : "is-bientot"}`}
              aria-current={est ? "true" : undefined} aria-label={`${m.nom}, ${statut(m)}`} onClick={() => onChoisir(m)}>
              <span class="methode-point seulement-ancienne" style={m.prete ? { background: m.couleur } : { borderColor: m.couleur }} aria-hidden="true" />
              <IconeMethode id={m.id} class="methode-icone seulement-nouvelle" />
              <strong>{m.court}</strong>
              <span class="methode-tuile-etat">{m.prete ? (est ? "Ouverte" : "\u00a0") : "Bientôt"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Bouton de la barre du haut : la matière et la méthode en cours ; on l'ouvre pour changer. */
export function ChoixMethode() {
  const ref = useRef<HTMLDialogElement>(null);
  const { premium } = useAccess();
  const [active, choisir] = useMethode();
  const variante = varianteMatiere();
  const [ouvert, setOuvert] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Matière affichée (A : onglet choisi ; B : matière dépliée).
  const [vue, setVue] = useState<string | null>(active.matiere);
  const matiere = matiereDe(active);

  const ouvrir = () => {
    setNote(null); setVue(active.matiere);
    if (variante === "c") return setOuvert(o => !o);
    const d = ref.current;
    if (d) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }
  };
  const fermer = () => {
    setOuvert(false);
    const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); }
  };
  const statut = (m: Methode) => !m.prete ? "bientôt" : premium ? "ouverte avec ta clé" : m.id === "dissertation" ? "début gratuit" : "avec l'accès complet";
  const prendre = (m: Methode) => {
    if (!m.prete) return setNote(`${m.nom} : en préparation. Un message sur l'accueil te préviendra.`);
    if (m.id !== active.id) animerMethode(m);
    choisir(m.id); fermer();
    if (location.hash !== "#/accueil") location.hash = "#/accueil";
  };
  const tuiles = (id: string) => <TuilesMethodes matiere={id} active={active} statut={statut} onChoisir={prendre} />;
  const enPreparation = (nom: string) => <p class="matiere-attente">{nom} arrive bientôt dans Litterae.</p>;
  const noteVue = note && <p class="methode-note">{note}</p>;
  const pied = <p class="methode-cle">Une seule clé d'accès ouvre toutes les méthodes.</p>;

  let contenu;
  if (variante === "a") {
    const m = MATIERES.find(x => x.id === vue) ?? matiere;
    contenu = (
      <>
        <div class="matiere-onglets" role="tablist" aria-label="Matières">
          {MATIERES.map(x => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === m.id} class={`matiere-onglet ${x.prete ? "" : "is-bientot"}`}
              onClick={() => { setVue(x.id); setNote(null); }}>{x.nom === "Histoire-Géographie" ? "Histoire\u2011Géo" : x.nom}</button>
          ))}
        </div>
        {m.prete ? tuiles(m.id) : enPreparation(m.nom)}
        {noteVue}
        {pied}
      </>
    );
  } else if (variante === "b") {
    contenu = (
      <>
        <ul class="matiere-liste">
          {MATIERES.map(x => {
            const deplie = vue === x.id;
            return (
              <li key={x.id} class={`matiere-bloc ${deplie ? "is-ouvert" : ""}`}>
                <button type="button" class={`matiere-ligne ${x.prete ? "" : "is-bientot"}`} aria-expanded={deplie}
                  onClick={() => { setVue(deplie ? null : x.id); setNote(null); }}>
                  <span class="matiere-nom">{x.nom}</span>
                  {!x.prete && <span class="matiere-badge">Bientôt</span>}
                  {x.id === active.matiere && <span class="matiere-badge is-actuelle">{active.court}</span>}
                  <Icon name="expand_more" size={20} />
                </button>
                {deplie && <div class="matiere-dedans">{x.prete ? tuiles(x.id) : enPreparation(x.nom)}</div>}
              </li>
            );
          })}
        </ul>
        {noteVue}
        {pied}
      </>
    );
  } else {
    contenu = (
      <>
        <p class="menu-matiere-titre">{matiere.nom}</p>
        {tuiles(matiere.id)}
        {noteVue}
        <p class="menu-matiere-autres">
          <span>Autres matières, bientôt :</span> {MATIERES.filter(x => x.id !== matiere.id).map(x => x.nom === "Histoire-Géographie" ? "Histoire\u2011Géo" : x.nom).join(" · ")}
        </p>
      </>
    );
  }

  return (
    <>
      <button type="button" class={`methode-bouton matiere-bouton ${ouvert ? "is-ouvert" : ""}`} onClick={ouvrir} aria-haspopup={variante === "c" ? "true" : "dialog"} aria-expanded={variante === "c" ? ouvert : undefined}
        aria-label={`${matiere.nom}, ${active.nom}. Changer de matière ou de méthode`}>
        <span class="matiere-bouton-texte">
          <span class="matiere-bouton-matiere">{matiere.nom}</span>
          <span class="methode-nom">{active.court}</span>
        </span>
        <Icon name="expand_more" size={18} />
      </button>
      {variante === "c" ? (ouvert && (
        <div class="menu-matiere-fond" onClick={e => e.target === e.currentTarget && fermer()}>
          <div class="menu-matiere" role="dialog" aria-label="Changer de méthode">{contenu}</div>
        </div>
      )) : (
        <dialog ref={ref} class={`sheet methode-feuille variante-${variante}`} aria-labelledby="methode-titre" onClick={e => e.target === ref.current && fermer()}>
          <div class="sheet-head">
            <h2 id="methode-titre" class="section-title">{variante === "a" ? "Matière et méthode" : "Choisis ta matière"}</h2>
            <button type="button" class="icon-btn" onClick={fermer} aria-label="Fermer"><Icon name="close" /></button>
          </div>
          <div class="sheet-body">{contenu}</div>
        </dialog>
      )}
    </>
  );
}
