import * as db from './db.js';
import { abrirEditor } from './editor.js';
import { construirPaquete } from './paquete.js';

export const VERSION_APP = '2.4';
const app = document.getElementById('app');
function aviso(texto) {
  document.getElementById('aviso')?.remove();
  const a = el('div', { id: 'aviso', role: 'alert', style: 'position:fixed;left:12px;right:12px;top:12px;z-index:99;background:#B3261E;color:#fff;border-radius:12px;padding:12px 14px;font-size:14px' }, texto, ' ', el('button', { type: 'button', style: 'margin-left:8px;background:#fff;border:0;border-radius:8px;padding:6px 10px', onclick: () => a.remove() }, 'Cerrar'));
  document.body.append(a);
}
addEventListener('unhandledrejection', (e) => aviso('Algo ha fallado: ' + (e.reason?.message || e.reason)));
addEventListener('error', (e) => aviso('Algo ha fallado: ' + e.message));
const SIN = 'Sin asignar';
const ICONOS = {
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  audio: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  archivo: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  nota: '<path d="M5 4h14v12H9l-4 4z"/>'
};
const ETQ = { foto: 'Foto', video: 'Vídeo', audio: 'Audio', archivo: 'Archivo', nota: 'Nota' };
const hoy = () => new Date().toISOString().slice(0, 10);
const el = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v);
  }
  for (const h of hijos.flat()) if (h != null) e.append(h.nodeType ? h : document.createTextNode(h));
  return e;
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[n]}</svg>`;
const destinoTxt = (d) => (d ? [d.zona, d.equipo].filter(Boolean).join(' · ') : SIN);

let destinoActual = SIN;
const urls = [];
const url = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
const liberar = () => { while (urls.length) URL.revokeObjectURL(urls.pop()); };

async function ruta() {
  liberar();
  const m = /^#\/v\/(.+)$/.exec(location.hash);
  if (m) { const v = await db.visita(m[1]); if (v) return pantallaVisita(v); }
  return pantallaInicio();
}

async function pantallaInicio() {
  const lista = await db.visitas();
  const hotel = el('input', { type: 'text', id: 'hotel', placeholder: 'Nombre del hotel', autocomplete: 'off' });
  const fecha = el('input', { type: 'date', id: 'fecha', value: hoy() });
  const crear = async () => {
    if (!hotel.value.trim()) { hotel.focus(); return; }
    const v = { id: db.uid(), hotel: hotel.value.trim(), fecha: fecha.value || hoy(), creada: new Date().toISOString(), destinos: [], pendientes: [] };
    await db.guardaVisita(v); location.hash = `#/v/${v.id}`;
  };
  app.replaceChildren(
    el('header', { class: 'cab' }, el('div', { class: 'fila' }, el('strong', {}, 'EfiAudit360 · Campo'), estadoRed()), el('h1', {}, 'Visitas')),
    el('main', {},
      el('section', { class: 'caja' }, el('h2', {}, 'Nueva visita'),
        el('label', { class: 'c' }, 'Hotel', hotel), el('label', { class: 'c' }, 'Fecha', fecha),
        el('button', { class: 'btn p g', id: 'crear', type: 'button', onclick: crear }, 'Empezar visita')),
      el('h2', {}, 'Visitas guardadas en este móvil'),
      lista.length ? lista.map((v) => el('a', { class: 'caja', href: `#/v/${v.id}`, style: 'text-decoration:none;color:inherit' }, el('strong', {}, v.hotel), el('span', { class: 'vacio' }, `Visita ${v.fecha}`))) : el('p', { class: 'vacio' }, 'Todavía no hay ninguna.'),
      el('section', { class: 'caja' }, el('span', { class: 'vacio' }, `Versión ${VERSION_APP}`),
        el('button', { class: 'btn g', id: 'actualizar', type: 'button', onclick: actualizarApp }, 'Buscar actualización de la app'),
        el('span', { class: 'mini' }, 'No borra tus visitas: solo recarga el programa.')))
  );
}

