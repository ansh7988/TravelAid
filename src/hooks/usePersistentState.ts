import { useCallback, useState } from 'react';

interface Store<T> {
  list?: () => T;
  get?: () => T;
  save: (value: T) => { ok: true } | { ok: false; error: string };
}

/**
 * React state synced to a local store. Returns a save error string when writing fails,
 * so the UI can show an honest message instead of silently losing data.
 */
export function usePersistentState<T>(store: Store<T>) {
  const read = (store.list ?? store.get) as () => T;
  const [value, setValue] = useState<T>(() => read());
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        const result = store.save(resolved);
        setError(result.ok ? null : result.error);
        return result.ok ? resolved : prev;
      });
    },
    [store],
  );

  return { value, update, error };
}
