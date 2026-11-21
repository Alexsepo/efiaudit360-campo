import { makeZip } from './zip.js';

export const FORMATO = 'efiaudit360-visita';
export const VERSION_FORMATO = 1;

export async function sha256Hex(bytes) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function limpiaNombre(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'archivo';
}
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'audio/webm': '.webm', 'audio/mp4': '.m4a', 'audio/ogg': '.ogg', 'video/mp4': '.mp4', 'video/webm': '.webm', 'application/pdf': '.pdf', 'text/plain': '.txt' };
function extDe(nombre, mime) {
  const m = /\.[A-Za-z0-9]{1,6}$/.exec(nombre || '');
  return m ? m[0].toLowerCase() : EXT[(mime || '').split(';')[0]] || '.bin';
}
async function bytesDe(blob) { return new Uint8Array(await blob.arrayBuffer()); }

/**
 * Construye el paquete de una visita: visita.json + archivos originales sin tocar (SHA-256).
 * Una foto editada guarda el original y, aparte, la versión con marcas.
 */
export async function construirPaquete(visita, items, ahora = new Date()) {
  const archivos = [], lista = [];
  const n = {};
  for (const it of items) {
    n[it.tipo] = (n[it.tipo] || 0) + 1;
    const base = `${it.tipo}-${String(n[it.tipo]).padStart(3, '0')}`;
    const entrada = { id: it.id, tipo: it.tipo, destino: it.destino || null, creado: it.creado, comentario: it.comentario || '' };
    if (it.tipo === 'nota') {
      const data = new TextEncoder().encode(it.texto || '');
      const ruta = `archivos/${base}.txt`;
      archivos.push({ name: ruta, data });
      Object.assign(entrada, { archivo: ruta, sha256: await sha256Hex(data), bytes: data.length, texto: it.texto || '' });
    } else {
      const data = await bytesDe(it.blob);
      const ruta = `archivos/${base}${it.tipo === 'archivo' ? '-' + limpiaNombre(it.nombre) : extDe(it.nombre, it.mime)}`;
      archivos.push({ name: ruta, data });
      Object.assign(entrada, { archivo: ruta, nombreOriginal: it.nombre || null, mime: it.mime || it.blob.type || null, sha256: await sha256Hex(data), bytes: data.length });
      if (it.marcado) {
        const d2 = await bytesDe(it.marcado);
        const r2 = `archivos/${base}-marcas.png`;
        archivos.push({ name: r2, data: d2 });
        entrada.conMarcas = { archivo: r2, sha256: await sha256Hex(d2), bytes: d2.length, textos: it.textos || [] };
      }
    }
    lista.push(entrada);
  }
  const manifiesto = {
    formato: FORMATO, version: VERSION_FORMATO, generado: ahora.toISOString(),
    visita: { id: visita.id, hotel: visita.hotel, fecha: visita.fecha, creada: visita.creada },
    destinos: visita.destinos, pendientes: visita.pendientes, elementos: lista,
    nota: 'Los archivos de archivos/ son los originales sin modificar. Los datos de esta visita son de campo y no se han validado.'
  };
  const json = new TextEncoder().encode(JSON.stringify(manifiesto, null, 2));
  const nombre = `visita_${limpiaNombre(visita.hotel)}_${visita.fecha}.zip`;
  return { nombre, bytes: makeZip([{ name: 'visita.json', data: json }, ...archivos], ahora), manifiesto };
}
