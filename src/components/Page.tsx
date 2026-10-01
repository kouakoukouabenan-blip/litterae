import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import { goBack } from "../lib/router";
import { Icon } from "./Icon";
import { EspaceBouton, NavTabs } from "./Nav";
import { InstallButton } from "./Install";
import { Cloche } from "./Annonces";
import { Partager, type Partage } from "./Partager";

interface Props {
  /** Titre court affiché dans la barre du haut sur mobile pour les pages de détail. */
  title?: string;
  /** Page parente : affiche un bouton Retour. */
  back?: string;
  wide?: boolean;
  /** Contenu à partager : une petite icône apparaît dans la barre du haut. */
  partage?: { type: Partage; cle: string; titre: string; texte: string; chemin: string };
  /** Petits boutons propres à la page, dans la barre du haut (ex. : enregistrer une fiche). */
  actions?: ComponentChildren;
  children: ComponentChildren;
}

export function Page({ title, back, wide, partage, actions, children }: Props) {
  useEffect(() => {
    document.title = title ? `${title} · Litterae` : "Litterae";
  }, [title]);

  return (
    <>
      <header class="topbar">
        <div class="topbar-inner">
          {back ? (
            <button class="icon-btn back-btn" type="button" onClick={() => goBack(back)} aria-label="Retour">
              <Icon name="arrow_back" />
            </button>
          ) : null}
          <a class={`brand ${back ? "brand-desktop" : ""}`} href="#/accueil" aria-label="Litterae, accueil">
            Litter<span>ae</span>
          </a>
          {back && title ? <p class="topbar-title">{title}</p> : <span class="topbar-spacer" />}
          <NavTabs />
          {actions}
          {partage && <Partager {...partage} />}
          <Cloche />
          <EspaceBouton detail={!!back} />
          <InstallButton />
        </div>
      </header>
      <main id="contenu" class={`page ${wide ? "page-wide" : ""}`}>{children}</main>
      <footer class="site-footer">
        <a href="#/a-propos">À propos et fonctionnalités</a>
        <a href="#/contact">Nous contacter</a>
        <a href="#/cgu">Conditions générales</a>
        <a href="#/confidentialite">Confidentialité</a>
      </footer>
    </>
  );
}
