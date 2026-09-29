import { useState } from "preact/hooks";
import { useAnnonces } from "../lib/annonces";
import { useNotifs } from "../lib/notifications";
import { useInstall } from "../lib/install";
import { Icon } from "./Icon";

const NOMS = { promo: "Promo", message: "Message", astuce: "Astuce" };

/** Messages de l'éditeur en haut de l'accueil. L'élève peut fermer chacun. */
export function Annonces() {
  const { annonces, fermer, clic } = useAnnonces();
  if (!annonces.length) return null;
  return (
    <div class="annonces">
      {annonces.map(a => (
        <aside key={a.id} class={`annonce annonce-${a.type}${a.urgent ? " annonce-urgente" : ""}`} aria-labelledby={`annonce-${a.id}`}>
          <p class="annonce-type">{NOMS[a.type] ?? "Message"}{a.urgent && <span class="annonce-urgent">Urgent</span>}</p>
          <p id={`annonce-${a.id}`} class="annonce-titre">{a.titre}</p>
          {a.texte && <p class="annonce-texte">{a.texte}</p>}
          {a.lien && (
            <a class="btn btn-primary align-start" href={a.lien} onClick={() => clic(a.id)}
              {...(a.lien.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
              {a.lienTexte || "Voir"}
            </a>
          )}
          <button type="button" class="icon-btn annonce-fermer" onClick={() => fermer(a.id)} aria-label="Masquer ce message"><Icon name="close" size={20} /></button>
        </aside>
      ))}
    </div>
  );
}

/** Invitation discrète à recevoir les notifications, quand le bandeau d'installation n'est pas affiché. */
export function InvitationNotifs() {
  const { etat, plusTard, reporter, activer } = useNotifs();
  const { showBanner } = useInstall();
  const [erreur, setErreur] = useState<string | null>(null);
  if (etat !== "possible" || plusTard || showBanner) return null;
  return (
    <aside class="install-banner" aria-label="Notifications">
      <Icon name="notifications" size={22} />
      <p class="install-banner-title">{erreur ?? "Reçois les astuces et les promos de Litterae en notification."}</p>
      <button type="button" class="btn btn-primary" onClick={async () => setErreur(await activer())}>Activer</button>
      <button type="button" class="icon-btn" onClick={reporter} aria-label="Plus tard"><Icon name="close" size={20} /></button>
    </aside>
  );
}

/** Réglage des notifications sur la page À propos. */
export function ReglageNotifs() {
  const { etat, activer, desactiver } = useNotifs();
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <>
      <h2 class="section-title">Notifications</h2>
      {etat === "abonne" && (
        <>
          <p>Tu reçois les astuces et les promos de Litterae sur cet appareil.</p>
          <button type="button" class="btn btn-secondary align-start" onClick={desactiver}>Ne plus recevoir</button>
        </>
      )}
      {etat === "possible" && (
        <>
          <p>Reçois les astuces, les nouveautés et les promos de Litterae sur cet appareil, quelques fois par mois au plus.</p>
          <button type="button" class="btn btn-primary align-start" onClick={async () => setErreur(await activer())}><Icon name="notifications" size={20} />Activer les notifications</button>
        </>
      )}
      {etat === "installer-iphone" && <p>Sur iPhone, les notifications marchent une fois Litterae installée sur l'écran d'accueil (iOS 16.4 ou plus récent). Installe-la, puis ouvre-la depuis son icône pour les activer.</p>}
      {etat === "refuse" && <p>Les notifications de Litterae sont bloquées sur cet appareil. Pour les recevoir, autorise-les dans les réglages du navigateur pour ce site.</p>}
      {etat === "impossible" && <p>Ce navigateur ne permet pas de recevoir des notifications. Les messages de Litterae s'affichent quand même en haut de l'accueil.</p>}
      {erreur && <p class="field-error" role="alert"><Icon name="error" size={18} />{erreur}</p>}
    </>
  );
}
