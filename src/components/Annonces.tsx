import { useEffect, useRef, useState } from "preact/hooks";
import { fermerMessages, marquerLue, ouvrirMessages, useAnnonces, type Annonce } from "../lib/annonces";
import { useNotifs } from "../lib/notifications";
import { aDecouvert, useInstall } from "../lib/install";
import { Icon } from "./Icon";
import { changerRappels, JOURS_AVANT_RAPPEL, preparerRappel, rappelsActifs } from "../lib/rappels";

const NOMS = { promo: "Promo", message: "Message", astuce: "Astuce" };
const dateCourte = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** Cloche de la barre du haut, sur tous les écrans : nombre de messages non lus, qui pulse tant qu'il en reste. */
export function Cloche() {
  const { annonces, nonLues } = useAnnonces();
  if (!annonces.length) return null;
  const n = nonLues.length;
  return (
    <button type="button" class={`icon-btn cloche${n ? " cloche-active" : ""}`} onClick={() => ouvrirMessages()}
      aria-label={n ? `Messages : ${n} non lu${n > 1 ? "s" : ""}` : "Messages"}>
      <Icon name="notifications" />
      {n > 0 && <span class="cloche-nombre" aria-hidden="true">{n > 9 ? "9+" : n}</span>}
    </button>
  );
}