function estadoRed() {
  const c = el('span', { class: 'chip net' });
  const act = () => { c.textContent = navigator.onLine ? 'Todo guardado en el móvil' : 'Sin conexión · todo guardado'; };
  act(); addEventListener('online', act); addEventListener('offline', act);
  return c;
}

async function pantallaVisita(v) {
  destinoActual = v.ultimo ?? SIN;
  const its = await db.items(v.id);
  const cuenta = (t) => its.filter((i) => i.tipo === t).length;
  const guarda = () => db.guardaVisita(v);
  const refresca = () => pantallaVisita(v);

  // Pendientes
  const pend = el('section', { class: 'caja pend' }, el('h2', {}, `Pendiente de esta visita (${v.pendientes.filter((p) => p.hecho).length} de ${v.pendientes.length})`));
  v.pendientes.forEach((p, i) => pend.append(el('label', { class: 'pen' }, el('input', { type: 'checkbox', ...(p.hecho ? { checked: '' } : {}), onchange: async (e) => { p.hecho = e.target.checked; await guarda(); refresca(); } }), p.texto)));
  const np = el('input', { type: 'text', placeholder: 'Añadir tarea (por ejemplo: pedir facturas)', id: 'nueva-tarea' });
  pend.append(el('div', { class: 'fila' }, np, el('button', { class: 'btn', type: 'button', onclick: async () => { if (np.value.trim()) { v.pendientes.push({ texto: np.value.trim(), hecho: false }); await guarda(); refresca(); } } }, '+')));

  // Destinos
  const nombres = [SIN, ...v.destinos.map(destinoTxt)];
  if (!nombres.includes(destinoActual)) destinoActual = SIN;
  const chips = el('div', { class: 'dest', role: 'group', 'aria-label': 'Guardar en' }, nombres.map((n) => el('button', { type: 'button', class: n === destinoActual ? 'on' : '', onclick: async () => { v.ultimo = n; await guarda(); refresca(); } }, n)));
  const zona = el('input', { type: 'text', placeholder: 'Zona (Cubierta, Salón…)', id: 'zona' });
  const equipo = el('input', { type: 'text', placeholder: 'Equipo (opcional)', id: 'equipo' });
  const dest = el('section', { class: 'caja' }, el('h2', {}, 'Guardar en'), chips,
    el('details', {}, el('summary', { style: 'min-height:44px;display:flex;align-items:center;cursor:pointer;color:#0B6E6D;font-weight:600' }, '+ Zona o equipo nuevo'),
      el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:8px' }, zona, equipo,
        el('button', { class: 'btn', id: 'add-destino', type: 'button', onclick: async () => {
          if (!zona.value.trim() && !equipo.value.trim()) { zona.focus(); return; }
          const d = { zona: zona.value.trim(), equipo: equipo.value.trim() };
          v.destinos.push(d); v.ultimo = destinoTxt(d); await guarda(); refresca();
        } }, 'Añadir'))));

  // Elementos por destino
  const grupos = new Map();
  for (const i of its) { const k = destinoTxt(i.destino); (grupos.get(k) || grupos.set(k, []).get(k)).push(i); }
  const lista = el('div', { style: 'display:flex;flex-direction:column;gap:12px' });
  if (!its.length) lista.append(el('p', { class: 'vacio' }, 'Aún no hay nada. Usa los botones de abajo.'));
  for (const [k, arr] of grupos) {
    lista.append(el('div', { class: 'grupo' }, el('h3', {}, `${k} · ${arr.length}`), el('div', { class: 'grid' }, arr.map((i) => {
      const hijo = i.tipo === 'foto' ? el('img', { src: url(i.marcado || i.blob), alt: i.comentario || 'Foto' }) : el('span', { class: 'ic', html: svg(i.tipo).replace('<svg', '<svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"') });
      return el('button', { class: 'it', type: 'button', 'data-tipo': i.tipo, onclick: () => detalle(i, refresca) }, hijo, el('span', { class: 'etq' }, ETQ[i.tipo] + (i.marcado ? ' ✎' : '')));
    }))));
  }

  const destino = () => { const d = v.destinos.find((x) => destinoTxt(x) === destinoActual); return d || null; };
  const nuevo = async (tipo, extra) => { await db.guardaItem({ id: db.uid(), visitaId: v.id, tipo, destino: destino(), creado: new Date().toISOString(), comentario: '', ...extra }); refresca(); };

  const inp = (id, accept, capture) => el('input', { type: 'file', id, accept, ...(capture ? { capture } : {}), hidden: '' });
  const iFoto = inp('in-foto', 'image/*', 'environment'), iVideo = inp('in-video', 'video/*', 'environment'), iArch = inp('in-archivo', '*/*');
  iArch.multiple = true;
  iFoto.onchange = async () => {
    const f = iFoto.files[0]; iFoto.value = ''; if (!f) return;
    const r = await abrirEditor(f, `Foto ${cuenta('foto') + 1} · ${destinoActual}`);
    if (r) await nuevo('foto', { blob: f, mime: f.type, nombre: f.name, marcado: r.marcado, textos: r.textos });
  };
  iVideo.onchange = async () => { const f = iVideo.files[0]; iVideo.value = ''; if (f) await nuevo('video', { blob: f, mime: f.type, nombre: f.name }); };
  iArch.onchange = async () => { const fs = [...iArch.files]; iArch.value = ''; for (const f of fs) await db.guardaItem({ id: db.uid(), visitaId: v.id, tipo: 'archivo', destino: destino(), creado: new Date().toISOString(), comentario: '', blob: f, mime: f.type, nombre: f.name }); if (fs.length) refresca(); };

  const boton = (t, cls, fn) => el('button', { type: 'button', class: cls, id: `cap-${t}`, html: svg(t) + ETQ[t], onclick: fn });
  const barra = el('nav', { class: 'barra', 'aria-label': 'Captura rápida' },
    el('div', { class: 'cap' },
      boton('foto', 'foto', () => iFoto.click()), boton('video', '', () => iVideo.click()),
      boton('audio', '', () => grabarAudio(nuevo)), boton('archivo', '', () => iArch.click()), boton('nota', '', () => escribirNota(nuevo))),
    el('button', { class: 'btn p g', id: 'enviar', type: 'button', onclick: () => enviar(v) }, 'Enviar visita completa (.zip)'),
    el('span', { class: 'mini' }, `Versión ${VERSION_APP}. Las fotos y audios se guardan solos en la visita. Al terminar, pulsa «Enviar visita completa»: no compartas las fotos sueltas.`));

  app.replaceChildren(
    el('header', { class: 'cab' }, el('div', { class: 'fila' }, el('a', { href: '#/', style: 'color:#C7D7DC;text-decoration:none' }, '← Visitas'), estadoRed()),
      el('button', { class: 'btn', id: 'enviar-arriba', type: 'button', style: 'background:#fff;margin-top:4px', onclick: () => enviar(v) }, 'Enviar visita completa (.zip)'),
      el('h1', {}, v.hotel), el('div', { style: 'font-size:13px;color:#C7D7DC' }, `Visita ${v.fecha} · ${cuenta('foto')} fotos · ${cuenta('audio')} audios · ${cuenta('video')} vídeos · ${cuenta('archivo')} archivos · ${cuenta('nota')} notas`)),
    el('main', {}, pend, dest, lista), iFoto, iVideo, iArch, barra);
}

