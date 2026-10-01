import { LECONS } from "../lib/lecons";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { InstallBanner } from "../components/Install";
import { Annonces, InvitationNotifs } from "../components/Annonces";
import { useStored } from "../lib/storage";
import { OEUVRES, SUJETS } from "../lib/data";
import { lienContact } from "../lib/contact";
import { ReponseAlerte } from "../components/ReponseAlerte";
import { useState } from "preact/hooks";
import { href } from "../lib/router";

const MINUTES = LECONS.reduce((n, l) => n + (parseInt(l.duree) || 0), 0);

export function CoursScreen() {
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
          <input type="search" value={q} placeholder="Thème, auteur…" enterkeyhint="search" autocomplete="off"
            onInput={e => setQ((e.target as HTMLInputElement).value)} />
        </label>
        <button type="submit" class="btn btn-primary">Chercher</button>
      </form>

      <nav class="choix" aria-label="Que veux-tu faire ?">
        <a class="choix-carte choix-oeuvres" href="#/oeuvres">
          <Icon name="local_library" size={28} />
          <span class="choix-titre">Trouver des exemples pour ma dissertation</span>
          <span class="choix-detail">{OEUVRES.length} fiches d'œuvres, classées par argument</span>
        </a>
        <a class="choix-carte choix-methode" href={suivante ? `#/cours/${suivante.id}` : "#/cours/" + LECONS[0].id}>
          <Icon name="menu_book" size={28} />
          <span class="choix-titre">{nbLues === 0 ? "Apprendre la méthode" : suivante ? "Continuer la méthode" : "Revoir la méthode"}</span>
          <span class="choix-detail">{nbLues === 0 ? `${LECONS.length} leçons courtes (${MINUTES} min), avec quiz` : `${nbLues} leçon${nbLues > 1 ? "s" : ""} lue${nbLues > 1 ? "s" : ""} sur ${LECONS.length}`}</span>
          {nbLues > 0 && <span class="progress-bar" aria-hidden="true"><span style={{ width: `${(nbLues / LECONS.length) * 100}%` }} /></span>}
        </a>
        <a class="choix-carte choix-entrainer" href="#/entrainement">
          <Icon name="edit" size={28} />
          <span class="choix-titre">M'entraîner sur un sujet</span>
          <span class="choix-detail">{SUJETS.length} sujets type bac, à rédiger étape par étape</span>
        </a>
      </nav>

      <ReponseAlerte />
      <Annonces />
      <InstallBanner />
      <InvitationNotifs />


      <section aria-labelledby="cours-title">
        <h2 id="cours-title" class="section-title home-section-title">Les leçons</h2>
        <ol class="list" aria-label="Leçons">
          {LECONS.map((l, i) => {
            const lue = lues.includes(l.id);
            return (
              <li key={l.id}>
                <a class="row" href={`#/cours/${l.id}`}>
                  <span class={`step-num ${lue ? "done" : ""}`} aria-hidden="true">{lue ? <Icon name="check" size={18} /> : i + 1}</span>
                  <span class="row-body">
                    <span class="row-title">{l.titre}</span>
                    <span class="meta">{l.duree}{lue ? " · lue" : ""}{l.payante ? " · accès complet" : ""}</span>
                  </span>
                  <Icon name="chevron_right" />
                </a>
              </li>
            );
          })}
        </ol>
        <p class="signaler">Une leçon te manque ? <a href={lienContact("lecon")}>Propose-la</a></p>
      </section>
    </Page>
  );
}
