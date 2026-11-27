import { useEffect, useState } from "preact/hooks";
import { Icon } from "./Icon";
import { appareilsCle, deconnecterAppareil, type AppareilsCle } from "../lib/licence";
import { dateFin } from "../lib/access";
import { lienAide, WHATSAPP } from "../lib/site";

const jour = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/**
 * Appareils où la clé est active, avec « Déconnecter » sur les autres (téléphone perdu, changé, prêté).
 * Limité par le serveur (1 fois par mois) pour qu'une clé ne passe pas de main en main.
 * « nouvelAppareil » : la clé est pleine et l'élève essaie de l'utiliser ici ; après la déconnexion, onPlace relance l'activation.
 */
export function MesAppareils({ cle, nouvelAppareil = false, onPlace }: { cle: string; nouvelAppareil?: boolean; onPlace?: () => void }) {
  const [d, setD] = useState<AppareilsCle | null | "chargement">("chargement");
  const [choisi, setChoisi] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { appareilsCle(cle).then(setD); }, [cle]);

  if (d === "chargement") return <p class="small muted">Chargement de tes appareils…</p>;
  if (!d) return <p class="small muted">Impossible d'afficher tes appareils pour l'instant. Vérifie ta connexion et réessaie.</p>;

  async function deconnecter(ref: string) {
    setEnvoi(true);
    setMessage("");
    const r = await deconnecterAppareil(cle, ref);
    setEnvoi(false);
    setChoisi(null);
    if (!r) { setMessage("La déconnexion n'a pas pu se faire. Vérifie ta connexion et réessaie."); return; }
    setD(r);
    if (r.erreur === "plus-de-retrait") { setMessage("Tu as déjà déconnecté un appareil ce mois-ci."); return; }
    if (r.erreur) { setMessage("Cet appareil n'est plus sur ta clé."); return; }
    setMessage(nouvelAppareil ? "Appareil déconnecté. Ouverture de ta clé ici…" : "Appareil déconnecté. Il perd l'accès complet dès sa prochaine connexion.");
    if (nouvelAppareil) onPlace?.();
  }

  const autres = d.appareils.filter(a => !a.moi);
  return (
    <div class="mes-appareils">
      {nouvelAppareil && <p>Déconnecte celui que tu n'utilises plus pour ouvrir ta clé sur ce téléphone.</p>}
      <ul class="appareils-liste">
        {d.appareils.map(a => (
          <li key={a.ref}>
            <Icon name="install_mobile" size={22} />
            <div class="appareil-corps">
              <span class="appareil-nom">{a.nom}</span>
              <span class="small muted">{a.moi ? "Ce téléphone" : `Vu le ${jour(a.dernier || a.premier)}`}</span>
            </div>
            {!a.moi && d.restants > 0 && choisi !== a.ref && (
              <button type="button" class="btn btn-secondary btn-small" disabled={envoi} onClick={() => { setChoisi(a.ref); setMessage(""); }}>Déconnecter</button>
            )}
            {choisi === a.ref && (
              <div class="appareil-confirmer">
                <span class="small">Il perdra l'accès complet.</span>
                <button type="button" class="btn btn-primary btn-small" disabled={envoi} onClick={() => deconnecter(a.ref)}>{envoi ? "…" : "Oui, déconnecter"}</button>
                <button type="button" class="btn btn-secondary btn-small" disabled={envoi} onClick={() => setChoisi(null)}>Annuler</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {message && <p class="small" role="status">{message}</p>}
      {autres.length > 0 && !(nouvelAppareil && message.startsWith("Appareil déconnecté")) && (d.restants > 0
        ? <p class="small muted">Tu peux déconnecter {d.parMois > 1 ? `${d.parMois} appareils` : "1 appareil"} par mois.</p>
        : <p class="small muted">Prochaine déconnexion possible le {d.prochain ? dateFin(d.prochain) : "mois prochain"}. Urgent ? <a href={lienAide("je dois déconnecter un appareil de ma clé Litterae")} target="_blank" rel="noopener">Écris-nous{WHATSAPP ? " sur WhatsApp" : ""}</a>.</p>)}
    </div>
  );
}
