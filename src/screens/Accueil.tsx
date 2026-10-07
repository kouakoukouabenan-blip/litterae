import { LECONS } from "../lib/lecons";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { InstallBanner } from "../components/Install";
import { Annonces, InvitationNotifs } from "../components/Annonces";
import { useStored, write } from "../lib/storage";
import { OEUVRES, SUJETS } from "../lib/data";
import { ReponseAlerte } from "../components/ReponseAlerte";
import { ProchaineAction, Suggestions } from "../components/Suggestions";
import { sujetsEntrainement } from "../lib/entrainement";
import { useState } from "preact/hooks";
import { href } from "../lib/router";

/** Détail d'une case : version courte sur téléphone, où les cases sont étroites. */
const Detail = ({ long, court }: { long: string; court: string }) => (
  <span class="choix-detail"><span class="detail-long">{long}</span><span class="detail-court">{court}</span></span>
);

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

      <ProchaineAction />

      {/* La recherche d'exemples d'abord : c'est ce que cherche l'élève qui a une dissertation à rendre. */}
      <form class="accueil-recherche" role="search" onSubmit={e => { e.preventDefault(); (document.activeElement as HTMLElement | null)?.blur(); location.hash = href(["oeuvres"], q.trim() ? { q: q.trim() } : undefined); }}>
        <label class="field">
          <Icon name="search" />
          <span class="sr-only">Chercher des exemples</span>
          <input type="search" value={q} placeholder="Titre, auteur, thème, pays…" enterkeyhint="search" autocomplete="off"
            onInput={e => setQ((e.target as HTMLInputElement).value)} />
        </label>
        <span class="accueil-boutons">
          <button type="submit" class="btn btn-primary">Chercher le livre</button>
          {/* Le sujet d'un devoir à rendre : plan, œuvres et mots proposés à partir de l'énoncé. */}
          {/* Le texte déjà tapé dans la recherche part avec : « J'ai un devoir » l'analyse tout de suite. */}
          <a class="btn btn-secondary" href="#/devoir" onClick={() => { if (q.trim()) { write("devoir-texte", q.trim()); write("devoir-auteur", ""); } }}><Icon name="edit" size={18} />J'ai un devoir</a>
        </span>
      </form>
      <p class="accueil-astuce">Cherche une illustration par thème, auteur, titre ou argument parmi {OEUVRES.length} fiches d'œuvres.</p>

      <nav class="choix" aria-label="Que veux-tu faire ?">
        <a class="choix-carte choix-methode" href={suivante && nbLues > 0 ? `#/cours/${suivante.id}` : "#/cours"}>
          <Icon name="menu_book" size={24} />
          <span class="choix-titre">{nbLues === 0 ? "Apprendre la méthode" : suivante ? "Continuer la méthode" : "Revoir la méthode"}</span>
          <Detail long={nbLues === 0 ? `${LECONS.length} leçons courtes` : suivante ? `Reprendre à la leçon ${LECONS.indexOf(suivante) + 1}` : `${LECONS.length} leçons lues`}
            court={nbLues === 0 ? `${LECONS.length} leçons` : suivante ? `Leçon ${LECONS.indexOf(suivante) + 1} à lire` : "Tout est lu"} />
          {nbLues > 0 && <span class="progress-bar" aria-hidden="true"><span style={{ width: `${(nbLues / LECONS.length) * 100}%` }} /></span>}
        </a>
        <a class="choix-carte choix-corriges" href="#/sujets">
          <Icon name="history_edu" size={24} />
          <span class="choix-titre">Sujets corrigés</span>
          <Detail long={`${SUJETS.length} copies modèles`} court={`${SUJETS.length} copies`} />
        </a>
        <a class="choix-carte choix-entrainer" href="#/entrainement">
          <Icon name="edit" size={24} />
          <span class="choix-titre">M'entraîner</span>
          <Detail long={`${sujetsEntrainement().length} sujets type bac`} court={`${sujetsEntrainement().length} sujets bac`} />
        </a>
        <a class="choix-carte choix-outils" href="#/outils">
          <Icon name="inventory_2" size={24} />
          <span class="choix-titre">Boîte à outils</span>
          <Detail long="Dictionnaire, formules, vocabulaire" court="Dico et formules" />
        </a>
      </nav>

      <Suggestions />
      <ReponseAlerte />
      <Annonces />
      <InstallBanner />
      <InvitationNotifs />
    </Page>
  );
}
