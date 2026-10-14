import { useCallback, useState } from 'react';
import { DEFAULT_TRIP, TRIPS, VIEWS } from './config.js';

// The current trip and page live in the URL hash (#nov26 or #nov26/split), so
// a link opens the same tab and page.
function parse() {
  const [t, v] = location.hash.slice(1).split('/');
  return { trip: TRIPS[t] ? t : DEFAULT_TRIP, view: VIEWS[v] ? v : 'hunt' };
}

export function useHashRoute() {
  const [route, setRoute] = useState(parse);
  const update = useCallback(next => {
    setRoute(prev => {
      const r = { ...prev, ...next };
      history.replaceState(null, '', '#' + r.trip + (r.view === 'hunt' ? '' : '/' + r.view));
      return r;
    });
  }, []);
  return [route, update];
}
