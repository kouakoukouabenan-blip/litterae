import { useEffect, useRef, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { AchatLien } from "../components/Achat";
import {
  actualiserQuestions, envoyerMessage, marquerVues, QUESTIONS_EN_ATTENTE, SUJETS_CONTACT, useQuestions,
  type EchecEnvoi, type Question, type SujetContact
} from "../lib/contact";
import { useAccess } from "../lib/access";
import { replaceRoute } from "../lib/router";
import { CONTACT_EMAIL, EDITEUR, WHATSAPP } from "../lib/site";

const MAX = 2000;

const CHAMP: Record<SujetContact, { label: string; exemple: string }> = {
  question: { label: "Ta question", exemple: "Ex. : comment savoir si un sujet est d'orientation lyrique ou engagée ?" },
  lecon: { label: "La leçon que tu aimerais trouver", exemple: "Ex. : une leçon sur les transitions, avec des exemples." },
  oeuvre: { label: "L'œuvre à ajouter", exemple: "Titre et auteur. Si tu le sais : les thèmes qu'elle permet d'illustrer." },
  erreur: { label: "L'erreur que tu as vue", exemple: "Où se trouve l'erreur, et ce qui serait juste." },
  autre: { label: "Ton message", exemple: "" },
  copie: { label: "Ta copie", exemple: "" }
};

const ECHECS: Record<EchecEnvoi, string> = {
  "hors-ligne": "Pas de connexion Internet. Ton message est gardé ici : renvoie-le une fois connecté.",
  trop: "Tu as déjà envoyé plusieurs messages. Réessaie dans une heure, ou écris-nous directement.",
  "en-attente": `Tu as déjà ${QUESTIONS_EN_ATTENTE} questions en attente de réponse. Tu pourras en poser une autre dès qu'une réponse arrive.`,
  cle: "Ta clé d'accès n'est plus active sur cet appareil. Saisis-la de nouveau dans « Clé d'accès », puis renvoie ton message.",
  serveur: "Le message n'est pas parti. Réessaie dans un instant, ou écris-nous directement."
};

const dateCourte = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** Conditions affichées avant d'écrire, pour tout le monde. */
function Consignes({ premium }: { premium: boolean }) {
  return (
    <details class="repli consignes">
      <summary>Avant d'écrire : 5 règles simples</summary>
      <ul class="bullets">
        <li>Une seule question par message, écrite en phrases complètes, sans langage SMS.</li>
        <li>Précise la leçon, le sujet ou l'œuvre concernés. Depuis une fiche, c'est indiqué pour toi.</li>
        <li>On t'aide à comprendre. On ne rédige pas ta dissertation ni ton devoir à ta place.</li>
        <li>Reste poli. Un message insultant ou hors sujet ne reçoit pas de réponse.</li>
        <li>{premium
          ? `La réponse peut prendre quelques jours, davantage en période d'examens. Elle arrive ici, dans « Mes questions ». ${QUESTIONS_EN_ATTENTE} questions en attente au maximum.`
          : "La réponse peut prendre quelques jours, davantage en période d'examens."}</li>
      </ul>
    </details>
  );
}

/** Questions posées avec l'accès complet, et réponses de l'auteur. */
function MesQuestions({ questions, onEcrire }: { questions: Question[]; onEcrire: () => void }) {
  const [chargement, setChargement] = useState(false);
  useEffect(() => {
    setChargement(true);
    actualiserQuestions(true).finally(() => setChargement(false));
  }, []);
  // Les réponses affichées sont comptées comme lues.
  useEffect(() => {
    marquerVues(questions.filter(q => q.reponse && !q.vue).map(q => q.id));
  }, [questions.map(q => `${q.id}${q.vue}`).join()]);

  if (!questions.length) return (
    <div class="empty">
      <p class="empty-title">{chargement ? "Chargement…" : "Aucune question pour l'instant."}</p>
      {!chargement && <div class="empty-body"><p>Pose ta première question à l'auteur : la réponse arrivera ici.</p>
        <button type="button" class="btn btn-secondary" onClick={onEcrire}>Poser une question</button></div>}
    </div>
  );

  return (
    <ol class="questions" aria-label="Mes questions">
      {questions.map(q => {
        const [objet, corps] = q.texte.startsWith("À propos de : ") ? [q.texte.slice(14).split("\n")[0], q.texte.split("\n").slice(1).join("\n").trim()] : ["", q.texte];
        return (
          <li key={q.id} class={`question ${q.reponse ? "question-repondue" : ""}`}>
            <p class="meta">
              {q.sujet === "copie" ? "Copie envoyée" : SUJETS_CONTACT.find(s => s.id === q.sujet)?.label.replace(/^Poser une question$/, "Question")} · {dateCourte(q.date)}
              {objet && <> · {q.page ? <a href={q.page}>{objet}</a> : objet}</>}
            </p>
            {q.sujet === "copie"
              ? <details class="question-copie"><summary>Voir ma copie</summary><p class="question-texte">{corps}</p></details>
              : <p class="question-texte">{corps}</p>}
            {q.reponse ? (
              <div class="question-reponse">
                <p class="question-auteur">{q.sujet === "copie" ? "Correction" : "Réponse"} de Prof {EDITEUR}{q.reponseDate ? `, le ${dateCourte(q.reponseDate)}` : ""}</p>
                <p class="question-texte">{q.reponse}</p>
              </div>
            ) : (
              <p class="question-attente">En attente de réponse</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ContactScreen({ params }: { params: URLSearchParams }) {
  const { premium } = useAccess();
  const { questions, nouvellesReponses } = useQuestions();
  const onglet = premium && params.get("vue") === "questions" ? "questions" : "ecrire";
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

  const voir = (vue: "ecrire" | "questions") => {
    const p = new URLSearchParams(params);
    if (vue === "questions") p.set("vue", "questions"); else p.delete("vue");
    replaceRoute(`#/contact${p.toString() ? "?" + p : ""}`);
  };

  async function envoyer(e: Event) {
    e.preventDefault();
    if (etat === "envoi") return;
    if (texte.trim().length < 5) { setTropCourt(true); return; }
    setEtat("envoi");
    setEchec(null);
    const corps = objet ? `À propos de : ${objet}\n\n${texte.trim()}` : texte.trim();
    const err = await envoyerMessage({
      sujet, texte: corps, nom: nom.trim(), reponse: premium ? "" : reponse.trim(), page: objet ? page : "",
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
          Chaque message est lu par Prof {EDITEUR}.
        </PageHeader>

        {premium && (
          <div class="segmented" role="tablist" aria-label="Contact">
            <button type="button" role="tab" class="segment" aria-selected={onglet === "ecrire"} onClick={() => voir("ecrire")}>Écrire</button>
            <button type="button" role="tab" class="segment" aria-selected={onglet === "questions"} onClick={() => voir("questions")}>
              Mes questions{nouvellesReponses > 0 && <span class="pastille" aria-label={`${nouvellesReponses} nouvelle(s) réponse(s)`}>{nouvellesReponses}</span>}
            </button>
          </div>
        )}

        {onglet === "questions" ? (
          <MesQuestions questions={questions} onEcrire={() => voir("ecrire")} />
        ) : etat === "envoye" ? (
          <div class="contact-envoye" role="status">
            <p class="notice notice-success"><Icon name="check" size={20} />Message envoyé. Merci !</p>
            {premium
              ? <p>La réponse arrivera dans <button type="button" class="link-btn" onClick={() => voir("questions")}>Mes questions</button>. Si tu as accepté les notifications, ton téléphone te préviendra.</p>
              : <p>{reponse.trim() ? "Tu recevras une réponse au contact indiqué." : "Tu n'as pas laissé de contact : on ne pourra pas te répondre directement, mais ton message sera pris en compte."}</p>}
            <button type="button" class="link-btn align-start" onClick={recommencer}>Envoyer un autre message</button>
          </div>
        ) : (
          <>
            <Consignes premium={premium} />
            {!premium && (
              <p class="contact-premium small">
                Réponse dans l'appli avec l'accès complet.{" "}
                <AchatLien label="Acheter l'accès" /> · <a href="#/acces">J'ai une clé</a>
              </p>
            )}
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
                {!premium && (
                  <div>
                    <label class="field-label" for="contact-reponse">Pour te répondre <span class="muted">(facultatif)</span></label>
                    <input id="contact-reponse" class="input input-texte" maxLength={120} autocomplete="off" inputMode="email" value={reponse}
                      placeholder="WhatsApp ou e-mail" onInput={e => setReponse((e.target as HTMLInputElement).value)} />
                  </div>
                )}
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
              <p class="meta">Ton message{premium ? "" : " et le contact laissé"} servent seulement à te répondre. <a href="#/confidentialite">Confidentialité</a></p>
            </form>
          </>
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
