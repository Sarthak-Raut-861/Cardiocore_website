/* ═══════════════════════════════════════════════════════════
   CardioCore · motion
   Spring physics engine · cursor/hand tracking unlock ·
   magnetic controls · pointer-driven light & sheen ·
   hero reflection rig
   ═══════════════════════════════════════════════════════════ */
const Motion = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finePointer = () => window.matchMedia?.('(pointer: fine)').matches;

  /* ───────────────── springs ─────────────────────────────────
     A critically-ish damped spring with real mass: it accelerates
     toward the target, carries momentum through it, and settles.
     x'' = (-k(x - t) - c·x') / m
     ─────────────────────────────────────────────────────────── */
  class Spring {
    constructor(value = 0, {k = 170, d = 26, m = 1} = {}){
      this.x = value; this.t = value; this.v = 0;
      this.k = k; this.d = d; this.m = m;
    }
    set(v){ this.x = this.t = v; this.v = 0; return this; }
    to(t){ this.t = t; return this; }
    step(dt){
      const a = (-this.k * (this.x - this.t) - this.d * this.v) / this.m;
      this.v += a * dt;
      this.x += this.v * dt;
      return this.x;
    }
    get rest(){ return Math.abs(this.x - this.t) < 0.02 && Math.abs(this.v) < 0.02; }
  }
  const spring = (value, opts) => new Spring(value, opts);

  /* ───────────────── one rAF loop for everything ───────────── */
  const ticks = new Set();
  let raf = null, last = 0;
  function frame(ts){
    if(ticks.size === 0){ stop(); return; }
    raf = requestAnimationFrame(frame);
    if(!last) last = ts;
    let dt = (ts - last) / 1000; last = ts;
    if(dt > 0.05) dt = 0.05;                       /* clamp after tab switches */
    if(reduce() || document.hidden){ ticks.forEach(t => t(0, 0)); return; }
    const steps = Math.min(3, Math.max(1, Math.round(dt / 0.008)));
    const h = dt / steps;
    ticks.forEach(t => { for(let i = 0; i < steps; i++){
      try{ t(h, dt); }
      catch(e){
        ticks.delete(t);                                   /* quarantine the offender */
        (window.__tickErrs = window.__tickErrs || []).push(String(e && e.message || e) + ' @ ' + String(t).slice(0, 90));
      }
    } });
  }
  function start(){ if(!raf && ticks.size > 0) raf = requestAnimationFrame(frame); }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf = null; last = 0; } }
  const tick = fn => {
    ticks.add(fn);
    start();
    return () => {
      ticks.delete(fn);
      if(ticks.size === 0) stop();
    };
  };

  /* ───────────────── global pointer state ─────────────────── */
  const P = { x:0, y:0, vx:0, vy:0, speed:0, down:false, inside:false, t:0 };
  let lastPx = 0, lastPy = 0, lastPt = 0;
  window.addEventListener('pointermove', e => {
    P.x = e.clientX; P.y = e.clientY; P.inside = true;
    const now = performance.now();
    const dt = (now - lastPt) || 16;
    P.vx = (P.x - lastPx) / dt;
    P.vy = (P.y - lastPy) / dt;
    P.speed = Math.hypot(P.vx, P.vy);
    lastPx = P.x; lastPy = P.y; lastPt = now;
    if(P.down) P.t = now;
  }, {passive:true});
  window.addEventListener('pointerdown', () => { P.down = true; }, {passive:true});
  window.addEventListener('pointerup',   () => { P.down = false; }, {passive:true});
  window.addEventListener('pointerleave',() => { P.inside = false; });

  /* ───────────────── CURSOR / HAND UNLOCK ───────────────────
     The pointer drags a heart with weight: a heavy spring lags,
     overshoots and settles; a light spring drives the hand that
     carries it. Hold it inside the ring and the lock releases.
     ─────────────────────────────────────────────────────────── */
  function unlock(stage, { onProgress, onDone, hold = 1.5 } = {}){
    if(!stage) return null;
    const canvas = $('.unlock-trail', stage);
    const orb    = $('.unlock-orb', stage);
    const hand   = $('.unlock-hand', stage);
    const ring   = $('.unlock-ring .unlock-arc', stage);
    const target = $('.unlock-target', stage);
    const rays   = $('.unlock-rays', stage);
    const hint   = $('.unlock-hint', stage);
    if(!orb) return null;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* springs: heavy orb, light hand, plus tilt + shadow coupling */
    const cx = spring(stage.clientWidth / 2, {k:120, d:17, m:2.6});
    const cy = spring(stage.clientHeight / 2, {k:120, d:17, m:2.6});
    const hx = spring(cx.x, {k:420, d:34, m:1});
    const hy = spring(cy.x, {k:420, d:34, m:1});
    const rot = spring(0, {k:90, d:12, m:1.2});    /* orb rotation from momentum */
    const lift = spring(0, {k:120, d:16, m:1.2});  /* how airborne the heart is */
    const tilt = spring(0, {k:150, d:18, m:1});    /* 3D tilt */
    const glow = spring(0, {k:80, d:14, m:1.4});   /* contact glow strength */
    let progress = 0, done = false, locked = false;

    const R = () => stage.getBoundingClientRect();
    const cxPx = () => { const r = R(); return P.x - r.left; };
    const cyPx = () => { const r = R(); return P.y - r.top; };
    const targetC = () => {
      const r = R(), t = target.getBoundingClientRect();
      return { x: t.left - r.left + t.width/2, y: t.top - r.top + t.height/2, r: t.width/2 };
    };

    canvas.width = R().width * dpr; canvas.height = R().height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const trail = [];

    if(reduce()){                                  /* accessibility: no physics */
      orb.style.left = (R().width/2) + 'px';
      orb.style.top  = (R().height/2) + 'px';
      hint.textContent = 'Reduced motion is on — click anywhere in the panel to unlock.';
      target.style.transform = 'translate(-50%,-50%)';
      stage.addEventListener('click', () => { progress = 1; finish(); });
      stage.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); progress = 1; finish(); } });
      return {destroy(){}};
    }

    const stop = tick((h, dt) => {
      const r = R();
      if(!r.width) return;
      const inside = P.inside && P.y > r.top - 60 && P.y < r.bottom + 60;

      /* target: follow the pointer, or rest at the centre */
      const tx = inside ? Math.max(18, Math.min(r.width - 18, cxPx())) : r.width / 2;
      const ty = inside ? Math.max(18, Math.min(r.height - 18, cyPx())) : r.height / 2;
      const prevX = cx.x, prevY = cy.x;
      cx.to(tx); cy.to(ty);
      cx.step(h); cy.step(h);
      hx.to(tx); hy.to(ty); hx.step(h); hy.step(h);

      const vX = (cx.x - prevX) / Math.max(h, 0.001);
      const vY = (cy.x - prevY) / Math.max(h, 0.001);
      P.vx = vX; P.vy = vY; P.speed = Math.hypot(vX, vY);

      /* weight tells the story: rotation, tilt and sheen follow momentum */
      rot.to(Math.max(-26, Math.min(26, vX * 0.09)));
      tilt.to(Math.max(-18, Math.min(18, vY * 0.06 - vX * 0.035)));
      rot.step(h); tilt.step(h);
      /* a heavy thing deforms and lifts when it is thrown: squash along the
         direction of travel, a longer shadow under it */
      const speed = Math.hypot(vX, vY);
      const deform = Math.max(-0.12, Math.min(0.12, vX * 0.0006));
      lift.to(Math.min(1, speed / 900)); lift.step(h);

      /* hand trails the orb */
      /* the palm sits under the heart and slightly behind the motion —
         it reads as the thing doing the carrying */
      hand.style.transform = `translate3d(${hx.x + 17}px, ${hy.x + 25}px, 0) translate(-50%,-50%) rotate(${rot.x * 0.32 + 4}deg) scale(${(1 + deform * 0.35).toFixed(3)})`;
      orb.style.transform =
        `translate3d(${cx.x}px, ${cy.x}px, 0) translate(-50%,-50%) ` +
        `rotate(${rot.x}deg) perspective(560px) rotateX(${tilt.x}deg) ` +
        `scale(${(1 + Math.min(speed / 900, 0.09)).toFixed(4)}) ` +
        `scale(${(1 + deform).toFixed(4)}, ${(1 - deform * 0.85).toFixed(4)})`;
      /* the light on the panel follows the heart, the layers drift behind it */
      const dx = cx.x - r.width / 2, dy = cy.x - r.height / 2;
      stage.style.setProperty('--px', (50 + dx * 0.06).toFixed(2) + '%');
      stage.style.setProperty('--py', (50 + dy * 0.08).toFixed(2) + '%');
      stage.style.setProperty('--lift', lift.x.toFixed(3));
      if(rays) rays.style.transform = `translate3d(${(-dx * 0.028).toFixed(2)}px, ${(-dy * 0.028).toFixed(2)}px, 0)`;
      if(target) target.style.transform = `translate(-50%,-50%) translate3d(${(-dx * 0.05).toFixed(2)}px, ${(-dy * 0.05).toFixed(2)}px, 0)`;
      /* light coupling: the shadow lags opposite the motion, the highlight leads */
      orb.style.setProperty('--sl', (0.34 - Math.min(Math.abs(P.vx) / 2200, 0.16)) + '');
      orb.style.setProperty('--sx', (-P.vx * 0.05) + 'px');
      orb.style.setProperty('--sy', (-P.vy * 0.05 + 14 + lift.x * 12) + 'px');
      orb.style.setProperty('--lx', (58 + rot.x * 0.4) + '%');

      /* trail ribbon: past positions, fading */
      trail.push({ x: cx.x, y: cy.x, a: 0.55 });
      if(trail.length > 26) trail.shift();
      ctx.clearRect(0, 0, r.width, r.height);
      for(let i = 0; i < trail.length - 1; i++){
        const p0 = trail[i], p1 = trail[i+1];
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(14,158,158,${p0.a * (i / trail.length) * 0.5})`;
        ctx.lineWidth = 1 + (i / trail.length) * 7;
        ctx.lineCap = 'round'; ctx.stroke();
        p0.a *= 0.965;
      }

      /* hold to unlock: near the ring, moving slowly.
         A still hand charges the lock fully; a drifting one still gets
         there, just slower — so nobody has to be a statue to sign in. */
      const t = targetC();
      const d = Math.hypot(cx.x - t.x, cy.x - t.y);
      const calm = P.speed < 1.1;
      const near = d < t.r * 0.68 && inside;
      if(near && !done){
        progress = Math.min(1, progress + (dt || h) / hold * (calm ? 1 : 0.42));
        glow.to(calm ? 1 : 0.7); stage.classList.add('locking');
      } else if(!done){
        progress = Math.max(0, progress - (dt || h) * 1.2);
        glow.to(0); stage.classList.remove('locking');
      }
      glow.step(h);
      orb.style.setProperty('--glow', glow.x.toFixed(3));
      ring.style.strokeDashoffset = String(1 - progress);
      ring.style.opacity = progress > 0.02 ? '1' : '0';
      hint.style.opacity = inside ? String(1 - progress * 0.85) : '1';
      if(progress > 0.12 && progress < 1) hint.textContent = 'Hold steady…';
      else if(progress === 0) hint.textContent = 'Drag the heart into the ring with your hand and hold it still.';

      onProgress?.(progress);
      if(progress >= 1 && !done){ done = true; locked = true; finish(); }
    });

    function finish(){
      if(target) target.style.transform = '';       /* let the CSS pop take over */
      stage.classList.add('unlocked');
      onDone?.();
    }
    return { destroy: stop, finish };
  }

  /* ───────────────── spring reveals ────────────────────────
     Entrances are sprung, not eased: content arrives with a little
     weight behind it and settles instead of stopping dead.
     ─────────────────────────────────────────────────────────── */
  function reveal(el, {y = 10, s0 = 0.99, k = 220, d = 28, m = 1, onDone} = {}){
    if(!el) return;
    if(reduce()){ el.style.opacity = ''; el.style.transform = ''; onDone?.(); return; }
    el.style.willChange = 'transform,opacity';
    const py = spring(y, {k, d, m}), po = spring(0, {k: 180, d: 24, m: 1});
    py.to(0); po.to(1);
    const stop = tick(h => {
      py.step(h); po.step(h);
      el.style.transform = `translate3d(0,${py.x.toFixed(2)}px,0)`;
      el.style.opacity = Math.max(0, po.x).toFixed(3);
      if(py.rest && po.rest){
        el.style.transform = ''; el.style.opacity = ''; el.style.willChange = '';
        stop(); onDone?.();
      }
    });
  }

  /* ───────────────── magnetic controls ─────────────────────
     Native CSS handles button hover/active without displacing clicks.
     ─────────────────────────────────────────────────────────── */
  function magnets(){
    // Kept as a lightweight API stub to avoid breaking external callers
  }

  /* ───────────────── light: tilt + sheen on surfaces ─────────
     Every lit card computes its own illumination from the pointer:
     rotation toward the light, a specular sheen that follows it,
     and a contact shadow that moves away from it.
     ─────────────────────────────────────────────────────────── */
  function lighting(){
    if(reduce() || !finePointer()) return;
    const marks = 'section .card, .vital, .doc-card, .band, .auth-card, .float-card, .onb-step .card, .unlock-panel, .demotile';
    $$(marks).forEach(el => {
      if(el.dataset.lit) return;
      if(el.closest('.modal') || el.closest('.palette')) return;
      el.dataset.lit = '1';
      el.classList.add('lit');
      const rx = spring(0, {k:150, d:18, m:1});
      const ry = spring(0, {k:150, d:18, m:1});
      const lift = spring(0, {k:220, d:24, m:1});
      const sheen = spring(0, {k:110, d:16, m:1});
      const mx = spring(50, {k:150, d:20, m:1});
      const my = spring(50, {k:150, d:20, m:1});
      let active = false, r = null, untick = null;

      function stepCard(h){
        rx.step(h); ry.step(h); lift.step(h); sheen.step(h); mx.step(h); my.step(h);
        if(!active && rx.rest && ry.rest && lift.rest && sheen.rest && mx.rest && my.rest){
          el.style.transform = '';
          el.style.removeProperty('--sheen');
          el.style.removeProperty('--mx');
          el.style.removeProperty('--my');
          if(untick){ untick(); untick = null; }
          return;
        }
        el.style.setProperty('--mx', mx.x.toFixed(1) + '%');
        el.style.setProperty('--my', my.x.toFixed(1) + '%');
        el.style.setProperty('--sheen', sheen.x.toFixed(3));
        el.style.transform =
          `perspective(1100px) rotateX(${rx.x.toFixed(2)}deg) rotateY(${ry.x.toFixed(2)}deg) translate3d(0,${lift.x.toFixed(2)}px,0)`;
      }

      function ensureActive(){
        if(!untick){ untick = tick(stepCard); }
      }

      el.addEventListener('pointerenter', () => {
        active = true;
        r = el.getBoundingClientRect();
        lift.to(-3); sheen.to(1);
        ensureActive();
      });
      el.addEventListener('pointermove', e => {
        if(!r) r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        mx.to(nx * 100); my.to(ny * 100);
        ry.to((nx - 0.5) * 5.4);          /* yaw */
        rx.to(-(ny - 0.5) * 4.2);         /* pitch */
        ensureActive();
      });
      el.addEventListener('pointerleave', () => {
        active = false;
        r = null;
        rx.to(0); ry.to(0); lift.to(0); sheen.to(0); mx.to(50); my.to(50);
        ensureActive();
      });
    });
  }

  /* ───────────────── hero rig: reflection + contact shadow ── */
  function heroTilt(){
    const stage = $('#stage'), heart = $('#heartImg'), glowEl = $('.heart-bloom'),
          refl = $('.heart-refl'), floor = $('.heart-floor');
    if(!stage || !heart) return;

    const rx = spring(0, {k:110, d:16, m:1.4});
    const ry = spring(0, {k:110, d:16, m:1.4});
    const px = spring(0, {k:90,  d:14, m:1.6});
    const py = spring(0, {k:90,  d:14, m:1.6});
    const shX = spring(0, {k:70, d:13, m:1.8});
    const shY = spring(0, {k:70, d:13, m:1.8});
    const bloom = spring(0.5, {k:60, d:12, m:1.6});

    let stageRect = null, isVisible = true, untick = null;

    if('IntersectionObserver' in window){
      const obs = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting && (!document.body.dataset.screen || document.body.dataset.screen === 'site');
        if(isVisible) ensureActive();
      }, {threshold: 0.05});
      obs.observe(stage);
    }

    function ensureActive(){
      if(!untick && isVisible){
        untick = tick(stepHero);
      }
    }

    stage.addEventListener('pointerenter', () => {
      stageRect = stage.getBoundingClientRect();
      ensureActive();
    });

    stage.addEventListener('pointermove', e => {
      if(!stageRect) stageRect = stage.getBoundingClientRect();
      const nx = (e.clientX - stageRect.left) / stageRect.width - 0.5;
      const ny = (e.clientY - stageRect.top) / stageRect.height - 0.5;
      ry.to(nx * 11); rx.to(-ny * 8);
      px.to(nx * 17); py.to(ny * 13);
      shX.to(-nx * 40); shY.to(-ny * 22 + 26);
      bloom.to(0.86);
      ensureActive();
    });
    stage.addEventListener('pointerleave', () => {
      stageRect = null;
      rx.to(0); ry.to(0); px.to(0); py.to(0); shX.to(0); shY.to(30); bloom.to(0.5);
      ensureActive();
    });

    /* the beat also moves the light: the bloom swells with systole */
    function stepHero(h){
      if(!isVisible || (document.body.dataset.screen && document.body.dataset.screen !== 'site')){
        if(untick){ untick(); untick = null; }
        return;
      }
      rx.step(h); ry.step(h); px.step(h); py.step(h); shX.step(h); shY.step(h);
      const beat = (performance.now() % 1600) / 1600;
      /* systole stays subtle: the heart breathes, it does not inflate
         over the cards around it */
      const swell = Math.exp(-Math.pow((beat - 0.08) / 0.05, 2)) * 0.075 +
                    Math.exp(-Math.pow((beat - 0.26) / 0.06, 2)) * 0.035;
      bloom.step(h);
      heart.style.transform =
        `translate3d(${px.x.toFixed(2)}px, ${py.x.toFixed(2)}px, 0) ` +
        `rotateY(${ry.x.toFixed(2)}deg) rotateX(${rx.x.toFixed(2)}deg) scale(${(1 + swell).toFixed(4)})`;
      heart.style.setProperty('--shx', shX.x.toFixed(1) + 'px');
      heart.style.setProperty('--shy', shY.x.toFixed(1) + 'px');
      if(glowEl) glowEl.style.opacity = (bloom.x * (1 + swell * 1.4)).toFixed(3);
      if(refl){
        refl.style.transform =
          `translate3d(${(px.x * 0.5).toFixed(2)}px, 0, 0) scaleY(-1) rotateY(${(-ry.x).toFixed(2)}deg) scale(${(1 + swell * 0.6).toFixed(4)})`;
        refl.style.opacity = (0.34 * (1 - Math.abs(py.x) / 120)).toFixed(3);
      }
      if(floor) floor.style.transform = `translate3d(${(shX.x * 0.35).toFixed(1)}px, 0, 0) scale(${(1 + swell * 0.6).toFixed(3)})`;
    }

    ensureActive();
  }

  function presses(){
    // Native CSS handles button press feedback without intercepting clicks
  }

  function init(){
    heroTilt();
    lighting();
  }
  document.addEventListener('DOMContentLoaded', init);

  return {spring, tick, start, stop, unlock, magnets, lighting, heroTilt, reveal, pointer:P, reduce};
})();
if (typeof window !== 'undefined') window.Motion = Motion;
