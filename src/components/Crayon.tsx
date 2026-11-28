import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useStored } from "../lib/storage";
import { Icon } from "./Icon";
import { Texte } from "./Texte";

/**
 * Le crayon : l'élève travaille sur le texte comme sur une feuille.
 * Souligner, entourer, encadrer un mot ou un passage, écrire une annotation, gommer.
 * On touche le premier mot, puis le dernier (le même mot deux fois pour un seul mot).
 * Le travail est gardé sur le téléphone, par texte (clé `crayon:<id>`), et retrouvé partout où ce texte s'ouvre.
 */

type Outil = "souligner" | "entourer" | "encadrer" | "note" | "gomme";
interface Trait { id: number; type: Exclude<Outil, "gomme">; d: number; f: number; c: number; note?: string }

const COULEURS = ["bleu", "rouge", "vert"] as const;
const NOMS_COULEURS = ["Bleu", "Rouge", "Vert"];

/** Petits dessins des outils, à la main, comme sur une trousse. */
const Dessin = ({ outil }: { outil: Outil }) => {
  const c: Record<Outil, JSX.Element> = {
    souligner: <><text x="12" y="15" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">ab</text><path d="M4 19.5h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></>,
    entourer: <><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">ab</text><ellipse cx="12" cy="12.5" rx="10" ry="7.5" fill="none" stroke="currentColor" stroke-width="2" /></>,
    encadrer: <><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">ab</text><rect x="2.5" y="5" width="19" height="15" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" /></>,
    note: <><path d="M5 4h14v11l-5 5H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><path d="M8 9h8M8 12.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></>,
    gomme: <><path d="M14.5 4.5l5 5-9 9H6l-2.5-2.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><path d="M10 9l5 5M11 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></>
  };
  return <svg class="crayon-dessin" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">{c[outil]}</svg>;
};

const OUTILS: { id: Outil; label: string }[] = [
  { id: "souligner", label: "Souligner" },
  { id: "entourer", label: "Entourer" },
  { id: "encadrer", label: "Encadrer" },
  { id: "note", label: "Annoter" },
  { id: "gomme", label: "Gommer" }
];

/** Les mots du texte, numérotés d'un bout à l'autre ; les paragraphes sont séparés par une ligne vide. */
function decouper(texte: string) {
  let n = 0;
  return texte.split(/\n\s*\n/).map(p => p.split(/\s+/).filter(Boolean).map(m => ({ i: n++, m })));
}

