import { createServer } from "vite";
import { readFileSync } from "node:fs";
const memoire = {}; const rien = () => {};
const partout = new Proxy(rien, { get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : partout), apply: () => partout });
Object.assign(globalThis, { localStorage: { getItem: k => memoire[k] ?? null, setItem: (k, v) => { memoire[k] = String(v); }, removeItem: k => { delete memoire[k]; } },
  document: partout, addEventListener: rien, removeEventListener: rien, matchMedia: () => ({ matches: false, addEventListener: rien }), location: { hash: "", href: "http://localhost/" }, innerWidth: 400 });
globalThis.sessionStorage = globalThis.localStorage; globalThis.window = globalThis;
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { analyserSujet } = await vite.ssrLoadModule("/src/lib/devoir.ts");
const l = JSON.parse(readFileSync("/mnt/project-files/litterae/entrainement/sujets-ambigus.json","utf8"));
let p1=0,p2=0,n2=0;
for (const s of l) { const a = analyserSujet(s.texte,6); const ok1=a.fonctions[0]===s.fonctions[0]; if(ok1)p1++;
  const t=a.plan.axe2; const K={Engagement:/arme|combat|dénonc|engag/i,Sociale:/miroir|réalité|témoin|société telle/i,Esthétique:/beauté|forme|artiste|style/i,Évasion:/rêver|évader|rêve|divert/i,Lyrique:/sentiments|émotion|âme/i};
  let ok2=null; if(s.source==="atikan-corrige"&&s.fonctions[1]){n2++;ok2=K[s.fonctions[1]].test(t);if(ok2)p2++;}
  if(!ok1||ok2===false) console.log(s.id, "app:",a.fonctions.join("/"),"| attendu:",s.fonctions.join("/"),"| P2:",t.slice(0,90)); }
console.log(`P1 ${p1}/${l.length}  P2 corrigés ${p2}/${n2}`); await vite.close();
