/**
 * Logos des deux identités. Les deux sont dans la page ; la feuille de style montre celui de l'identité active
 * (.seulement-ancienne / .seulement-nouvelle), si bien que l'interrupteur ne demande aucun rechargement.
 */
const L = "M40,40 H72 V184 H160 V216 H40 Z M216,216 H184 V72 H96 V40 H216 Z";
const CARRE = "M112,112 H144 V144 H112 Z";
const MOT = "M9.7 0V-98H26.5V-15.3H72.5V0Z M83.3 0V-69.2H99.3V0ZM91.3 -78Q86.8 -78 83.7 -80.9Q80.6 -83.8 80.6 -88.5Q80.6 -93.2 83.7 -96.1Q86.8 -99 91.3 -99Q95.9 -99 98.9 -96.1Q101.9 -93.2 101.9 -88.5Q101.9 -83.8 98.9 -80.9Q95.9 -78 91.3 -78Z M143.1 0Q136.4 0 132.4 -4Q128.4 -8 128.4 -14.8V-55.9H110.3V-69.2H128.4V-91.4H144.5V-69.2H164.3V-55.9H144.5V-17.5Q144.5 -13.3 148.4 -13.3H162.3V0Z M204 0Q197.4 0 193.4 -4Q189.4 -8 189.4 -14.8V-55.9H171.3V-69.2H189.4V-91.4H205.4V-69.2H225.3V-55.9H205.4V-17.5Q205.4 -13.3 209.4 -13.3H223.3V0Z M270.4 2Q260 2 252.1 -2.5Q244.2 -6.9 239.8 -14.9Q235.4 -22.9 235.4 -33.8V-35.4Q235.4 -46.3 239.7 -54.3Q244.1 -62.3 251.9 -66.7Q259.7 -71.2 269.9 -71.2Q280 -71.2 287.6 -66.7Q295.1 -62.3 299.3 -54.3Q303.5 -46.3 303.5 -35.8V-30H251.7Q252 -21.9 257.4 -17Q262.8 -12.1 270.8 -12.1Q278.6 -12.1 282.4 -15.5Q286.2 -18.9 288.2 -23.2L301.4 -16.4Q299.4 -12.6 295.7 -8.3Q292 -4 285.9 -1Q279.8 2 270.4 2ZM251.8 -42.1H287.2Q286.7 -49 282 -53.1Q277.3 -57.1 269.8 -57.1Q262.2 -57.1 257.5 -53.1Q252.9 -49 251.8 -42.1Z M317.1 0V-69.2H332.8V-61.2H335.2Q336.8 -65.5 340.4 -67.5Q344.1 -69.5 349.2 -69.5H357.5V-55.2H348.8Q341.9 -55.2 337.5 -51.5Q333.1 -47.8 333.1 -40V0Z M390.3 2Q382.9 2 377 -0.6Q371.2 -3.2 367.8 -8.1Q364.3 -13 364.3 -20.1Q364.3 -27.2 367.8 -32Q371.2 -36.7 377.2 -39.1Q383.2 -41.6 390.9 -41.6H411V-45.7Q411 -51.2 407.6 -54.6Q404.2 -58.1 397.1 -58.1Q390.1 -58.1 386.5 -54.8Q383 -51.5 381.8 -46.3L367 -51.2Q368.7 -56.7 372.4 -61.2Q376.1 -65.6 382.3 -68.4Q388.5 -71.2 397.3 -71.2Q410.9 -71.2 418.7 -64.3Q426.6 -57.5 426.6 -44.6V-17.5Q426.6 -13.3 430.5 -13.3H436.2V0H425Q419.9 0 416.7 -2.5Q413.5 -5.1 413.5 -9.3V-9.6H411.1Q410.3 -7.7 408.2 -4.9Q406.1 -2.1 401.8 -0.1Q397.5 2 390.3 2ZM392.9 -11.1Q400.9 -11.1 406 -15.7Q411 -20.2 411 -28V-29.4H392Q386.7 -29.4 383.5 -27.1Q380.4 -24.9 380.4 -20.6Q380.4 -16.3 383.7 -13.7Q387 -11.1 392.9 -11.1Z M478.2 2Q467.8 2 459.9 -2.5Q452.1 -6.9 447.7 -14.9Q443.3 -22.9 443.3 -33.8V-35.4Q443.3 -46.3 447.6 -54.3Q451.9 -62.3 459.7 -66.7Q467.5 -71.2 477.8 -71.2Q487.9 -71.2 495.4 -66.7Q503 -62.3 507.2 -54.3Q511.4 -46.3 511.4 -35.8V-30H459.5Q459.8 -21.9 465.3 -17Q470.7 -12.1 478.7 -12.1Q486.5 -12.1 490.3 -15.5Q494.1 -18.9 496.1 -23.2L509.3 -16.4Q507.3 -12.6 503.6 -8.3Q499.9 -4 493.8 -1Q487.7 2 478.2 2ZM459.7 -42.1H495.1Q494.5 -49 489.8 -53.1Q485.2 -57.1 477.7 -57.1Q470 -57.1 465.4 -53.1Q460.7 -49 459.7 -42.1Z";

