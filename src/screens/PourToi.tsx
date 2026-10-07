import { Page } from "../components/Page";
import { Suggestions } from "../components/Suggestions";

/** Le fil « Pour toi » en entier : l'accueil n'en montre qu'une carte. */
export function PourToiScreen() {
  return (
    <Page title="Pour toi" back="#/accueil">
      <Suggestions />
    </Page>
  );
}
