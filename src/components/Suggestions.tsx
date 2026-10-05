import { useMemo } from "preact/hooks";
import { suggestions } from "../lib/suggestions";
import { Icon } from "./Icon";

/** « Pour toi » sur l'accueil : trois suggestions au plus, tirées de ce que l'élève a fait sur ce téléphone. */
export function Suggestions() {
  const liste = useMemo(() => suggestions().filter(s => !s.horsAccueil).slice(0, 3), []);
  if (!liste.length) return null;
  return (
    <section class="pour-toi" aria-labelledby="pour-toi-titre">
      <h2 id="pour-toi-titre" class="pour-toi-titre">Pour toi</h2>
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
