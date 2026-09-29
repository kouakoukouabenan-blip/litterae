import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { WorkItem } from "../components/WorkItem";
import { oeuvre } from "../lib/data";
import { useNotes, useSaved } from "../lib/carnet";
import type { Oeuvre } from "../data/types";
import { Icon } from "../components/Icon";
import { licence } from "../lib/licence";
import { AchatLien } from "../components/Achat";
import { PRICE } from "../lib/access";

export function CarnetScreen() {
  const { saved } = useSaved();
  const { notes } = useNotes();
  const enregistrees = saved.map(oeuvre).filter((w): w is Oeuvre => !!w);
  const annotees = Object.keys(notes).filter(id => !saved.includes(id)).map(oeuvre).filter((w): w is Oeuvre => !!w);

  return (
    <Page>
      <PageHeader eyebrow="Sur cet appareil" title="Mon carnet">
        Les œuvres que tu as enregistrées et tes notes, prêtes pour le prochain devoir.
      </PageHeader>

      <a class="row access-row" href="#/acces">
        <Icon name="lock" size={20} />
        <span class="row-body">
          <span class="row-title">{licence() ? "Accès complet actif" : "Accès complet"}</span>
          <span class="meta">{licence() ? "Voir ma clé d'accès" : "Saisir ma clé ou acheter l'accès"}</span>
        </span>
        <Icon name="chevron_right" />
      </a>
      {!licence() && <p class="small muted access-buy">Pas encore de clé ? <AchatLien label={`Acheter l'accès complet, ${PRICE}`} /></p>}

      {!enregistrees.length && !annotees.length ? (
        <EmptyState title="Ton carnet est vide.">
          <p>Sur la fiche d'une œuvre, touche « Enregistrer » ou écris une note : elle apparaîtra ici.</p>
          <a class="btn btn-primary" href="#/oeuvres">Chercher une œuvre</a>
        </EmptyState>
      ) : (
        <div class="reading reading-left">
          {enregistrees.length > 0 && (
            <section aria-labelledby="c-saved">
              <h2 id="c-saved" class="section-title">Œuvres enregistrées <span class="muted">({enregistrees.length})</span></h2>
              <ul class="works">{enregistrees.map(w => <li key={w.id}><WorkItem w={w} note={notes[w.id]} /></li>)}</ul>
            </section>
          )}
          {annotees.length > 0 && (
            <section aria-labelledby="c-notes">
              <h2 id="c-notes" class="section-title">Autres œuvres annotées <span class="muted">({annotees.length})</span></h2>
              <ul class="works">{annotees.map(w => <li key={w.id}><WorkItem w={w} note={notes[w.id]} /></li>)}</ul>
            </section>
          )}
          <p class="small muted">Le carnet est gardé dans ce navigateur. Si tu effaces les données du navigateur, il sera perdu.</p>
        </div>
      )}
    </Page>
  );
}
