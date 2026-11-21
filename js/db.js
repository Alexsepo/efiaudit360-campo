// Almacenamiento local en el móvil (IndexedDB). Todo funciona sin conexión.
let dbp;
function abre() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('efiaudit360', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('visitas', { keyPath: 'id' });
      d.createObjectStore('items', { keyPath: 'id' }).createIndex('visita', 'visitaId');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function tx(store, mode, fn) { const d = await abre(); const t = d.transaction(store, mode); const out = await fn(t.objectStore(store)); await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); }); return out; }
export const uid = () => crypto.randomUUID();
export const guardaVisita = (v) => tx('visitas', 'readwrite', (s) => req(s.put(v)));
export const visitas = () => tx('visitas', 'readonly', (s) => req(s.getAll())).then((l) => l.sort((a, b) => b.creada.localeCompare(a.creada)));
export const visita = (id) => tx('visitas', 'readonly', (s) => req(s.get(id)));
export const guardaItem = (i) => tx('items', 'readwrite', (s) => req(s.put(i)));
export const borraItem = (id) => tx('items', 'readwrite', (s) => req(s.delete(id)));
export const items = (visitaId) => tx('items', 'readonly', (s) => req(s.index('visita').getAll(visitaId))).then((l) => l.sort((a, b) => a.creado.localeCompare(b.creado)));
