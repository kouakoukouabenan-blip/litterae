import { useEffect, useState } from "preact/hooks";
import { extrait } from "../components/Partager";
import { LECONS } from "../lib/lecons";
import type { BlocLecon } from "../data/types";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { useStored } from "../lib/storage";
import { NotFound } from "./NotFound";
import { QuizLecon } from "../components/Quiz";
import { LockPanel } from "../components/LockPanel";
import { LECONS_GRATUITES, ouvrirLecon, useAccesLecons, type EchecLecon } from "../lib/lecons-libres";
import { AchatLien } from "../components/Achat";
import { LigneContact } from "../components/LigneContact";
import { noter } from "../lib/stats";
import { noterVue } from "../lib/historique";
import { synchroniser } from "../lib/synchro";

function Bloc({ b }: { b: BlocLecon }) {
  if ("p" in b) return <p>{b.p}</p>;
  if ("h" in b) return <h2 class="section-title">{b.h}</h2>;
  if ("liste" in b) return <ul class="bullets">{b.liste.map(x => <li key={x}>{x}</li>)}</ul>;
  if ("astuce" in b) return <aside class="callout"><p class="callout-label">Astuce</p><p>{b.astuce}</p></aside>;
  if ("etapes" in b)
    return (
      <ol class="steps">
        {b.etapes.map(([t, d]) => <li key={t}><strong>{t}</strong><span>{d}</span></li>)}
      </ol>
    );
  if ("sujet" in b) return <blockquote class="citation">{b.sujet}</blockquote>;
  if ("def" in b)
    return (
      <dl class="def">
        {b.def.map(([k, v]) => [<dt key={k}>{k}</dt>, <dd key={k + "d"}>{v}</dd>])}
      </dl>
    );
  if ("modele" in b) return <figure class="model"><figcaption>Exemple rédigé</figcaption><p>{b.modele}</p></figure>;
  if ("plan" in b) return <ol class="outline">{b.plan.map(x => <li key={x}>{x}</li>)}</ol>;
  // Lien venu du serveur : seulement vers une page de l'appli ou un site https.
  if ("lien" in b) return /^(https:\/\/|#\/)/.test(b.lien.href) && <a class="btn btn-secondary align-start" href={b.lien.href}><Icon name="local_library" size={20} />{b.lien.texte}</a>;
  return null;
}

/**
 * Leçon publiée depuis le tableau de bord dont le texte n'est pas encore sur l'appareil :
 * il est demandé au serveur tout de suite, et la page se relance dès qu'il est arrivé.
 */
function TexteEnRoute() {
  const [etat, setEtat] = useState<"charge" | "echec">("charge");
  const essayer = () => {
    setEtat("charge");
    synchroniser(true).then(ok => { if (ok) location.reload(); else setEtat("echec"); });
  };
  useEffect(essayer, []);
  return etat === "charge" ? (
    <p class="notice notice-court" role="status">Chargement du texte de la leçon…</p>
  ) : (
    <div role="status">
      <p class="notice notice-court"><Icon name="wifi_off" size={20} />Le texte n'a pas pu être chargé. Vérifie ta connexion.</p>
      <button type="button" class="btn btn-secondary align-start" onClick={essayer}>Réessayer</button>
    </div>
  );
}

/** Ouverture d'une leçon gratuite : un court message pendant l'envoi, ou ce qui bloque. */
function OuvertureLecon({ echec, reessayer }: { echec: EchecLecon | null; reessayer: () => void }) {
  if (!echec) return <p class="notice notice-court" role="status">Ouverture de la leçon…</p>;
  return (
    <div role="alert">
      <p class="notice notice-court"><Icon name="wifi_off" size={20} />{echec === "hors-ligne" ? "Connecte-toi à Internet pour ouvrir cette leçon. Elle restera ensuite sur ton téléphone."
        : echec === "trop" ? "Trop de leçons ouvertes depuis cette connexion. Réessaie dans une heure."
        : "La leçon n'a pas pu s'ouvrir."}</p>
      <button type="button" class="btn btn-secondary align-start" onClick={reessayer}>Réessayer</button>
    </div>
  );
}

export function LeconScreen({ id }: { id: string }) {
  const i = LECONS.findIndex(l => l.id === id);
  useEffect(() => { if (i > -1) { noter({ t: "lecon", ref: id }); noterVue("lecon", id); } }, [id]);
  const [lues, setLues] = useStored<string[]>("lecons-lues", []);
  const acces = useAccesLecons();
  // Leçon gratuite ouverte pendant cette visite : son texte vient d'arriver sur l'appareil.
  const ouverte = acces.ouvertes[id];
  const verrouillee = i > -1 && !acces.peutLire(id);
  const aOuvrir = i > -1 && !acces.premium && !verrouillee && !ouverte;
  const [echec, setEchec] = useState<EchecLecon | null>(null);
  const [essai, setEssai] = useState(0);
  // Sans clé, ouvrir une leçon la compte dans les 5 gratuites.
  useEffect(() => {
    if (!aOuvrir) return;
    let actif = true;
    setEchec(null);
    ouvrirLecon(id).then(r => { if (actif && !Array.isArray(r)) setEchec(r); });
    return () => { actif = false; };
  }, [id, aOuvrir, essai]);
  const lisible = i > -1 && !verrouillee && !aOuvrir && echec !== "limite";
  useEffect(() => {
    if (lisible && !lues.includes(id)) setLues([...lues, id]);
  }, [id, lisible]);
  if (i < 0) return <NotFound what="Cette leçon n'existe pas." back="#/cours" />;
  const base = LECONS[i], prev = LECONS[i - 1], next = LECONS[i + 1];
  const l = !base.blocs.length && ouverte ? { ...base, blocs: ouverte } : base;

  return (
    <Page title={`Leçon ${i + 1}`} back="#/cours" partage={{
      type: "lecon", cle: l.id, titre: l.titre, chemin: `#/cours/${l.id}`,
      texte: [`Leçon ${i + 1} : « ${l.titre} » (${l.duree} de lecture).`,
        !!ouverte && extrait((l.blocs.find(b => "p" in b) as { p: string } | undefined)?.p),
        "À lire sur Litterae, la dissertation littéraire pas à pas :"].filter(Boolean).join("\n\n")
    }}>
      <article class="reading">
        <header class="page-header">
          <p class="eyebrow">Leçon {i + 1} sur {LECONS.length} · {l.duree}</p>
          <h1 class="page-title">{l.titre}</h1>
          {ouverte && (
            <p class="small muted fiche-quota">Leçon gratuite {acces.nbOuvertes} sur {LECONS_GRATUITES}. <AchatLien label="Tout débloquer" /></p>
          )}
        </header>
        {aOuvrir && echec !== "limite" ? (
          <OuvertureLecon echec={echec} reessayer={() => setEssai(essai + 1)} />
        ) : !lisible ? (
          <LockPanel reason={`Tu as lu tes ${LECONS_GRATUITES} leçons gratuites.`} />
        ) : (
          l.blocs.length ? <div class="prose">{l.blocs.map((b, k) => <Bloc key={k} b={b} />)}</div> : <TexteEnRoute key={l.id} />
        )}
        <QuizLecon id={l.id} />
        {lisible && <LigneContact page={`#/cours/${l.id}`} objet={`la leçon « ${l.titre} »`} quoi="cette leçon" />}
        <nav class="pager" aria-label="Leçons">
          {prev ? <a class="pager-link" href={`#/cours/${prev.id}`}><span class="meta">Précédente</span>{prev.titre}</a> : <span />}
          {next ? (
            <a class="pager-link pager-next" href={`#/cours/${next.id}`}><span class="meta">Suivante</span>{next.titre}</a>
          ) : (
            <a class="pager-link pager-next" href="#/sujets"><span class="meta">Et maintenant</span>Les sujets corrigés</a>
          )}
        </nav>
      </article>
    </Page>
  );
}
