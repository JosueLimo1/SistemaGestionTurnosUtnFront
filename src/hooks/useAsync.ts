import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from '../api';

/** Carga datos de la API y expone { data, loading, error, reload }. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    run()
      .then((d) => {
        if (id === seq.current) setData(d);
      })
      .catch((e) => {
        if (id === seq.current) setError(errorMessage(e));
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
