// Small helpers shared by every route module.
export const j = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
