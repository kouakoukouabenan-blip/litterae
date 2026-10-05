import { LECONS } from "../lib/lecons";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { useStored } from "../lib/storage";
import { lienContact } from "../lib/contact";
import { CoursOnglets } from "../components/SujetsOnglets";
import { LECONS_GRATUITES, useAccesLecons } from "../lib/lecons-libres";
import { AchatLien } from "../components/Achat";
import { plural } from "../lib/text";

const MINUTES = LECONS.reduce((n, l) => n + (parseInt(l.duree) || 0), 0);

/** Les leçons de méthode, dans l'ordre. */
export function CoursScreen() {
  const [lues] = useStored<string[]>("lecons-lues", []);
  const nbLues = LECONS.filter(l => lues.includes(l.id)).length;
  const acces = useAccesLecons();

  return (
    <Page>
      <CoursOnglets actif="lecons" />
      <header class="page-header">
        <h1 class="page-title">La méthode</h1>
        <p class="lede">{nbLues === 0 ? `${LECONS.length} leçons courtes (${MINUTES} min), chacune avec son quiz.` : `${nbLues} leçon${nbLues > 1 ? "s" : ""} lue${nbLues > 1 ? "s" : ""} sur ${LECONS.length}.`}</p>
        {nbLues > 0 && <span class="progress-bar cours-progression" aria-hidden="true"><span style={{ width: `${(nbLues / LECONS.length) * 100}%` }} /></span>}
      </header>

      {!acces.premium && LECONS.length > LECONS_GRATUITES && (
        <p class="quota">
          {acces.restantes > 0 && <span class="muted quota-texte">{plural(acces.restantes, "leçon gratuite", "leçons gratuites")} à lire</span>}
          <AchatLien label="Tout débloquer" />
        </p>
      )}

      <ol class="list" aria-label="Leçons">
        {LECONS.map((l, i) => {
          const lue = lues.includes(l.id);
          const fermee = !acces.peutLire(l.id);
          return (
            <li key={l.id}>
              <a class="row" href={`#/cours/${l.id}`}>
                <span class={`step-num ${lue ? "done" : ""}`} aria-hidden="true">{lue ? <Icon name="check" size={18} /> : i + 1}</span>
                <span class="row-body">
                  <span class="row-title">{l.titre}</span>
                  <span class="meta">{l.duree}{lue ? " · lue" : ""}</span>
                </span>
                {fermee ? <span class="row-lock" title="Accès complet"><Icon name="lock" size={18} /><span class="sr-only">Réservée à l'accès complet</span></span> : <Icon name="chevron_right" />}
              </a>
            </li>
          );
        })}
      </ol>
      <p class="signaler">Une leçon te manque ? <a href={lienContact("lecon")}>Propose-la</a></p>

    </Page>
  );
}
