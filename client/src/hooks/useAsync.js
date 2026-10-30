import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api.js';

/** Runs `fn` on mount and whenever `deps` change; exposes loading/error/reload. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const alive = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const r = await fnRef.current(); alive.current && setState({ data: r, loading: false, error: null }); }
    catch (e) { alive.current && setState({ data: null, loading: false, error: errorMessage(e) }); }
  }, []);
  useEffect(() => { alive.current = true; run(); return () => { alive.current = false; }; }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: run };
}
