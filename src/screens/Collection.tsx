import { useMemo } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { EmptyState } from "../components/EmptyState";
import { TOUS_LES_PAYS, paysDecouverts } from "../lib/fil";
import { TOUS_LES_AUTEURS, auteursDebloques, badgeGagne, badges, carteAuteur, initialiserCollection } from "../lib/collection";

/** Ma collection : les badges et les cartes d'auteurs débloquées en lisant les fiches. */
export function CollectionScreen() {
  const { liste, cartes } = useMemo(() => {
    initialiserCollection();
    const a = auteursDebloques();
    return {
      liste: badges(),
      cartes: Object.entries(a).sort((x, y) => y[1].d - x[1].d).map(([nom]) => carteAuteur(nom))
    };
  }, []);
  const gagnes = liste.filter(badgeGagne);
  const pays = new Set(paysDecouverts());
  return (
    <Page title="Ma collection" back="#/carnet">
      <PageHeader title="Ma collection" compact>{cartes.length} auteur{cartes.length > 1 ? "s" : ""} sur {TOUS_LES_AUTEURS.length} · {gagnes.length} badge{gagnes.length > 1 ? "s" : ""} sur {liste.length}</PageHeader>

      <section>
        <h2 class="section-title">Badges</h2>
        <ul class="badges">
          {liste.map(b => {
            const ok = badgeGagne(b);
            return (
              <li key={b.id} class={`badge-carte${ok ? " gagne" : ""}`}>
                <span class="badge-icone" aria-hidden="true"><Icon name={ok ? "emoji_events" : "lock"} size={22} /></span>
                <span class="badge-nom">{b.nom}</span>
                <span class="badge-texte">{b.texte}</span>
                {!ok && <span class="progress-bar" aria-label={`${b.valeur} sur ${b.objectif}`}><span style={{ width: `${Math.min(100, (b.valeur / b.objectif) * 100)}%` }} /></span>}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 class="section-title">Tour du monde littéraire</h2>
        <p class="small muted">{pays.size} pays découvert{pays.size > 1 ? "s" : ""} sur {TOUS_LES_PAYS.length}. Réponds aux cartes « Tour du monde » pour en découvrir d'autres.</p>
        {pays.size > 0 && <ul class="pays-liste">{TOUS_LES_PAYS.filter(p => pays.has(p)).map(p => <li key={p}>{p}</li>)}</ul>}
      </section>

      <section>
        <h2 class="section-title">Cartes d'auteurs</h2>
        {cartes.length ? (
          <ul class="auteurs-cartes">
            {cartes.map(c => (
              <li key={c.nom} class="auteur-carte">
                <span class="auteur-initiale" aria-hidden="true">{c.nom.split(" ").pop()?.charAt(0)}</span>
                <span class="auteur-nom">{c.nom}{c.bonus && <span class="fil-nouveau">Bonus</span>}</span>
                <span class="meta">{[c.pays, `${c.lues} œuvre${c.lues > 1 ? "s" : ""} lue${c.lues > 1 ? "s" : ""} sur ${c.oeuvres.length}`].filter(Boolean).join(" · ")}</span>
                {c.oeuvres[0] && <a class="auteur-lien" href={`#/oeuvres?q=${encodeURIComponent(c.nom)}`}>Ses œuvres</a>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucune carte pour l'instant">Chaque fiche d'œuvre que tu lis ajoute la carte de son auteur ici.</EmptyState>
        )}
      </section>
    </Page>
  );
}
