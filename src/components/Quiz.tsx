import { Texte } from "./Texte";
import { useState } from "preact/hooks";
import apercu from "../data/quiz-apercu.json";
import libres from "../data/quiz-libre.json";
import type { QuestionQuiz } from "../data/types";
import { activer, licence } from "../lib/licence";
import { PRICE } from "../lib/access";
import { useStored } from "../lib/storage";
import { plural } from "../lib/text";
import { AchatLien } from "./Achat";
import { Icon } from "./Icon";
import { ajouterCarte, cleQuiz } from "../lib/revisions";
import { marquer } from "../lib/progres";
import { useVerrou } from "./LockPanel";
import { contenuLibre } from "../lib/libre";

const NOMBRES = apercu as Record<string, number>;
/** Quiz offert à tous (le premier), pour découvrir l'entraînement. */
const LIBRES = libres as Record<string, QuestionQuiz[]>;

/** Quiz en bas d'une leçon : le premier est offert, les autres font partie de l'accès complet. */
export function QuizLecon({ id }: { id: string }) {
  // Leçons du guide : nombre publié avec le site ; leçons ajoutées : nombre donné par le tableau de bord.
  const nombre = NOMBRES[id] ?? contenuLibre()?.ajouts?.lecons.find(l => l.id === id)?.quiz;
  if (!nombre) return null;
  const l = licence();
  const offert = LIBRES[id]?.length ? LIBRES[id] : undefined;
  const questions = offert ?? l?.contenu.quiz?.[id];

  return (
    <section class="quiz" aria-labelledby="quiz-title">
      <p class="eyebrow">Quiz · {plural(nombre, "question")}{offert && !l ? " · offert" : ""}</p>
      <h2 id="quiz-title" class="section-title">Vérifie ce que tu as retenu</h2>
      {questions ? <Questions id={id} questions={questions} /> : l ? <MiseAJour cle={l.cle} /> : <Verrou nombre={nombre} />}
    </section>
  );
}

function Verrou({ nombre }: { nombre: number }) {
  useVerrou("quiz");
  return (
    <div class="quiz-lock">
      <p><Icon name="lock" size={18} /> Les {nombre} questions de ce quiz, avec la correction expliquée, font partie de l'accès complet ({PRICE}, une seule fois).</p>
      <div class="lock-actions">
        <AchatLien class="btn btn-primary" label={`Acheter une clé, ${PRICE}`} />
        <a class="btn btn-secondary" href="#/acces">J'ai une clé d'accès</a>
      </div>
    </div>
  );
}

/** Clé activée avant l'arrivée des quiz : on redemande le contenu au serveur (sans utiliser de place d'appareil). */
function MiseAJour({ cle }: { cle: string }) {
  const [etat, setEtat] = useState<"" | "envoi" | string>("");
  async function maj() {
    setEtat("envoi");
    const err = await activer(cle);
    if (err) setEtat(err.message);
    else location.reload();
  }
  return (
    <div class="quiz-lock">
      <p>Les quiz sont arrivés après l'activation de ta clé. Mets ton accès à jour pour les recevoir.</p>
      <button type="button" class="btn btn-primary align-start" disabled={etat === "envoi"} onClick={maj}>
        {etat === "envoi" ? "Mise à jour…" : "Mettre à jour mon accès"}
      </button>
      {etat && etat !== "envoi" && <p class="field-error" role="alert"><Icon name="error" size={18} />{etat}</p>}
    </div>
  );
}

function Questions({ id, questions }: { id: string; questions: QuestionQuiz[] }) {
  const [n, setN] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [meilleurs, setMeilleurs] = useStored<Record<string, number>>("quiz-meilleurs", {});
  const fini = n >= questions.length;

  function repondre(i: number) {
    if (choix !== null) return;
    setChoix(i);
    if (i === questions[n].bonne) setScore(score + 1);
    // La question reviendra dans les révisions (demain si l'élève s'est trompé).
    ajouterCarte(cleQuiz(id, n), i === questions[n].bonne);
    marquer(`quiz:${id}`);
  }
  function suivante() {
    const dernier = n + 1 >= questions.length;
    if (dernier && score > (meilleurs[id] ?? -1)) setMeilleurs({ ...meilleurs, [id]: score });
    setN(n + 1);
    setChoix(null);
  }
  function recommencer() {
    setN(0); setChoix(null); setScore(0);
  }

  if (fini)
    return (
      <div class="quiz-card quiz-fin" role="status">
        <p class="quiz-score">{score} / {questions.length}</p>
        <p>{score === questions.length ? "Parfait, tu maîtrises cette leçon." : score >= questions.length / 2 ? "Bien. Relis les points manqués, puis refais le quiz." : "Relis la leçon, puis refais le quiz."}</p>
        {meilleurs[id] !== undefined && <p class="small muted">Meilleur score : {meilleurs[id]} / {questions.length}</p>}
        <button type="button" class="btn btn-secondary align-start" onClick={recommencer}>Recommencer</button>
      </div>
    );

  const q = questions[n];
  const juste = choix === q.bonne;
  return (
    <div class="quiz-card">
      <p class="small muted">Question {n + 1} sur {questions.length}</p>
      <p class="quiz-q"><Texte text={q.q} /></p>
      <ul class="quiz-choix">
        {q.choix.map((c, i) => {
          const etat = choix === null ? "" : i === q.bonne ? "ok" : i === choix ? "faux" : "";
          return (
            <li key={c}>
              <button type="button" class={`quiz-option ${etat}`} disabled={choix !== null} aria-pressed={choix === i} onClick={() => repondre(i)}>
                <span>{c}</span>
                {etat === "ok" && <Icon name="check" size={20} />}
                {etat === "faux" && <Icon name="close" size={20} />}
              </button>
            </li>
          );
        })}
      </ul>
      {choix !== null && (
        <div class="quiz-correction" role="status">
          <p><strong>{juste ? "Bonne réponse." : "Pas tout à fait."}</strong> <Texte text={q.pourquoi} /></p>
          <button type="button" class="btn btn-primary align-start" onClick={suivante}>
            {n + 1 < questions.length ? "Question suivante" : "Voir mon score"}
          </button>
        </div>
      )}
    </div>
  );
}
