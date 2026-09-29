import type { ComponentChildren } from "preact";

export function PageHeader({ eyebrow, title, children, compact }: { eyebrow?: string; title: ComponentChildren; children?: ComponentChildren; compact?: boolean }) {
  return (
    <header class={`page-header ${compact ? "page-header-compact" : ""}`}>
      {eyebrow && <p class="eyebrow">{eyebrow}</p>}
      <h1 class="page-title">{title}</h1>
      {children && <div class="lede">{children}</div>}
    </header>
  );
}
