import { createServer } from "vite";
const memoire = {}; const rien = () => {};
const partout = new Proxy(rien, { get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : partout), apply: () => partout });
Object.assign(globalThis, { localStorage: { getItem: k => memoire[k] ?? null, setItem: (k, v) => { memoire[k] = String(v); }, removeItem: k => { delete memoire[k]; } },
  document: partout, addEventListener: rien, removeEventListener: rien, matchMedia: () => ({ matches: false, addEventListener: rien }), location: { hash: "", href: "http://localhost/" }, innerWidth: 400 });
globalThis.sessionStorage = globalThis.localStorage; globalThis.window = globalThis;
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const m = await vite.ssrLoadModule("/src/lib/devoir.ts");
for (const t of process.argv.slice(2)) console.log(t, JSON.stringify(m.__debug(t)));
await vite.close();
