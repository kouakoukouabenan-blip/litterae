import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { WorkItem } from "../components/WorkItem";
import { oeuvre } from "../lib/data";
import { useNotes, useSaved } from "../lib/carnet";
import type { Oeuvre } from "../data/types";
import { Icon } from "../components/Icon";
import { accesTermine, finAcces, licence, titulaire } from "../lib/licence";
import { AchatLien } from "../components/Achat";
import { PRICE, dateFin, joursAvant, useAccess } from "../lib/access";
import { useQuestions } from "../lib/contact";
import { OeuvresOnglets } from "../components/SujetsOnglets";
import { auteursDebloques, badgeGagne, badges } from "../lib/collection";
import { useDevoirs } from "../lib/devoirs";
import { surAncienneAdresse } from "../lib/passage";
import { ouvrirPassage } from "../components/Passage";
import { useState } from "preact/hooks";
import { ESSAI } from "../lib/site";
import { choisirIdentite, identiteActive, identiteChoisieIci, type Identite } from "../lib/identite";

/** Site d'essai : passer d'une identité visuelle à l'autre sur ce téléphone, pour comparer. */
function ChoixApparence() {
  const [actuelle, setActuelle] = useState<Identite>(identiteActive());
  const choisir = (id: Identite) => { choisirIdentite(id); setActuelle(id); };
  return (
    <section class="apparence" aria-labelledby="apparence-titre">
      <h2 id="apparence-titre" class="sub-title">Apparence (site d'essai)</h2>
      <div class="chips" role="group" aria-label="Identité visuelle">
        <button type="button" class="chip" aria-pressed={actuelle === "nouvelle-afrique"} onClick={() => choisir("nouvelle-afrique")}>Synthèse, couleurs d'Afrique</button>
        <button type="button" class="chip" aria-pressed={actuelle === "nouvelle"} onClick={() => choisir("nouvelle")}>Synthèse, indigo</button>
        <button type="button" class="chip" aria-pressed={actuelle === "ancienne"} onClick={() => choisir("ancienne")}>Ancien design</button>
      </div>
      {identiteChoisieIci() && <button type="button" class="link-btn" onClick={() => { choisirIdentite(null); setActuelle(identiteActive()); }}>Revenir au réglage général</button>}
    </section>
  );
}

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

/** Les devoirs gardés depuis « J'ai un devoir ». */
function LigneDevoirs() {
  const [devoirs] = useDevoirs();
  return (
    <a class="row access-row" href="#/devoirs">
      <Icon name="bookmarks" size={20} />
      <span class="row-body">
        <span class="row-title">Mes devoirs{devoirs.length > 0 && <span class="muted"> ({devoirs.length})</span>}</span>
        <span class="meta">{devoirs.length ? "Rouvrir un sujet gardé" : "Garde ici les sujets de tes devoirs"}</span>
      </span>
      <Icon name="chevron_right" />
    </a>
  );
}

function LigneCollection() {
  const n = Object.keys(auteursDebloques()).length;
  const gagnes = badges().filter(badgeGagne).length;
  return (
    <a class="row access-row" href="#/collection">
      <Icon name="style" size={20} />
      <span class="row-body">
        <span class="row-title">Ma collection</span>
        <span class="meta">{n} auteur{n > 1 ? "s" : ""} · {gagnes} badge{gagnes > 1 ? "s" : ""}</span>
      </span>
      <Icon name="chevron_right" />
    </a>
  );
}

export function CarnetScreen() {
  // Un mois avant la fin de l'accès, une ligne discrète propose de renouveler.
  const fin = finAcces(), termine = accesTermine();
  const bientot = fin !== null && joursAvant(fin) <= 30;
  return (
    <Page>
      <PageHeader title={titulaire() ? `Bonjour ${titulaire()!.prenom}` : "Mon espace"} compact />

      <a class="row access-row" href="#/acces">
        <Icon name="lock" size={20} />
        <span class="row-body">
          <span class="row-title">{licence() ? "Accès complet actif" : termine ? "Accès complet terminé" : "Accès complet"}</span>
          <span class="meta">{licence()
            ? (bientot ? `Jusqu'au ${dateFin(fin!)}` : titulaire() ? `Au nom de ${titulaire()!.nom}` : "Voir ma clé d'accès")
            : termine ? `Depuis le ${dateFin(termine.fin)}` : "Saisir ma clé ou acheter l'accès"}</span>
        </span>
        <Icon name="chevron_right" />
      </a>
      {bientot && <p class="small muted access-buy">Ton accès se termine bientôt. <AchatLien label={`Renouveler, ${PRICE}`} /></p>}
      {!licence() && <p class="small muted access-buy">{termine ? <AchatLien label={`Renouveler l'accès complet, ${PRICE}`} /> : <>Pas encore de clé ? <AchatLien label={`Acheter l'accès complet, ${PRICE}`} /></>}</p>}
      <a class="row access-row" href="#/progres">
        <Icon name="history_edu" size={20} />
        <span class="row-body">
          <span class="row-title">Ma progression</span>
          <span class="meta">Série de jours, révisions, défi du jour, niveau par étape</span>
        </span>
        <Icon name="chevron_right" />
      </a>
      <LigneDevoirs />
      <LigneCollection />
      <LigneMessages />
      {surAncienneAdresse() && (
        <button type="button" class="row access-row" onClick={ouvrirPassage}>
          <Icon name="arrow_forward" size={20} />
          <span class="row-body">
            <span class="row-title">Passer à la nouvelle adresse</span>
            <span class="meta">litterae.app, avec ta clé et ta progression</span>
          </span>
          <Icon name="chevron_right" />
        </button>
      )}
      {ESSAI && <ChoixApparence />}
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