function modal(titulo, cuerpo) {
  const m = el('div', { class: 'modal', role: 'dialog', 'aria-label': titulo });
  const cerrar = () => m.remove();
  m.append(el('div', { class: 'hoja' }, el('h2', {}, titulo), cuerpo(cerrar)));
  m.addEventListener('click', (e) => { if (e.target === m) cerrar(); });
  document.body.append(m); return cerrar;
}

function escribirNota(nuevo) {
  const t = el('textarea', { id: 'texto-nota', rows: '5', placeholder: 'Escribe la nota…' });
  modal('Nota', (cerrar) => el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, t,
    el('button', { class: 'btn p g', id: 'guardar-nota', type: 'button', onclick: async () => { if (!t.value.trim()) return; cerrar(); await nuevo('nota', { texto: t.value.trim() }); } }, 'Guardar nota'),
    el('button', { class: 'btn g', type: 'button', onclick: cerrar }, 'Cancelar')));
  t.focus();
}

function grabarAudio(nuevo) {
  const crono = el('div', { class: 'rec', id: 'crono', role: 'timer' }, '0:00');
  const msg = el('p', { class: 'vacio', id: 'msg-audio' }, 'Toca Grabar y habla. El audio original se conserva tal cual.');
  let rec, chunks = [], t0, timer, stream, cancelado = false;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const libera = () => { clearInterval(timer); stream?.getTracks().forEach((x) => x.stop()); };
  const bGrab = el('button', { class: 'btn p g', id: 'grabar', type: 'button' }, 'Grabar');
  const cerrar = modal('Audio', (cerrar0) => {
    bGrab.onclick = async () => {
      if (rec && rec.state === 'recording') { rec.stop(); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { msg.textContent = 'No se puede usar el micrófono. Revisa el permiso del navegador o adjunta un archivo de audio con «Archivo».'; return; }
      const tipo = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined); chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        libera(); crono.classList.remove('on'); cerrar0();
        if (cancelado || !chunks.length) return;
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        await nuevo('audio', { blob, mime: blob.type, nombre: `audio-${Date.now()}`, duracion: Math.round((Date.now() - t0) / 1000) });
      };
      rec.start(1000); t0 = Date.now(); crono.classList.add('on'); bGrab.textContent = 'Detener y guardar'; msg.textContent = 'Grabando…';
      timer = setInterval(() => { crono.textContent = fmt(Math.round((Date.now() - t0) / 1000)); }, 500);
    };
    return el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, crono, msg, bGrab,
      el('button', { class: 'btn g', type: 'button', onclick: () => { cancelado = true; if (rec?.state === 'recording') rec.stop(); else { libera(); cerrar0(); } } }, 'Cancelar'));
  });
}

