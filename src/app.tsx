import { useEffect, useRef } from "preact/hooks";
import { useRoute } from "./lib/router";
import { BottomNav } from "./components/Nav";
import { ToastHost } from "./components/Toast";
import { OfflineNotice } from "./components/OfflineNotice";
import { CoursScreen } from "./screens/Cours";
import { LeconScreen } from "./screens/Lecon";
import { SujetsScreen } from "./screens/Sujets";
import { SujetScreen } from "./screens/Sujet";
import { OeuvresScreen } from "./screens/Oeuvres";
import { OeuvreScreen } from "./screens/Oeuvre";
import { OutilsScreen } from "./screens/Outils";
import { EntrainementScreen } from "./screens/Entrainement";
import { AtelierScreen } from "./screens/Atelier";
import { CarnetScreen } from "./screens/Carnet";
import { NotFound } from "./screens/NotFound";
import { AProposScreen, CguScreen, ConfidentialiteScreen } from "./screens/Infos";
import { InstallGate, InstallGuide } from "./components/Install";
import { CommentPayer } from "./components/CommentPayer";
import { AccesScreen } from "./screens/Acces";
import { ContactScreen } from "./screens/Contact";
import { licence, rechargerContenu, reverifier } from "./lib/licence";
import { contenuEnRetard } from "./lib/data";
import { demarrerStats, noter } from "./lib/stats";
import { actualiserContenuLibre } from "./lib/libre";
import { actualiserQuestions } from "./lib/contact";
import { prevenirAchatHorsLigne } from "./components/Achat";

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
    // Site mis à jour avec de nouveaux sujets ou fiches : le contenu payant est rechargé tout de suite,
    // puis la page est relancée pour les afficher (une seule fois, si le serveur les a bien envoyés).
    const l = licence();
    if (l && contenuEnRetard(l.contenu)) {
      rechargerContenu().then(ok => {
        const n = licence();
        if (ok && n && !contenuEnRetard(n.contenu)) location.reload();
      });
    } else reverifier();
    prevenirAchatHorsLigne();
    demarrerStats();
    actualiserContenuLibre();
    // Réponses de l'auteur aux questions (accès complet) : au démarrage et au retour dans l'appli.
    actualiserQuestions();
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") actualiserQuestions(); });
    // Ouverture depuis une notification : l'adresse porte le numéro du message.
    const depuisNotif = new URLSearchParams(location.search).get("annonce");
    if (depuisNotif) {
      noter({ t: "notif", ref: depuisNotif });
      history.replaceState(null, "", location.pathname + location.hash);
    }
  }, []);
  const { path, params } = useRoute();
  const [section = "cours", id] = path;
  useEffect(() => { noter({ t: "ecran", ref: section }); }, [section]);
  useScrollMemory(path.join("/"));

  let screen;
  switch (section) {
    case "cours": screen = id ? <LeconScreen id={id} /> : <CoursScreen />; break;
    case "sujets": screen = id ? <SujetScreen num={id} /> : <SujetsScreen params={params} />; break;
    case "oeuvres": screen = id ? <OeuvreScreen id={id} /> : <OeuvresScreen params={params} />; break;
    case "outils": screen = <OutilsScreen />; break;
    case "carnet": screen = <CarnetScreen />; break;
    case "entrainement": screen = id ? <AtelierScreen num={id} params={params} /> : <EntrainementScreen />; break;
    case "a-propos": screen = <AProposScreen />; break;
    case "cgu": screen = <CguScreen />; break;
    case "confidentialite": screen = <ConfidentialiteScreen />; break;
    case "acces": screen = <AccesScreen />; break;
    case "contact": screen = <ContactScreen params={params} />; break;
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
      <CommentPayer />
      <InstallGate />
    </>
  );
}
