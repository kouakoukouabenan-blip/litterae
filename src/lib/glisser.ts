import { useEffect, useRef } from "preact/hooks";

/**
 * Glisser le doigt vers la gauche ou la droite pour passer d'un onglet à l'autre.
 * Chaque rangée d'onglets de la page s'inscrit ici ; la plus intérieure répond d'abord
 * (Dictionnaire → Formules), et laisse la main à celle du dessus quand elle est au bout
 * (Dictionnaire → Leçons).
 */
interface Zone { niveau: number; aller: (sens: 1 | -1) => boolean }
const zones: Zone[] = [];

/** Là où le doigt sert déjà à autre chose : écrire, choisir du texte, faire défiler de côté. */
function occupe(cible: EventTarget | null) {
  for (let el = cible instanceof Element ? cible : null; el && el !== document.body; el = el.parentElement) {
    if (el.matches("input, textarea, select, [contenteditable], dialog, .sans-glisser")) return true;
    const s = getComputedStyle(el);
    if (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 2) return true;
  }
  return !!document.querySelector("dialog[open]");
}

let depart: { x: number; y: number; t: number } | null = null;

function debut(e: TouchEvent) {
  const p = e.touches[0];
  // Un seul doigt, et pas depuis le bord de l'écran (geste « retour » du téléphone).
  depart = e.touches.length === 1 && p.clientX > 24 && p.clientX < innerWidth - 24 && !occupe(e.target)
    ? { x: p.clientX, y: p.clientY, t: Date.now() } : null;
}

function fin(e: TouchEvent) {
  if (!depart) return;
  const p = e.changedTouches[0];
  const dx = p.clientX - depart.x, dy = p.clientY - depart.y, duree = Date.now() - depart.t;
  depart = null;
  // Un vrai glissement de côté : assez long, bien plus horizontal que vertical, assez vif.
  if (Math.abs(dx) < 70 || Math.abs(dx) < 2 * Math.abs(dy) || duree > 700) return;
  if (getSelection()?.toString()) return;
  const sens = dx < 0 ? 1 : -1;
  for (const z of [...zones].sort((a, b) => b.niveau - a.niveau)) if (z.aller(sens)) return;
}

/**
 * Inscrit une rangée d'onglets : `index` est l'onglet ouvert, `ouvrir(k)` ouvre le k-ième.
 * `niveau` : 1 pour des onglets rangés sous d'autres (rubriques de la boîte à outils).
 * Le geste est écouté une seule fois pour toute l'appli.
 */
export function useGlisser(index: number, nombre: number, ouvrir: (k: number) => void, niveau = 0) {
  const etat = useRef({ index, nombre, ouvrir });
  etat.current = { index, nombre, ouvrir };
  useEffect(() => {
    const zone: Zone = {
      niveau,
      aller: sens => {
        const { index: i, nombre: n, ouvrir: o } = etat.current;
        const k = i + sens;
        if (k < 0 || k >= n) return false;
        o(k);
        return true;
      }
    };
    zones.push(zone);
    if (zones.length === 1) {
      addEventListener("touchstart", debut, { passive: true });
      addEventListener("touchend", fin, { passive: true });
    }
    return () => {
      zones.splice(zones.indexOf(zone), 1);
      if (!zones.length) {
        removeEventListener("touchstart", debut);
        removeEventListener("touchend", fin);
      }
    };
  }, []);
}
