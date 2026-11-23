import { useEffect, useState } from "preact/hooks";
import { Icon } from "./Icon";
import {
  adresseSonde, codeLisible, marquerNoteVue, noteLisible, noterSonde, quand, sondeAFaire, useCodesAffiches, useDevoirsComposa, useNoteAVoir,
} from "../lib/composa";

/** Haut de l'accueil : la note publiée (si l'élève ne l'a pas encore vue), puis le devoir en cours. */
export function TuileDevoirs() {
  return <><LigneNote /><LigneDevoir /><SondeComposa /></>;
}

/** Note publiée par le professeur : une ligne, la note à droite ; la toucher ouvre la correction. */
function LigneNote() {
  const n = useNoteAVoir();
  if (!n) return null;
  return (
    <a class="devoir-ligne devoir-ligne-note" href={`#/composa?salle=${n.id}&vue=resultat`} onClick={() => marquerNoteVue(n.id)}
      aria-label={`${n.titre} : ta note est ${noteLisible(n)}. Voir la correction`}>
      <span class="devoir-ligne-texte">
        <span class="devoir-ligne-sur">Ta note est arrivée</span>
        <span class="devoir-ligne-titre">{n.titre}</span>
      </span>
      <span class="devoir-ligne-note-valeur">{noteLisible(n)}</span>
    </a>
  );
}

/**
 * Cadre invisible vers COMPOSA, de temps en temps (élève qui a déjà ouvert l'espace Devoirs) :
 * COMPOSA renvoie les devoirs et les notes, puis le cadre est retiré.
 */
function SondeComposa() {
  const [actif, setActif] = useState(() => sondeAFaire());
  useEffect(() => {
    if (!actif) return;
    noterSonde();
    const fin = () => setActif(false);
    window.addEventListener("composa-recu", fin);
    const delai = setTimeout(fin, 30000);
    return () => { window.removeEventListener("composa-recu", fin); clearTimeout(delai); };
  }, [actif]);
  if (!actif) return null;
  return <iframe class="composa-sonde" src={adresseSonde()} title="" aria-hidden="true" tabIndex={-1} />;
}

/**
 * Seulement quand il y a un devoir : une ligne compacte.
 * Devoir dont le professeur affiche le code : le code, et toucher la ligne fait entrer avec.
 * Devoir déjà rejoint : « Composer ».
 */
function LigneDevoir() {
  const rejoints = useDevoirsComposa();
  const affiches = useCodesAffiches();
  const dejaLa = new Set(rejoints.map(d => d.id));
  const aRejoindre = affiches.find(d => !dejaLa.has(d.id));
  const rejoint = rejoints[0];
  // Un devoir déjà commencé ou ouvert passe d'abord ; sinon le code à entrer.
  if (rejoint && (rejoint.etat !== "a_venir" || !aRejoindre)) {
    const ouvert = rejoint.etat !== "a_venir";
    return (
      <a class="devoir-ligne" href={`#/composa?salle=${rejoint.id}`}>
        <span class="devoir-ligne-texte">
          <span class="devoir-ligne-sur">{rejoint.etat === "a_terminer" ? "À terminer" : ouvert ? "En cours" : "Programmé"} · {quand(rejoint)}</span>
          <span class="devoir-ligne-titre">{rejoint.titre}</span>
        </span>
        <span class="devoir-ligne-action">{ouvert ? "Composer" : "Voir"}</span>
      </a>
    );
  }
  if (!aRejoindre) return null;
  const ouvert = Date.parse(aRejoindre.ouverture_at) <= Date.now();
  return (
    <a class="devoir-ligne" href={`#/composa?code=${aRejoindre.code}`} aria-label={`${aRejoindre.titre}, code ${codeLisible(aRejoindre.code)}, entrer dans le devoir`}>
      <span class="devoir-ligne-texte">
        <span class="devoir-ligne-sur">{ouvert ? "En cours" : "Programmé"} · {quand(aRejoindre)}</span>
        <span class="devoir-ligne-titre">{aRejoindre.titre}</span>
      </span>
      <span class="devoir-ligne-code"><span class="devoir-ligne-code-mot">Code</span>{codeLisible(aRejoindre.code)}</span>
    </a>
  );
}

/** Entrée discrète vers l'espace Devoirs, en bas de l'accueil (pour taper un code reçu du professeur). */
export function LienDevoirs() {
  return (
    <a class="devoirs-lien" href="#/composa">
      <Icon name="fact_check" size={20} />
      <span>Devoirs de ton professeur</span>
      <Icon name="chevron_right" size={20} />
    </a>
  );
}
