import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import { goBack } from "../lib/router";
import { Icon } from "./Icon";
import { NavTabs } from "./Nav";
import { InstallButton } from "./Install";
import { Cloche } from "./Annonces";

interface Props {
  /** Titre court affiché dans la barre du haut sur mobile pour les pages de détail. */
  title?: string;
  /** Page parente : affiche un bouton Retour. */
  back?: string;
  wide?: boolean;
  children: ComponentChildren;
}

export function Page({ title, back, wide, children }: Props) {
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
          <a class={`brand ${back ? "brand-desktop" : ""}`} href="#/cours" aria-label="Litterae, accueil">
            Litter<span>ae</span>
          </a>
          {back && title ? <p class="topbar-title">{title}</p> : <span class="topbar-spacer" />}
          <NavTabs />
          <Cloche />
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