function detalle(i, refresca) {
  modal(`${ETQ[i.tipo]} · ${destinoTxt(i.destino)}`, (cerrar) => {
    const com = el('textarea', { rows: '3', id: 'comentario', placeholder: 'Comentario' }); com.value = i.comentario || '';
    let vista;
    if (i.tipo === 'foto') vista = el('img', { src: url(i.marcado || i.blob), alt: 'Foto', style: 'width:100%;border-radius:10px' });
    else if (i.tipo === 'video') vista = el('video', { src: url(i.blob), controls: '', style: 'width:100%;border-radius:10px' });
    else if (i.tipo === 'audio') vista = el('audio', { src: url(i.blob), controls: '', style: 'width:100%' });
    else if (i.tipo === 'nota') vista = el('p', { style: 'white-space:pre-wrap;margin:0' }, i.texto);
    else vista = el('p', { style: 'margin:0' }, `${i.nombre} · ${(i.blob.size / 1024).toFixed(0)} KB`);
    return el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, vista,
      i.marcado ? el('span', { class: 'chip warn' }, 'Se conserva el original y la versión con marcas') : null, com,
      el('button', { class: 'btn p g', type: 'button', onclick: async () => { i.comentario = com.value; await db.guardaItem(i); cerrar(); refresca(); } }, 'Guardar comentario'),
      el('button', { class: 'btn g', id: 'borrar', type: 'button', style: 'color:#B3261E;border-color:#B3261E', onclick: async () => { if (confirm('¿Borrar este elemento de la visita?')) { await db.borraItem(i.id); cerrar(); refresca(); } } }, 'Borrar'));
  });
}

