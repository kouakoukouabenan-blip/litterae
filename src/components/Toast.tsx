import { useEffect, useState } from "preact/hooks";
import { Icon } from "./Icon";

let push: (msg: string) => void = () => {};

/** Message bref après une action (copie, enregistrement). */
export function toast(msg: string) {
  push(msg);
}

export function ToastHost() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    push = text => setMsg({ text, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <div class="toast-host" role="status" aria-live="polite">
      {msg && <div class="toast" key={msg.id}><Icon name="check" size={18} />{msg.text}</div>}
    </div>
  );
}

export async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("Copie impossible : sélectionnez le texte et copiez-le à la main.");
  }
}
