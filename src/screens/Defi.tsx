import { useEffect, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { AchatLien } from "../components/Achat";
import { SUJETS, estComplet, oeuvresCitees } from "../lib/data";
import { useAccess } from "../lib/access";
import { numero } from "../lib/entrainement";
import { lireBrouillon, brouillonVide } from "../lib/atelier";
import { write } from "../lib/storage";
import { jourLocal } from "../lib/progres";
import { DUREE_DEFI, enregistrerDefi, fonctionsDuSujet, oeuvresPourSujet, sujetDuJour, useDefis, verifierOeuvres, type ReponseDefi } from "../lib/defi";
import { noterErreurQuiz } from "../lib/interets";
import { OEUVRES } from "../lib/data";

/** Nom de la fonction dans une phrase. */
const NOM: Record<string, string> = { Engagement: "d'engagement", Sociale: "sociale", Esthétique: "esthétique", Évasion: "d'évasion", Lyrique: "lyrique" };

const minutes = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Défi du jour : 5 minutes, deux arguments, deux œuvres, puis le corrigé pour comparer. */
export function DefiScreen() {
  const sujet = sujetDuJour();
  const [defis] = useDefis();
  const jour = jourLocal();
  const deja = defis[jour]?.num === sujet.num ? defis[jour] : undefined;
  const [r, setR] = useState<ReponseDefi>(deja ?? { num: sujet.num, args: ["", ""], oeuvres: ["", ""], fini: false });
  const [reste, setReste] = useState(DUREE_DEFI);
  useEffect(() => {
    if (r.fini) return;
    const debut = Date.now();
    const t = setInterval(() => setReste(Math.max(0, DUREE_DEFI - Math.round((Date.now() - debut) / 1000))), 1000);
    return () => clearInterval(t);
  }, [r.fini]);

  const maj = (p: Partial<ReponseDefi>) => { const n = { ...r, ...p }; setR(n); enregistrerDefi(n); };
  const champ = (cle: "args" | "oeuvres", i: number, v: string) => maj({ [cle]: r[cle].map((x, j) => (j === i ? v : x)) });
  const pret = r.args.some(a => a.trim()) && r.oeuvres.some(o => o.trim());

  return (
    <Page title="Défi du jour" back="#/accueil">
      <article class="reading defi">
        <header class="page-header">
          <p class="eyebrow">Défi du jour · Sujet {numero(sujet.num)}</p>
          <blockquote class="citation citation-lg">« {sujet.citation} »</blockquote>
          <p class="small muted">{sujet.auteur}. {sujet.consigne}</p>
        </header>

        {!r.fini ? (
          <>
            <p class={`defi-chrono${reste === 0 ? " defi-chrono-fini" : ""}`} role="timer" aria-live="off">
              <Icon name="edit" size={18} />{reste ? `${minutes(reste)} pour trouver 2 arguments et 2 œuvres` : "Temps écoulé : termine quand tu veux"}
            </p>
            <datalist id="titres-oeuvres">{OEUVRES.map(w => <option key={w.id} value={w.titre} />)}</datalist>
            <div class="defi-champs">
              {[0, 1].map(i => (
                <fieldset key={i} class="defi-bloc">
                  <legend class="field-label">Argument {i + 1}</legend>
                  <textarea class="textarea" rows={2} value={r.args[i]} placeholder={i ? "Une nuance ou l'autre point de vue" : "Une idée qui explique la citation"}
                    onInput={e => champ("args", i, (e.target as HTMLTextAreaElement).value)} />
                  <input class="input input-texte" list="titres-oeuvres" value={r.oeuvres[i]} placeholder="Une œuvre pour l'illustrer"
                    aria-label={`Œuvre pour l'argument ${i + 1}`} onInput={e => champ("oeuvres", i, (e.target as HTMLInputElement).value)} />
                </fieldset>
              ))}
            </div>
            <button type="button" class="btn btn-primary btn-block" disabled={!pret} onClick={() => maj({ fini: true })}>J'ai fini, comparer</button>
            {!pret && <p class="small muted">Écris au moins un argument et une œuvre.</p>}
          </>
        ) : (
          <Comparaison r={r} />
        )}
      </article>
    </Page>
  );
}

function Comparaison({ r }: { r: ReponseDefi }) {
  const { premium, canOpenSubject } = useAccess();
  const i = SUJETS.findIndex(s => s.num === r.num);
  const s = SUJETS[i];
  const corrige = s && estComplet(s) && canOpenSubject(i) ? s : null;
  const citees = corrige ? oeuvresCitees(corrige) : [];
  const autres = oeuvresPourSujet(r.num).filter(w => !citees.some(c => c.id === w.id));
  // Les œuvres tapées par l'élève vont-elles avec la fonction du sujet ? Une erreur fait revenir la bonne fiche sur l'accueil.
  const verif = verifierOeuvres(r);
  const attendue = NOM[fonctionsDuSujet(r.num)[0]] ?? "";
  useEffect(() => { for (const v of verif) if (v.mieux) noterErreurQuiz(`defi:${v.mieux.id}`); }, []);
  const lien = (id: string) => `#/oeuvres/${encodeURIComponent(id)}`;

  /** L'atelier reprend les arguments et les œuvres du défi si le brouillon de ce sujet est vide. */
  function rediger() {
    if (!lireBrouillon(r.num)) {
      const b = brouillonVide();
      b.axe1.args = r.args.map((arg, j) => ({ arg, expl: "", ex: r.oeuvres[j] ?? "" }));
      write(`atelier:${r.num}`, { ...b, modifie: Date.now() });
    }
    location.hash = `#/entrainement/${r.num}?etape=1`;
  }

  return (
    <div class="defi-resultat">
      <p class="defi-bravo" role="status"><Icon name="check" size={20} />Défi relevé. Reviens demain pour un nouveau sujet.</p>

      <section>
        <h2 class="section-title">Ta réponse</h2>
        <ul class="defi-liste">
          {r.args.map((a, j) => (a.trim() || r.oeuvres[j]?.trim()) && (
            <li key={j}><strong>{a.trim() || "Argument"}</strong>{r.oeuvres[j]?.trim() && <span class="muted"> · {r.oeuvres[j]}</span>}</li>
          ))}
        </ul>
      </section>

      {verif.length > 0 && (
        <section>
          <h2 class="section-title">Tes œuvres pour ce sujet</h2>
          <ul class="defi-verif">
            {verif.map(v => (
              <li key={v.oeuvre.id} class={v.va ? "defi-verif-ok" : "defi-verif-revoir"}>
                <Icon name={v.va ? "check" : "info"} size={18} />
                <span>
                  <a href={lien(v.oeuvre.id)}><cite>{v.oeuvre.titre}</cite></a>
                  {v.va ? ` va avec ce sujet (fonction ${attendue}).` : <> illustre surtout la fonction {NOM[v.oeuvre.fonctions[0]]}, alors que le sujet attend la fonction {attendue}.
                    {v.mieux && <> Pense plutôt à <a href={lien(v.mieux.id)}><cite>{v.mieux.titre}</cite></a>.</>}</>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {corrige ? (
        <section>
          <h2 class="section-title">Le plan du corrigé</h2>
          {[corrige.axe1, corrige.axe2].map(axe => (
            <div key={axe.titre} class="defi-axe">
              <p class="defi-axe-titre">{axe.titre}</p>
              <ul class="defi-liste">{axe.args.map(a => <li key={a.titre}>{a.titre}</li>)}</ul>
            </div>
          ))}
          {citees.length > 0 && <p class="small">Œuvres citées : {citees.map((w, j) => <>{j ? ", " : ""}<a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a></>)}.</p>}
          <a class="link-strong" href={`#/sujets/${r.num}`}>Lire le corrigé complet</a>
        </section>
      ) : (
        <p class="small muted">{premium || r.num.startsWith("e") ? "Ce sujet n'a pas de corrigé : compare avec les œuvres ci-dessous." : <>Le corrigé de ce sujet fait partie de l'accès complet. <AchatLien label="Le débloquer" /></>}</p>
      )}

      {autres.length > 0 && (
        <section>
          <h2 class="section-title">D'autres œuvres pour ce sujet</h2>
          <ul class="defi-liste">
            {autres.map(w => <li key={w.id}><a href={`#/oeuvres/${encodeURIComponent(w.id)}`}><cite>{w.titre}</cite></a><span class="muted"> · {w.auteur}</span></li>)}
          </ul>
        </section>
      )}

      <button type="button" class="btn btn-secondary align-start" onClick={rediger}>Rédiger ce sujet dans l'atelier</button>
    </div>
  );
}
