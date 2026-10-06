import { useState } from "preact/hooks";
import { TexteLiens } from "./TexteLiens";
import type { Annotation } from "../lib/contact";

const NOMS: Record<Annotation["t"], string> = { commentaire: "Commentaire", souligne: "Souligné", barre: "Barré", surligne: "Surligné" };

/**
 * Copie de l'élève avec les annotations du prof : soulignés, barrés, surlignés et commentaires numérotés.
 * Toucher un numéro ouvre le commentaire juste sous le paragraphe. `debut` : où commence la copie dans le texte envoyé.
 */
export function CopieAnnotee({ texte, debut, annotations }: { texte: string; debut: number; annotations: Annotation[] }) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  let n = 0;
  const nums = annotations.map(a => a.t === "commentaire" ? ++n : 0);
  const commentaires = annotations.map((a, i) => ({ a, num: nums[i] })).filter(x => x.num);

  // Paragraphes de la copie, avec leur position dans le texte envoyé.
  const paragraphes: [number, number][] = [];
  const re = /\n\s*\n/g;
  let d = debut, m: RegExpExecArray | null;
  re.lastIndex = debut;
  while ((m = re.exec(texte))) { paragraphes.push([d, m.index]); d = m.index + m[0].length; }
  paragraphes.push([d, texte.length]);

  return (
    <div class="copie-annotee">
      {paragraphes.filter(([pd, pf]) => pf > pd).map(([pd, pf]) => {
        const bornes = [...new Set([pd, pf, ...annotations.flatMap(a => [a.d, a.f]).filter(x => x > pd && x < pf)])].sort((x, y) => x - y);
        const ici = commentaires.filter(({ a, num }) => a.f > pd && a.f <= pf && ouvert === num);
        return (
          <div key={pd}>
            <p class="copie-paragraphe">
              {bornes.slice(0, -1).map((bd, i) => {
                const bf = bornes[i + 1];
                const marques = [...new Set(annotations.filter(a => a.d <= bd && a.f >= bf).map(a => `m-${a.t}`))].join(" ");
                return (
                  <span key={bd}>
                    <span class={marques || undefined}>{texte.slice(bd, bf)}</span>
                    {commentaires.filter(({ a }) => a.f === bf).map(({ num }) => (
                      <button key={num} type="button" class="annot-num" aria-expanded={ouvert === num}
                        aria-label={`Commentaire ${num}`} onClick={() => setOuvert(o => o === num ? null : num)}>{num}</button>
                    ))}
                  </span>
                );
              })}
            </p>
            {ici.map(({ a, num }) => <p key={num} class="annot-bulle"><strong>{num}.</strong> <TexteLiens text={a.c ?? ""} /></p>)}
          </div>
        );
      })}
      {annotations.length > 0 && (
        <details class="repli annot-tout">
          <summary>Toutes les annotations ({annotations.length})</summary>
          <ol class="annot-liste">
            {annotations.map((a, i) => (
              <li key={i}>
                <span class={`annot-type m-${a.t}`}>{a.t === "commentaire" ? nums[i] : NOMS[a.t]}</span>
                <span><em>« {texte.slice(a.d, a.f)} »</em>{a.c && <> {a.c}</>}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