/** reference : l'auteur et la source, écrits sous le texte comme dans les sujets d'examen. */
export function TexteCrayon({ id, texte, note, reference }: { id: string; texte: string; note?: string; reference?: string }) {
  const [traits, setTraits] = useStored<Trait[]>(`crayon:${id}`, []);
  const [actif, setActif] = useState(false);
  const [outil, setOutil] = useState<Outil>("souligner");
  const [couleur, setCouleur] = useState(0);
  const [debut, setDebut] = useState<number | null>(null);
  // Annotation en cours d'écriture : un nouveau passage, ou une annotation déjà posée.
  const [edition, setEdition] = useState<{ d: number; f: number; id?: number; texte: string } | null>(null);
  const [effacerTout, setEffacerTout] = useState(false);
  const pars = decouper(texte);

  const prochainId = () => traits.reduce((m, t) => Math.max(m, t.id), 0) + 1;
  const couvre = (t: Trait, i: number) => i >= t.d && i <= t.f;

  function toucher(i: number) {
    if (!actif) return;
    if (outil === "gomme") {
      const dessus = traits.filter(t => couvre(t, i)).sort((a, b) => b.id - a.id)[0];
      if (dessus) setTraits(traits.filter(t => t !== dessus));
      return;
    }
    if (debut == null) { setDebut(i); return; }
    const d = Math.min(debut, i), f = Math.max(debut, i);
    setDebut(null);
    if (outil === "note") { setEdition({ d, f, texte: "" }); return; }
    // Le même trait posé deux fois au même endroit : on ne le double pas.
    const autres = traits.filter(t => !(t.type === outil && t.d === d && t.f === f));
    setTraits([...autres, { id: prochainId(), type: outil, d, f, c: couleur }]);
  }

  function enregistrerNote() {
    if (!edition) return;
    const texteNote = edition.texte.trim();
    if (edition.id != null) {
      setTraits(texteNote ? traits.map(t => t.id === edition.id ? { ...t, note: texteNote } : t) : traits.filter(t => t.id !== edition.id));
    } else if (texteNote) {
      setTraits([...traits, { id: prochainId(), type: "note", d: edition.d, f: edition.f, c: couleur, note: texteNote }]);
    }
    setEdition(null);
  }

  const notes = traits.filter(t => t.type === "note").sort((a, b) => a.d - b.d);
  const numeroNote = (t: Trait) => notes.indexOf(t) + 1;

  /** Les mots d'un passage, avec les cadres et les cercles qu'il contient (les plus grands autour des plus petits). */
  function rendre(mots: { i: number; m: string }[], cadres: Trait[]): (JSX.Element | string)[] {
    if (!mots.length) return [];
    const a = mots[0].i, b = mots[mots.length - 1].i;
    const ici = cadres.filter(t => t.f >= a && t.d <= b);
    const dedans = (x: Trait, y: Trait) => x !== y && y.d <= x.d && x.f <= y.f && !(y.d === x.d && y.f === x.f && y.id > x.id);
    const hauts = ici.filter(x => !ici.some(y => dedans(x, y))).sort((x, y) => x.d - y.d || x.id - y.id);
    const out: (JSX.Element | string)[] = [];
    let k = 0, fin = a - 1;
    for (const h of hauts) {
      const d = Math.max(h.d, fin + 1, a), f = Math.min(h.f, b);
      if (d > f) continue;
      while (k < mots.length && mots[k].i < d) { out.push(mot(mots[k], k + 1 < mots.length)); k++; }
      const groupe = mots.filter(x => x.i >= d && x.i <= f);
      k += groupe.length;
      out.push(<span key={`c${h.id}-${d}`} class={`crayon-${h.type} encre-${COULEURS[h.c]}`}>{rendre(groupe, ici.filter(x => x !== h && dedans(x, h)))}</span>);
      if (k < mots.length) out.push(" ");
      fin = f;
    }
    while (k < mots.length) { out.push(mot(mots[k], k + 1 < mots.length)); k++; }
    return out;
  }

  /** Un mot, son soulignement ou son annotation, et l'espace qui le suit. */
  function mot(w: { i: number; m: string }, espace: boolean) {
    const s = traits.filter(t => (t.type === "souligner" || t.type === "note") && couvre(t, w.i)).sort((a, b) => b.id - a.id)[0];
    const lie = s && couvre(s, w.i + 1);
    const finNote = traits.filter(t => t.type === "note" && t.f === w.i);
    const classe = s ? `crayon-${s.type === "note" ? "annote" : "souligne"} encre-${COULEURS[s.c]}` : "";
    return (
      <span key={w.i}>
        <span data-i={w.i} class={`crayon-mot ${classe}${debut === w.i ? " crayon-debut" : ""}`}>{w.m}</span>
        {finNote.map(t => (
          <button key={t.id} type="button" class={`crayon-appel encre-${COULEURS[t.c]}`} aria-label={`Annotation ${numeroNote(t)}`}
            onClick={e => { e.stopPropagation(); setEdition({ d: t.d, f: t.f, id: t.id, texte: t.note ?? "" }); }}>{numeroNote(t)}</button>
        ))}
        {espace && <span class={lie ? classe : undefined}>{" "}</span>}
      </span>
    );
  }

  const cadres = traits.filter(t => t.type === "entourer" || t.type === "encadrer");
  const motsDe = (d: number, f: number) => pars.flat().filter(w => w.i >= d && w.i <= f).map(w => w.m).join(" ");

  return (
    <div class={`crayon ${actif ? "is-actif" : ""}`}>
      {!actif ? (
        // Reste à portée de main pendant qu'on fait défiler le texte.
        <div class="crayon-prendre-zone">
          <span class="crayon-prendre-aide">Souligne, entoure, annote…</span>
          <button type="button" class="crayon-prendre" onClick={() => setActif(true)}>
            <Icon name="edit" size={18} />Crayon
          </button>
        </div>
      ) : (
        <div class="crayon-barre">
          <div class="crayon-ligne" role="toolbar" aria-label="Crayon">
            {OUTILS.map(o => (
              <button key={o.id} type="button" class="crayon-outil" aria-pressed={outil === o.id} title={o.label} aria-label={o.label}
                onClick={() => { setOutil(o.id); setDebut(null); }}>
                <Dessin outil={o.id} />
              </button>
            ))}
            <span class="crayon-sep" aria-hidden="true" />
            <button type="button" class={`crayon-couleur encre-${COULEURS[couleur]}`} title="Changer de couleur"
              aria-label={`Couleur : ${NOMS_COULEURS[couleur]}. Toucher pour changer`} onClick={() => setCouleur((couleur + 1) % COULEURS.length)} />
            <button type="button" class="crayon-outil" title="Annuler le dernier trait" aria-label="Annuler le dernier trait" disabled={!traits.length}
              onClick={() => setTraits(traits.filter(t => t.id !== prochainId() - 1))}>
              <svg class="crayon-dessin" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H5v-4M5.5 7A8 8 0 1 1 4 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <button type="button" class="crayon-outil" title="Ranger le crayon" aria-label="Ranger le crayon" onClick={() => { setActif(false); setDebut(null); setEffacerTout(false); }}>
              <Icon name="close" size={20} />
            </button>
          </div>
          <p class="crayon-aide" role="status">
            {OUTILS.find(o => o.id === outil)!.label} · {outil === "gomme" ? "touche un mot pour effacer ce qui est dessus."
              : debut != null ? "touche le dernier mot (ou le même)."
              : "touche le premier mot, puis le dernier."}
            {traits.length > 0 && !effacerTout && <button type="button" class="crayon-lien" onClick={() => setEffacerTout(true)}>Tout effacer</button>}
          </p>
          {effacerTout && (
            <div class="crayon-confirmer" role="alert">
              <span>Effacer tout ton travail sur ce texte ?</span>
              <button type="button" class="crayon-petit danger" onClick={() => { setTraits([]); setEffacerTout(false); }}>Effacer</button>
              <button type="button" class="crayon-petit" onClick={() => setEffacerTout(false)}>Non</button>
            </div>
          )}
        </div>
      )}

      <div class="crayon-texte" onClick={e => {
        const i = (e.target as HTMLElement).dataset?.i;
        if (i != null) toucher(Number(i));
      }}>
        {pars.map((p, k) => <p key={k}>{rendre(p, cadres)}</p>)}
        {reference && <p class="crayon-reference"><Texte text={reference} /></p>}
        {note && <p class="crayon-source-note">{note}</p>}
      </div>

      {notes.length > 0 && (
        <section class="crayon-notes" aria-label="Mes annotations">
          <h3 class="crayon-notes-titre">Mes annotations</h3>
          <ol>
            {notes.map(t => (
              <li key={t.id}>
                <button type="button" class="crayon-note-ligne" onClick={() => setEdition({ d: t.d, f: t.f, id: t.id, texte: t.note ?? "" })}>
                  <span class={`crayon-appel encre-${COULEURS[t.c]}`}>{numeroNote(t)}</span>
                  <span><span class="crayon-cite">« {motsDe(t.d, t.f)} »</span>{t.note}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {edition && (
        <div class="crayon-feuille" role="dialog" aria-label="Annotation">
          <p class="crayon-cite">« {motsDe(edition.d, edition.f)} »</p>
          <textarea class="crayon-zone" rows={3} placeholder="Ce que tu remarques ici…" value={edition.texte} autoFocus
            onInput={e => setEdition({ ...edition, texte: (e.target as HTMLTextAreaElement).value })} />
          <div class="crayon-feuille-boutons">
            <button type="button" class="btn btn-primary" onClick={enregistrerNote}>Enregistrer</button>
            {edition.id != null && <button type="button" class="btn btn-secondary" onClick={() => { setTraits(traits.filter(t => t.id !== edition.id)); setEdition(null); }}>Supprimer</button>}
            <button type="button" class="btn btn-secondary" onClick={() => setEdition(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
