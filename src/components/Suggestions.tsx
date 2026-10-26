import { Texte } from "./Texte";
import { useEffect, useMemo } from "preact/hooks";
import { suggestionOuverte, suggestionsVues } from "../lib/interets";
import { noter } from "../lib/stats";
import type { Suggestion } from "../lib/suggestions";

/** Compte, sans rien savoir de l'élève, les suggestions montrées (une fois par jour) et celles qui sont ouvertes. */
function montrees(liste: Suggestion[]) {
  const nouvelles = new Set(suggestionsVues(liste.map(s => s.cle)));
  for (const s of liste) if (s.type && nouvelles.has(s.cle)) noter({ t: "suggestion", ref: `vue:${s.type}` });
}
function ouverte(s: Suggestion) {
  suggestionOuverte(s.cle);
  if (s.type) noter({ t: "suggestion", ref: `clic:${s.type}` });
}
import { prochaineAction } from "../lib/suggestions";
import { marquerLue, ouvrirMessages, useAnnonces, type Annonce } from "../lib/annonces";
import { Fil } from "./Fil";
import { Icon } from "./Icon";
import { Flamme } from "./Flamme";
import { OBJECTIF_DU_JOUR, recompenseVue, useBilan } from "../lib/progres";

/** « Pour toi » sur l'accueil : le fil du jour (suggestions personnelles et cartes à jouer), sous la série et l'objectif du jour. */
export function Suggestions() {
  const b = useBilan();
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
      <Fil />
    </section>
  );
}

const ICONES_MESSAGE = { promo: "cadeau", message: "notifications", astuce: "lightbulb" } as const;
const NOMS_MESSAGE = { promo: "Promo", message: "Message", astuce: "Astuce" };

/** Message de l'éditeur mis en tête de l'accueil : même carte que « Ta prochaine action », qui appelle l'œil (halo, icône qui sonne) jusqu'à ce que l'élève la touche ou la ferme. */
function MessageEnTete({ a, clic }: { a: Annonce; clic: (id: number) => void }) {
  const lien = a.lien && /^(https:\/\/|#\/)/.test(a.lien) ? a.lien : null;
  return (
    <div class="prochaine-message">
      <a class="prochaine" href={lien ?? "#/accueil"} {...(lien?.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
        onClick={e => { if (lien) { clic(a.id); marquerLue(a.id); } else { e.preventDefault(); ouvrirMessages(a.id); } }}>
        <span class="prochaine-icone" aria-hidden="true"><Icon name={ICONES_MESSAGE[a.type] ?? "notifications"} size={22} /></span>
        <span class="prochaine-texte">
          <span class="prochaine-etiquette"><span class="prochaine-signal" aria-hidden="true" />{NOMS_MESSAGE[a.type] ?? "Message"}</span>
          <span class="prochaine-titre"><Texte text={a.titre} /></span>
          {a.texte && <span class="prochaine-detail prochaine-court"><Texte text={a.texte} /></span>}
          <span class="prochaine-suite">{lien ? a.lienTexte || "Voir" : "Lire le message"}<Icon name="arrow_forward" size={16} /></span>
        </span>
      </a>
      <button type="button" class="prochaine-fermer" onClick={() => marquerLue(a.id)} aria-label="Fermer ce message"><Icon name="close" size={20} /></button>
    </div>
  );
}

/** Commentaire composé : seulement le message mis en avant depuis le tableau de bord, s'il y en a un. */
export function MessageALaUne() {
  const { aLaUne, clic } = useAnnonces();
  return aLaUne ? <MessageEnTete a={aLaUne} clic={clic} /> : null;
}

/** En tête de l'accueil : le message mis en avant depuis le tableau de bord s'il y en a un, sinon « Ta prochaine action ». */
export function ProchaineAction() {
  const { aLaUne, clic } = useAnnonces();
  return aLaUne ? <MessageEnTete a={aLaUne} clic={clic} /> : <ActionDuJour />;
}

/** « Ta prochaine action » : un seul gros bouton en tête de l'accueil, la chose la plus utile à faire maintenant. */
function ActionDuJour() {
  const a = useMemo(() => prochaineAction(), []);
  const recompense = a.cle === "recompense";
  useEffect(() => { if (!recompense) montrees([a]); }, []);
  return (
    <a class={`prochaine${recompense ? " prochaine-recompense" : ""}`} href={a.lien} onClick={() => { if (recompense) recompenseVue(); else ouverte(a); }}>
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
