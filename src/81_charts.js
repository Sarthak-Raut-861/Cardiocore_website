/* ═══════════════════════════════════════════════════════════
   CardioCore · Charts + Units
   Interactive plots: crosshair, drag-scrub, pin, zoom, real
   variability envelopes and a spring draw-in — plus SI-aware
   unit formatting for every number the app prints.
   ═══════════════════════════════════════════════════════════ */
const Units = (() => {
  /* kind → [SI unit, conversion from stored value, conventional unit, conversion] */
  const DEF = {
    hr:     { si:'min⁻¹', toSI:v => v,        conv:'BPM',      toConv:v => v,        dp:0 },
    hrv:    { si:'ms',    toSI:v => v,        conv:'ms',       toConv:v => v,        dp:0 },
    spo2:   { si:'%',     toSI:v => v,        conv:'%',        toConv:v => v,        dp:0 },
    temp:   { si:'°C',    toSI:v => v,        conv:'°F',       toConv:v => v * 9/5 + 32, dp:1 },
    chol:   { si:'mmol/L', toSI:v => v / 38.67, conv:'mg/dL',  toConv:v => v,       dp:2 },
    glucose:{ si:'mmol/L', toSI:v => v / 18.016, conv:'mg/dL', toConv:v => v,       dp:2 },
    mass:   { si:'kg',    toSI:v => v,        conv:'lb',       toConv:v => v * 2.2046, dp:1 },
    dist:   { si:'km',    toSI:v => v,        conv:'mi',       toConv:v => v * 0.6214, dp:2 },
    rate:   { si:'min⁻¹', toSI:v => v,        conv:'/min',     toConv:v => v,        dp:1 },
    pct:    { si:'%',     toSI:v => v,        conv:'%',        toConv:v => v,        dp:0 },
    time:   { si:'min',   toSI:v => v,        conv:'min',      toConv:v => v,        dp:0 },
    score:  { si:'',      toSI:v => v,        conv:'',         toConv:v => v,        dp:0 },
  };
  const pref = () => X.store.units || 'si';
  const unit = kind => { const d = DEF[kind] || DEF.score; return pref() === 'si' ? d.si : d.conv; };
  const value = (kind, v) => { const d = DEF[kind] || DEF.score; const n = pref() === 'si' ? d.toSI(v) : d.toConv(v);
                               return Number.isFinite(n) ? +n.toFixed(d.dp) : v; };
  const fmt = (kind, v, withUnit = true) => {
    const n = value(kind, v), d = DEF[kind] || DEF.score;
    const s = Number(n).toFixed(d.dp);
    return withUnit ? s + (unit(kind) ? ' ' + unit(kind) : '') : s;
  };
  /* what the user sees for the paired unit, e.g. "68 min⁻¹ (BPM)" */
  const both = (kind, v) => {
    const d = DEF[kind] || DEF.score;
    if(!d.si || d.si === d.conv) return fmt(kind, v);
    return `${fmt(kind, v)} (${pref() === 'si' ? d.conv : d.si} ${pref() === 'si' ? d.toConv(v).toFixed(d.dp) : d.toSI(v).toFixed(d.dp)})`;
  };
  function set(p){
    X.store.units = p; X.save(); paint(); CC.drawAll(document);
    CC.toast(p === 'si' ? 'Units: SI (min⁻¹, ms, °C, mmol/L).' : 'Units: conventional (°F, mg/dL).', 'ok', 3600);
  }
  /* rewrite every tagged number in place — idempotent, so it can run on any repaint */
  function paint(root = document){
    root.querySelectorAll('[data-unit]').forEach(el => {
      const kind = el.dataset.unit;
      const numEl = el.querySelector('[data-num]');
      const src = numEl ? numEl.textContent : el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : '';
      /* the first paint records the raw value; every later paint converts from it,
         so switching SI ↔ conventional is lossless */
      const raw = el.dataset.raw !== undefined ? parseFloat(el.dataset.raw)
                                               : parseFloat(String(src).replace(/[^0-9.+-]/g, ''));
      if(!Number.isFinite(raw)) return;
      el.dataset.raw = String(raw);
      const shown = value(kind, raw);
      const d = DEF[kind] || DEF.score;
      const txt = shown.toFixed(d.dp);
      if(numEl) numEl.textContent = txt;
      else if(el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = txt;
      const slot = el.querySelector('.u, .metric-unit, [data-unit-txt]');
      if(slot){
        const u = unit(kind);
        slot.textContent = u ? (slot.className.includes('metric-unit') ? u : ' ' + u) : '';
      }
    });
  }
  /* write a raw measurement into a readout that carries data-unit (the tag may sit on
     the wrapper, not on the number node) and re-render it in the active unit system */
  function write(id, v){
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if(!el) return;
    el.textContent = v;
    const host = el.closest && el.closest('[data-unit]');
    if(host){
      const num = parseFloat(String(v).replace(/[^0-9.+-]/g, ''));
      if(Number.isFinite(num)) host.dataset.raw = String(num);
      paint(host.closest('.view') || document);
    }
  }

  function chip(){
    const p = pref();
    return `<div class="seg units-seg">
      <button class="${p === 'si' ? 'on' : ''}" onclick="CC.setUnits('si')" title="min⁻¹, ms, °C, mmol/L">SI</button>
      <button class="${p === 'conv' ? 'on' : ''}" onclick="CC.setUnits('conv')" title="BPM, °F, mg/dL">Conventional</button></div>`;
  }
  function mountChips(){
    const host = document.getElementById('unitChips');
    if(host) host.innerHTML = chip();
  }
  document.addEventListener('DOMContentLoaded', () => { mountChips(); paint(); });
  return {DEF, value, unit, fmt, both, write, set, setUnits:set, paint, chip, mountChips, pref};
})();
if (typeof window !== 'undefined') window.Units = Units;

const ChartFX = (() => {
  const hexA = (c, a) => CC._helpers.hexA(c, a);
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const original = {};                       /* key → pristine cfg */
  const state = {};                          /* key → { zoom:[i0,i1], pins:[i], hover:i, brush:[a,b] } */
  const st = key => (state[key] ||= { zoom:null, pins:[], hover:null, brush:null });
  const skipZoom = cv => cv.dataset.chart === 'day' || cv.dataset.nozoom !== undefined;

  const snapshot = cfg => JSON.parse(JSON.stringify({ vals:cfg.vals, labels:cfg.labels, series:cfg.series, quality:cfg.quality }));
  function remember(key, cfg){
    if(!original[key] && cfg) original[key] = snapshot(cfg);
    return original[key];
  }
  /* zoom is applied by rewriting the live cfg from the saved copy, then drawAll runs as usual */
  function applyZoom(){
    const charts = CC._charts;
    Object.keys(original).forEach(key => {
      const cfg = charts[key], full = original[key];
      const z = st(key).zoom;
      if(!cfg || !full) return;
      const slice = (arr, a, b) => arr ? arr.slice(a, b + 1) : arr;
      const n = (full.vals || []).length;
      const [a, b] = z ? z : [0, n - 1];
      cfg.vals = slice(full.vals, a, b);
      cfg.labels = slice(full.labels, a, b);
      cfg.quality = slice(full.quality, a, b);
      if(full.series) cfg.series = full.series.map(s2 => ({ ...s2, vals:slice(s2.vals, a, b) }));
      cfg._zoom = z ? [a, b, n] : null;
    });
  }

  /* ───────── envelopes: what "normal" looks like around the line ───────── */
  function envelope(vals, win = 5){
    const n = vals.length, lo = [], hi = [], trend = [];
    let e = vals[0];
    for(let i = 0; i < n; i++){
      e = e + (vals[i] - e) * 0.35;                                  /* EWMA trend */
      trend.push(e);
      const a = Math.max(0, i - win), b = Math.min(n - 1, i + win);
      const window = vals.slice(a, b + 1);
      const mean = window.reduce((s2, v) => s2 + v, 0) / window.length;
      const sd = Math.sqrt(window.reduce((s2, v) => s2 + (v - mean) ** 2, 0) / window.length) || 1;
      lo.push(mean - sd * 1.6);
      hi.push(mean + sd * 1.6);
    }
    return { lo, hi, trend };
  }

  /* ───────── the layered canvases: underlay = bands, overlay = interaction ───────── */
  function prep(cv){
    const host = cv.parentElement;
    if(!host) return null;
    if(host.dataset.chartHost !== '1'){
      host.dataset.chartHost = '1';
      host.classList.add('chart-host');
      const mk = cls => {
        const c = document.createElement('canvas');
        c.className = cls; c.setAttribute('aria-hidden', 'true');
        host.insertBefore(c, cv);
        return c;
      };
      const under = mk('chart-under');
      const over = document.createElement('canvas');
      over.className = 'chart-over';
      host.insertBefore(over, cv.nextSibling);
      host._under = under; host._over = over;
      size(cv, under); size(cv, over);
      wire(cv, over);
    }
    return { under:host._under, over:host._over };
  }
  function size(cv, layer){
    const r = cv.getBoundingClientRect();
    const host = cv.parentElement, hr = host.getBoundingClientRect();
    /* align to the canvas itself — the card has a title and a value above it */
    const left = r.left - hr.left - host.clientLeft + host.scrollLeft;
    const top  = r.top  - hr.top  - host.clientTop  + host.scrollTop;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if(layer._w === w && layer._h === h && layer._l === Math.round(left) && layer._t === Math.round(top)) return false;
    layer._l = Math.round(left); layer._t = Math.round(top);
    layer.style.left = left + 'px'; layer.style.top = top + 'px';
    layer.width = w * dpr; layer.height = h * dpr;
    layer.style.width = w + 'px'; layer.style.height = h + 'px';
    layer._w = w; layer._h = h; layer._dpr = dpr;
    const ctx = layer.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  const PAD = cv => ({ l:cv.dataset.chart === 'day' ? 38 : 6, r:6, t:16, b:cv.dataset.chart === 'day' ? 30 : 22 });
  const nOf = cfg => (cfg.idx || cfg.vals || (cfg.series && cfg.series[0].vals) || []).length;
  const seriesOf = cfg => cfg.series || [{ vals:cfg.vals, color:cfg.color, unit:cfg.unit, kind:cfg.kind, label:cfg.label }];
  function indexAt(cv, cfg, clientX){
    const r = cv.getBoundingClientRect();
    const n = nOf(cfg), pad = PAD(cv);
    const span = r.width - pad.l - pad.r;
    const i = Math.round(((clientX - r.left) - pad.l) / span * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }
  function xOf(cv, i, n){
    const r = cv.getBoundingClientRect(), pad = PAD(cv);
    return pad.l + i * (r.width - pad.l - pad.r) / Math.max(1, n - 1);
  }
  function yOf(cv, cfg, v){
    const s = seriesOf(cfg)[0].vals;
    const mn = Math.min(...s, cfg.base ?? Infinity), mx = Math.max(...s, cfg.base ?? -Infinity);
    const span = (mx - mn) || 1, lo = mn - span * 0.35, hi = mx + span * 0.35;
    const r = cv.getBoundingClientRect(), pad = PAD(cv);
    return pad.t + (hi - v) / (hi - lo) * (r.height - pad.t - pad.b);
  }

  /* ───────── underlay: expected range + trend + (for time series) day shading ───────── */
  function drawUnder(cv){
    const host = cv.parentElement, under = host && host._under;
    const cfg = cv._cfg;
    if(!under || !cfg) return;
    size(cv, under);
    const ctx = under.getContext('2d');
    const r = cv.getBoundingClientRect(), pad = PAD(cv);
    const w = r.width, h = r.height;
    ctx.clearRect(0, 0, w, h);
    const series = seriesOf(cfg).filter(s2 => s2.vals && s2.vals.length > 2);
    if(!series.length || cfg.type === 'bars' || cfg.type === 'stack' || cfg.type === 'dual') return;

    series.forEach((s2, si) => {
      const { lo, hi, trend } = envelope(s2.vals);
      const n = s2.vals.length;
      const X = i => xOf(cv, i, n);
      const Y = v => yOf(cv, cfg, v);
      /* the envelope the Twin expects this signal to stay inside */
      ctx.beginPath();
      hi.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
      for(let i = n - 1; i >= 0; i--) ctx.lineTo(X(i), Y(lo[i]));
      ctx.closePath();
      ctx.fillStyle = hexA(s2.color || '#0E9E9E', si === 0 ? 0.10 : 0.06);
      ctx.fill();
      ctx.strokeStyle = hexA(s2.color || '#0E9E9E', 0.20); ctx.lineWidth = 1; ctx.stroke();
      /* trend: the direction, stripped of the day's noise */
      ctx.beginPath();
      trend.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
      ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6;
      ctx.strokeStyle = hexA(s2.color || '#0E9E9E', 0.55); ctx.stroke();
      ctx.setLineDash([]);
    });
    host._underOK = true;
  }

  /* ───────── overlay: crosshair, pinned readings, brush, draw-in reveal ───────── */
  function drawOver(cv){
    const host = cv.parentElement, over = host && host._over;
    if(!over) return;
    const r = cv.getBoundingClientRect(), pad = PAD(cv);
    if(size(cv, over)){
      const ctx0 = over.getContext('2d');
      ctx0.clearRect(0, 0, r.width, r.height);
    }
    const ctx = over.getContext('2d');
    ctx.clearRect(0, 0, r.width, r.height);
    const cfg = cv._cfg;
    /* a reveal mask: cover the plot in the card's own colour, then clear left→right */
    if(cv._reveal !== undefined && cv._reveal < 1){
      const bg = getComputedStyle(host).backgroundColor;
      if(bg && bg !== 'rgba(0, 0, 0, 0)' && !host.classList.contains('card-tint')){
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, r.width, r.height);
        ctx.clearRect(pad.l, 0, (r.width - pad.l - pad.r) * cv._reveal, r.height);
        ctx.fillStyle = hexA('#0E9E9E', 0.85);
        ctx.fillRect(pad.l + (r.width - pad.l - pad.r) * cv._reveal - 1, pad.t * 0.5, 1.6, r.height - pad.t);
        return;
      }
    }
    if(!cfg) return;
    const n = nOf(cfg);
    const series = seriesOf(cfg);
    const stt = st(cv.dataset.chart);

    /* the scrub brush (while dragging a zoom window) */
    if(stt.brush){
      const [a, b] = stt.brush;
      const x0 = xOf(cv, a, n), x1 = xOf(cv, b, n);
      ctx.fillStyle = hexA('#12A6CF', 0.14);
      ctx.fillRect(Math.min(x0, x1), pad.t, Math.abs(x1 - x0), r.height - pad.t - pad.b);
      ctx.strokeStyle = hexA('#12A6CF', 0.7); ctx.lineWidth = 1.2;
      [x0, x1].forEach(x => { ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, r.height - pad.b); ctx.stroke(); });
    }

    /* pinned readings */
    stt.pins.forEach(i => {
      if(i >= n) return;
      const x = xOf(cv, i, n);
      const v = series[0].vals[i];
      const y = yOf(cv, cfg, v);
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7);
      ctx.fillStyle = series[0].color || '#0E9E9E'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x, r.height - pad.b);
      ctx.strokeStyle = hexA(series[0].color || '#0E9E9E', 0.45); ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    });

    /* crosshair + readout at the pointer */
    const hi = cfg._watch !== undefined ? cfg._watch : stt.hover;
    if(hi !== null && hi !== undefined && hi < n){
      const x = xOf(cv, hi, n);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, r.height - pad.b);
      ctx.strokeStyle = hexA('#0E9E9E', 0.42); ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      series.forEach(s2 => {
        if(!s2.vals || !s2.vals[hi] && s2.vals[hi] !== 0) return;
        const y = yOf(cv, cfg, s2.vals[hi]);
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 7);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = s2.color || '#0E9E9E'; ctx.lineWidth = 2.6; ctx.stroke();
      });
    }
  }

  /* ───────── interaction ───────── */
  function wire(cv, over){
    const cfgOf = () => cv._cfg;
    over.style.pointerEvents = 'auto';
    over.style.cursor = 'crosshair';
    let dragFrom = null, moved = false;

    const readout = (i, clientX) => {
      const cfg = cfgOf(); if(!cfg) return;
      cfg._watch = i;
      drawOver(cv);
      const tip = cv.parentElement.querySelector('.chart-tip');
      if(tip){
        const series = seriesOf(cfg);
        const label = cfg.labels ? cfg.labels[i] : 'now';
        tip.innerHTML = `<span>${label ?? ''}</span>` + series.map(s2 => {
          const kind = s2.kind || cfg.kind;
          const txt = (kind && Units.DEF[kind]) ? Units.fmt(kind, s2.vals[i]) : `${s2.vals[i]} ${s2.unit || cfg.unit || ''}`;
          return `<div style="color:${s2.color || cfg.color}">${s2.label ? s2.label + ' · ' : ''}<b>${txt}</b></div>`;
        }).join('') + (cfg._zoom ? `<div class="zoomhint">zoomed · double-click to reset</div>` : '');
        const r = cv.getBoundingClientRect();
        tip.style.left = Math.min(Math.max(xOf(cv, i, nOf(cfg)), 46), r.width - 46) + 'px';
        tip.style.top = '10px';
        tip.classList.add('on');
      }
      cv.dispatchEvent(new CustomEvent('chartread', { bubbles:true, detail:{ index:i, cfg } }));
    };
    const clear = () => {
      const cfg = cfgOf(); if(cfg) cfg._watch = undefined;
      drawOver(cv);
      const tip = cv.parentElement.querySelector('.chart-tip');
      if(tip) tip.classList.remove('on');
    };

    over.addEventListener('pointerdown', e => {
      over.setPointerCapture?.(e.pointerId);
      const cfg = cfgOf(); if(!cfg) return;
      dragFrom = indexAt(cv, cfg, e.clientX);
      moved = false;
      if(e.shiftKey || e.button === 2){ st(cv.dataset.chart).brush = [dragFrom, dragFrom]; }
      e.preventDefault();
    });
    over.addEventListener('pointermove', e => {
      const cfg = cfgOf(); if(!cfg) return;
      const i = indexAt(cv, cfg, e.clientX);
      if(dragFrom !== null && e.buttons && !skipZoom(cv) && (e.shiftKey || st(cv.dataset.chart).brush)){
        st(cv.dataset.chart).brush = [Math.min(dragFrom, i), Math.max(dragFrom, i)];
        readout(i, e.clientX);
        return;
      }
      if(dragFrom !== null && e.buttons){ moved = true; }
      readout(i, e.clientX);
    });
    const finish = e => {
      const cfg = cfgOf(); if(!cfg) return;
      const chart = st(cv.dataset.chart);
      if(chart.brush && Math.abs(chart.brush[1] - chart.brush[0]) >= 3){
        chart.zoom = chart.brush.slice(); chart.brush = null; zoomChip(cv);
        applyZoom(); CC.drawAll(document);
      } else if(chart.brush){ chart.brush = null; drawOver(cv); }
      else if(dragFrom !== null && !moved){
        /* a click pins a reading; clicking the same point unpins it */
        const i = dragFrom;
        chart.pins = chart.pins.includes(i) ? chart.pins.filter(p => p !== i) : [...chart.pins, i].slice(-4);
        drawOver(cv);
      }
      dragFrom = null; moved = false;
    };
    over.addEventListener('pointerup', finish);
    over.addEventListener('pointercancel', finish);
    over.addEventListener('pointerleave', () => { if(dragFrom === null) clear(); });
    over.addEventListener('dblclick', () => resetZoom(cv));
    over.addEventListener('contextmenu', e => e.preventDefault());
    over.addEventListener('wheel', e => {
      if(skipZoom(cv)) return;
      const cfg = cfgOf(); if(!cfg) return;
      e.preventDefault();
      const chart = st(cv.dataset.chart);
      const n = nOf(cfg);
      const i = indexAt(cv, cfg, e.clientX);
      const cur = chart.zoom || [0, n - 1];
      const span = cur[1] - cur[0];
      const k = e.deltaY > 0 ? 1.18 : 0.85;
      let half = Math.max(4, Math.round(span * k / 2));
      let a = Math.max(0, i - half), b = Math.min(n - 1, i + half);
      if(b - a < 6){ a = Math.max(0, b - 6); }
      chart.zoom = (a === 0 && b === n - 1) ? null : [a, b];
      applyZoom(); zoomChip(cv); CC.drawAll(document);
    }, { passive:false });
  }
  function zoomChip(cv){
    const host = cv.parentElement;
    let chip = host.querySelector('.zoombar');
    const chart = st(cv.dataset.chart);
    if(!chart.zoom){ chip?.remove(); return; }
    if(!chip){
      chip = document.createElement('div');
      chip.className = 'zoombar';
      host.appendChild(chip);
    }
    const cfg = cv._cfg, n = nOf(cfg);
    chip.innerHTML = `<span>Zoomed to ${n} of ${original[cv.dataset.chart]?.vals?.length || n} points</span>
      <button class="btn xs ghost" onclick="CC.resetZoom('${cv.dataset.chart}')">Reset</button>`;
  }
  function resetZoom(key){
    const cv = document.querySelector(`canvas[data-chart="${key}"]`);
    st(key).zoom = null;
    applyZoom();
    if(cv){ zoomChip(cv); const o = cv.parentElement._over; if(o) drawOver(cv); }
    CC.drawAll(document);
    CC.toast('Zoom reset.','ok',2200);
  }

  /* ───────── draw-in: the plot uncovers itself, left to right ───────── */
  function animate(cv, delay = 0){
    if(Motion.reduce()){ cv._reveal = 1; return; }
    const key = cv.dataset.chart;
    original[key] ||= cv._cfg ? snapshot(cv._cfg) : null;
    cv._reveal = 0;
    const s2 = Motion.spring(0, { k:120, d:26, m:1 });   /* soft, no bounce */
    s2.to(1);
    setTimeout(() => {
      const stop = Motion.tick(h => {
        s2.step(h);
        const t = Math.min(1, s2.x);
        cv._reveal = (1 - t) < 0.004 ? 1 : t;
        drawOver(cv);
        if(cv._reveal === 1){ drawOver(cv); stop(); }
      });
    }, delay);
  }
  function animateView(root){
    const charts = $$('canvas[data-chart]', root || document).filter(cv => cv.offsetParent !== null);
    charts.filter(cv => cv.dataset.chart !== 'day').slice(0, 6)
          .forEach((cv, i) => animate(cv, 60 + i * 70));
  }

  /* ───────── lifecycle ───────── */
  function refresh(){
    $$('canvas[data-chart]').forEach(cv => {
      if(!cv._cfg) return;
      prep(cv);
      drawUnder(cv);
      drawOver(cv);
    });
  }
  function init(){
    const _drawAll = CC.drawAll;
    CC.drawAll = function(root){
      $$('canvas[data-chart]', root || document).forEach(cv => { if(cv._cfg) remember(cv.dataset.chart, cv._cfg); });
      applyZoom();
      const r = _drawAll.apply(this, arguments);
      refresh();
      return r;
    };
    /* remember the first paint, then keep both layers in step with resizes */
    window.addEventListener('resize', () => { clearTimeout(init._t); init._t = setTimeout(refresh, 140); });
    document.addEventListener('DOMContentLoaded', () => {
      CC._charts && Object.keys(CC._charts).forEach(k => remember(k, CC._charts[k]));
      refresh();
    });
    /* the existing hover tooltips are replaced by the overlay readout */
    CC.chartTooltip && (CC.chartTooltip = () => {});
    $$('canvas[data-chart]').forEach(cv => { cv.dataset.tip = '1'; cv.parentElement.classList.add('chart-host'); });

    /* every view change draws its charts in */
    const wrap = fn => function(){
      const r = fn.apply(this, arguments);
      requestAnimationFrame(() => animateView(document));
      return r;
    };
    CC.goP = wrap(CC.goP);
    CC.goD = wrap(CC.goD);
    setTimeout(() => animateView(document), 500);
  }
  document.addEventListener('DOMContentLoaded', init);

  return {init, refresh, animate, animateView, resetZoom, applyZoom, remember, envelope,
          zoomOf:key => st(key).zoom, pinsOf:key => st(key).pins, _state:state};
})();
if (typeof window !== 'undefined') window.ChartFX = ChartFX;
