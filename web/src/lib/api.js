// JSON calls to the worker. api('/api/x') is a GET; pass a body to POST.
export async function api(path, method, body) {
  const r = await fetch(path, { method: method || 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}
