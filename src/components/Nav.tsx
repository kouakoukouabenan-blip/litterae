import { useRoute } from "../lib/router";
import { Icon } from "./Icon";
import { useQuestions } from "../lib/contact";

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
  { section: "sujets", label: "Sujets", icon: "history_edu" },
  { section: "oeuvres", label: "Œuvres", icon: "local_library" },
  // Sur téléphone, la boîte à outils s'ouvre depuis l'accueil (tuile Dictionnaire) : quatre onglets suffisent.
  { section: "outils", label: "Outils", long: "Boîte à outils", icon: "inventory_2", ordinateur: true }
] as const;

function useSection() {
  const section = useRoute().path[0] ?? "accueil";
  // Les sujets d'entraînement sont le second onglet de Sujets.
  return section === "entrainement" ? "sujets" : section;
}

/** Onglets dans la barre du haut, sur tablette et ordinateur. */
export function NavTabs() {
  const current = useSection();
  return (
    <nav class="nav-tabs" aria-label="Navigation principale">
      {ITEMS.map(i => (
        <a key={i.section} href={`#/${i.section}`} class="nav-tab" aria-current={current === i.section ? "page" : undefined}>
          {"long" in i ? i.long : i.label}
        </a>
      ))}
    </nav>
  );
}

/** Barre du bas, sur téléphone. */
export function BottomNav() {
  const current = useSection();
  return (
    <nav class="bottom-nav" aria-label="Navigation principale">
      {ITEMS.filter(i => !("ordinateur" in i)).map(i => {
        const active = current === i.section;
        return (
          <a key={i.section} href={`#/${i.section}`} class="bottom-nav-item" aria-current={active ? "page" : undefined}>
            <span class="bottom-nav-icone"><Icon name={i.icon} filled={active} /></span>
            <span>{i.label}</span>
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