/** Logo horizontal « La Synthèse » : symbole + nom. L'encre suit la couleur du texte (currentColor). */
export function LogoHorizontal({ class: c = "" }: { class?: string }) {
  return (
    <svg class={c} viewBox="0 0 777 256" aria-hidden="true" focusable="false">
      <g transform="translate(0,24) scale(0.8)"><path d={L} fill="currentColor" /><path class="carre-synthese" d={CARRE} fill="#D9653B" /></g>
      <g transform="translate(236,176)"><path d={MOT} fill="currentColor" /></g>
    </svg>
  );
}

/** Tuile d'appli : nouvelle identité (indigo, L papier, carré terracotta) ou ancienne (L. sur crème). */
export function TuileAppli({ class: c = "" }: { class?: string }) {
  return (
    <>
      <svg class={`${c} seulement-ancienne`} viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#FFF3DC"/><path fill="#0F3D2E" d="M18 14h14v3h-4v28h9.5l3-8H44l-1.5 13H18v-3h4V17h-4z"/><circle cx="50" cy="47.5" r="3.5" fill="#C4562B"/></svg>
      <svg class={`${c} seulement-nouvelle`} viewBox="0 0 256 256" aria-hidden="true"><rect class="papier-synthese" width="256" height="256" rx="56" fill="#FAF7F0"/><path class="encre-synthese" d="M56,56 H84 V172 H156 V200 H56 Z M200,200 H172 V84 H100 V56 H200 Z" fill="#26285E"/><path class="carre-synthese" d="M114,114 H142 V142 H114 Z" fill="#D9653B"/></svg>
    </>
  );
}

/** Icônes des méthodes, dessinées sur la grille du logo (256 unités, traits de 28, une seule touche terracotta). */
const ICONES_METHODE: Record<string, [string, string]> = {
  // Le plan en trois parties.
  dissertation: ["M100,52 H216 V80 H100 Z M100,114 H216 V142 H100 Z M100,176 H216 V204 H100 Z", "M40,114 H68 V142 H40 Z"],
  // Le texte cité entre crochets.
  commentaire: ["M40,48 H84 V76 H68 V180 H84 V208 H40 Z M216,48 H172 V76 H188 V180 H172 V208 H216 Z M100,92 H156 V116 H100 Z", "M114,140 H142 V168 H114 Z"],
  // Le texte qui se resserre : trois lignes de plus en plus courtes, l'essentiel au bout.
  resume: ["M40,52 H216 V80 H40 Z M40,114 H172 V142 H40 Z M40,176 H112 V204 H40 Z", "M136,176 H164 V204 H136 Z"]
};

export function IconeMethode({ id, class: c = "" }: { id: string; class?: string }) {
  const d = ICONES_METHODE[id];
  if (!d) return null;
  return (
    <svg class={c} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <path d={d[0]} fill="currentColor" fill-rule="evenodd" /><path class="carre-synthese" d={d[1]} fill="#D9653B" />
    </svg>
  );
}
