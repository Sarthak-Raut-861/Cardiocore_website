/* ═══════════════════════════════════════════════════════════
   CardioCore · core  —  router, charts, ECG engine, UI kit
   ═══════════════════════════════════════════════════════════ */
const CC = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);   /* capped: canvas cost on mobile */

  /* ─────────────── router ─────────────── */
  const SCREENS = ['site','about','login-patient','login-doctor','onboard','app-patient','app-doctor'];
  const ALIAS = { home:'site', landing:'site', clinician:'login-doctor', patient:'login-patient' };
  function go(name){
    name = SCREENS.includes(name) ? name : (ALIAS[name] || 'site');
    SCREENS.forEach(s=>{
      const el = document.getElementById(s);
      if(!el) return;
      if(s === name){ el.classList.remove('hidden'); }
      else { el.classList.add('hidden'); }
    });
    window.scrollTo({top:0,behavior:'instant'});
    document.body.dataset.screen = name;
    if(name === 'app-patient') drawAll($('#app-patient'));
    if(name === 'app-doctor')  drawAll($('#app-doctor'));
    if(name.startsWith('login')) drawAll(document.getElementById(name));
    if(name === 'site') drawAll($('#site'));
  }
  function goP(view){
    const app = $('#app-patient'); if(!app) return;
    go('app-patient');
    $$('.nav-item[data-pview]', app).forEach(n=>n.classList.toggle('on', n.dataset.pview===view));
    $$('.view', app).forEach(v=>v.classList.toggle('on', v.dataset.view===view));
    $('#sidePatient')?.classList.remove('open');
    drawAll(app);
  }
  function goD(view){
    const app = $('#app-doctor'); if(!app) return;
    go('app-doctor');
    $$('.nav-item[data-dview]', app).forEach(n=>n.classList.toggle('on', n.dataset.dview===view));
    $$('.view', app).forEach(v=>v.classList.toggle('on', v.dataset.view===view));
    $('#sideDoctor')?.classList.remove('open');
    drawAll(app);
  }

  // Global event delegation for instantaneous (0ms) button and navigation responses
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const goEl = e.target.closest('[data-go]');
      if (goEl) {
        e.preventDefault();
        go(goEl.dataset.go);
        return;
      }
      const pEl = e.target.closest('[data-pview]');
      if (pEl) {
        e.preventDefault();
        goP(pEl.dataset.pview);
        return;
      }
      const dEl = e.target.closest('[data-dview]');
      if (dEl) {
        e.preventDefault();
        goD(dEl.dataset.dview);
        return;
      }
      const sEl = e.target.closest('[data-side]');
      if (sEl) {
        e.preventDefault();
        $('#'+sEl.dataset.side)?.classList.toggle('open');
        return;
      }
      const gtEl = e.target.closest('[data-goto]');
      if (gtEl) {
        e.preventDefault();
        const id = gtEl.dataset.goto.replace('#','');
        const jump = () => document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
        if (document.body.dataset.screen === 'site') jump();
        else { go('site'); setTimeout(jump, 40); }
        return;
      }
      const scEl = e.target.closest('[data-scroll]');
      if (scEl) {
        e.preventDefault();
        go('site');
        setTimeout(()=>document.getElementById(scEl.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'}), 40);
        return;
      }
    });
  }

  function wire(root=document){
    // Retained for backwards compatibility; global delegation handles all clicks
  }

  /* ─────────────── toasts ─────────────── */
  function toast(msg, kind='ok', ms=4200){
    const host = $('#toasts'); if(!host) return;
    const el = document.createElement('div');
    const ic = {ok:'#12A06A', warn:'#D98314', err:'#E0453F'}[kind] || '#0E9E9E';
    el.className = 'toast ' + kind;
    el.innerHTML = `<span style="flex:none;width:22px;height:22px;border-radius:50%;background:${ic}1f;display:grid;place-items:center">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${ic}" stroke-width="3" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg></span>
      <span class="grow">${msg}</span>`;
    host.appendChild(el);
    setTimeout(()=>{ el.style.transition='.3s'; el.style.opacity='0'; el.style.transform='translateX(30px)';
      setTimeout(()=>el.remove(),320); }, ms);
  }

  /* ─────────────── modal ─────────────── */
  let modalStack = [];
  function modal({title, sub='', body='', footer='', wide=false, accent=''}){
    const scrim = $('#scrim'), box = $('#modal');
    box.className = 'modal' + (wide ? ' wide' : '');
    box.innerHTML = `
      <div class="modal-h">
        <div>
          ${accent ? `<div class="tag ${accent}">${sub}</div>` : (sub ? `<div class="caption">${sub}</div>` : '')}
          <h3 class="h3" style="margin-top:2px">${title}</h3>
        </div>
        <button class="icon-btn" onclick="CC.closeModal()" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A2B2F" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="modal-b">${body}</div>
      ${footer ? `<div class="modal-f">${footer}</div>` : ''}`;
    scrim.classList.add('on');
    document.body.style.overflow = 'hidden';
    modalStack.push(title);
    wire(box); drawAll(box);
    if(typeof CC.afterModal === 'function') CC.afterModal(box);
  }
  function closeModal(){
    const scrim = $('#scrim'); if(!scrim) return;
    scrim.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(()=>{ const box = $('#modal'); if(box && !scrim.classList.contains('on')) box.innerHTML = ''; }, 260);
    modalStack.pop();
  }

  /* ─────────────── charts ─────────────── */
  /* chart palette — swapped by CC.setPalette() for dark mode */
  const RENDERERS = {};                   /* extras layer registers chart types here */
  const PAL = { grid:'#EDF7F6', grid2:'#DCEFEE', axis:'#6E9A9E', halo:'rgba(255,255,255,.9)',
                surface:'#FFFFFF', empty:'#EEF5F5', band:'rgba(14,158,158,.07)' };
  function setPalette(name){
    const dark = name === 'dark';
    Object.assign(PAL, dark
      ? { grid:'#123238', grid2:'#173E46', axis:'#7CA6AB', halo:'rgba(6,26,31,.9)', surface:'#0C272D', empty:'#123238' }
      : { grid:'#EDF7F6', grid2:'#DCEFEE', axis:'#6E9A9E', halo:'rgba(255,255,255,.9)', surface:'#FFFFFF', empty:'#EEF5F5' });
    drawAll(document);
  }

  const seedRand = (seed) => { let s = seed; return () => (s = (s*16807) % 2147483647) / 2147483647; };

  const CHART_DATA = {
    hrSpark:  {kind:'hr', type:'line', color:'#0E9E9E', vals:[70,69,71,68,70,69,68,70,69,68,69,68], fill:true},
    hrvSpark: {kind:'hrv', type:'line', color:'#7A6BF0', vals:[54,53,52,51,53,50,49,50,49,48,48,48], fill:true},
    spo2Spark:{kind:'spo2', type:'line', color:'#12A6CF', vals:[98,98,97,98,98,98,99,98,98,98,98,98], fill:true},
    tempSpark:{kind:'temp', type:'line', color:'#12A06A', vals:[36.6,36.6,36.5,36.7,36.6,36.6,36.6,36.5,36.6,36.6,36.7,36.6], fill:true},
    hrTrend:  {kind:'hr', band:true, type:'line', labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], color:'#0E9E9E',
               vals:[70,68,69,71,68,67,68], base:70, unit:'BPM', fill:true},
    hrvTrend: {kind:'hrv', band:true, type:'line', labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], color:'#7A6BF0',
               vals:[52,51,50,49,49,48,48], base:52, unit:'ms', fill:true},
    spo2Trend:{kind:'spo2', band:true, type:'line', labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], color:'#12A6CF',
               vals:[98,98,97,98,98,99,98], base:98, unit:'%', fill:true},
    tempTrend:{kind:'temp', band:true, type:'line', labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], color:'#12A06A',
               vals:[36.5,36.6,36.6,36.7,36.6,36.5,36.6], base:36.5, unit:'°C', fill:true},
    ecgEvents:{type:'bars', color:'#0E9E9E', labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], vals:[0,1,1,0,0,1,0], max:2},
    adherence:{type:'bars', color:'#12A06A', labels:['22','23','24','25','26','27','28','29','30','1','2','3','4','5'],
               vals:[4,3,4,4,4,2,2,4,4,3,4,4,4,2], max:4},
    weekLoad: {type:'bars', color:'#12A6CF', labels:['Mon','Tue','Wed','Thu','Fri','Sat'], vals:[5,6,3,6,4,2]},
    alertMix: {type:'stack', labels:['W1','W2','W3','W4'], series:[
                {color:'#12A6CF', vals:[6,5,7,6]}, {color:'#D98314', vals:[3,4,2,3]}, {color:'#E0453F', vals:[1,1,0,1]}]},
    qualityVsLoad:{type:'dual', labels:['W1','W2','W3','W4'],
                a:{color:'#0E9E9E', vals:[92,94,95,96], label:'signal quality %'},
                b:{color:'#D98314', vals:[10,9,8,7], label:'alerts / week'}}
  };

  const RANGE_SCALE = { '24H':6, '7D':1, '30D':1.6, '3M':2.4, '1Y':3.2 };
  const RANGE_LABELS = { '24H':['00','04','08','12','16','20','24'],
                         '7D':['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
                         '30D':['1','5','10','15','20','25','30'],
                         '3M':['Jul','Aug','Sep','Oct','Nov','Dec'],
                         '1Y':['Q4','Q1','Q2','Q3','Q4'] };

  function rangeData(key, range){
    const base = CHART_DATA[key]; if(!base) return null;
    /* rangeData clones the config, so kind/units travel with it */
    const r = seedRand(key.length * 977 + range.length * 31);
    const n = range==='24H'?12:range==='7D'?7:range==='30D'?12:range==='3M'?12:12;
    const mid = base.vals.reduce((a,b)=>a+b,0)/base.vals.length;
    const amp = Math.max(Math.abs(mid)*0.06, base.unit==='°C'?0.25:1.6);
    const vals = Array.from({length:n},(_,i)=> mid + (r()-0.45)*amp*(range==='1Y'?2.6:range==='3M'?1.9:1));
    return {...base, vals, labels:RANGE_LABELS[range], band:base.band,
      base: base.base ? mid + (r()-0.5)*amp*0.2 : undefined};
  }

  const SIZED = new WeakMap();
  function prep(cv){
    const w = +cv.getAttribute('width'), h = +cv.getAttribute('height');
    if(SIZED.get(cv) !== w+'x'+h){          /* resize backing store once only */
      cv.width = w*dpr; cv.height = h*dpr;
      if(!cv.style.height) cv.style.height = h+'px';
      SIZED.set(cv, w+'x'+h);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    return {ctx,w,h};
  }
  const hexA = (hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;};

  function drawLine(ctx,w,h,cfg,opts={}){
    const pad = opts.pad ?? {l:6,r:6,t:16,b:22};
    const vals = cfg.vals, n = vals.length;
    const mn = Math.min(...vals, cfg.base ?? Infinity), mx = Math.max(...vals, cfg.base ?? -Infinity);
    const span = (mx-mn) || 1, lo = mn - span*0.35, hi = mx + span*0.35;
    const X = i => pad.l + i*(w-pad.l-pad.r)/(n-1);
    const Y = v => pad.t + (hi-v)/(hi-lo)*(h-pad.t-pad.b);

    if(cfg.band && typeof cfg.base === 'number'){
      const hi2 = Y(cfg.base*1.045), lo2 = Y(cfg.base*0.955);
      ctx.fillStyle = hexA(cfg.color,.07);
      ctx.fillRect(pad.l, Math.min(hi2,lo2), w-pad.l-pad.r, Math.abs(lo2-hi2));
      ctx.setLineDash([3,4]); ctx.strokeStyle = hexA(cfg.color,.22); ctx.lineWidth = 1;
      [hi2,lo2].forEach(y=>{ ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke(); });
      ctx.setLineDash([]);
    }
    if(opts.grid){ ctx.strokeStyle=PAL.grid; ctx.lineWidth=1;
      for(let i=0;i<=4;i++){ const y=pad.t+i*(h-pad.t-pad.b)/4; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke(); } }

    if(cfg.base!==undefined && !isNaN(cfg.base)){
      ctx.setLineDash([5,5]); ctx.strokeStyle=hexA(cfg.color,.42); ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(pad.l,Y(cfg.base)); ctx.lineTo(w-pad.r,Y(cfg.base)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=hexA(cfg.color,.75); ctx.font='700 10px Manrope, sans-serif';
      ctx.fillText('baseline '+(+cfg.base).toFixed(cfg.unit==='°C'?1:0), pad.l+2, Y(cfg.base)-5);
    }
    const path = new Path2D();
    vals.forEach((v,i)=> i? path.lineTo(X(i),Y(v)) : path.moveTo(X(i),Y(v)));
    if(cfg.fill){
      const g = ctx.createLinearGradient(0,pad.t,0,h-pad.b);
      g.addColorStop(0, hexA(cfg.color,.20)); g.addColorStop(1, hexA(cfg.color,0));
      const area = new Path2D(path); area.lineTo(X(n-1),h-pad.b); area.lineTo(X(0),h-pad.b); area.closePath();
      ctx.fillStyle=g; ctx.fill(area);
    }
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.strokeStyle=PAL.halo; ctx.lineWidth=6; ctx.stroke(path);
    ctx.strokeStyle=cfg.color; ctx.lineWidth=2.8; ctx.stroke(path);
    vals.forEach((v,i)=>{ ctx.beginPath(); ctx.arc(X(i),Y(v), i===n-1?4.6:2.6, 0, 7);
      ctx.fillStyle= i===n-1? cfg.color : PAL.surface; ctx.fill();
      ctx.strokeStyle=cfg.color; ctx.lineWidth=2; ctx.stroke(); });
    if(cfg.labels && opts.axis){ ctx.fillStyle=PAL.axis; ctx.font='700 11px Manrope, sans-serif';
      cfg.labels.slice(0,opts.ticks||cfg.labels.length).forEach((l,i)=>{
        const x = pad.l + i*(w-pad.l-pad.r)/(((opts.ticks||cfg.labels.length))-1);
        const tw = ctx.measureText(l).width;
        ctx.fillText(l, Math.max(1, Math.min(x, w-tw-1)), h-6); }); }
  }

  function drawBars(ctx,w,h,cfg){
    const pad={l:8,r:8,t:14,b:22}, vals=cfg.vals, n=vals.length;
    const mx = cfg.max || Math.max(...vals) || 1;
    const bw = (w-pad.l-pad.r)/n*0.52;
    vals.forEach((v,i)=>{
      const x = pad.l + i*(w-pad.l-pad.r)/n + ((w-pad.l-pad.r)/n - bw)/2;
      const bh = Math.max((v/mx)*(h-pad.t-pad.b), v?3:0);
      const y = h-pad.b-bh;
      const g = ctx.createLinearGradient(0,y,0,h-pad.b);
      g.addColorStop(0, cfg.color); g.addColorStop(1, hexA(cfg.color,.35));
      ctx.fillStyle = v ? g : PAL.empty;
      const r = Math.min(5, bw/2);
      ctx.beginPath();
      ctx.moveTo(x,h-pad.b); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.lineTo(x+bw-r,y); ctx.quadraticCurveTo(x+bw,y,x+bw,y+r); ctx.lineTo(x+bw,h-pad.b); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle=PAL.axis; ctx.font='700 10px Manrope, sans-serif';
    cfg.labels.forEach((l,i)=>{ const x=pad.l+i*(w-pad.l-pad.r)/n+((w-pad.l-pad.r)/n)/2;
      ctx.fillText(l, x-ctx.measureText(l).width/2, h-6); });
  }

  function drawStack(ctx,w,h,cfg){
    const pad={l:8,r:8,t:14,b:22}, n=cfg.labels.length;
    const totals = cfg.labels.map((_,i)=>cfg.series.reduce((a,s)=>a+s.vals[i],0));
    const mx = Math.max(...totals);
    const bw = (w-pad.l-pad.r)/n*0.5;
    cfg.labels.forEach((l,i)=>{
      const x = pad.l + i*(w-pad.l-pad.r)/n + ((w-pad.l-pad.r)/n - bw)/2;
      let yb = h-pad.b;
      cfg.series.forEach(s=>{
        const seg = (s.vals[i]/mx)*(h-pad.t-pad.b);
        ctx.fillStyle=s.color; ctx.fillRect(x, yb-seg, bw, seg);
        yb -= seg;
      });
    });
    ctx.fillStyle=PAL.axis; ctx.font='700 10px Manrope, sans-serif';
    cfg.labels.forEach((l,i)=>{ const x=pad.l+i*(w-pad.l-pad.r)/n+((w-pad.l-pad.r)/n)/2;
      ctx.fillText(l, x-ctx.measureText(l).width/2, h-6); });
    let lx = pad.l+2;
    cfg.series.forEach((s,si)=>{ const names=['Level 1','Level 2','Level 3'];
      ctx.fillStyle=s.color; ctx.beginPath(); ctx.roundRect(lx,2,9,9,3); ctx.fill();
      ctx.fillStyle=PAL.axis; ctx.font='700 10px Manrope, sans-serif';
      const t=names[si]||''; ctx.fillText(t, lx+13, 10); lx += 13 + ctx.measureText(t).width + 12; });
  }

  function drawDual(ctx,w,h,cfg){
    const pad={l:10,r:34,t:22,b:22}, n=cfg.labels.length;
    const norm = s => { const mn=Math.min(...s), mx=Math.max(...s), sp=(mx-mn)||1;
      return s.map(v=>({v, y: pad.t + (1-(v-mn)/sp)*(h-pad.t-pad.b)*0.86 + 6})); };
    const A = norm(cfg.a.vals), B = norm(cfg.b.vals);
    [[A,cfg.a],[B,cfg.b]].forEach(([pts,meta])=>{
      const p = new Path2D(); pts.forEach((pt,i)=> i?p.lineTo(pad.l+i*(w-pad.l-pad.r)/(n-1), pt.y) : p.moveTo(pad.l, pt.y));
      ctx.strokeStyle=PAL.halo; ctx.lineWidth=6; ctx.stroke(p);
      ctx.strokeStyle=meta.color; ctx.lineWidth=2.8; ctx.lineJoin='round'; ctx.stroke(p);
      ctx.fillStyle=meta.color; pts.forEach(pt=>{ ctx.beginPath(); ctx.arc(pad.l+pts.indexOf(pt)*(w-pad.l-pad.r)/(n-1), pt.y, 3.4,0,7); ctx.fill(); });
    });
    ctx.font='700 10px Manrope, sans-serif';
    ctx.fillStyle=cfg.a.color; ctx.fillText('● '+cfg.a.label, pad.l+2, 10);
    ctx.fillStyle=cfg.b.color; ctx.fillText('● '+cfg.b.label, pad.l+2, 22);
  }

  /* ─────────────── ECG engine ─────────────── */
  function beat(t, hr=72){
    const period = 60/hr, p = ((t % period) + period) % period / period;   // 0..1
    const g = (c,wd,amp)=> amp*Math.exp(-Math.pow((p-c)/wd,2));
    return g(.14,.028,.14)      // P
         - g(.205,.008,.10)     // Q
         + g(.225,.0075,1.0)    // R
         - g(.25,.011,.26)      // S
         + g(.42,.055,.28);     // T
  }
  function ecgGrid(ctx,w,h){
    ctx.save();
    ctx.strokeStyle=PAL.grid; ctx.lineWidth=1;
    for(let x=0;x<w;x+=12){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for(let y=0;y<h;y+=12){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.strokeStyle=PAL.grid2;
    for(let x=0;x<w;x+=60){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for(let y=0;y<h;y+=60){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.restore();
  }
  function ecgTrace(ctx,w,h,{hr=72,t0=0,pxPerSec=150,amp=1,noise=true,color='#0E9E9E'}){
    const mid = h*0.56, A = h*0.34*amp;
    let prev = null;
    ctx.beginPath();
    for(let x=0;x<=w;x+=1.2){
      const t = t0 + x/pxPerSec;
      let v = beat(t,hr);
      if(noise) v += (Math.sin(t*57.3)*0.012 + Math.sin(t*23.7)*0.01 + (Math.random()-0.5)*0.006);
      const y = mid - v*A;
      if(prev===null) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      prev = y;
    }
    ctx.strokeStyle=PAL.halo; ctx.lineWidth=5; ctx.lineJoin='round'; ctx.stroke();
    ctx.strokeStyle=color; ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
  }

  let ecgRAF = null, ecgT = 0, recording = false, recSec = 18;
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const visibleEcg = new Set();
  let ecgObs = null;
  function observeEcg(root=document){
    if(!('IntersectionObserver' in window)) return;
    if(!ecgObs){
      ecgObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if(e.isIntersecting) visibleEcg.add(e.target);
          else visibleEcg.delete(e.target);
        });
        if(visibleEcg.size > 0 && !ecgRAF) animateEcg();
      }, {rootMargin:'80px'});
    }
    $$('canvas[data-ecg]', root).forEach(cv => ecgObs.observe(cv));
  }
  const onScreen = (el, pad=120) => {
    if(ecgObs) return visibleEcg.has(el);
    const r = el.getBoundingClientRect();
    return r.bottom > -pad && r.top < (window.innerHeight || 800) + pad;
  };
  function drawAll(root=document){
    $$('canvas[data-chart]', root).forEach(cv=>{
      if(cv.offsetParent === null) return;
      const key = cv.dataset.chart, cfg = CHART_DATA[key]; if(!cfg) return;
      const {ctx,w,h} = prep(cv);
      cv._cfg = cfg; cv._w = w; cv._h = h;
      if(cfg.type==='line') drawLine(ctx,w,h,cfg,{axis:cv.classList.contains('svg-chart'), grid:cv.classList.contains('svg-chart'), ticks:7});
      else if(cfg.type==='bars') drawBars(ctx,w,h,cfg);
      else if(cfg.type==='stack') drawStack(ctx,w,h,cfg);
      else if(cfg.type==='dual') drawDual(ctx,w,h,cfg);
      else if(RENDERERS[cfg.type]) RENDERERS[cfg.type](ctx,w,h,cfg);
    });
    $$('canvas[data-ecg]', root).forEach(cv=>{
      if(cv.offsetParent === null) return;
      if(!cv.dataset.static) drawStaticEcg(cv);
    });
    applyRangeBar();
    observeEcg(root);
    if(!ecgRAF) animateEcg();
  }
  function drawStaticEcg(cv){
    const {ctx,w,h} = prep(cv);
    cv.dataset.static='1'; cv.dataset.painted='1';
    const k = cv.dataset.ecg;
    if(k==='review' || k==='doc'){ cv.dataset.hr='138'; }
    ecgGrid(ctx,w,h);
    const hr = +cv.dataset.hr || (k==='review'?138:72);
    const pxPerSec = (k==='hero'||k==='live'||k==='home') ? 155 : w/30;
    const amp = k==='review'||k==='doc' ? 0.92 : 0.85;
    const y = cv.dataset.rolling;
    ecgTrace(ctx,w,h,{hr,t0: y||0,pxPerSec,amp});
  }
  function animateEcg(){
    if(ecgRAF) cancelAnimationFrame(ecgRAF);
    let last = 0;
    const loop = (ts) => {
      const activeCanvases = $$('canvas[data-ecg]').filter(cv => cv.offsetParent !== null && (recording || onScreen(cv)));
      if(activeCanvases.length === 0 && !recording){
        ecgRAF = null;
        return;
      }
      ecgRAF = requestAnimationFrame(loop);
      if(ts - last < 33) return;                          /* ~30 fps ceiling */
      last = ts;
      const animate = !paused && !reduceMotion();
      activeCanvases.forEach(cv=>{
        const k = cv.dataset.ecg;
        const scrolling = animate && (k==='hero'||k==='live'||k==='home');
        if(!scrolling && cv.dataset.painted === '1') return;  // static strips paint once
        const {ctx,w,h} = prep(cv);
        ecgGrid(ctx,w,h);
        const hr = recording && (k==='live') ? 88 : (+cv.dataset.hr || (k==='hero'?76:72));
        ecgTrace(ctx,w,h,{hr, t0: scrolling ? ecgT : 0, pxPerSec: scrolling?155:w/30,
                          amp: (k==='review'||k==='doc')?0.92:0.85});
        cv.dataset.painted = '1';
      });
      if(animate && activeCanvases.length > 0) ecgT += 0.2;
    };
    ecgRAF = requestAnimationFrame(loop);
  }
  const scrollingActive = () => $$('canvas[data-ecg]').some(cv=>cv.offsetParent!==null && onScreen(cv));
  function startEcg(){
    recording = true; recSec = 0;
    toast('Recording a 30-second ECG. Keep still and breathe normally.','ok');
    let beats = 23;
    const iv = setInterval(()=>{
      if(!recording){ clearInterval(iv); return; }
      recSec++;
      const cl = $('#ecgClock'); if(cl) cl.textContent = '00:'+String(Math.min(recSec,30)).padStart(2,'0');
      const bc = $('#beatCount'); if(bc && Math.random()>.45){ beats++; bc.textContent = beats; }
      const live = $('canvas[data-ecg="live"]');
      if(live){ live.dataset.hr = String(84 + Math.round(Math.sin(recSec/3)*6 + (Math.random()*4-2))); live.dataset.rolling=''; }
      if(recSec>=30){ clearInterval(iv); stopEcg(true); }
    }, 1000);
  }
  function stopEcg(finished){
    recording = false;
    if(finished){
      const live = $('canvas[data-ecg="live"]'); if(live) delete live.dataset.hr;
      toast('ECG saved — 30 s, 250 Hz, quality 96%. Added to your recordings.','ok');
      shareModal();
    } else toast('Recording stopped. Partial strip discarded.','warn');
  }

  /* ─────────────── range tabs ─────────────── */
  let curRange = '7D';
  function applyRangeBar(){
    ['hrTrend','hrvTrend','spo2Trend','tempTrend'].forEach(key=>{
      const cv = document.querySelector(`canvas[data-chart="${key}"]`); if(!cv) return;
      const cfg = rangeData(key, curRange); if(!cfg) return;
      const {ctx,w,h} = prep(cv); cv._cfg = cfg; cv._w = w; cv._h = h;
      drawLine(ctx,w,h,cfg,{axis:true,grid:true,ticks:7});
    });
  }
  function setRange(r){ curRange = r; $$('#rangeTabs .tab').forEach(t=>t.classList.toggle('on', t.dataset.range===r));
    applyRangeBar(); toast('Showing '+r+' window, compared against your 90-day baseline.','ok',2600); }

  /* ─────────────── auth ─────────────── */
  function patientLogin(e, otp){
    e?.preventDefault();
    if(otp){
      const code = $$('#otpBlock .otp').map(i=>i.value).join('');
      if(code.replace(/\s/g,'').length < 6){ toast('Enter all six digits of the code.','warn'); return false; }
    }
    const btn = e?.target?.querySelector('button[type=submit]');
    if(btn){ btn.innerHTML = '<span class="spin"></span> Verifying…'; btn.disabled = true; }
    setTimeout(()=>{
      if(typeof CC.onboarded === 'function' && !CC.onboarded()){ go('onboard'); toast('Welcome, Aarav. Two minutes to set up your baseline.','ok',5200); }
      else { goP('home'); toast('Signed in. Digital Twin synced 2 minutes ago.','ok'); }
    }, 900);
    return false;
  }
  function doctorLogin(e){
    e?.preventDefault();
    const btn = e?.target?.querySelector('button[type=submit]');
    if(btn){ btn.innerHTML = '<span class="spin"></span> Verifying credentials…'; btn.disabled = true; }
    setTimeout(()=>{ goD('roster'); toast('Signed in as Dr Neha Raghavan · session access-logged.','ok'); }, 1000);
    return false;
  }
  function sendOtp(){
    const b = $('#otpBlock'); b.classList.remove('hidden');
    const inputs = $$('#otpBlock .otp'); inputs[0].focus();
    const demo = '481200';
    inputs.forEach((inp,i)=>{ inp.addEventListener('input',()=>{ if(inp.value && inputs[i+1]) inputs[i+1].focus(); });
      inp.addEventListener('keydown',ev=>{ if(ev.key==='Backspace' && !inp.value && inputs[i-1]) inputs[i-1].focus(); });
      inp.addEventListener('click',()=>{ inp.value = demo[i]; });
    });
    toast('Demo code sent: 481200 — tap the boxes to autofill.','ok',6000);
  }

  /* ─────────────── patient-side flows ─────────────── */
  const DOCS = [
    {ini:'NR',av:'av-teal',name:'Dr Neha Raghavan',spec:'Interventional cardiology · 14 yrs',hosp:'Meridian Heart Institute · 3.2 km',when:'Tue 10:30',mode:'In-person',rating:'4.9'},
    {ini:'SO',av:'av-violet',name:'Dr Samuel Okafor',spec:'Electrophysiology · 11 yrs',hosp:'Northbridge Clinic · video only',when:'Today 16:00',mode:'Video',rating:'4.8'},
    {ini:'AK',av:'av-cyan',name:'Dr Amara Khan',spec:'Preventive cardiology · 9 yrs',hosp:'City Care Hospital · 5.8 km',when:'Fri 09:15',mode:'Both',rating:'4.9'},
    {ini:'LM',av:'av-green',name:'Dr Luca Moretti',spec:'General cardiology · 17 yrs',hosp:'Riverside Medical · 8.4 km',when:'Next: 6 Oct',mode:'In-person',rating:'4.7'},
    {ini:'PS',av:'av-amber',name:'Dr Priya Sundaram',spec:'Heart failure · 12 yrs',hosp:'Meridian Heart Institute · 2.9 km',when:'Wed 11:00',mode:'Video',rating:'4.8'},
    {ini:'RK',av:'av-red',name:'Dr Rohan Kapoor',spec:'Interventional cardiology · 20 yrs',hosp:'City Care Hospital · 6.1 km',when:'Thu 15:45',mode:'Both',rating:'5.0'}
  ];
  function docCard(d, bookable=true){
    return `<div class="doc-card mb2">
      <span class="avatar ${d.av}">${d.ini}</span>
      <div class="grow" style="min-width:0">
        <div class="row gap8 wrapf"><b>${d.name}</b><span class="stars">★ ${d.rating}</span></div>
        <div class="fs13 mid">${d.spec}</div>
        <div class="fs12 muted">${d.hosp}</div>
      </div>
      <div class="center" style="min-width:92px">
        <div class="chip neutral" style="margin-bottom:6px">${d.when}</div>
        <div class="fs12 muted mb1">${d.mode}</div>
        <button class="btn xs" onclick="CC.bookModal(null,'${d.name}')">Book</button>
      </div>
    </div>`;
  }
  function filterDoctors(btn, type){
    if(btn){
      btn.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('solid'));
      btn.classList.add('solid');
    }
    const pub = $('#publicDocs');
    if(!pub) return;
    let list = DOCS;
    if(type === 'video') list = DOCS.filter(d => d.mode === 'Video' || d.mode === 'Both');
    else if(type === 'inperson') list = DOCS.filter(d => d.mode === 'In-person' || d.mode === 'Both');
    pub.innerHTML = list.map(d => docCard(d, true)).join('');
    const txt = $('#docCountTxt');
    if(txt) txt.textContent = `Showing ${list.length} specialist${list.length === 1 ? '' : 's'}`;
  }
  function bookModal(mode, doctor){
    modal({
      title: 'Book an appointment', sub: 'Care network · Cardiology', wide: true,
      body: `
        <div class="grid g2" style="gap:18px">
          <div>
            <div class="field"><label>Visit type</label>
              <div class="seg w100" style="display:flex;width:100%">
                <button class="grow ${mode!=='video'?'on':''}" onclick="CC.pickSeg(this)">In-person</button>
                <button class="grow ${mode==='video'?'on':''}" onclick="CC.pickSeg(this)">Video consult</button>
              </div>
            </div>
            <div class="field"><label>Clinician</label>
              <select class="input" id="bkDoc">${DOCS.map(d=>`<option ${doctor===d.name?'selected':''}>${d.name} — ${d.spec.split('·')[0].trim()}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Institution</label>
              <select class="input"><option>Meridian Heart Institute</option><option>Northbridge Clinic</option><option>City Care Hospital</option><option>Riverside Medical</option></select>
            </div>
            <div class="field"><label>Reason (visible to your clinician)</label>
              <textarea class="input" rows="3" style="resize:vertical">Review of elevated resting heart rate on 28 September and reduced HRV over two days.</textarea>
            </div>
          </div>
          <div>
            <div class="caption mb2">Available slots · Tue 6 Oct</div>
            <div class="grid g2" style="gap:9px">
              ${['09:15','10:30','11:45','14:00','15:15','16:30'].map((t,i)=>
                `<button class="tab ${i===1?'on':''}" style="justify-content:center" onclick="CC.pickSlot(this)">${t}</button>`).join('')}
            </div>
            <div class="hr-scan"></div>
            <div class="caption mb2">What will be shared</div>
            <label class="check mb2"><input type="checkbox" checked> Baseline summary — 90 days, 7 signals</label>
            <label class="check mb2"><input type="checkbox" checked> 7-day trend charts</label>
            <label class="check mb2"><input type="checkbox" checked> 3 recent ECG strips</label>
            <label class="check mb2"><input type="checkbox"> Medication adherence history</label>
            <label class="check"><input type="checkbox"> Lipid profile and lab history</label>
            <div class="info-note mt3">You can revoke any of this afterwards. Sharing expires when the appointment is closed.</div>
          </div>
        </div>`,
      footer: `<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
               <button class="btn" onclick="CC.confirmBooking()">Confirm booking</button>`
    });
  }
  function pickSeg(el){ [...el.parentNode.children].forEach(c=>c.classList.remove('on')); el.classList.add('on'); }
  function pickSlot(el){ [...el.parentNode.children].forEach(c=>c.classList.remove('on')); el.classList.add('on'); }
  function confirmBooking(){
    const doc = $('#bkDoc')?.value || 'Dr Neha Raghavan — Interventional cardiology';
    closeModal();
    setTimeout(()=>{
      modal({
        title: 'Appointment confirmed', sub: 'Booking reference CC-48120', accent: 'stable',
        body: `
          <div class="row gap16 mb3">
            <span class="avatar av-teal" style="width:56px;height:56px;font-size:18px">NR</span>
            <div><b style="font-family:var(--font-display);font-size:17px">${doc}</b>
              <div class="fs13 mid">Meridian Heart Institute</div>
              <div class="row gap8 mt2"><span class="chip"><span class="dot"></span> Tue 6 Oct · 10:30</span><span class="chip neutral">In-person</span></div></div>
          </div>
          <div class="grid g2" style="gap:12px">
            <div class="card flat" style="background:var(--surface-2);padding:14px"><div class="caption">Sharing</div><b class="fs14">Baseline · trends · 3 ECG strips</b></div>
            <div class="card flat" style="background:var(--surface-2);padding:14px"><div class="caption">Confirmation sent to</div><b class="fs14">aarav.menon@example.com</b></div>
          </div>
          <p class="small mt3">Your baseline summary and recent ECG recordings will be shared with this provider per your consent settings. A confirmation has been sent to your email.</p>`,
        footer: `<button class="btn ghost" onclick="CC.closeModal();CC.toast('Added to your calendar.','ok')">Add to calendar</button>
                 <button class="btn ghost" onclick="CC.closeModal();CC.toast('Directions sent to your phone.','ok')">Get directions</button>
                 <button class="btn" onclick="CC.closeModal()">Done</button>`
      });
      toast('Appointment confirmed. Confirmation email sent.','ok');
    }, 260);
  }
  function shareModal(){
    modal({
      title: 'Share data with Dr Neha Raghavan?', sub: 'Consent · revocable at any time',
      body: `
        <p class="mid fs14 mb3">Select what this clinician may see. Sharing expires when the appointment closes, and every access is logged in your consent ledger.</p>
        <div class="lrow"><div class="grow"><b class="fs14">Baseline summary</b><div class="fs12 muted">90-day baseline, 7 signals</div></div><input type="checkbox" checked style="accent-color:var(--teal);width:20px;height:20px"></div>
        <div class="lrow"><div class="grow"><b class="fs14">7-day trends</b><div class="fs12 muted">Resting HR, HRV, SpO₂, temperature</div></div><input type="checkbox" checked style="accent-color:var(--teal);width:20px;height:20px"></div>
        <div class="lrow"><div class="grow"><b class="fs14">3 ECG strips</b><div class="fs12 muted">25 Sep · 23 Sep · 21 Sep</div></div><input type="checkbox" checked style="accent-color:var(--teal);width:20px;height:20px"></div>
        <div class="lrow"><div class="grow"><b class="fs14">Medication adherence</b><div class="fs12 muted">14-day history, 96%</div></div><input type="checkbox" checked style="accent-color:var(--teal);width:20px;height:20px"></div>
        <div class="lrow"><div class="grow"><b class="fs14">Lipid profile</b><div class="fs12 muted">Last updated 24 Sep 2026</div></div><input type="checkbox" style="accent-color:var(--teal);width:20px;height:20px"></div>`,
      footer: `<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
               <button class="btn" onclick="CC.closeModal();CC.toast('Shared with Dr Neha Raghavan. Expires after the appointment — revoke any time.','ok')">Share</button>`
    });
  }
  function urgentModal(){
    modal({
      title: 'Urgent pattern detected', sub: 'Level 3 · Urgent — 28 Sep 2026, 11:24', accent: 'urgent',
      body: `
        <p class="mid fs14 mb3">Your wearable detected a significant change from your normal cardiovascular pattern. This is not a diagnosis. Clinical evaluation may be required.</p>
        <div class="grid g3 mb3" style="gap:12px">
          <div class="card flat" style="background:var(--red-soft);padding:14px;border-color:#F7C9C6"><div class="caption">Heart rate</div><div class="metric-value redc" style="font-size:26px">138</div><div class="fs12 muted">at rest · baseline 72</div></div>
          <div class="card flat" style="background:var(--red-soft);padding:14px;border-color:#F7C9C6"><div class="caption">HRV</div><div class="metric-value redc" style="font-size:26px">19<span class="metric-unit">ms</span></div><div class="fs12 muted">baseline 52 ms</div></div>
          <div class="card flat" style="background:var(--amber-soft);padding:14px;border-color:#F3DDB6"><div class="caption">SpO₂</div><div class="metric-value amberc" style="font-size:26px">94<span class="metric-unit">%</span></div><div class="fs12 muted">baseline 98%</div></div>
        </div>
        <canvas class="ecg-strip" width="880" height="140" data-ecg="doc" style="height:140px;background:#FBFFFE;border-radius:14px;border:1px solid var(--border)"></canvas>
        <div class="caption mt3 mb2">How this was assessed</div>
        <div class="grid g2" style="gap:10px">
          <div class="chip stable" style="justify-content:flex-start;padding:10px 12px"><span class="dot"></span> Signal quality verified as good</div>
          <div class="chip stable" style="justify-content:flex-start;padding:10px 12px"><span class="dot"></span> Persisted 9 minutes at rest</div>
          <div class="chip stable" style="justify-content:flex-start;padding:10px 12px"><span class="dot"></span> Motion ruled out as cause</div>
          <div class="chip stable" style="justify-content:flex-start;padding:10px 12px"><span class="dot"></span> Multi-signal cross-check passed</div>
        </div>
        <div class="warn-note mt3">This is not a diagnosis. If you have chest pain, severe breathlessness or faintness, call emergency services now.</div>`,
      footer: `<button class="btn ghost" onclick="CC.closeModal();CC.toast('Dismissed. Your clinician can still see this event in your record.','warn')">I'm okay — dismiss</button>
               <button class="btn danger" onclick="CC.panic(true)">Call emergency services</button>
               <button class="btn" onclick="CC.closeModal();CC.toast('Urgent review requested. Meridian Heart Institute is booking the earliest urgent slot.','ok')">Get urgent medical review</button>`
    });
  }
  function panic(fromUrgent){
    modal({
      title: 'Emergency services', sub: 'Level 3 · Urgent', accent: 'urgent',
      body: `<p class="mid fs14 mb2">CardioCore never contacts emergency services on your behalf without your explicit action. In a demo environment this button would dial your local emergency number.</p>
      <div class="card flat mb2" style="background:var(--red-soft);border-color:#F7C9C6;padding:16px">
        <b>Your location would be shared</b><div class="fs13 mid mt1">Meridian Heart Institute catchment · last known position 14 minutes ago</div></div>
      <div class="card flat" style="background:var(--surface-2);padding:16px">
        <b>Emergency contact notified</b><div class="fs13 mid mt1">Priya Menon · +91 98••• ••210 · SMS with location</div></div>
      <p class="small mt3">If this is a real emergency, call your local emergency number directly. Do not wait for an app.</p>`,
      footer: `<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
               <button class="btn danger" onclick="CC.closeModal();CC.toast('Demo only — in a live build this would dial emergency services.','warn',6000)">Call emergency services now</button>`
    });
  }
  function joinVideo(){
    modal({
      title: 'Video consult — connecting', sub: 'Secure channel · end-to-end encrypted', wide: true,
      body: `
        <div style="background:linear-gradient(150deg,#0A3F45,#0E7F7F);border-radius:20px;height:300px;display:grid;place-items:center;color:#fff;text-align:center;position:relative;overflow:hidden">
          <div class="blob b1" style="opacity:.3;background:#9BEDE0"></div>
          <div style="position:relative;z-index:2">
            <span class="avatar av-teal" style="width:76px;height:76px;font-size:24px;border-radius:24px;margin:0 auto 14px">NR</span>
            <b style="font-family:var(--font-display);font-size:19px;display:block">Dr Neha Raghavan</b>
            <div class="fs13 mt1" style="color:rgba(255,255,255,.75)">Meridian Heart Institute · waiting room</div>
            <div class="row gap8 mt3" style="justify-content:center">
              <span class="chip" style="background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.3)"><span class="dot"></span> Baseline + 3 ECG strips pre-loaded</span>
              <span class="chip" style="background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.3)"><span class="dot"></span> Mic &amp; camera ready</span>
            </div>
          </div>
          <div class="row gap12" style="position:absolute;bottom:18px">
            <button class="btn white sm" onclick="CC.toast('Microphone muted.','ok')">Mute</button>
            <button class="btn white sm" onclick="CC.toast('Camera off.','ok')">Camera</button>
            <button class="btn danger sm" onclick="CC.closeModal();CC.toast('Left the waiting room.','warn')">Leave</button>
          </div>
        </div>
        <p class="small mt3">Video consults run in-browser. Records shared for this consult are readable only for its duration.</p>`,
      footer: `<button class="btn" onclick="CC.closeModal()">Close</button>`
    });
  }

  /* ─────────────── clinician-side flows ─────────────── */
  const PATIENTS = {
    aarav:{ini:'AM',av:'av-red',name:'Aarav Menon',meta:'44 y · M · MRN 44821 · consent active',level:'urgent',levelTxt:'Level 3 · Urgent',
      hr:'138',hrNote:'at rest · baseline 72',hrv:'19',hrvNote:'baseline 52 ms',spo2:'94',spo2Note:'baseline 98%',
      cond:'Hypertension (2019) · Type 2 diabetes (2021)',meds:'Ramipril 5 mg · Atorvastatin 20 mg · Metformin 500 mg · adherence 96%',
      labs:'Total chol 192 · LDL 112 (above target) · HDL 46 · Trigs 168 · 24 Sep 2026',
      why:'Signal quality verified good; persisted 9 minutes at rest; motion and posture ruled out; multi-signal cross-check across HR, HRV, SpO₂ and temperature.',
      consent:'Baseline summary, 7-day trends, 3 ECG strips, medication adherence. Expires after the 6 Oct appointment.'},
    rohit:{ini:'RS',av:'av-amber',name:'Rohit Sharma',meta:'61 y · M · MRN 11204 · consent active',level:'attention',levelTxt:'Level 2 · Attention',
      hr:'74',hrNote:'2 days above baseline',hrv:'31',hrvNote:'baseline 38 ms',spo2:'97',spo2Note:'stable',
      cond:'Coronary artery disease · previous MI (2019)',meds:'Aspirin 75 mg · Bisoprolol 5 mg · Rosuvastatin 10 mg · adherence 84%',
      labs:'LDL 128 (above target) · 02 Sep 2026',
      why:'Sustained elevation across 48 hours with moderate adherence. Signal quality good. No arrhythmia pattern detected.',
      consent:'Baseline summary, trends, 2 ECG strips. Expires 12 Oct 2026.'},
    meera:{ini:'MI',av:'av-teal',name:'Meera Iyer',meta:'52 y · F · MRN 77310 · consent active',level:'attention',levelTxt:'Level 2 · Attention',
      hr:'72',hrNote:'within range',hrv:'38',hrvNote:'−8 ms over 5 days',spo2:'98',spo2Note:'stable',
      cond:'Arrhythmia (2021)',meds:'Metoprolol 25 mg · adherence 93%',
      labs:'LDL 104 · 14 Aug 2026',
      why:'Gradual HRV decline over 5 days without rate change. Signal quality good. Recommend review of sleep and stress factors.',
      consent:'Baseline summary, 7-day trends, 1 ECG strip. Expires 30 Oct 2026.'},
    leela:{ini:'LN',av:'av-violet',name:'Leela Nair',meta:'67 y · F · MRN 20338 · consent expires in 6 days',level:'stable',levelTxt:'Level 1 · Informational',
      hr:'76',hrNote:'within range',hrv:'42',hrvNote:'stable',spo2:'97',spo2Note:'stable',
      cond:'Heart failure (2022)',meds:'Furosemide 40 mg · Enalapril 5 mg · Spironolactone 25 mg · adherence 79%',
      labs:'BNP rising · reviewed 02 Aug 2026',
      why:'Signals within baseline; adherence below target is the main modifiable factor. Signal quality fair — PPG contact intermittent.',
      consent:'Baseline summary and trends only. Renewal requested.'},
    kabir:{ini:'KS',av:'av-green',name:'Kabir Sethi',meta:'38 y · M · MRN 90114 · consent active',level:'stable',levelTxt:'Level 1 · Informational',
      hr:'61',hrNote:'within range',hrv:'58',hrvNote:'above baseline',spo2:'99',spo2Note:'stable',
      cond:'None recorded',meds:'None recorded · no adherence concerns',
      labs:'LDL 88 · 12 Jul 2026',
      why:'All signals within personal baseline. No deviation beyond noise thresholds across 30 days.',
      consent:'Baseline summary, trends, ECG strips on request.'},
    dev:{ini:'DP',av:'av-cyan',name:'Dev Patel',meta:'55 y · M · MRN 55021 · new consent · baseline day 4 of 14',level:'neutral',levelTxt:'Baseline building',
      hr:'building',hrNote:'day 4 of 14',hrv:'building',hrvNote:'—',spo2:'98',spo2Note:'stable',
      cond:'Hypertension (2024)',meds:'Telmisartan 40 mg · adherence n/a (new)',
      labs:'LDL 142 · 18 Sep 2026',
      why:'Baseline still building. The system will not raise alerts until 14 days of usable data or explicit clinician override.',
      consent:'Baseline and trends. Full sharing requested for the first review.'}
  };
  function openPatient(id){
    const p = PATIENTS[id] || PATIENTS.aarav;
    const tone = {urgent:'var(--red)',attention:'var(--amber)',stable:'var(--green)',neutral:'#6E9A9E'}[p.level];
    modal({
      wide: true, accent: p.level==='urgent'?'urgent':p.level==='attention'?'attention':'stable',
      sub: p.levelTxt, title: p.name,
      body: `
        <div class="row row-b wrapf gap16 mb3">
          <div class="row gap12">
            <span class="avatar ${p.av}" style="width:52px;height:52px;border-radius:16px;font-size:17px">${p.ini}</span>
            <div><div class="fs13 mid">${p.meta}</div>
              <div class="row gap8 mt1"><span class="chip neutral">Twin active</span><span class="chip stable"><span class="dot"></span> Wearable synced 2 min ago</span></div></div>
          </div>
          <div class="row gap8">
            <button class="btn sm ghost" onclick="CC.messageModal('${id}')">Message</button>
            <button class="btn sm dark" onclick="CC.toast('Consult note opened for ${p.name}.','ok')">Start consult</button>
          </div>
        </div>
        <div class="grid g3 mb3" style="gap:12px">
          <div class="card flat" style="background:var(--surface-2);padding:14px;border-left:3px solid ${tone}"><div class="caption">Heart rate</div><div class="metric-value" style="font-size:26px">${p.hr}<span class="metric-unit">bpm</span></div><div class="fs12 muted">${p.hrNote}</div></div>
          <div class="card flat" style="background:var(--surface-2);padding:14px"><div class="caption">HRV</div><div class="metric-value" style="font-size:26px">${p.hrv}<span class="metric-unit">ms</span></div><div class="fs12 muted">${p.hrvNote}</div></div>
          <div class="card flat" style="background:var(--surface-2);padding:14px"><div class="caption">SpO₂</div><div class="metric-value" style="font-size:26px">${p.spo2}<span class="metric-unit">%</span></div><div class="fs12 muted">${p.spo2Note}</div></div>
        </div>
        <div class="caption mb2">Latest strip · Lead I · 250 Hz</div>
        <canvas class="ecg-strip" width="880" height="130" data-ecg="doc" data-hr="${id==='aarav'?'138':id==='rohit'?'74':'72'}" style="height:130px;background:#FBFFFE;border-radius:14px;border:1px solid var(--border)"></canvas>
        <div class="grid g2 mt3" style="gap:16px">
          <div>
            <div class="caption mb2">Clinical context</div>
            <div class="kv"><span class="mid">Conditions</span><b class="fs13" style="text-align:right;max-width:60%">${p.cond}</b></div>
            <div class="kv"><span class="mid">Medications</span><b class="fs13" style="text-align:right;max-width:60%">${p.meds}</b></div>
            <div class="kv"><span class="mid">Labs</span><b class="fs13" style="text-align:right;max-width:60%">${p.labs}</b></div>
          </div>
          <div>
            <div class="caption mb2">Why this was raised</div>
            <p class="fs14 mid">${p.why}</p>
            <div class="caption mt3 mb2">Consent scope</div>
            <p class="fs13 mid">${p.consent}</p>
          </div>
        </div>
        <div class="info-note mt3">Every open of this record is logged with your registration number and timestamp, and is visible to the patient.</div>`,
      footer: `<button class="btn ghost" onclick="CC.closeModal()">Close</button>
               <button class="btn ghost" onclick="CC.toast('Follow-up requested. The patient can accept a video slot or an in-person visit.','ok')">Request follow-up</button>
               <button class="btn" onclick="CC.closeModal();CC.toast('Interpretation saved to the record.','ok')">Save interpretation</button>`
    });
  }
  function messageModal(id){
    const p = PATIENTS[id] || PATIENTS.aarav;
    modal({ title: 'Message ' + p.name, sub: 'Secure in-record message',
      body: `
        <div class="info-note mb3">Messages are part of the health record. Do not use messaging for emergencies — patients are routed to local services instead.</div>
        <div class="field"><label>Template</label>
          <select class="input"><option>Follow-up scheduled</option><option>Continue current medication</option><option>Repeat recording advised</option><option>Custom message</option></select></div>
        <div class="field"><label>Message</label>
          <textarea class="input" rows="5" style="resize:vertical">I've reviewed your recent recordings. Please continue your current medication exactly as prescribed. Bring these trends to the appointment on 6 October at 10:30. If you develop chest pain, severe breathlessness or faintness, treat it as an emergency and call local services immediately.</textarea></div>`,
      footer: `<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
               <button class="btn" onclick="CC.closeModal();CC.toast('Message sent to ${p.name}. They will be notified in the app.','ok')">Send message</button>` });
  }

  /* ─────────────── boot ─────────────── */
  function init(){
    wire(document);
    // nav shadow
    const nav = $('#nav');
    window.addEventListener('scroll', ()=> nav?.classList.toggle('scrolled', window.scrollY > 8), {passive:true});
    // menu
    $('#siteMenu')?.addEventListener('click', ()=> $('#siteMenuPanel')?.classList.toggle('hidden'));
    // public doctor cards
    const pub = $('#publicDocs');
    if(pub) pub.innerHTML = DOCS.slice(0,4).map(d=>docCard(d,false)).join('');
    const pd = $('#patientDocs');
    if(pd) pd.innerHTML = DOCS.map(d=>docCard(d,true)).join('');
    // range tabs
    $$('#rangeTabs .tab').forEach(t=>t.addEventListener('click',()=>setRange(t.dataset.range)));
    // auth mode switch
    $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
      const m = b.dataset.mode;
      $$('#login-patient [data-mode]').forEach(x=>x.classList.toggle('on', x===b));
      $('#pFormPass').classList.toggle('hidden', m!=='password');
      $('#pFormOtp').classList.toggle('hidden', m!=='otp');
    }));
    // esc closes modal
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
    $('#scrim')?.addEventListener('click', e=>{ if(e.target.id==='scrim') closeModal(); });
    drawAll(document);
    animateEcg();
    go('site');
  }
  document.addEventListener('DOMContentLoaded', init);

  let paused = false;
  function setAnim(on){ paused = !on; drawAll(document); }
  /* internals the extras layer builds on */
  return {go, goP, goD, toast, modal, closeModal, setAnim, setPalette,
          patientLogin, doctorLogin, sendOtp, startEcg, stopEcg,
          bookModal, confirmBooking, shareModal, urgentModal, panic, joinVideo, openPatient, messageModal,
          pickSeg, pickSlot, setRange, drawAll, wire, filterDoctors,
          _charts: CHART_DATA, _patients: PATIENTS, _docs: DOCS, _renderers: RENDERERS,
          _helpers: {PAL, hexA, drawLine, drawBars, prep, setPalette}};
})();
if (typeof window !== 'undefined') window.CC = CC;
