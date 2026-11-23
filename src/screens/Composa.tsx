import { useEffect, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { adresseComposa } from "../lib/composa";

/**
 * Espace « Devoirs » : COMPOSA, la plateforme de devoirs en ligne du professeur, dans Litterae.
 * L'élève y entre le code donné par son professeur, compose et retrouve ses notes.
 */
export function ComposaScreen({ params }: { params: URLSearchParams }) {
  // L'adresse est fixée à l'ouverture : changer d'écran dans COMPOSA ne recharge pas le cadre.
  const [src] = useState(() => adresseComposa(params.get("salle"), params.get("code"), params.get("vue")));
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.univers = "composa";
    return () => { delete document.documentElement.dataset.univers; };
  }, []);
  return (
    <Page title="Devoirs" back="#/accueil">
      <h1 class="sr-only">Devoirs de ton professeur</h1>
      {!charge && <p class="composa-attente" role="status">Ouverture de tes devoirs…</p>}
      <iframe class="composa-cadre" src={src} title="Devoirs de ton professeur (COMPOSA)"
        allow="fullscreen; clipboard-write" referrerpolicy="strict-origin" onLoad={() => setCharge(true)} />
    </Page>
  );
}
