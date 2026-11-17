import { useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { accesTermine, activer, licence, retirer } from "../lib/licence";
import { PAYE, PRICE, PRIX_AVANT, dateFin, joursAvant, DUREE } from "../lib/access";
import { ACHAT_URL, lienAide, WHATSAPP } from "../lib/site";
import { AchatLien } from "../components/Achat";
import { CommentPayerBouton } from "../components/CommentPayer";
import { BIENVENUE } from "../components/Bienvenue";
import { write } from "../lib/storage";
import { cleRecue, oublierCleRecue, recevoir, surAncienneAdresse } from "../lib/passage";

/** Code de passage (ancienne adresse, iPhone) collé dans la case de la clé : bien plus long qu'une clé. */
const estCodePassage = (t: string) => t.trim().length > 80 && /^[A-Za-z0-9_-]+$/.test(t.trim().replace(/^.*#passage=/, ""));

/** Saisie de la clé reçue par e-mail après l'achat, ou état de l'accès complet. */
export function AccesScreen({ params }: { params: URLSearchParams }) {
  const actuelle = licence();
  const termine = accesTermine();
  const fin = actuelle?.fin ?? null;
  const reste = fin ? joursAvant(fin) : null;
  // Lien reçu par e-mail (…#/acces?cle=ABCD-1234) : la clé est déjà remplie, il ne reste qu'à valider.
  const [cle, setCle] = useState(() => (params.get("cle") ?? "").trim().toUpperCase());
  const peutColler = typeof navigator.clipboard?.readText === "function";
  const coller = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) { setCle(estCodePassage(t) ? t : t.toUpperCase()); setErreur(""); }
    } catch { /* l'élève peut toujours coller à la main */ }
  };
  const [etat, setEtat] = useState<"saisie" | "envoi" | "ok">("saisie");
  const [erreur, setErreur] = useState("");

  async function valider(e: Event) {
    e.preventDefault();
    if (etat === "envoi" || !cle.trim()) return;
    setEtat("envoi");
    setErreur("");
    // Code de passage : la progression est rangée ici, puis la clé qu'il contient est validée (même appareil).
    let aValider = cle;
    if (estCodePassage(cle)) {
      if (!recevoir(cle)) { setErreur("Ce code de passage est incomplet. Recopie-le en entier depuis l'ancienne appli."); setEtat("saisie"); return; }
      const recue = cleRecue();
      if (!recue) { setEtat("ok"); setTimeout(() => { location.hash = "#/accueil"; location.reload(); }, 1200); return; }
      aValider = recue;
    }
    const err = await activer(aValider);
    if (!err) oublierCleRecue();
    if (err) {
      setErreur(err.message);
      setEtat("saisie");
    } else {
      setEtat("ok");
      // Première activation sur cet appareil : un message résume tout ce qui vient de s'ouvrir.
      if (!actuelle) write(BIENVENUE, true);
      // Recharge pour intégrer le contenu payant partout dans l'application.
      setTimeout(() => { location.hash = "#/accueil"; location.reload(); }, 1200);
    }
  }

  if (actuelle && etat !== "ok" && !params.get("nouvelle"))
    return (
      <Page title="Accès complet" back="#/accueil">
        <div class="reading">
          <PageHeader eyebrow="Accès complet" title="Ton accès est actif">
            Tout est ouvert sur cet appareil, même hors connexion.
          </PageHeader>
          <dl class="def">
            {actuelle.titulaire && <><dt>Au nom de</dt><dd>{actuelle.titulaire.nom}</dd></>}
            <dt>Clé</dt><dd class="mono">{actuelle.cle.replace(/.(?=.{4})/g, "•")}</dd>
            {fin ? <><dt>Valable jusqu'au</dt><dd>{dateFin(fin)}</dd></> : DUREE && <><dt>Durée</dt><dd>Sans limite</dd></>}
          </dl>
          {reste !== null && reste <= 30 && ACHAT_URL && (
            <section class="acces-renouveler">
              <p>{reste <= 1 ? "Ton accès se termine aujourd'hui." : `Ton accès se termine dans ${reste} jours.`} Renouvelle maintenant : les jours qui te restent s'ajoutent à ta nouvelle clé.</p>
              <AchatLien class="btn btn-primary align-start" label={`Renouveler, ${PRICE}`} />
              <p class="small muted">Ensuite, colle la nouvelle clé ici, sur ce téléphone.</p>
              <a class="btn btn-secondary align-start" href="#/acces?nouvelle=1">J'ai ma nouvelle clé</a>
            </section>
          )}
          <details class="repli acces-note">
            <summary>Ta clé marche sur 2 appareils</summary>
            <p>Garde l'e-mail qui la contient pour la saisir sur un nouveau téléphone. Attention : effacer les données du navigateur compte comme un nouvel appareil. En cas de souci, <a href={lienAide("ma clé Litterae a atteint sa limite d'appareils")} target="_blank" rel="noopener">écris-nous</a>.</p>
          </details>
          <button type="button" class="btn btn-secondary" onClick={() => { if (confirm("Retirer l'accès complet de cet appareil ? Tu pourras le réactiver avec ta clé.")) { retirer(); location.reload(); } }}>
            Retirer de cet appareil
          </button>
        </div>
      </Page>
    );

  return (
    <Page title="Clé d'accès" back="#/accueil">
      <div class="reading">
        {termine && etat !== "ok" ? (
          <PageHeader eyebrow="Accès complet" title="Ton accès est terminé">
            Ton accès complet a pris fin le {dateFin(termine.fin)}. Tes travaux restent sur ton téléphone ; une nouvelle clé rouvre tout.
            {ACHAT_URL && <> <AchatLien label={`Renouveler, ${PRICE}`} /></>}
          </PageHeader>
        ) : (
          <PageHeader eyebrow="Accès complet" title={actuelle ? "Saisir ma nouvelle clé" : "Saisir ma clé d'accès"}>
            La clé reçue par e-mail après l'achat.
            {ACHAT_URL && !actuelle && <> Pas de clé ? <AchatLien label="Acheter une clé" /></>}
          </PageHeader>
        )}

        {etat === "ok" ? (
          <p class="notice notice-success" role="status"><Icon name="check" size={20} />Clé validée. Ouverture de l'accès complet…</p>
        ) : (
          <form class="key-form" onSubmit={valider} noValidate>
            <label class="field-label" for="cle">Clé d'accès</label>
            <input id="cle" class="input mono" value={cle} autocomplete="off" autocapitalize="characters" spellcheck={false}
              placeholder="ABCD-1234-EFGH-5678" aria-invalid={!!erreur} aria-describedby={erreur ? "cle-erreur" : undefined}
              onInput={e => { setCle((e.target as HTMLInputElement).value); setErreur(""); }} />
            {peutColler && !cle && <button type="button" class="btn btn-secondary align-start" onClick={coller}><Icon name="content_paste" size={20} />Coller ma clé</button>}
            {erreur && <p id="cle-erreur" class="field-error" role="alert"><Icon name="error" size={18} />{erreur}</p>}
            {erreur && ACHAT_URL && <p class="small">Tu n'as pas de clé valide ? <AchatLien label={`Acheter une clé, ${PRICE}`} /></p>}
            {erreur && <p class="small">Tu as payé et ta clé est refusée ? <a href={lienAide("ma clé Litterae est refusée")} target="_blank" rel="noopener">Écris-nous{WHATSAPP ? " sur WhatsApp" : ""}</a>, on règle ça.</p>}
            <button type="submit" class="btn btn-primary btn-block" disabled={!cle.trim() || etat === "envoi"}>
              {etat === "envoi" ? "Vérification…" : "Valider ma clé"}
            </button>
          </form>
        )}

        {!surAncienneAdresse() && !actuelle && (
          <details class="repli acces-aide">
            <summary>J'ai un code de passage</summary>
            <p>Tu avais Litterae sur l'ancienne adresse (iPhone) ? Colle le code copié dans la case ci-dessus et valide : ta clé et ta progression reviennent, sans prendre de place sur ta clé.</p>
          </details>
        )}

        <details class="repli acces-aide">
          <summary>Je n'ai pas reçu ma clé</summary>
          <p>Elle arrive par e-mail quelques minutes après le paiement, à l'adresse donnée sur Chariow. Regarde aussi dans les dossiers <strong>Spam</strong> et <strong>Promotions</strong>.</p>
          <a class="btn btn-secondary align-start" href={lienAide("je n'ai pas reçu ma clé Litterae")} target="_blank" rel="noopener">
            {WHATSAPP ? "Nous écrire sur WhatsApp" : "Nous écrire par e-mail"}
          </a>
          <p>Pour toute autre question : page <a href="#/contact">Contact</a>.</p>
        </details>

        <section class="acces-achat">
          <h2 class="section-title">{termine || actuelle ? "Pas encore ta nouvelle clé ?" : "Pas encore de clé ?"}</h2>
          <p>{PRIX_AVANT && <><s class="prix-avant">{PRIX_AVANT}</s> </>}<strong>{PRICE}</strong>, {PAYE} par Mobile Money.</p>
          {ACHAT_URL ? (
            <>
              <AchatLien class="btn btn-primary align-start" label={termine || actuelle ? `Renouveler, ${PRICE}` : `Acheter une clé, ${PRICE}`} />
              <CommentPayerBouton />
            </>
          ) : (
            <p class="small muted">Le paiement ouvre très bientôt.</p>
          )}
        </section>
      </div>
    </Page>
  );
}
