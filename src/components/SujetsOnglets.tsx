import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";

/** Dernier onglet choisi par groupe : au changement de page, le curseur part de l'ancien onglet. */
const derniers: Record<string, number> = {};

interface Segment { label: ComponentChildren; href?: string; onClick?: () => void; actif: boolean }

/**
 * Deux (ou trois) choix côte à côte en haut d'une page. Le curseur blanc glisse d'un choix à l'autre
 * et le contenu arrive du côté où l'élève est allé.
 */
export function Segments({ groupe, label, items }: { groupe: string; label: string; items: Segment[] }) {
  const ref = useRef<HTMLElement>(null);
  const i = Math.max(0, items.findIndex(s => s.actif));

  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const curseur = nav.querySelector<HTMLElement>(".segments-curseur")!;
    const place = (k: number) => {
      const el = nav.querySelectorAll<HTMLElement>(".segment")[k];
      if (el) { curseur.style.width = `${el.offsetWidth}px`; curseur.style.transform = `translateX(${el.offsetLeft}px)`; }
    };
    const avant = derniers[groupe];
    derniers[groupe] = i;
    const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (avant != null && avant !== i && !calme) {
      curseur.style.transition = "none";
      place(avant);
      void curseur.offsetWidth;
      curseur.style.transition = "";
      requestAnimationFrame(() => place(i));
      const racine = document.documentElement;
      racine.dataset.glisse = i > avant ? "droite" : "gauche";
      setTimeout(() => { delete racine.dataset.glisse; }, 450);
    } else place(i);
    // Police chargée ou écran tourné : le curseur se recale sans animation.
    // (Le premier appel, immédiat, est ignoré pour ne pas couper l'animation.)
    let premier = true;
    const ro = new ResizeObserver(() => {
      if (premier) { premier = false; return; }
      curseur.style.transition = "none"; place(derniers[groupe]); void curseur.offsetWidth; curseur.style.transition = "";
    });
    ro.observe(nav);
    return () => ro.disconnect();
  }, [i, groupe]);

  const toucher = () => { try { navigator.vibrate?.(8); } catch { /* pas de vibreur */ } };

  return (
    <nav ref={ref} class="segments" aria-label={label}>
      <span class="segments-curseur" aria-hidden="true" />
      {items.map((s, k) => s.href
        ? <a key={k} class="segment" href={s.href} aria-current={s.actif ? "page" : undefined} onClick={toucher}>{s.label}</a>
        : <button key={k} type="button" class="segment" aria-pressed={s.actif} onClick={() => { toucher(); s.onClick?.(); }}>{s.label}</button>)}
    </nav>
  );
}

/** Les deux façons de travailler un sujet, côte à côte en haut de l'onglet Sujets : s'entraîner d'abord. */
export function SujetsOnglets({ actif }: { actif: "corriges" | "entrainement" }) {
  return <Segments groupe="sujets" label="Sujets" items={[
    { label: "M'entraîner", href: "#/entrainement", actif: actif === "entrainement" },
    { label: "Corrigés", href: "#/sujets", actif: actif === "corriges" }
  ]} />;
}

/** Les deux parties de l'onglet Cours : apprendre la méthode, puis les outils pour l'appliquer. */
export function CoursOnglets({ actif }: { actif: "lecons" | "outils" }) {
  return <Segments groupe="cours" label="Cours" items={[
    { label: "Leçons", href: "#/cours", actif: actif === "lecons" },
    { label: "Boîte à outils", href: "#/outils", actif: actif === "outils" }
  ]} />;
}

/** Les deux parties de l'onglet Œuvres : chercher, et retrouver ses fiches enregistrées. */
export function OeuvresOnglets({ actif }: { actif: "chercher" | "carnet" }) {
  return <Segments groupe="oeuvres" label="Œuvres" items={[
    { label: "Rechercher", href: "#/oeuvres", actif: actif === "chercher" },
    { label: "Mon carnet", href: "#/mes-fiches", actif: actif === "carnet" }
  ]} />;
}
