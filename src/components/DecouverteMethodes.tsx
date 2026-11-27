import { useEffect, useRef, useState } from "preact/hooks";
import { MATIERES, METHODES, useMethode, type Methode } from "../lib/methodes";
import { write } from "../lib/storage";
import { useRoute } from "../lib/router";
import { choixAFaire, choixFait, repereAMontrer, repereVu } from "../lib/decouverte-methodes";
import { IconeMethode } from "./Marque";
import { animerMethode } from "./ChoixMethode";

const DESCRIPTION: Record<string, string> = {
  dissertation: "Comprendre un sujet, trouver des arguments, rédiger ta copie.",
  commentaire: "Lire un texte de près et rédiger ton commentaire.",
  resume: "Réduire un texte argumentatif en gardant ses idées."
};
const AVEC_ARTICLE: Record<string, string> = {
  dissertation: "la Dissertation littéraire",
  commentaire: "le Commentaire composé",
  resume: "le Résumé de texte argumentatif"
};

const surAccueil = () => ["", "#", "#/", "#/accueil"].includes(location.hash);

/** Tout premier lancement : l'élève choisit sa méthode avant d'entrer (seulement s'il arrive sur l'accueil). */
export function PremierChoix() {
  const [visible, setVisible] = useState(() => choixAFaire() && surAccueil());
  const [, choisir] = useMethode();
  if (!visible) return null;
  const prendre = (m: Methode) => {
    if (!m.prete) return;
    write("methode", m.id);
    choisir(m.id);
    choixFait();
    animerMethode(m);
    setVisible(false);
  };
  return (
    <div class="premier-choix" role="dialog" aria-modal="true" aria-labelledby="premier-choix-titre">
      <div class="premier-choix-inner">
        <p class="premier-choix-marque">Litter<span>ae</span></p>
        <h1 id="premier-choix-titre" class="premier-choix-titre">Que veux-tu travailler ?</h1>
        <p class="premier-choix-sous">Tu pourras changer quand tu veux.</p>
        {MATIERES.map(x => x.prete ? (
          <section key={x.id} class="premier-choix-matiere">
            <h2 class="premier-choix-matiere-nom">{x.nom}</h2>
            <ul class="premier-choix-liste">
              {METHODES.filter(m => m.matiere === x.id).map(m => (
                <li key={m.id}>
                  <button type="button" class={`premier-choix-carte ${m.prete ? "" : "is-bientot"}`} disabled={!m.prete}
                    style={{ "--m": m.couleur, "--m-fond": m.fond, "--m-encre": m.encre }} onClick={() => prendre(m)}>
                    <span class="premier-choix-icone"><IconeMethode id={m.id} /></span>
                    <span class="premier-choix-texte">
                      <strong>{m.nom}</strong>
                      <span>{m.prete ? DESCRIPTION[m.id] : "Bientôt dans Litterae"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p key={x.id} class="premier-choix-autre"><strong>{x.nom}</strong><span>Bientôt</span></p>
        ))}
      </div>
    </div>
  );
}

/** Quelque chose occupe déjà l'écran : le repère attend. */
const occupe = () => !!document.querySelector("#splash, .install-gate, .premier-choix, dialog[open], .transition-methode, .salle-entree, .menu-matiere-fond");

interface Position { top: number; right: number; fleche: number }

/**
 * Petit repère sous le bouton de méthode de la barre du haut : « Il y a aussi le Commentaire composé. »
 * Rien n'est assombri ; il disparaît au premier toucher, n'importe où.
 */
export function RepereMethode() {
  const { path } = useRoute();
  const section = path[0] ?? "accueil";
  const [active] = useMethode();
  const [pos, setPos] = useState<Position | null>(null);
  const bouton = useRef<HTMLElement | null>(null);
  // Juste après le tout premier choix, le repère suit.
  const [tour, setTour] = useState(0);
  useEffect(() => {
    const fn = () => setTour(n => n + 1);
    addEventListener("choix-methode-fait", fn);
    return () => removeEventListener("choix-methode-fait", fn);
  }, []);

  const placer = () => {
    const b = bouton.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const right = Math.max(12, innerWidth - r.right - 4);
    setPos({ top: r.bottom + 12, right, fleche: Math.max(14, innerWidth - (r.left + r.width / 2) - right - 8) });
  };
  const fermer = () => { bouton.current?.classList.remove("repere-actif"); bouton.current = null; setPos(null); };

  // Attend un écran libre sur l'accueil, puis montre le repère (jusqu'à 40 secondes d'attente).
  useEffect(() => {
    if (section !== "accueil" || pos || !repereAMontrer()) return;
    let essais = 0;
    const t = setInterval(() => {
      if (++essais > 50) return clearInterval(t);
      if (occupe() || document.visibilityState !== "visible") return;
      const b = document.querySelector<HTMLElement>(".topbar .methode-bouton");
      if (!b || !b.getBoundingClientRect().width) return;
      clearInterval(t);
      bouton.current = b;
      b.classList.add("repere-actif");
      repereVu();
      placer();
    }, 800);
    return () => clearInterval(t);
  }, [section, tour]);

  useEffect(() => {
    if (!pos) return;
    const toucher = () => fermer();
    // Le toucher qui ouvre le choix de méthode ferme aussi le repère.
    const t = setTimeout(() => document.addEventListener("pointerdown", toucher), 300);
    addEventListener("resize", placer);
    addEventListener("hashchange", toucher);
    return () => { clearTimeout(t); document.removeEventListener("pointerdown", toucher); removeEventListener("resize", placer); removeEventListener("hashchange", toucher); };
  }, [!!pos]);

  if (!pos) return null;
  const autres = METHODES.filter(m => m.prete && m.id !== active.id).map(m => AVEC_ARTICLE[m.id] ?? m.nom);
  return (
    <div class="repere-methode" role="status" style={{ top: `${pos.top}px`, right: `${pos.right}px`, "--fleche": `${pos.fleche}px` }}>
      <p><strong>Il y a aussi {autres.join(" et ")}.</strong> Touche ici pour changer de méthode.</p>
      <button type="button" class="repere-methode-ok" onClick={fermer}>Compris</button>
    </div>
  );
}
