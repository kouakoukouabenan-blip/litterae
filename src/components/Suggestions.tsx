import { useMemo } from "preact/hooks";
import { suggestions } from "../lib/suggestions";
import { Icon } from "./Icon";
import { OBJECTIF_DU_JOUR, useBilan } from "../lib/progres";

/** « Pour toi » sur l'accueil : trois suggestions au plus, tirées de ce que l'élève a fait sur ce téléphone. */
export function Suggestions() {
  const liste = useMemo(() => suggestions().filter(s => !s.horsAccueil).slice(0, 3), []);
  const b = useBilan();
  if (!liste.length) return null;
  const faites = Math.min(b.faitesAujourdhui, OBJECTIF_DU_JOUR);
  return (
    <section class="pour-toi" aria-labelledby="pour-toi-titre">
      <div class="pour-toi-tete">
        <h2 id="pour-toi-titre" class="pour-toi-titre">Pour toi</h2>
        {/* Série et objectif du jour : le détail est sur « Ma progression ». */}
        <a class="pour-toi-serie" href="#/progres" aria-label={`Ma progression : série de ${b.serie} jour${b.serie > 1 ? "s" : ""}, objectif du jour ${faites} sur ${OBJECTIF_DU_JOUR}`}>
          {b.serie > 0 && <span class="serie-badge">{b.serie} j</span>}
          <span class="objectif-points" aria-hidden="true">
            {Array.from({ length: OBJECTIF_DU_JOUR }, (_, i) => <span key={i} class={i < faites ? "fait" : ""} />)}
          </span>
          <span class="pour-toi-lien">Ma progression</span>
          <Icon name="chevron_right" size={18} />
        </a>
      </div>
      <ul class="pour-toi-liste">
        {liste.map(s => (
          <li key={s.cle}>
            <a class="pour-toi-ligne" href={s.lien}>
              <span class="pour-toi-icone" aria-hidden="true"><Icon name={s.icone} size={20} /></span>
              <span class="pour-toi-texte">
                <span class="pour-toi-nom">{s.titre}</span>
                <span class="pour-toi-detail">{s.detail}</span>
              </span>
              <Icon name="chevron_right" size={20} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
