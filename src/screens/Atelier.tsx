import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { AchatLien } from "../components/Achat";
import { copyText } from "../components/Toast";
import { SUJETS } from "../lib/data";
import { useAccess } from "../lib/access";
import { href, replaceRoute } from "../lib/router";
import { envoyerMessage, type EchecEnvoi } from "../lib/contact";
import {
  ORIENTATIONS, avancement, orientationDonnee, nouvelArgument, redaction, useBrouillon,
  type Axe, type Brouillon
} from "../lib/atelier";
import { NotFound } from "./NotFound";

const ETAPES = ["Comprendre le sujet", "Plan détaillé", "Introduction", "Développement", "Conclusion", "Ma rédaction"];
const CONSIGNE = "Expliquez et discutez.";

const ECHECS: Record<EchecEnvoi, string> = {
  "hors-ligne": "Tu es hors connexion. Ta copie reste enregistrée : envoie-la quand tu seras connecté.",
  "trop": "Trop d'envois en peu de temps. Réessaie dans une heure.",
  "en-attente": "Tu as déjà 3 messages en attente de réponse. Attends une réponse avant d'envoyer cette copie.",
  "cle": "Ta clé n'est pas active sur ce téléphone. Saisis-la de nouveau dans Mon espace.",
  "serveur": "L'envoi n'a pas abouti. Réessaie dans quelques minutes."
};

/** Consigne en quelques mots ; l'explication complète s'ouvre avec « Aide ». */
function Aide({ court, detail, children }: { court: string; detail?: string; children?: ComponentChildren }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      {court}
      {detail && <> <button type="button" class="link-btn aide-btn" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>{ouvert ? "Masquer" : "Aide"}</button></>}
      {children && <> {children}</>}
      {ouvert && <span class="aide-detail">{detail}</span>}
    </>
  );
}

const val = (e: Event) => (e.target as HTMLInputElement | HTMLTextAreaElement).value;

function Champ({ id, label, aide, value, onInput, rows = 2, placeholder }: {
  id: string; label: string; aide?: ComponentChildren; value: string; onInput: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div class="atelier-champ">
      <label class="field-label" for={id}>{label}</label>
      {aide && <div class="atelier-aide" id={`${id}-aide`}>{aide}</div>}
      <textarea id={id} class="textarea atelier-texte" rows={rows} value={value} placeholder={placeholder}
        style={{ minHeight: `calc(${rows} * 1.5em + 26px)` }}
        aria-describedby={aide ? `${id}-aide` : undefined} onInput={e => onInput(val(e))} />
    </div>
  );
}

/** Rappel de ce que l'élève a déjà écrit, comme son brouillon posé à côté de la copie. */
function Rappel({ lignes, vide = "Rien encore : remplis d'abord les étapes précédentes." }: { lignes: [string, string][]; vide?: string }) {
  const pleines = lignes.filter(([, v]) => v.trim());
  return (
    <aside class="atelier-rappel">
      <p class="callout-label">Ton brouillon</p>
      {pleines.length ? (
        <dl>{pleines.map(([k, v]) => [<dt key={k}>{k}</dt>, <dd key={k + "v"}>{v}</dd>])}</dl>
      ) : <p class="small muted">{vide}</p>}
    </aside>
  );
}

