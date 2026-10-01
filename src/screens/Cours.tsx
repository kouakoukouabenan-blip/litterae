import { LECONS } from "../lib/lecons";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { useStored } from "../lib/storage";
import { lienContact } from "../lib/contact";

const OUTILS = [
  ["dictionnaire", "Dictionnaire", "Le sens des mots qu'on trouve dans les sujets", "search"],
  ["formules", "Formules", "Phrases modèles pour l'introduction, la transition, la conclusion", "content_copy"],
  ["vocabulaire", "Vocabulaire", "Connecteurs logiques et mots de l'orientation", "menu_book"]
] as const;

const MINUTES = LECONS.reduce((n, l) => n + (parseInt(l.duree) || 0), 0);

/** Les leçons de méthode, dans l'ordre. */
export function CoursScreen() {
  const [lues] = useStored<string[]>("lecons-lues", []);
  const nbLues = LECONS.filter(l => lues.includes(l.id)).length;

  return (
    <Page>
      <header class="page-header">
        <h1 class="page-title">Cours</h1>
        <p class="lede">{nbLues === 0 ? `${LECONS.length} leçons courtes (${MINUTES} min), chacune avec son quiz.` : `${nbLues} leçon${nbLues > 1 ? "s" : ""} lue${nbLues > 1 ? "s" : ""} sur ${LECONS.length}.`}</p>
        {nbLues > 0 && <span class="progress-bar cours-progression" aria-hidden="true"><span style={{ width: `${(nbLues / LECONS.length) * 100}%` }} /></span>}
      </header>

      <h2 class="section-title cours-section">Les leçons</h2>
      <ol class="list" aria-label="Leçons">
        {LECONS.map((l, i) => {
          const lue = lues.includes(l.id);
          return (
            <li key={l.id}>
              <a class="row" href={`#/cours/${l.id}`}>
                <span class={`step-num ${lue ? "done" : ""}`} aria-hidden="true">{lue ? <Icon name="check" size={18} /> : i + 1}</span>
                <span class="row-body">
                  <span class="row-title">{l.titre}</span>
                  <span class="meta">{l.duree}{lue ? " · lue" : ""}{l.payante ? " · accès complet" : ""}</span>
                </span>
                <Icon name="chevron_right" />
              </a>
            </li>
          );
        })}
      </ol>
      <p class="signaler">Une leçon te manque ? <a href={lienContact("lecon")}>Propose-la</a></p>

      {/* Ce qui sert pendant la rédaction, rangé avec la méthode. */}
      <h2 class="section-title cours-section">La boîte à outils</h2>
      <ul class="list" aria-label="Boîte à outils">
        {OUTILS.map(([vue, titre, detail, icone]) => (
          <li key={vue}>
            <a class="row" href={`#/outils?vue=${vue}`}>
              <span class="outil-icone" aria-hidden="true"><Icon name={icone} size={20} /></span>
              <span class="row-body"><span class="row-title">{titre}</span><span class="meta">{detail}</span></span>
              <Icon name="chevron_right" />
            </a>
          </li>
        ))}
      </ul>
    </Page>
  );
}
