import { useEffect, useState } from "preact/hooks";

export interface Route {
  path: string[];
  params: URLSearchParams;
}

/** Routes sous forme de hash (#/oeuvres/rebelle?q=…) : compatible GitHub Pages et partage de liens. */
export function parseHash(hash = location.hash): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  return { path: path.split("/").filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(query) };
}

export function href(path: string[], params?: URLSearchParams | Record<string, string>) {
  const p = path.map(encodeURIComponent).join("/");
  const q = params ? new URLSearchParams(params as Record<string, string>).toString() : "";
  return `#/${p}${q ? "?" + q : ""}`;
}

/** Remplace l'adresse sans créer d'entrée d'historique (saisie de recherche, filtres). */
export function replaceRoute(url: string) {
  history.replaceState(history.state, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

// Nombre de pages ouvertes depuis l'app : sert à savoir si « Retour » peut revenir en arrière
// sans sortir de Litterae (lien partagé ouvert directement sur une fiche, par exemple).
let depth = 0;
document.addEventListener("click", e => {
  const a = (e.target as Element).closest?.("a[href^='#/']");
  if (a && !e.defaultPrevented) depth++;
});
window.addEventListener("popstate", () => { depth = Math.max(0, depth - 1); });

export function goBack(fallback: string) {
  if (depth > 0) history.back();
  else location.hash = fallback;
}