function PlanAxe({ n, axe, set, question }: { n: 1 | 2; axe: Axe; set: (a: Axe) => void; question: string }) {
  const majArg = (i: number, champ: "arg" | "expl" | "ex", v: string) =>
    set({ ...axe, args: axe.args.map((a, j) => j === i ? { ...a, [champ]: v } : a) });
  return (
    <section class="atelier-axe" aria-labelledby={`axe${n}-titre`}>
      <h2 id={`axe${n}-titre`} class="section-title"><span class="part-num">{n === 1 ? "I." : "II."}</span> {n === 1 ? "Thèse" : "Antithèse"}</h2>
      <Champ id={`axe${n}`} label="Idée générale de la partie" rows={1} value={axe.titre} onInput={v => set({ ...axe, titre: v })}
        aide={question} />
      {axe.args.map((a, i) => (
        <fieldset key={i} class="atelier-arg">
          <legend>Argument {i + 1}</legend>
          <Champ id={`a${n}-${i}-arg`} label="Argument" rows={1} value={a.arg} onInput={v => majArg(i, "arg", v)} />
          <Champ id={`a${n}-${i}-expl`} label="Explication" value={a.expl} onInput={v => majArg(i, "expl", v)}
            aide={<Aide court="Explique l'argument." detail="Reformule l'argument en une ou deux phrases, puis dis ce que cela implique." />} />
          <Champ id={`a${n}-${i}-ex`} label="Illustration" value={a.ex} onInput={v => majArg(i, "ex", v)}
            aide={<Aide court="Une œuvre précise." detail="Le titre, l'auteur, et ce qui dans l'œuvre prouve l'argument." />} />
          {axe.args.length > 1 && (
            <button type="button" class="link-btn atelier-retirer" onClick={() => set({ ...axe, args: axe.args.filter((_, j) => j !== i) })}>
              Retirer cet argument
            </button>
          )}
        </fieldset>
      ))}
      {axe.args.length < 5 && (
        <button type="button" class="btn btn-secondary" onClick={() => set({ ...axe, args: [...axe.args, nouvelArgument()] })}>
          <Icon name="add" size={20} />Ajouter un argument
        </button>
      )}
    </section>
  );
}

