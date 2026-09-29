import { useEffect, useState } from "preact/hooks";
import { Icon } from "./Icon";

export function OfflineNotice() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (online) return null;
  return (
    <p class="offline" role="status">
      <Icon name="wifi_off" size={18} />
      Hors connexion. Le cours, les sujets et les œuvres restent consultables.
    </p>
  );
}
