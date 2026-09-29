import { ICONS, type IconName } from "./icons";

type BaseName = Exclude<IconName, `${string}-fill`>;

export function Icon({ name, filled = false, size = 22 }: { name: BaseName; filled?: boolean; size?: number }) {
  const key = (filled && `${name}-fill` in ICONS ? `${name}-fill` : name) as IconName;
  return (
    <svg class="icon" width={size} height={size} viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
      <path d={ICONS[key]} />
    </svg>
  );
}