export function AtelierScreen({ num, params }: { num: string; params: URLSearchParams }) {
  const sujet = SUJETS.find(s => s.num === num);
  const [b, setB] = useBrouillon(num);
  const { premium } = useAccess();
  const etape = Math.min(Math.max(Number(params.get("etape")) || 0, 0), ETAPES.length - 1);
  const debut = useRef(Date.now());
  const [envoi, setEnvoi] = useState<"" | "envoi" | "ok">("");
  const [echec, setEchec] = useState<EchecEnvoi | null>(null);
  useEffect(() => { window.scrollTo(0, 0); }, [etape]);
  if (!sujet) return <NotFound what="Ce sujet n'existe pas." back="#/entrainement" />;

  const maj = (p: Partial<Brouillon>) => setB({ ...b, ...p });
  const aller = (i: number) => replaceRoute(href(["entrainement", num], i ? { etape: String(i) } : undefined));
  const pct = avancement(b);
  const texte = redaction(b);
  const plan = (axe: Axe) => axe.args.map((a, i) => [`Argument ${i + 1}`, [a.arg, a.ex].filter(s => s.trim()).join(" · ")] as [string, string]);
  const comprehension: [string, string][] = [
    ["Thème", b.theme], ["Thèse", b.these], ["Orientation", orientationDonnee(b)],
    ["Reformulation", b.reformulation], ["Problématique", b.problematique]
  ];

  async function envoyer() {
    setEnvoi("envoi"); setEchec(null);
    const r = await envoyerMessage({
      sujet: "copie", nom: "", reponse: "", site: "", page: `#/entrainement/${num}`,
      duree: Date.now() - debut.current,
      texte: `À propos de : Sujet ${num}\n\n« ${sujet!.citation} » (${sujet!.auteur})\n\n${texte}`
    });
    if (r) { setEchec(r); setEnvoi(""); return; }
    maj({ envoye: Date.now() });
    setEnvoi("ok");
  }

  return (
    <Page title={`Sujet ${num}`} back="#/entrainement">
      <article class="reading atelier">
        <header class="page-header">
          <p class="eyebrow">Atelier · Sujet {num}</p>
          <blockquote class="citation">« {sujet.citation} »</blockquote>
          <p class="meta">{sujet.auteur}. {CONSIGNE}</p>
        </header>

        <nav class="atelier-etapes" aria-label="Étapes">
          <ol>
            {ETAPES.map((nom, i) => (
              <li key={nom}>
                <button type="button" class="atelier-pastille" aria-current={i === etape ? "step" : undefined}
                  aria-label={`Étape ${i + 1} : ${nom}`} onClick={() => aller(i)}>{i + 1}</button>
              </li>
            ))}
          </ol>
          <p class="atelier-etape-nom">Étape {etape + 1} sur {ETAPES.length} · <strong>{ETAPES[etape]}</strong></p>
          <div class="atelier-barre" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Devoir fait">
            <span style={{ width: `${pct}%` }} />
          </div>
          <p class="meta atelier-pct">Devoir fait à {pct} %, enregistré sur ce téléphone</p>
        </nav>

        {etape === 0 && (
          <div class="atelier-etape">
            <Champ id="theme" label="Thème" rows={1} value={b.theme} onInput={v => maj({ theme: v })}
              aide={<Aide court="Qui parle, et de quoi ?" detail="Ce dont l'auteur parle est le thème : la littérature, le roman, la poésie, l'écrivain…" />} />
            <Champ id="these" label="Thèse" value={b.these} onInput={v => maj({ these: v })}
              aide={<Aide court="Le point de vue de l'auteur, souvent entre guillemets.">{!b.these && <button type="button" class="link-btn" onClick={() => maj({ these: sujet.citation })}>Reprendre la citation</button>}</Aide>} />
            <fieldset class="atelier-champ">
              <legend class="field-label">Orientation</legend>
              <div class="atelier-aide"><Aide court="Choisis-la ou écris-la." detail="L'orientation est la fonction que l'auteur donne au thème." /></div>
              <div class="atelier-choix">
                {ORIENTATIONS.map(o => (
                  <button key={o} type="button" class="chip" aria-pressed={b.orientations.includes(o)}
                    onClick={() => maj({ orientations: b.orientations.includes(o) ? b.orientations.filter(x => x !== o) : [...b.orientations, o] })}>{o}</button>
                ))}
              </div>
              <textarea class="textarea atelier-texte atelier-orientation" rows={2} aria-label="Orientation écrite avec tes mots"
                placeholder="Ou écris-la : ex. engagement, l'écrivain doit défendre les sans-voix"
                value={b.orientationLibre} onInput={e => maj({ orientationLibre: val(e) })} />
            </fieldset>
            <fieldset class="atelier-champ">
              <legend class="field-label">Mots-clés</legend>
              <div class="atelier-aide"><Aide court="Définis les mots importants." detail="Surtout ceux qui justifient l'orientation. Donne leur sens dans le contexte du sujet." /></div>
              {b.motscles.map((m, i) => (
                <div key={i} class="atelier-mot">
                  <input class="input input-texte" aria-label={`Mot-clé ${i + 1}`} placeholder="Mot-clé" value={m.mot}
                    onInput={e => maj({ motscles: b.motscles.map((x, j) => j === i ? { ...x, mot: val(e) } : x) })} />
                  <textarea class="textarea atelier-texte" rows={1} aria-label={`Définition du mot-clé ${i + 1}`} placeholder="Sa définition dans le sujet" value={m.def}
                    onInput={e => maj({ motscles: b.motscles.map((x, j) => j === i ? { ...x, def: val(e) } : x) })} />
                  {b.motscles.length > 1 && (
                    <button type="button" class="icon-btn" aria-label={`Retirer le mot-clé ${i + 1}`}
                      onClick={() => maj({ motscles: b.motscles.filter((_, j) => j !== i) })}><Icon name="close" size={18} /></button>
                  )}
                </div>
              ))}
              {b.motscles.length < 6 && (
                <button type="button" class="link-btn" onClick={() => maj({ motscles: [...b.motscles, { mot: "", def: "" }] })}>Ajouter un mot-clé</button>
              )}
            </fieldset>
            <Champ id="reformulation" label="Reformulation" value={b.reformulation} onInput={v => maj({ reformulation: v })}
              aide={<Aide court="Ce que l'auteur affirme, en une phrase." detail="Dis-le simplement, avec tes mots. Commence par le thème." />} />
            <Champ id="problematique" label="Problématique" rows={3} value={b.problematique} onInput={v => maj({ problematique: v })}
              aide={<Aide court="« En quoi… ? » puis « Cependant… ? »" detail="Première question : « En quoi… » suivi de la thèse reformulée. Deuxième question : « Cependant… » suivi des limites de la thèse." />} />
          </div>
        )}

        {etape === 1 && (
          <div class="atelier-etape">
            <Rappel lignes={[["Reformulation", b.reformulation], ["Orientation", orientationDonnee(b)]]} />
            <PlanAxe n={1} axe={b.axe1} set={axe1 => maj({ axe1 })}
              question={`Pour trouver les arguments, demande-toi : pourquoi peut-on dire que ${b.reformulation.trim() ? `« ${b.reformulation.trim().replace(/\.$/, "")} »` : "la thèse est juste"} ?`} />
            <PlanAxe n={2} axe={b.axe2} set={axe2 => maj({ axe2 })}
              question="Montre les limites de la thèse : dans quels cas l'auteur n'a-t-il pas forcément raison ?" />
          </div>
        )}

        {etape === 2 && (
          <div class="atelier-etape">
            <Rappel lignes={[...comprehension, ["Partie I", b.axe1.titre], ["Partie II", b.axe2.titre]]} />
            <Champ id="intro" label="Introduction" rows={8} value={b.intro} onInput={v => maj({ intro: v })}
              aide={<Aide court="Généralité, thèse, problématique, annonce du plan." detail="Dans l'ordre : une généralité, la thèse entre guillemets suivie de « autrement dit » et ta reformulation, la problématique, puis l'annonce du plan (« Nous répondrons à ces interrogations dans notre analyse. »)." />} />
          </div>
        )}

        {etape === 3 && (
          <div class="atelier-etape">
            <Champ id="phrase-intro" label="Phrase introductive" rows={2} value={b.phraseIntro} onInput={v => maj({ phraseIntro: v })}
              aide={<Aide court="Elle rappelle la thèse." detail="Par exemple : « Dire que… se justifie aisément » ou « Il n'est pas erroné de dire que… »." />} />
            <h2 class="section-title"><span class="part-num">I.</span> {b.axe1.titre.trim() || "Thèse"}</h2>
            {b.axe1.args.map((a, i) => (
              <div key={i} class="atelier-paragraphe">
                <Rappel lignes={[["Argument", a.arg], ["Explication", a.expl], ["Illustration", a.ex]]}
                  vide={`L'argument ${i + 1} n'est pas encore préparé dans le plan détaillé (étape 2).`} />
                <Champ id={`p1-${i}`} label={`Paragraphe ${i + 1}`} rows={6} value={b.paragraphes1[i] ?? ""}
                  onInput={v => { const p = [...b.paragraphes1]; p[i] = v; maj({ paragraphes1: p }); }}
                  aide={i === 0 ? <Aide court="Argument, explication, exemple." detail="L'argument, puis l'explication (« En effet… »), puis l'illustration (« Par exemple… »). Commence par « D'abord », « Ensuite », « Enfin »." /> : undefined} />
              </div>
            ))}
            <Champ id="transition" label="Transition" rows={3} value={b.transition} onInput={v => maj({ transition: v })}
              aide={<Aide court="Thèse, puis antithèse." detail="Elle rappelle la thèse et annonce l'antithèse, reliées par « cependant », « toutefois » ou « néanmoins »." />} />
            <h2 class="section-title"><span class="part-num">II.</span> {b.axe2.titre.trim() || "Antithèse"}</h2>
            {b.axe2.args.map((a, i) => (
              <div key={i} class="atelier-paragraphe">
                <Rappel lignes={[["Argument", a.arg], ["Explication", a.expl], ["Illustration", a.ex]]}
                  vide={`L'argument ${i + 1} n'est pas encore préparé dans le plan détaillé (étape 2).`} />
                <Champ id={`p2-${i}`} label={`Paragraphe ${i + 1}`} rows={6} value={b.paragraphes2[i] ?? ""}
                  onInput={v => { const p = [...b.paragraphes2]; p[i] = v; maj({ paragraphes2: p }); }} />
              </div>
            ))}
          </div>
        )}

        {etape === 4 && (
          <div class="atelier-etape">
            <Rappel lignes={[["Problématique", b.problematique], ["Partie I", b.axe1.titre], ...plan(b.axe1), ["Partie II", b.axe2.titre], ...plan(b.axe2)]} />
            <Champ id="conclusion" label="Conclusion" rows={7} value={b.conclusion} onInput={v => maj({ conclusion: v })}
              aide={<Aide court="Bilan, avis personnel, ouverture." detail="Le bilan (« Au terme de notre analyse, retenons que… Cependant… »), ton jugement personnel, qui répond clairement à la problématique, puis une ouverture si tu le souhaites." />} />
          </div>
        )}

        {etape === 5 && (
          <div class="atelier-etape">
            {texte ? (
              <>
                <div class="atelier-copie">{texte.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</div>
                <p class="meta">{texte.split(/\s+/).length} mots{pct < 100 ? ` · fait à ${pct} % : certaines cases sont encore vides` : ""}</p>
                <div class="lock-actions">
                  <button type="button" class="btn btn-secondary" onClick={() => copyText(texte, "Rédaction copiée")}>
                    <Icon name="content_copy" size={20} />Copier
                  </button>
                  {premium && envoi !== "ok" && (
                    <button type="button" class="btn btn-primary" disabled={envoi === "envoi"} onClick={envoyer}>
                      <Icon name="mail" size={20} />{envoi === "envoi" ? "Envoi…" : b.envoye ? "Renvoyer au prof" : "Envoyer au prof"}
                    </button>
                  )}
                </div>
                {echec && <p class="field-error" role="alert"><Icon name="error" size={18} />{ECHECS[echec]}</p>}
                {envoi === "ok" || b.envoye ? (
                  <p class="notice notice-success atelier-envoye" role="status">
                    <Icon name="check" size={20} />
                    <span>Copie envoyée{b.envoye ? ` le ${new Date(b.envoye).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}. La correction arrivera dans <a href="#/contact?vue=questions">Mes questions</a>.</span>
                  </p>
                ) : null}
                {!premium && (
                  <p class="atelier-premium small">
                    Avec l'accès complet, tu peux envoyer ta copie au prof et recevoir sa correction dans l'application.{" "}
                    <AchatLien label="Acheter l'accès" /> · <a href="#/acces">J'ai une clé</a>
                  </p>
                )}
              </>
            ) : (
              <div class="empty">
                <p class="empty-title">Ta rédaction est encore vide.</p>
                <div class="empty-body"><p>Rédige l'introduction, le développement et la conclusion : ils s'assembleront ici.</p>
                  <button type="button" class="btn btn-secondary" onClick={() => aller(2)}>Rédiger l'introduction</button></div>
              </div>
            )}
          </div>
        )}

        <nav class="pager" aria-label="Étapes">
          {etape > 0 ? <button type="button" class="pager-link" onClick={() => aller(etape - 1)}><span class="meta">Précédent</span>{ETAPES[etape - 1]}</button> : <span />}
          {etape < ETAPES.length - 1 && (
            <button type="button" class="pager-link pager-next" onClick={() => aller(etape + 1)}>
              <span class="meta">{etape === 1 ? "Passer à la rédaction" : etape === 4 ? "Voir ma rédaction" : "Suivant"}</span>{ETAPES[etape + 1]}
            </button>
          )}
        </nav>
      </article>
    </Page>
  );
}
