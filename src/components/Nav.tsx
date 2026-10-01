import { useRoute } from "../lib/router";
import { Icon } from "./Icon";
import { useQuestions } from "../lib/contact";

/** Pastille sur « Mon espace » quand l'auteur a répondu à une question. */
function Pastille({ section }: { section: string }) {
  const { nouvellesReponses } = useQuestions();
  if (section !== "carnet" || !nouvellesReponses) return null;
  return <span class="nav-pastille" aria-label={`${nouvellesReponses} nouvelle${nouvellesReponses > 1 ? "s" : ""} réponse${nouvellesReponses > 1 ? "s" : ""}`} />;
}

const ITEMS = [
  { section: "cours", label: "Cours", icon: "menu_book" },
  { section: "sujets", label: "Sujets", icon: "history_edu" },
  { section: "oeuvres", label: "Œuvres", icon: "local_library" },
  { section: "outils", label: "Outils", long: "Boîte à outils", icon: "inventory_2" },
  { section: "carnet", label: "Mon espace", icon: "person" }
] as const;

function useSection() {
  const section = useRoute().path[0] ?? "cours";
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
          {"long" in i ? i.long : i.label}<Pastille section={i.section} />
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
      {ITEMS.map(i => {
        const active = current === i.section;
        return (
          <a key={i.section} href={`#/${i.section}`} class="bottom-nav-item" aria-current={active ? "page" : undefined}>
            <span class="bottom-nav-icone"><Icon name={i.icon} filled={active} /><Pastille section={i.section} /></span>
            <span>{i.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
