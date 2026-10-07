import { useMemo, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { copyText } from "../components/Toast";
import { adresse } from "../components/Partager";
import { OEUVRES } from "../lib/data";
import { graine, melanger, questionOeuvre } from "../lib/revisions";
import { marquer } from "../lib/progres";
import { noter } from "../lib/stats";
import { repondreEclair } from "../lib/collection";
import type { QuestionQuiz } from "../data/types";

const NB = 5;

/** Les 5 questions d'un défi : les mêmes pour les deux amis grâce au numéro du défi (dans le lien). */
function questionsDuDefi(numero: number): QuestionQuiz[] {
  const out: QuestionQuiz[] = [];
  const oeuvres = melanger(OEUVRES.filter(w => w.detaillee && w.niveaux?.length).sort((a, b) => a.id.localeCompare(b.id)), numero);
  for (const [i, w] of oeuvres.entries()) {
    if (out.length >= NB) break;
    const q = questionOeuvre(w, (numero + i) % 2);
    if (q) out.push(q);
  }
  return out;
}

/**
 * Défie un ami : 5 questions sur les œuvres, puis un lien à envoyer avec son score.
 * L'ami ouvre le lien, répond aux mêmes questions et voit qui a gagné. Rien ne passe par le serveur.
 */
export function DuelScreen({ params }: { params: URLSearchParams }) {
  const numero = useMemo(() => Number(params.get("g")) || graine(String(Date.now())) % 100000, []);
  const scoreAmi = params.has("s") ? Math.max(0, Math.min(NB, Number(params.get("s")) || 0)) : null;
  const questions = useMemo(() => questionsDuDefi(numero), [numero]);
  const [n, setN] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const fini = n >= questions.length;

  function repondre(i: number) {
    if (choix !== null) return;
    setChoix(i);
    const juste = i === questions[n].bonne;
    if (juste) setScore(score + 1);
    repondreEclair(juste);
  }
  function suivante() {
    if (n + 1 >= questions.length) { marquer(`duel:${numero}`); noter({ t: "suggestion", ref: "clic:duel" }); }
    setN(n + 1);
    setChoix(null);
  }
  async function defier() {
    const lien = adresse(`#/duel?g=${numero}&s=${score}`);
    const texte = `J'ai eu ${score}/${NB} au quiz des œuvres sur Litterae. À toi de jouer : tu peux faire mieux ?`;
    if (navigator.share) { try { await navigator.share({ title: "Défi Litterae", text: texte, url: lien }); } catch { /* annulé */ } return; }
    copyText(`${texte}\n${lien}`, "Texte et lien copiés : colle-les dans WhatsApp.");
  }

  const q = questions[n];
  return (
    <Page title="Défie un ami" back="#/accueil">
      <div class="reading revisions">
        <PageHeader title="Défie un ami" compact>
          {scoreAmi !== null ? `Ton ami a eu ${scoreAmi}/${NB}. Fais mieux !` : `${NB} questions sur les œuvres, puis envoie ton score à un ami.`}
        </PageHeader>
        {fini ? (
          <div class="quiz-card quiz-fin" role="status">
            <p class="quiz-score">{score} / {NB}</p>
            {scoreAmi !== null && <p><strong>{score > scoreAmi ? "Tu as gagné !" : score === scoreAmi ? "Égalité." : "Ton ami a gagné cette fois."}</strong> Ton ami avait {scoreAmi}/{NB}.</p>}
            <button type="button" class="btn btn-primary align-start" onClick={defier}><Icon name="groups" size={20} />{scoreAmi !== null ? "Lui renvoyer ton score" : "Envoyer à un ami"}</button>
            <button type="button" class="btn btn-secondary align-start" onClick={() => { location.hash = `#/duel?g=${(numero * 7919 + 13) % 100000}`; location.reload(); }}>Un autre défi</button>
          </div>
        ) : q ? (
          <>
            <p class="small muted revisions-compte">Question {n + 1} sur {questions.length}</p>
            <span class="progress-bar" aria-hidden="true"><span style={{ width: `${(n / questions.length) * 100}%` }} /></span>
            <div class="quiz-card carte-revision">
              <p class="quiz-q">{q.q}</p>
              <ul class="quiz-choix">
                {q.choix.map((c, i) => {
                  const etat = choix === null ? "" : i === q.bonne ? "ok" : i === choix ? "faux" : "";
                  return <li key={c}><button type="button" class={`quiz-option ${etat}`} disabled={choix !== null} onClick={() => repondre(i)}><span>{c}</span>
                    {etat === "ok" && <Icon name="check" size={20} />}{etat === "faux" && <Icon name="close" size={20} />}</button></li>;
                })}
              </ul>
              {choix !== null && (
                <div class="quiz-correction" role="status">
                  <p><strong>{choix === q.bonne ? "Bonne réponse." : "Pas tout à fait."}</strong> {q.pourquoi}</p>
                  <button type="button" class="btn btn-primary align-start" onClick={suivante}>{n + 1 < questions.length ? "Question suivante" : "Voir mon score"}</button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Page>
  );
}
