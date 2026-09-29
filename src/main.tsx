import { render } from "preact";
import "@fontsource-variable/literata/wght.css";
import "@fontsource-variable/literata/wght-italic.css";
import "@fontsource-variable/dm-sans/index.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./lib/install";
import { App } from "./app";
import { conserverDonnees } from "./lib/storage";

conserverDonnees();

render(<App />, document.getElementById("app")!);

// Retire l'écran d'ouverture : il reste au moins le temps de son animation, jamais plus.
const splash = document.getElementById("splash");
if (splash) {
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reste = calme ? 0 : Math.max(0, 900 - performance.now());
  setTimeout(() => {
    splash.classList.add("fin");
    setTimeout(() => splash.remove(), 400);
  }, reste);
}
