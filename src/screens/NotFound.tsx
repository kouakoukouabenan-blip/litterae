import { Page } from "../components/Page";
import { EmptyState } from "../components/EmptyState";

export function NotFound({ what = "Cette page n'existe pas.", back = "#/accueil" }: { what?: string; back?: string }) {
  return (
    <Page title="Introuvable" back={back}>
      <EmptyState title={what}>
        <p>Le lien est peut-être incomplet. <a href={back}>Revenir à la liste</a></p>
      </EmptyState>
    </Page>
  );
}
