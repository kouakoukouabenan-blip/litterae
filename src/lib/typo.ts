/**
 * Typographie française : une espace insécable avant « ! ? ; : » » et après « « »,
 * pour que la ponctuation ne parte jamais seule à la ligne (« Oui mon commandant ! »).
 *
 * Appliquée à tout le texte affiché, y compris ce qui vient du tableau de bord :
 * l'appli surveille la page et corrige chaque texte qui apparaît ou change.
 * Les champs de saisie ne sont pas touchés (l'élève tape ce qu'il veut).
 */

const FINE = "\u00A0";
const AVANT = /[ \t\u00A0]+([!?;:»])/g;
const APRES = /«[ \t\u00A0]+/g;
const POURCENT = /(\d)[ \t]+%/g;
const IGNORES = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);

export const espacesFines = (t: string) => t.replace(AVANT, FINE + "$1").replace(APRES, "«" + FINE).replace(POURCENT, "$1" + FINE + "%");

function corriger(n: Text) {
  const p = n.parentElement;
  if (!p || IGNORES.has(p.tagName) || p.isContentEditable) return;
  const d = n.data;
  if (!/[!?;:»«%]/.test(d)) return;
  const f = espacesFines(d);
  if (f !== d) n.data = f;
}

function parcourir(racine: Node) {
  if (racine.nodeType === Node.TEXT_NODE) return corriger(racine as Text);
  if (racine.nodeType !== Node.ELEMENT_NODE || IGNORES.has((racine as Element).tagName)) return;
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) corriger(n as Text);
}

export function typographieFrancaise(racine: Node = document.body) {
  parcourir(racine);
  new MutationObserver(liste => {
    for (const m of liste) {
      if (m.type === "characterData") corriger(m.target as Text);
      else m.addedNodes.forEach(parcourir);
    }
  }).observe(racine, { childList: true, subtree: true, characterData: true });
}
