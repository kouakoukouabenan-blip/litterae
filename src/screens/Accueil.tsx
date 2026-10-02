import { LECONS } from "../lib/lecons";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { InstallBanner } from "../components/Install";
import { Annonces, InvitationNotifs } from "../components/Annonces";
import { useStored } from "../lib/storage";
import { OEUVRES, SUJETS } from "../lib/data";
import { ReponseAlerte } from "../components/ReponseAlerte";
import { useState } from "preact/hooks";
import { href } from "../lib/router";

/** Écran d'accueil : la recherche d'œuvres, puis les autres choses que l'élève vient faire. Les leçons ont leur propre écran (Cours). */
export function AccueilScreen() {
  const [lues] = useStored<string[]>("lecons-lues", []);
  const suivante = LECONS.find(l => !lues.includes(l.id));
  const nbLues = LECONS.filter(l => lues.includes(l.id)).length;
  const [q, setQ] = useState("");

  return (
    <Page>
      <header class="home-header">
        <p class="eyebrow">La dissertation littéraire, pas à pas</p>
        <h1 class="home-title">Que veux-tu faire ?</h1>
      </header>

      {/* La recherche d'exemples d'abord : c'est ce que cherche l'élève qui a une dissertation à rendre. */}
      <form class="accueil-recherche" role="search" onSubmit={e => { e.preventDefault(); location.hash = href(["oeuvres"], q.trim() ? { q: q.trim() } : undefined); }}>
        <label class="field">
          <Icon name="search" />
          <span class="sr-only">Chercher des exemples</span>
          <input type="search" value={q} placeholder="Titre, auteur, thème, pays…" enterkeyhint="search" autocomplete="off"
            onInput={e => setQ((e.target as HTMLInputElement).value)} />
        </label>
        <button type="submit" class="btn btn-primary">Chercher le livre</button>
      </form>
      <p class="accueil-astuce">Cherche une illustration par thème, auteur, titre ou argument parmi {OEUVRES.length} fiches d'œuvres.</p>

      <nav class="choix" aria-label="Que veux-tu faire ?">
        <a class="choix-carte choix-methode" href={suivante && nbLues > 0 ? `#/cours/${suivante.id}` : "#/cours"}>
          <Icon name="menu_book" size={24} />
          <span class="choix-titre">{nbLues === 0 ? "Apprendre la méthode" : suivante ? "Continuer la méthode" : "Revoir la méthode"}</span>
          <span class="choix-detail">{nbLues === 0 ? `${LECONS.length} leçons courtes` : suivante ? `Reprendre à la leçon ${LECONS.indexOf(suivante) + 1}` : `${LECONS.length} leçons lues`}</span>
          {nbLues > 0 && <span class="progress-bar" aria-hidden="true"><span style={{ width: `${(nbLues / LECONS.length) * 100}%` }} /></span>}
        </a>
        <a class="choix-carte choix-corriges" href="#/sujets">
          <Icon name="history_edu" size={24} />
          <span class="choix-titre">Sujets corrigés</span>
          <span class="choix-detail">{SUJETS.length} copies modèles</span>
        </a>
        <a class="choix-carte choix-entrainer" href="#/entrainement">
          <Icon name="edit" size={24} />
          <span class="choix-titre">M'entraîner</span>
          <span class="choix-detail">{SUJETS.length} sujets type bac</span>
        </a>
        <a class="choix-carte choix-outils" href="#/outils">
          <Icon name="inventory_2" size={24} />
          <span class="choix-titre">Boîte à outils</span>
          <span class="choix-detail">Dictionnaire, formules, vocabulaire</span>
        </a>
      </nav>

      <ReponseAlerte />
      <Annonces />
      <InstallBanner />
      <InvitationNotifs />
    </Page>
  );
}
