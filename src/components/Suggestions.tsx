import { Texte } from "./Texte";
import { useMemo } from "preact/hooks";
import { decouvertes, prochaineAction, suggestions } from "../lib/suggestions";
import { Icon } from "./Icon";
import { Flamme } from "./Flamme";
import { OBJECTIF_DU_JOUR, recompenseVue, useBilan } from "../lib/progres";

/** « Pour toi » sur l'accueil : trois suggestions au plus, tirées de ce que l'élève a fait sur ce téléphone. */
export function Suggestions() {
  // La première suggestion est déjà en tête de l'accueil (« Ta prochaine action ») : deux autres ici.
  // Rien encore sur ce téléphone : des portes d'entrée à la place.
  const liste = useMemo(() => {
    const p = prochaineAction().cle;
    return [...suggestions(), ...decouvertes()].filter(s => !s.horsAccueil && s.cle !== p).slice(0, 2);
  }, []);
  const b = useBilan();
  if (!liste.length && !b.serie) return null;
  const faites = Math.min(b.faitesAujourdhui, OBJECTIF_DU_JOUR);
  return (
    <section class="pour-toi" aria-labelledby="pour-toi-titre">
      <div class="pour-toi-tete">
        <h2 id="pour-toi-titre" class="pour-toi-titre">Pour toi</h2>
        {/* Série et objectif du jour : le détail est sur « Ma progression ». */}
        <a class="pour-toi-serie" href="#/progres" aria-label={`Ma progression : série de ${b.serie} jour${b.serie > 1 ? "s" : ""}, objectif du jour ${faites} sur ${OBJECTIF_DU_JOUR}`}>
          {b.serie > 0 && <span class="serie-badge"><Flamme taille={14} />{b.serie} j</span>}
          <span class="objectif-points" aria-hidden="true">
            {Array.from({ length: OBJECTIF_DU_JOUR }, (_, i) => <span key={i} class={i < faites ? "fait" : ""} />)}
          </span>
          <span class="pour-toi-lien">Ma progression</span>
          <Icon name="chevron_right" size={18} />
        </a>
      </div>
      {liste.length > 0 && <ul class="pour-toi-liste">
        {liste.map(s => (
          <li key={s.cle}>
            <a class="pour-toi-ligne" href={s.lien}>
              <span class="pour-toi-icone" aria-hidden="true"><Icon name={s.icone} size={20} /></span>
              <span class="pour-toi-texte">
                <span class="pour-toi-nom"><Texte text={s.titre} /></span>
                <span class="pour-toi-detail"><Texte text={s.detail} /></span>
              </span>
              <Icon name="chevron_right" size={20} />
            </a>
          </li>
        ))}
      </ul>}
    </section>
  );
}

/** « Ta prochaine action » : un seul gros bouton en tête de l'accueil, la chose la plus utile à faire maintenant. */
export function ProchaineAction() {
  const a = useMemo(() => prochaineAction(), []);
  const recompense = a.cle === "recompense";
  return (
    <a class={`prochaine${recompense ? " prochaine-recompense" : ""}`} href={a.lien} onClick={() => { if (recompense) recompenseVue(); }}>
      <span class="prochaine-icone" aria-hidden="true">{recompense ? <Flamme taille={22} /> : <Icon name={a.icone} size={22} />}</span>
      <span class="prochaine-texte">
        <span class="prochaine-etiquette">Ta prochaine action</span>
        <span class="prochaine-titre"><Texte text={a.titre} /></span>
        <span class="prochaine-detail"><Texte text={a.detail} /></span>
      </span>
      <Icon name="arrow_forward" size={22} />
    </a>
  );
}
