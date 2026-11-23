import { useEffect, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { LockPanel } from "../components/LockPanel";
import { adresseComposa, useCodesAffiches, useLimiteDevoirs } from "../lib/composa";

/**
 * Espace « Devoirs » : COMPOSA, la plateforme de devoirs en ligne du professeur, dans Litterae.
 * L'élève y entre le code donné par son professeur, compose et retrouve ses notes.
 * Sans clé, un nombre limité de devoirs (réglé dans le tableau de bord) ; les devoirs déjà faits restent ouverts.
 */
export function ComposaScreen({ params }: { params: URLSearchParams }) {
  const salle = params.get("salle"), code = params.get("code");
  const affiches = useCodesAffiches();
  const { peutOuvrir, limite, premium } = useLimiteDevoirs();
  // Un code affiché sur l'accueil correspond à un devoir connu : déjà fait, il reste ouvert.
  const cible = salle ?? affiches.find(d => d.code === code)?.id ?? null;
  const ouvert = premium || peutOuvrir(cible);
  // L'adresse est fixée à l'ouverture : changer d'écran dans COMPOSA ne recharge pas le cadre.
  const [src] = useState(() => adresseComposa(salle, code, params.get("vue")));
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    if (!ouvert) return;
    document.documentElement.dataset.univers = "composa";
    return () => { delete document.documentElement.dataset.univers; };
  }, [ouvert]);
  if (!ouvert) return (
    <Page title="Devoirs" back="#/accueil">
      <LockPanel reason={limite === 0 ? "Les devoirs en ligne sont réservés à l'accès complet" : `Tu as fait tes ${limite} devoir${limite > 1 ? "s" : ""} gratuit${limite > 1 ? "s" : ""}`}
        contenu="Avec l'accès complet, tu fais tous les devoirs de ton professeur dans Litterae, et tu retrouves tes notes et tes corrections." />
    </Page>
  );
  return (
    <Page title="Devoirs" back="#/accueil">
      <h1 class="sr-only">Devoirs de ton professeur</h1>
      {!charge && <p class="composa-attente" role="status">Ouverture de tes devoirs…</p>}
      <iframe class="composa-cadre" src={src} title="Devoirs de ton professeur (COMPOSA)"
        allow="fullscreen; clipboard-write" referrerpolicy="strict-origin" onLoad={() => setCharge(true)} />
    </Page>
  );
}
