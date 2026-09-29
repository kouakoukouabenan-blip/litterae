import { useStored } from "./storage";

/** Œuvres enregistrées et notes personnelles, conservées sur l'appareil (comme dans l'app Flutter). */
export function useSaved() {
  const [saved, setSaved] = useStored<string[]>("oeuvres-enregistrees", []);
  return {
    saved,
    isSaved: (id: string) => saved.includes(id),
    toggle: (id: string) => setSaved(saved.includes(id) ? saved.filter(x => x !== id) : [id, ...saved])
  };
}

export function useNotes() {
  const [notes, setNotes] = useStored<Record<string, string>>("notes", {});
  return {
    notes,
    setNote: (id: string, text: string) => {
      const next = { ...notes };
      if (text.trim()) next[id] = text;
      else delete next[id];
      setNotes(next);
    }
  };
}
