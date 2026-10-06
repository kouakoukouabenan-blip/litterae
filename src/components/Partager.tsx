import { Icon } from "./Icon";
import { copyText } from "./Toast";
import { noter } from "../lib/stats";
import { sansEtoiles } from "../lib/text";

export type Partage = "lecon" | "oeuvre" | "sujet" | "entrainement" | "mot";

/** Adresse publique d'une page de l'appli (fonctionne aussi depuis l'appli installée). */
export const adresse = (chemin: string) => new URL("./", location.href).href + chemin;

/** Coupe un texte à la fin d'un mot, avec des points de suspension. */
export function extrait(texte: string | null | undefined, max = 220) {
  const t = sansEtoiles(texte).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1) > max * 0.6 ? t.lastIndexOf(" ", max - 1) : max - 1).replace(/[,;:.\s]+$/, "") + "…";
}

/**
 * Petite icône « Partager » (barre du haut, ou en-tête de la carte d'un mot) : la fenêtre de partage du téléphone (WhatsApp, SMS…) avec le texte et le lien,
 * ou, sans elle (ordinateur), le texte et le lien copiés.
 */
export function Partager({ type, cle, titre: titreBrut, texte: texteBrut, chemin }: { type: Partage; cle: string; titre: string; texte: string; chemin: string }) {
  // Le texte partagé est lu dans WhatsApp ou un SMS : les étoiles de l'italique n'y ont rien à faire.
  const titre = sansEtoiles(titreBrut), texte = sansEtoiles(texteBrut);
  const lien = adresse(chemin);
  const partager = async () => {
    noter({ t: "partage", ref: type });
    if (navigator.share) {
      try { await navigator.share({ title: titre, text: texte, url: lien }); } catch { /* partage annulé */ }
      return;
    }
    copyText(`${texte}\n${lien}`, "Texte et lien copiés : colle-les dans WhatsApp ou un SMS.");
  };
  return (
    <button type="button" class="icon-btn partager" onClick={partager} aria-label={`Partager ${titre}`} title="Partager" data-cle={cle}>
      <Icon name="share" />
    </button>
  );
}
