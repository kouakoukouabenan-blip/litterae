import { render } from "preact";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/playfair-display/latin-700-italic.css";
import "@fontsource/playfair-display/latin-900.css";
import "@fontsource/playfair-display/latin-900-italic.css";
import "@fontsource-variable/dm-sans/index.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./lib/install";
import { App } from "./app";

render(<App />, document.getElementById("app")!);
