import { useRef, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { envoyerMessage, SUJETS_CONTACT, type EchecEnvoi, type SujetContact } from "../lib/contact";
import { CONTACT_EMAIL, EDITEUR, WHATSAPP } from "../lib/site";

const MAX = 2000;

const CHAMP: Record<SujetContact, { label: string; exemple: string }> = {
  question: { label: "Ta question", exemple: "Ex. : comment savoir si un sujet est d'orientation lyrique ou engagée ?" },
  lecon: { label: "La leçon que tu aimerais trouver", exemple: "Ex. : une leçon sur les transitions, avec des exemples." },
  oeuvre: { label: "L'œuvre à ajouter", exemple: "Titre et auteur. Si tu le sais : les thèmes qu'elle permet d'illustrer." },
  erreur: { label: "L'erreur que tu as vue", exemple: "Où se trouve l'erreur, et ce qui serait juste." },
  autre: { label: "Ton message", exemple: "" }
};

const ECHECS: Record<EchecEnvoi, string> = {
  "hors-ligne": "Pas de connexion Internet. Ton message est gardé ici : renvoie-le une fois connecté.",
  trop: "Tu as déjà envoyé plusieurs messages. Réessaie dans une heure, ou écris-nous directement.",
  serveur: "Le message n'est pas parti. Réessaie dans un instant, ou écris-nous directement."
};

export function ContactScreen({ params }: { params: URLSearchParams }) {
  const initial = SUJETS_CONTACT.find(s => s.id === params.get("sujet"))?.id ?? "question";
  const page = params.get("page") ?? "";
  const [objet, setObjet] = useState(params.get("objet") ?? "");
  const [sujet, setSujet] = useState<SujetContact>(initial);
  const [texte, setTexte] = useState("");
  const [nom, setNom] = useState("");
  const [reponse, setReponse] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye">("saisie");
  const [echec, setEchec] = useState<EchecEnvoi | null>(null);
  const [tropCourt, setTropCourt] = useState(false);
  const piege = useRef<HTMLInputElement>(null);
  const ouvert = useRef(Date.now());

  async function envoyer(e: Event) {
    e.preventDefault();
    if (etat === "envoi") return;
    if (texte.trim().length < 5) { setTropCourt(true); return; }
    setEtat("envoi");
    setEchec(null);
    const corps = objet ? `À propos de : ${objet}\n\n${texte.trim()}` : texte.trim();
    const err = await envoyerMessage({
      sujet, texte: corps, nom: nom.trim(), reponse: reponse.trim(), page: objet ? page : "",
      site: piege.current?.value ?? "", duree: Date.now() - ouvert.current
    });
    if (err) { setEchec(err); setEtat("saisie"); }
    else setEtat("envoye");
  }

  function recommencer() {
    setTexte(""); setObjet(""); setEtat("saisie"); ouvert.current = Date.now();
  }

  const champ = CHAMP[sujet];

  return (
    <Page title="Contact" back="#/a-propos">
      <div class="reading">
        <PageHeader eyebrow="Contact" title="Écrire à l'auteur">
          Une question sur la méthode, une leçon ou une œuvre à ajouter, une erreur repérée : chaque message est lu par Prof {EDITEUR}.
        </PageHeader>

        {etat === "envoye" ? (
          <div class="contact-envoye" role="status">
            <p class="notice notice-success"><Icon name="check" size={20} />Message envoyé. Merci !</p>
            <p>{reponse.trim() ? "Tu recevras une réponse au contact indiqué." : "Tu n'as pas laissé de contact : on ne pourra pas te répondre directement, mais ton message sera pris en compte."}</p>
            <button type="button" class="link-btn align-start" onClick={recommencer}>Envoyer un autre message</button>
          </div>
        ) : (
          <form class="contact-form" onSubmit={envoyer} noValidate>
            <fieldset class="contact-sujets">
              <legend class="field-label">De quoi s'agit-il ?</legend>
              <div class="contact-choix">
                {SUJETS_CONTACT.map(s => (
                  <label key={s.id} class={`chip ${sujet === s.id ? "chip-actif" : ""}`}>
                    <input type="radio" name="sujet" class="sr-only" value={s.id} checked={sujet === s.id} onChange={() => setSujet(s.id)} />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {objet && (
              <p class="contact-objet">
                <span><span class="muted">À propos de :</span> {objet}</span>
                <button type="button" class="icon-btn" aria-label="Ne plus lier le message à cette page" onClick={() => setObjet("")}><Icon name="close" size={18} /></button>
              </p>
            )}

            <div>
              <label class="field-label" for="contact-texte">{champ.label}</label>
              <textarea id="contact-texte" class="textarea" rows={6} maxLength={MAX} value={texte} placeholder={champ.exemple}
                aria-invalid={tropCourt} aria-describedby={tropCourt ? "contact-court" : "contact-compteur"}
                onInput={e => { setTexte((e.target as HTMLTextAreaElement).value); setTropCourt(false); }} />
              {tropCourt
                ? <p id="contact-court" class="field-error" role="alert"><Icon name="error" size={18} />Écris ton message avant de l'envoyer.</p>
                : <p id="contact-compteur" class="meta contact-compteur">{texte.length} / {MAX}</p>}
            </div>

            <div class="contact-duo">
              <div>
                <label class="field-label" for="contact-nom">Prénom <span class="muted">(facultatif)</span></label>
                <input id="contact-nom" class="input input-texte" maxLength={60} autocomplete="given-name" value={nom} onInput={e => setNom((e.target as HTMLInputElement).value)} />
              </div>
              <div>
                <label class="field-label" for="contact-reponse">Pour te répondre <span class="muted">(facultatif)</span></label>
                <input id="contact-reponse" class="input input-texte" maxLength={120} autocomplete="off" inputMode="email" value={reponse}
                  placeholder="WhatsApp ou e-mail" onInput={e => setReponse((e.target as HTMLInputElement).value)} />
              </div>
            </div>

            {/* Champ piège pour les robots, invisible pour les élèves. */}
            <div class="contact-piege" aria-hidden="true">
              <label for="contact-site">Site web</label>
              <input id="contact-site" ref={piege} tabIndex={-1} autocomplete="off" />
            </div>

            {echec && <p class="field-error" role="alert"><Icon name="error" size={18} />{ECHECS[echec]}</p>}
            <button type="submit" class="btn btn-primary btn-block" disabled={etat === "envoi"}>
              {etat === "envoi" ? "Envoi…" : "Envoyer"}
            </button>
            <p class="meta">Ton message et le contact laissé servent seulement à te répondre. <a href="#/confidentialite">Confidentialité</a></p>
          </form>
        )}

        <section class="contact-direct" aria-labelledby="direct-title">
          <h2 id="direct-title" class="section-title">Écrire directement</h2>
          <p>Pour un souci de paiement ou de clé d'accès, WhatsApp est le plus rapide.</p>
          <div class="lock-actions">
            {WHATSAPP && <a class="btn btn-secondary" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener">WhatsApp : +{WHATSAPP.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5 $6")}</a>}
            <a class="btn btn-secondary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
        </section>
      </div>
    </Page>
  );
}
