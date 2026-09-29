// Informations d'édition et adresses de service.
export const EDITEUR = "Donatien Kouabenan";
/** Adresse de contact affichée dans les CGU et la page Confidentialité. */
export const CONTACT_EMAIL = "livresfaciles@gmail.com";
export const MISE_A_JOUR = "29 septembre 2026";

/** Page de vente Chariow de l'accès complet (vide tant que le produit n'est pas créé). */
export const ACHAT_URL = "https://livresfaciles.mychariow.shop/prd_mhf6g1pp";
/** Serveur de vérification des clés (Cloudflare Worker), sans barre finale. */
export const SERVEUR_URL: string = import.meta.env.VITE_SERVEUR_URL ?? "https://litterae-serveur.kouakoukouabenan.workers.dev";

/** Numéro WhatsApp de l'assistance, au format international sans « + » ni espaces (ex. 2250700000000). Vide : e-mail seulement. */
export const WHATSAPP = "";

/** Lien d'aide quand la clé n'arrive pas ou est refusée : WhatsApp si un numéro est renseigné, sinon e-mail. */
export function lienAide(sujet: string) {
  const texte = `Bonjour, ${sujet}. Mon adresse e-mail d'achat : `;
  return WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texte)}`
    : `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Litterae : " + sujet)}&body=${encodeURIComponent(texte)}`;
}
