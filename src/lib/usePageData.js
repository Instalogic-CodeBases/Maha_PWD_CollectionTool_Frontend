import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/*
  Mirrors the prototype's goto() loading behaviour:
    - shows a "Loading…" state while the loader runs
    - on 401: toasts "Session expired", logs out, returns to /login
    - on other errors: exposes an error message the page renders as a notice
  `loadFn` should perform the same loads the original goto() did for that page.
*/
export function usePageData(loadFn, deps = []) {
  const { logout } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, ready: false });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, ready: false });
    (async () => {
      try {
        await loadFn();
        if (alive) setState({ loading: false, error: null, ready: true });
      } catch (err) {
        if (!alive) return;
        if (err && err.status === 401) {
          toast('Session expired — please log in again', 'err');
          await logout();
          navigate('/login', { replace: true });
          return;
        }
        setState({ loading: false, error: err.message || 'Failed to load this screen', ready: false });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
