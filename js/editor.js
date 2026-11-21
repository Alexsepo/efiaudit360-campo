// Editor de foto: dibujar, flecha y texto sobre la imagen. El original nunca se modifica:
// se devuelve aparte una copia PNG con las marcas.
const COLORES = [['#E5484D', 'Rojo'], ['#F5B301', 'Amarillo'], ['#3E8EF7', 'Azul'], ['#FFFFFF', 'Blanco']];

export async function abrirEditor(blob, titulo = 'Foto') {
  const bmp = await createImageBitmap(blob);
  const esc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const W = Math.round(bmp.width * esc), H = Math.round(bmp.height * esc);
  const ops = [];
  let tool = 'draw', color = COLORES[0][0], cur = null;

  const ov = document.createElement('div');
  ov.className = 'editor'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Editar foto');
  ov.innerHTML = `
    <header><button type="button" data-a="cancel">✕ Descartar</button><strong></strong><span></span></header>
    <div class="lienzo"><canvas width="${W}" height="${H}"></canvas></div>
    <div class="colores"></div>
    <div class="herr"></div>
    <label class="texto-fila"><span>Texto para colocar</span><input type="text" placeholder="Escribe y toca la foto" maxlength="80"></label>
    <footer><button type="button" data-a="ok" class="primario">Guardar foto</button></footer>`;
  ov.querySelector('strong').textContent = titulo;
  const cv = ov.querySelector('canvas'), cx = cv.getContext('2d'), inp = ov.querySelector('input');
  const colEl = ov.querySelector('.colores'), herrEl = ov.querySelector('.herr');
  for (const [c, n] of COLORES) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'punto'; b.style.background = c; b.setAttribute('aria-label', n); b.dataset.c = c;
    b.onclick = () => { color = c; pinta(); }; colEl.append(b);
  }
  const HERR = [['draw', 'Dibujar'], ['arrow', 'Flecha'], ['text', 'Texto'], ['undo', 'Deshacer']];
  for (const [t, n] of HERR) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'herr-b'; b.textContent = n; b.dataset.t = t;
    b.onclick = () => { if (t === 'undo') { ops.pop(); dibuja(); } else tool = t; pinta(); }; herrEl.append(b);
  }
  const pinta = () => {
    colEl.querySelectorAll('.punto').forEach((b) => b.classList.toggle('on', b.dataset.c === color));
    herrEl.querySelectorAll('.herr-b').forEach((b) => b.classList.toggle('on', b.dataset.t === tool));
  };
  const lw = () => Math.max(3, Math.round(W / 140));
  function pintaOp(o) {
    cx.strokeStyle = o.c; cx.fillStyle = o.c; cx.lineWidth = lw(); cx.lineCap = 'round'; cx.lineJoin = 'round';
    if (o.t === 'draw') { cx.beginPath(); o.p.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y))); if (o.p.length === 1) cx.lineTo(o.p[0][0] + 0.1, o.p[0][1]); cx.stroke(); }
    if (o.t === 'arrow') {
      const [x1, y1] = o.a, [x2, y2] = o.b, ang = Math.atan2(y2 - y1, x2 - x1), h = lw() * 5;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
      cx.beginPath(); cx.moveTo(x2, y2); cx.lineTo(x2 - h * Math.cos(ang - 0.45), y2 - h * Math.sin(ang - 0.45)); cx.moveTo(x2, y2); cx.lineTo(x2 - h * Math.cos(ang + 0.45), y2 - h * Math.sin(ang + 0.45)); cx.stroke();
    }
    if (o.t === 'text') {
      const fs = Math.round(W / 22); cx.font = `700 ${fs}px Inter, system-ui, sans-serif`; cx.textBaseline = 'top';
      const w = cx.measureText(o.s).width;
      cx.fillStyle = 'rgba(15,42,54,.72)'; cx.fillRect(o.x - 8, o.y - 6, w + 16, fs + 12);
      cx.fillStyle = o.c; cx.fillText(o.s, o.x, o.y);
    }
  }
  function dibuja() { cx.drawImage(bmp, 0, 0, W, H); ops.forEach(pintaOp); if (cur) pintaOp(cur); }
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId); const p = pos(e);
    if (tool === 'text') { const s = inp.value.trim(); if (s) { ops.push({ t: 'text', c: color, x: p[0], y: p[1], s }); dibuja(); } else inp.focus(); return; }
    cur = tool === 'draw' ? { t: 'draw', c: color, p: [p] } : { t: 'arrow', c: color, a: p, b: p }; dibuja();
  });
  cv.addEventListener('pointermove', (e) => { if (!cur) return; const p = pos(e); if (cur.t === 'draw') cur.p.push(p); else cur.b = p; dibuja(); });
  const fin = () => { if (cur) { ops.push(cur); cur = null; dibuja(); } };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  document.body.append(ov); pinta(); dibuja();

  return new Promise((res) => {
    ov.addEventListener('click', (e) => {
      const a = e.target?.dataset?.a; if (!a) return;
      if (a === 'cancel') { ov.remove(); res(null); }
      if (a === 'ok') {
        const textos = ops.filter((o) => o.t === 'text').map((o) => o.s);
        if (!ops.length) { ov.remove(); res({ marcado: null, textos: [] }); return; }
        cv.toBlob((b) => { ov.remove(); res({ marcado: b, textos }); }, 'image/png');
      }
    });
  });
}
