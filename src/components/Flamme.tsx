/** Flamme animée de la série de jours : vive quand la série est en cours, éteinte (grise) à zéro. */
export function Flamme({ taille = 20, eteinte = false }: { taille?: number; eteinte?: boolean }) {
  return (
    <svg class={`flamme${eteinte ? " flamme-eteinte" : ""}`} width={taille} height={taille * 1.2} viewBox="0 0 20 24" aria-hidden="true">
      <g class="flamme-corps">
        <path class="flamme-ext" d="M10 1c1 3.6 6.8 7.4 6.8 13.4A6.8 6.8 0 0 1 10 23a6.8 6.8 0 0 1-6.8-8.6c.6-2.6 2.4-3.6 2.6-6 1.6 1.2 2 2.8 2 4.2C9.4 9.6 8.6 4.6 10 1z" />
        <path class="flamme-int" d="M10 10.5c.8 2.2 3.6 4.2 3.6 7.3A3.6 3.6 0 0 1 10 21.4a3.6 3.6 0 0 1-3.6-3.6c0-1.6.8-2.6 1.6-3.4.3 1 .8 1.6 1.4 1.8-.4-2 0-4 .6-5.7z" />
      </g>
    </svg>
  );
}
