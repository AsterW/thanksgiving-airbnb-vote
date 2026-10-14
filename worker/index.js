// Cloudflare Worker entry: routes /api/* to each feature's route table and
// serves the built frontend (./dist, via [assets]) for everything else.
// Each feature owns its routes in its own folder, so adding an endpoint only
// touches that feature's routes file.
import { routes as listingRoutes } from './listings/routes.js';
import { routes as userRoutes } from './users/users.js';
import { routes as splitRoutes } from './split/routes.js';
import { routes as foodRoutes } from './food/routes.js';
import { routes as angelRoutes } from './angel/routes.js';
import { routes as weatherRoutes } from './weather/routes.js';
import { routes as flightRoutes } from './flights/routes.js';
import { routes as activityRoutes } from './activities/routes.js';

// The Durable Object class must be exported from the entry module.
export { BlackjackTable } from './blackjack/table.js';
export { DdzHall } from './ddz/hall.js';

const ROUTES = { ...listingRoutes, ...userRoutes, ...splitRoutes, ...foodRoutes, ...angelRoutes, ...weatherRoutes, ...activityRoutes, ...flightRoutes };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Blackjack is one WebSocket endpoint handled by the table itself.
    if (url.pathname === '/api/bj') return env.BJ_TABLE.get(env.BJ_TABLE.idFromName('main')).fetch(request);
    // 斗地主: one WebSocket endpoint for all its tables, handled by the hall.
    if (url.pathname === '/api/ddz') return env.DDZ_HALL.get(env.DDZ_HALL.idFromName('hall')).fetch(request);
    const handler = ROUTES[request.method + ' ' + url.pathname];
    if (handler) return handler(request, env, url);
    return env.ASSETS.fetch(request);
  }
};
