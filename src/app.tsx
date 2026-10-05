import { PanneauMessages } from "./components/Annonces";
import { marquerLue, ouvrirMessages } from "./lib/annonces";
import { useEffect, useRef } from "preact/hooks";
import { useRoute } from "./lib/router";
import { marquerDecouverte } from "./lib/install";
import { BottomNav } from "./components/Nav";
import { ToastHost } from "./components/Toast";
import { OfflineNotice } from "./components/OfflineNotice";
import { CoursScreen } from "./screens/Cours";
import { AccueilScreen } from "./screens/Accueil";
import { LeconScreen } from "./screens/Lecon";
import { SujetsScreen } from "./screens/Sujets";
import { SujetScreen } from "./screens/Sujet";
import { OeuvresScreen } from "./screens/Oeuvres";
import { OeuvreScreen } from "./screens/Oeuvre";
import { OutilsScreen } from "./screens/Outils";
import { EntrainementScreen } from "./screens/Entrainement";
import { AtelierScreen } from "./screens/Atelier";
import { CarnetScreen, MesFichesScreen } from "./screens/Carnet";
import { NotFound } from "./screens/NotFound";
import { AProposScreen, CguScreen, ConfidentialiteScreen } from "./screens/Infos";
import { InstallGate, InstallGuide } from "./components/Install";
import { CommentPayer } from "./components/CommentPayer";
import { AccesScreen } from "./screens/Acces";
import { ContactScreen } from "./screens/Contact";
import { DefiScreen } from "./screens/Defi";
import { RevisionsScreen } from "./screens/Revisions";
import { ProgresScreen } from "./screens/Progres";
import { reverifier } from "./lib/licence";
import { synchroniser } from "./lib/synchro";
import { demarrerStats, noter } from "./lib/stats";
import { actualiserQuestions } from "./lib/contact";
import { prevenirAchatHorsLigne } from "./components/Achat";
import { preparerRappel } from "./lib/rappels";

function useScrollMemory(key: string) {
  const positions = useRef(new Map<string, number>());
  const popped = useRef(false);
  useEffect(() => {
    const onPop = () => { popped.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    // Revenir en arrière retrouve la position ; ouvrir une nouvelle page repart du haut.
    window.scrollTo(0, popped.current ? positions.current.get(key) ?? 0 : 0);
    popped.current = false;
    const save = () => positions.current.set(key, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [key]);
}

export function App() {
  useEffect(() => {
    // Nouveautés (site mis à jour, ou leçon, fiche, correction publiées depuis le tableau de bord) :
    // la liste et le contenu payant sont rechargés tout de suite, puis la page est relancée pour les afficher.
    // Sinon, vérification quotidienne de la clé.
    synchroniser().then(change => { if (!change) reverifier(); });
    prevenirAchatHorsLigne();
    demarrerStats();
    // Réponses de l'auteur aux questions (accès complet) et nouveautés : au démarrage et au retour dans l'appli.
    actualiserQuestions();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") { actualiserQuestions(); synchroniser(); }
      // En quittant l'appli : le rappel personnel (s'il part) proposera la suite de ce que l'élève vient de faire.
      else preparerRappel();
    });
    setTimeout(preparerRappel, 4000);
    // Ouverture depuis une notification : l'adresse porte le numéro du message.
    const depuisNotif = new URLSearchParams(location.search).get("annonce");
    if (depuisNotif) {
      noter({ t: "notif", ref: depuisNotif });
      // Message sans bouton : on l'ouvre directement sous la cloche.
      if (/^\d+$/.test(depuisNotif)) { if (!location.hash || location.hash === "#/") ouvrirMessages(Number(depuisNotif)); else marquerLue(Number(depuisNotif)); }
      history.replaceState(null, "", location.pathname + location.hash);
    }
  }, []);
  const { path, params } = useRoute();
  const [section = "accueil", id] = path;
  useEffect(() => { noter({ t: "ecran", ref: section }); }, [section]);
  // Première leçon, fiche ou sujet ouvert : l'élève a découvert l'app, on peut lui proposer d'installer.
  useEffect(() => { if (id && ["cours", "sujets", "oeuvres", "entrainement"].includes(section)) marquerDecouverte(); }, [section, id]);
  useScrollMemory(path.join("/"));

  let screen;
  switch (section) {
    case "accueil": screen = <AccueilScreen />; break;
    case "cours": screen = id ? <LeconScreen id={id} /> : <CoursScreen />; break;
    case "sujets": screen = id ? <SujetScreen num={id} /> : <SujetsScreen params={params} />; break;
    case "oeuvres": screen = id ? <OeuvreScreen id={id} params={params} /> : <OeuvresScreen params={params} />; break;
    case "outils": screen = <OutilsScreen />; break;
    case "carnet": screen = <CarnetScreen />; break;
    case "mes-fiches": screen = <MesFichesScreen />; break;
    case "entrainement": screen = id ? <AtelierScreen num={id} params={params} /> : <EntrainementScreen />; break;
    case "a-propos": screen = <AProposScreen />; break;
    case "cgu": screen = <CguScreen />; break;
    case "confidentialite": screen = <ConfidentialiteScreen />; break;
    case "acces": screen = <AccesScreen params={params} />; break;
    case "contact": screen = <ContactScreen params={params} />; break;
    case "defi": screen = <DefiScreen />; break;
    case "revisions": screen = <RevisionsScreen />; break;
    case "progres": screen = <ProgresScreen />; break;
    default: screen = <NotFound />;
  }

  return (
    <>
      <a class="skip-link" href="#contenu">Aller au contenu</a>
      <OfflineNotice />
      {screen}
      <BottomNav />
      <ToastHost />
      <InstallGuide />
      <PanneauMessages />
      <CommentPayer />
      <InstallGate />
    </>
  );
}