function Message({ a, lue, ouvert, clic }: { a: Annonce; lue: boolean; ouvert: boolean; clic: (id: number) => void }) {
  const lien = a.lien && /^(https:\/\/|#\/)/.test(a.lien) ? a.lien : null;
  return (
    <details class={`message message-${a.type}${lue ? "" : " message-nouveau"}${a.urgent ? " message-urgent" : ""}`} open={ouvert}
      onToggle={e => { if ((e.target as HTMLDetailsElement).open) marquerLue(a.id); }}>
      <summary>
        <span class="message-haut"><span class="message-type">{NOMS[a.type] ?? "Message"}</span>{a.urgent && <span class="annonce-urgent">Urgent</span>}<span class="meta">{dateCourte(a.date)}</span></span>
        <span class="message-titre">{a.titre}</span>
      </summary>
      <div class="message-corps">
        {a.texte && <p class="annonce-texte">{a.texte}</p>}
        {lien && (
          <a class="btn btn-primary align-start" href={lien} onClick={() => { clic(a.id); if (lien.startsWith("#")) fermerMessages(); }}
            {...(lien.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
            {a.lienTexte || "Voir"}
          </a>
        )}
      </div>
    </details>
  );
}

/** Panneau des messages, ouvert par la cloche ou par un titre de l'accueil. */
export function PanneauMessages() {
  const { annonces, estLue, ouvert, clic } = useAnnonces();
  const dialogue = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (ouvert !== null && !d.open) d.showModal();
    if (ouvert === null && d.open) d.close();
    if (ouvert) marquerLue(ouvert);
  }, [ouvert]);
  return (
    <dialog ref={dialogue} class="sheet" aria-labelledby="messages-titre" onClose={fermerMessages}
      onClick={e => e.target === dialogue.current && fermerMessages()}>
      <div class="sheet-head">
        <h2 id="messages-titre" class="section-title">Messages</h2>
        <button type="button" class="icon-btn" onClick={fermerMessages} aria-label="Fermer"><Icon name="close" /></button>
      </div>
      <div class="sheet-body messages-liste">
        {annonces.length ? annonces.map(a => <Message key={`${a.id}-${ouvert}`} a={a} lue={estLue(a.id)} ouvert={ouvert === a.id} clic={clic} />)
          : <p class="muted">Aucun message pour le moment.</p>}
      </div>
    </dialog>
  );
}

/** Sur l'accueil : seulement le titre des messages non lus ; le toucher ouvre le message. */
export function Annonces() {
  const { nonLues } = useAnnonces();
  if (!nonLues.length) return null;
  return (
    <ul class="annonces-titres" aria-label="Nouveaux messages">
      {nonLues.slice(0, 3).map(a => (
        <li key={a.id}>
          <button type="button" class={`annonce-ligne annonce-${a.type}${a.urgent ? " annonce-urgente" : ""}`} onClick={() => ouvrirMessages(a.id)}>
            <span class="annonce-type">{NOMS[a.type] ?? "Message"}</span>
            <span class="annonce-ligne-titre">{a.titre}</span>
            <Icon name="chevron_right" size={20} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Invitation discrète à recevoir les notifications, quand le bandeau d'installation n'est pas affiché. */
export function InvitationNotifs() {
  const { etat, plusTard, reporter, activer } = useNotifs();
  const { showBanner } = useInstall();
  const [erreur, setErreur] = useState<string | null>(null);
  // Pas à la première visite : on attend que l'élève ait ouvert une leçon, une fiche ou un sujet.
  if (etat !== "possible" || plusTard || showBanner || !aDecouvert()) return null;
  return (
    <aside class="install-banner" aria-label="Notifications">
      <Icon name="notifications" size={22} />
      <p class="install-banner-title">{erreur ?? "Rappels, astuces et promos en notification"}</p>
      <button type="button" class="btn btn-primary" onClick={async () => { const e = await activer(); setErreur(e); if (!e) preparerRappel(); }}>Activer</button>
      <button type="button" class="icon-btn" onClick={reporter} aria-label="Plus tard"><Icon name="close" size={20} /></button>
    </aside>
  );
}

/** Réglage des notifications sur la page À propos. */
export function ReglageNotifs() {
  const { etat, activer, desactiver } = useNotifs();
  const [rappels, setRappels] = useState(rappelsActifs);
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <>
      <h2 class="section-title">Notifications</h2>
      {etat === "abonne" && (
        <>
          <p>Tu reçois les astuces et les promos de Litterae sur cet appareil.</p>
          <label class="check-ligne">
            <input type="checkbox" checked={rappels} onChange={e => { const v = (e.target as HTMLInputElement).checked; setRappels(v); changerRappels(v); }} />
            <span>Me rappeler ce que je faisais si je ne reviens pas pendant {JOURS_AVANT_RAPPEL} jours</span>
          </label>
          <details class="repli">
            <summary>Comment ça marche ?</summary>
            <p class="small muted">Ton téléphone choisit le rappel (sujet commencé, leçon suivante, œuvre proche de tes lectures). Le serveur sait seulement quand l'envoyer, jamais ce que tu lis. Deux rappels au plus, puis plus rien tant que tu ne reviens pas.</p>
          </details>
          <button type="button" class="btn btn-secondary align-start" onClick={desactiver}>Ne plus recevoir</button>
        </>
      )}
      {etat === "possible" && (
        <>
          <p>Astuces et promos quelques fois par mois au plus, et un rappel si tu t'absentes quelques jours.</p>
          <button type="button" class="btn btn-primary align-start" onClick={async () => { const e = await activer(); setErreur(e); if (!e) preparerRappel(); }}><Icon name="notifications" size={20} />Activer les notifications</button>
        </>
      )}
      {etat === "installer-iphone" && <p>Sur iPhone, les notifications marchent une fois Litterae installée sur l'écran d'accueil (iOS 16.4 ou plus récent). Installe-la, puis ouvre-la depuis son icône pour les activer.</p>}
      {etat === "refuse" && <p>Les notifications de Litterae sont bloquées sur cet appareil. Pour les recevoir, autorise-les dans les réglages du navigateur pour ce site.</p>}
      {etat === "impossible" && <p>Ce navigateur ne permet pas de recevoir des notifications. Les messages de Litterae s'affichent quand même en haut de l'accueil.</p>}
      {erreur && <p class="field-error" role="alert"><Icon name="error" size={18} />{erreur}</p>}
    </>
  );
}