async function enviar(v) {
  let cerrarEspera;
  try {
    cerrarEspera = modal('Enviar visita', () => el('p', { id: 'estado-envio' }, 'Preparando el paquete…'));
    const its = await db.items(v.id);
    if (!its.length) { cerrarEspera(); aviso('La visita está vacía: haz alguna foto, audio o nota antes de enviarla.'); return; }
    const { nombre, bytes, manifiesto } = await construirPaquete(v, its);
    cerrarEspera();
    // Chrome solo deja compartir ciertos tipos de archivo: probamos varios y usamos el primero admitido.
    const candidatos = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'].map((t) => new File([bytes], nombre, { type: t }));
    const archivo = candidatos.find((f) => navigator.canShare?.({ files: [f] })) || candidatos[0];
    const detalleTec = `Tipo ${archivo.type}; canShare: ${navigator.canShare ? candidatos.map((f) => navigator.canShare({ files: [f] })).join('/') : 'no existe'}; ${(bytes.length / 1048576).toFixed(1)} MB`;
    const resumen = `${manifiesto.elementos.length} elementos · ${(bytes.length / 1048576).toFixed(1)} MB`;
    modal('Visita lista', (c) => {
      const msg = el('p', { id: 'msg-envio', class: 'vacio', style: 'margin:0' }, 'Lo más seguro: pulsa «Guardar el .zip en el móvil» y luego súbelo a OneDrive desde la app Archivos.');
      const acciones = [];
      const sube = [];
      if (navigator.canShare?.({ files: [archivo] })) {
        acciones.push(el('button', { class: 'btn g', id: 'compartir', type: 'button', onclick: async () => {
          try { await navigator.share({ files: [archivo], title: nombre }); msg.textContent = 'El móvil ha aceptado compartir. Comprueba en OneDrive que aparece el .zip.'; }
          catch (e) { msg.textContent = e?.name === 'AbortError' ? 'Has cancelado el envío. Puedes volver a intentarlo.' : `Tu móvil no ha podido compartir el archivo (${e?.name}: ${e?.message}). [${detalleTec}] Usa «Guardar el .zip en el móvil» y súbelo desde la app Archivos.`; }
        } }, 'Probar a compartir directamente'));
      } else {
        msg.textContent = `Este navegador no permite compartir este tipo de archivo directamente [${detalleTec}]. Usa «Guardar el .zip en el móvil» y súbelo a OneDrive desde la app Archivos.`;
      }
      const href = url(archivo);
      acciones.push(el('a', { class: 'btn p g', id: 'descargar', href, download: nombre, onclick: () => { msg.textContent = 'Guardado en Descargas como ' + nombre + '. Abre la app Archivos, entra en Descargas, deja pulsado el .zip y elige Compartir, OneDrive.'; } }, 'Guardar el .zip en el móvil'));
      acciones.reverse();
      return el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, el('p', { style: 'margin:0;word-break:break-all' }, nombre), el('p', { class: 'vacio', style: 'margin:0' }, resumen), msg, acciones, el('button', { class: 'btn g', type: 'button', onclick: c }, 'Cerrar'));
    });
  } catch (e) {
    cerrarEspera?.();
    aviso('No se ha podido preparar la visita: ' + (e?.message || e));
  }
}

async function actualizarApp() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    for (const k of await caches.keys()) await caches.delete(k);
  } catch { /* se recarga igualmente */ }
  location.reload();
}

addEventListener('hashchange', ruta);
ruta();
if ('serviceWorker' in navigator) {
  const habia = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (habia && !window.__recargado) { window.__recargado = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
}
