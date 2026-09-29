import { useEffect, useState } from "preact/hooks";

const PREFIX = "litterae.";

// Copie en mémoire : si le navigateur bloque le stockage (navigation privée, aperçu intégré),
// les compteurs continuent de fonctionner pendant la visite.
const memory = new Map<string, string>();

export function read<T>(key: string, fallback: T): T {
  let raw: string | null = memory.get(key) ?? null;
  try {
    raw = localStorage.getItem(PREFIX + key) ?? raw;
  } catch {
    // Stockage indisponible : on garde la copie en mémoire.
  }
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  memory.set(key, JSON.stringify(value));
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Stockage plein ou bloqué : l'app reste utilisable, seule la mémorisation est perdue.
  }
  listeners.get(key)?.forEach(fn => fn());
}

const listeners = new Map<string, Set<() => void>>();

/** Valeur stockée sur l'appareil, partagée entre les écrans qui l'utilisent. */
export function useStored<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const fn = () => setValue(read(key, fallback));
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => listeners.get(key)!.delete(fn);
  }, [key]);
  return [value, (v: T) => write(key, v)];
}

/**
 * Demande au navigateur de ne pas effacer les données de Litterae (clé d'accès, carnet, progression)
 * quand la mémoire du téléphone manque. Sans effet si l'élève efface lui-même les données du site.
 */
export function conserverDonnees() {
  navigator.storage?.persist?.().catch(() => {});
}
