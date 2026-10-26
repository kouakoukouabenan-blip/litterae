import { useRoute } from "../lib/router";
import { read, write } from "../lib/storage";
import { Icon } from "./Icon";
import { useQuestions } from "../lib/contact";
import { useMethode } from "../lib/methodes";

/** Pastille sur « Mon espace » quand l'auteur a répondu à une question. */
function Pastille() {
  const { nouvellesReponses } = useQuestions();
  if (!nouvellesReponses) return null;
  return <span class="nav-pastille" aria-label={`${nouvellesReponses} nouvelle${nouvellesReponses > 1 ? "s" : ""} réponse${nouvellesReponses > 1 ? "s" : ""}`} />;
}

// « Mon espace » est l'icône de profil en haut à droite (EspaceBouton), pour laisser la place à l'accueil.
const ITEMS = [
  { section: "accueil", label: "Accueil", icon: "home" },
  { section: "cours", label: "Cours", icon: "menu_book" },
  { section: "sujets", label: "Sujets", icon: "history_edu", lien: "entrainement" },
  { section: "oeuvres", label: "Œuvres", icon: "local_library" }
] as const;

/** Pages à deux onglets : l'onglet de la barre du bas qui les regroupe. */
const DOUBLES: Record<string, string> = { cours: "cours", outils: "cours", entrainement: "sujets", sujets: "sujets", devoir: "sujets", oeuvres: "oeuvres", "mes-fiches": "oeuvres" };

/**
 * Retient le dernier des deux onglets ouvert dans chaque partie (et la rubrique de la boîte à outils),
 * pour y revenir en touchant la barre du bas. Renvoie l'adresse à ouvrir pour chaque partie.
 */
function useDerniersOnglets() {
  const { path, params } = useRoute();
  const partie = path.length === 1 ? DOUBLES[path[0]] : undefined;
  if (partie) {
    const vue = path[0] === "outils" ? params.get("vue") : null;
    const adresse = vue ? `outils?vue=${vue}` : path[0];
    if (read(`onglet-${partie}`, "") !== adresse) write(`onglet-${partie}`, adresse);
  }
  const [methode] = useMethode();
  if (path[0] === "cc" && path.length === 2) {
    const partieCC = path[1] === "cours" || path[1] === "outils" || path[1] === "figures" ? "cours" : path[1] === "genres" || path[1] === "tonalites" ? "genres" : "sujets";
    const adresseCC = `cc/${path[1]}`;
    if (read(`onglet-cc-${partieCC}`, "") !== adresseCC) write(`onglet-cc-${partieCC}`, adresseCC);
  }
  // Commentaire composé : la barre du bas mène à ses propres leçons et sujets.
  if (methode.id === "commentaire") return (i: (typeof ITEMS)[number]) =>
    i.section === "cours" ? `#/${read("onglet-cc-cours", "cc/cours")}` : i.section === "sujets" ? `#/${read("onglet-cc-sujets", "cc/corriges")}` : i.section === "oeuvres" ? `#/${read("onglet-cc-genres", "cc/genres")}` : `#/${read(`onglet-${i.section}`, i.section)}`;
  return (i: (typeof ITEMS)[number]) => `#/${read(`onglet-${i.section}`, "lien" in i ? i.lien : i.section)}`;
}

/** Commentaire composé : l'onglet Œuvres devient Genres (genres littéraires et tonalités). */
function useLibelle() {
  const [methode] = useMethode();
  return (i: (typeof ITEMS)[number]) => methode.id === "commentaire" && i.section === "oeuvres" ? { label: "Genres", icon: "account_tree" as const } : i;
}

function useSection() {
  const [premier, second] = useRoute().path;
  // Commentaire composé : les leçons et outils vont avec Cours, les corrigés et l'entraînement avec Sujets.
  if (premier === "cc") return second === "cours" || second === "outils" || second === "figures" ? "cours" : second === "corriges" || second === "entrainement" || second === "atelier" ? "sujets" : second === "genres" || second === "tonalites" ? "oeuvres" : "accueil";
  const section = premier ?? "accueil";
  // Les sujets d'entraînement et « J'ai un devoir » sont des onglets de Sujets ; la boîte à outils se range avec le cours.
  return ["defi", "revisions", "progres"].includes(section) ? "accueil" : section === "entrainement" || section === "devoir" ? "sujets" : section === "outils" ? "cours" : section === "mes-fiches" ? "oeuvres" : section;
}

/** Onglets dans la barre du haut, sur tablette et ordinateur. */
export function NavTabs() {
  const current = useSection();
  const lien = useDerniersOnglets();
  const libelle = useLibelle();
  return (
    <nav class="nav-tabs" aria-label="Navigation principale">
      {ITEMS.map(i => (
        <a key={i.section} href={lien(i)} class="nav-tab" aria-current={current === i.section ? "page" : undefined}>
          {libelle(i).label}
        </a>
      ))}
    </nav>
  );
}

/** Barre du bas, sur téléphone. */
export function BottomNav() {
  const current = useSection();
  const lien = useDerniersOnglets();
  const libelle = useLibelle();
  return (
    <nav class="bottom-nav" aria-label="Navigation principale">
      {ITEMS.map(i => {
        const active = current === i.section;
        return (
          <a key={i.section} href={lien(i)} class="bottom-nav-item" aria-current={active ? "page" : undefined}>
            <span class="bottom-nav-icone"><Icon name={libelle(i).icon} filled={active} /></span>
            <span>{libelle(i).label}</span>
          </a>
        );
      })}
    </nav>
  );
}

/** « Mon espace » (clé d'accès, carnet, questions à l'auteur) : icône de profil dans la barre du haut. */
export function EspaceBouton({ detail }: { detail?: boolean }) {
  const actif = useSection() === "carnet";
  return (
    <a class={`icon-btn espace-btn${detail ? " espace-detail" : ""}`} href="#/carnet" aria-label="Mon espace" aria-current={actif ? "page" : undefined}>
      <Icon name="person" filled={actif} /><Pastille />
    </a>
  );
}
