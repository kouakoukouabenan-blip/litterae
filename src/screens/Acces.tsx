import { useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { activer, licence, retirer } from "../lib/licence";
import { PRICE } from "../lib/access";
import { ACHAT_URL, lienAide, WHATSAPP } from "../lib/site";
import { AchatLien } from "../components/Achat";

/** Saisie de la clé reçue par e-mail après l'achat, ou état de l'accès complet. */
export function AccesScreen() {
  const actuelle = licence();
  const [cle, setCle] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "ok">("saisie");
  const [erreur, setErreur] = useState("");

  async function valider(e: Event) {
    e.preventDefault();
    if (etat === "envoi" || !cle.trim()) return;
    setEtat("envoi");
    setErreur("");
    const err = await activer(cle);
    if (err) {
      setErreur(err.message);
      setEtat("saisie");
    } else {
      setEtat("ok");
      // Recharge pour intégrer le contenu payant partout dans l'application.
      setTimeout(() => { location.hash = "#/cours"; location.reload(); }, 1200);
    }
  }

  if (actuelle && etat !== "ok")
    return (
      <Page title="Accès complet" back="#/cours">
        <div class="reading">
          <PageHeader eyebrow="Accès complet" title="Ton accès est actif">
            Tous les sujets corrigés et toutes les fiches d'œuvres sont ouverts sur cet appareil, même hors connexion.
          </PageHeader>
          <dl class="def">
            <dt>Clé</dt><dd class="mono">{actuelle.cle.replace(/.(?=.{4})/g, "•")}</dd>
          </dl>
          <p class="small muted acces-note">Ta clé fonctionne sur 3 appareils. Garde l'e-mail qui la contient pour la saisir sur un nouveau téléphone. Attention : effacer les données du navigateur compte comme un nouvel appareil. En cas de souci, <a href={lienAide("ma clé Litterae a atteint sa limite d'appareils")} target="_blank" rel="noopener">écris-nous</a>.</p>
          <button type="button" class="btn btn-secondary" onClick={() => { if (confirm("Retirer l'accès complet de cet appareil ? Tu pourras le réactiver avec ta clé.")) { retirer(); location.reload(); } }}>
            Retirer de cet appareil
          </button>
        </div>
      </Page>
    );

  return (
    <Page title="Clé d'accès" back="#/cours">
      <div class="reading">
        <PageHeader eyebrow="Accès complet" title="Saisir ma clé d'accès">
          Après ton achat, tu reçois par e-mail une clé comme <span class="mono">ABCD-1234-EFGH-5678</span>. Saisis-la ici pour tout débloquer.
          {ACHAT_URL && <> Tu n'as pas encore de clé ? <AchatLien label="Acheter une clé sur Chariow" /></>}
        </PageHeader>

        {etat === "ok" ? (
          <p class="notice notice-success" role="status"><Icon name="check" size={20} />Clé validée. Ouverture de l'accès complet…</p>
        ) : (
          <form class="key-form" onSubmit={valider} noValidate>
            <label class="field-label" for="cle">Clé d'accès</label>
            <input id="cle" class="input mono" value={cle} autocomplete="off" autocapitalize="characters" spellcheck={false}
              placeholder="ABCD-1234-EFGH-5678" aria-invalid={!!erreur} aria-describedby={erreur ? "cle-erreur" : undefined}
              onInput={e => { setCle((e.target as HTMLInputElement).value); setErreur(""); }} />
            {erreur && <p id="cle-erreur" class="field-error" role="alert"><Icon name="error" size={18} />{erreur}</p>}
            {erreur && ACHAT_URL && <p class="small">Tu n'as pas de clé valide ? <AchatLien label={`Acheter une clé, ${PRICE}`} /></p>}
            {erreur && <p class="small">Tu as payé et ta clé est refusée ? <a href={lienAide("ma clé Litterae est refusée")} target="_blank" rel="noopener">Écris-nous{WHATSAPP ? " sur WhatsApp" : ""}</a>, on règle ça.</p>}
            <button type="submit" class="btn btn-primary btn-block" disabled={!cle.trim() || etat === "envoi"}>
              {etat === "envoi" ? "Vérification…" : "Valider ma clé"}
            </button>
          </form>
        )}

        <section class="acces-aide" aria-labelledby="aide-title">
          <h2 id="aide-title" class="section-title">Je n'ai pas reçu ma clé</h2>
          <p>La clé arrive par e-mail quelques minutes après le paiement, à l'adresse donnée sur Chariow. Regarde aussi dans les dossiers <strong>Spam</strong> et <strong>Promotions</strong>.</p>
          <a class="btn btn-secondary align-start" href={lienAide("je n'ai pas reçu ma clé Litterae")} target="_blank" rel="noopener">
            {WHATSAPP ? "Nous écrire sur WhatsApp" : "Nous écrire par e-mail"}
          </a>
        </section>

        <section class="acces-achat">
          <h2 class="section-title">Pas encore de clé ?</h2>
          <p>L'accès complet coûte {PRICE}, payés une seule fois par Mobile Money. La clé arrive par e-mail juste après le paiement.</p>
          {ACHAT_URL ? (
            <AchatLien class="btn btn-primary align-start" label={`Acheter une clé, ${PRICE}`} />
          ) : (
            <p class="small muted">Le paiement ouvre très bientôt.</p>
          )}
        </section>
      </div>
    </Page>
  );
}
