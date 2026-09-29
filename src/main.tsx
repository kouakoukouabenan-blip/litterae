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
