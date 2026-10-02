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
import { PRICE, useAccess } from "../lib/access";
import { useQuestions } from "../lib/contact";
import { OeuvresOnglets } from "../components/SujetsOnglets";

/** Accès aux messages : questions à l'auteur et réponses (accès complet), ou page Contact. */
function LigneMessages() {
  const { premium } = useAccess();
  const { nouvellesReponses, enAttente } = useQuestions();
  const detail = !premium ? "Une question, une proposition, une erreur à signaler"
    : nouvellesReponses ? `${nouvellesReponses} nouvelle${nouvellesReponses > 1 ? "s" : ""} réponse${nouvellesReponses > 1 ? "s" : ""} de l'auteur`
    : enAttente ? `${enAttente} question${enAttente > 1 ? "s" : ""} en attente de réponse`
    : "Pose une question, la réponse arrive ici";
  return (
    <a class="row access-row messages-row" href={premium ? "#/contact?vue=questions" : "#/contact"}>
      <Icon name="mail" size={20} />
      <span class="row-body">
        <span class="row-title">{premium ? "Mes questions à l'auteur" : "Écrire à l'auteur"}{nouvellesReponses > 0 && <span class="pastille">{nouvellesReponses}</span>}</span>
        <span class="meta">{detail}</span>
      </span>
      <Icon name="chevron_right" />
    </a>
  );
}

export function CarnetScreen() {
  return (
    <Page>
      <PageHeader title="Mon espace" compact />

      <a class="row access-row" href="#/acces">
        <Icon name="lock" size={20} />
        <span class="row-body">
          <span class="row-title">{licence() ? "Accès complet actif" : "Accès complet"}</span>
          <span class="meta">{licence() ? "Voir ma clé d'accès" : "Saisir ma clé ou acheter l'accès"}</span>
        </span>
        <Icon name="chevron_right" />
      </a>
      {!licence() && <p class="small muted access-buy">Pas encore de clé ? <AchatLien label={`Acheter l'accès complet, ${PRICE}`} /></p>}
      <LigneMessages />
    </Page>
  );
}

/** Onglet Œuvres, seconde partie : les fiches enregistrées et annotées. */
export function MesFichesScreen() {
  const { saved } = useSaved();
  const { notes } = useNotes();
  const enregistrees = saved.map(oeuvre).filter((w): w is Oeuvre => !!w);
  const annotees = Object.keys(notes).filter(id => !saved.includes(id)).map(oeuvre).filter((w): w is Oeuvre => !!w);

  return (
    <Page title="Mon carnet">
      <OeuvresOnglets actif="carnet" />
      <h1 class="sr-only">Mon carnet</h1>
      <p class="lede carnet-lede">Tes œuvres enregistrées et tes notes.</p>

      {!enregistrees.length && !annotees.length ? (
        <EmptyState title="Ton carnet est vide.">
          <p>Touche le marque-page en haut d'une fiche d'œuvre.</p>
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
          <p class="small muted">Gardé dans ce navigateur : effacer ses données l'efface aussi.</p>
        </div>
      )}
    </Page>
  );
}
