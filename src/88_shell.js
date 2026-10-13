/* ═══════════════════════════════════════════════════════════
   CardioCore · Shell   —  mounts the physical-world layer
   unlock panel · hero light rig · emergency banner · shortcuts
   ═══════════════════════════════════════════════════════════ */
const Shell = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ───────── hero light rig: bloom, floor, reflection ───────── */
  function mountHero(){
    const stage = $('#stage'), heart = $('#heartImg');
    if(!stage || !heart || stage.dataset.rigged) return;
    stage.dataset.rigged = '1';
    const alt = heart.getAttribute('alt') || '';
    heart.insertAdjacentHTML('afterend', `
      <div class="heart-bloom" aria-hidden="true"></div>
      <div class="heart-floor" aria-hidden="true"></div>
      <img class="heart-refl" src="${heart.getAttribute('src')}" alt="" aria-hidden="true">`);
    if(!Motion.reduce()) stage.classList.add('live-light');
    Motion.heroTilt();
  }

  /* ───────── the unlock panel markup ───────── */
  function unlockPanelHTML(ctx){
    return `<div class="unlock-panel" data-ctx="${ctx}" tabindex="0" aria-label="Gesture unlock area">
      <canvas class="unlock-trail" aria-hidden="true"></canvas>
      <div class="unlock-rays" aria-hidden="true"></div>
      <div class="unlock-orb" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
          <path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z"/>
          <path d="M4.9 11.6h3l1.2-2.3 1.8 4.4 1.5-3 .9 1h5.5" stroke="#C9FBEF"/></svg>
      </div>
      <div class="unlock-hand" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L4 15.2a1.7 1.7 0 0 1 2.6-2.1L9 15.4V11Z"/>
        </svg>
      </div>
      <div class="unlock-target" aria-hidden="true">
        <svg class="unlock-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(14,158,158,.22)" stroke-width="4"/>
          <path class="unlock-arc" fill="none" stroke="#0E9E9E" stroke-width="4" stroke-linecap="round"
                stroke-dasharray="1" stroke-dashoffset="1" pathLength="1"
                transform="rotate(-90 50 50)" d="M50 4a46 46 0 1 1 0 92 46 46 0 1 1 0-92"/></svg>
        <span class="unlock-pulse"></span>
      </div>
      <div class="unlock-hint">Move your hand or cursor into the panel — the heart follows with weight, the hand trails behind it.</div>
      <div class="unlock-done hidden">
        <span class="unlock-tick"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <b>Identity confirmed</b><span class="fs13 mid">Palm signature matched · opening your portal…</span>
      </div>
    </div>`;
  }

  let rig = null;
  function startRig(panel, ctx){
    if(rig){ rig.destroy?.(); rig = null; }
    panel.classList.remove('unlocked');
    $('#unlockDone')?.classList.add('hidden');
    const done = $('.unlock-done', panel);
    rig = Motion.unlock(panel, {
      hold: 1.4,
      onProgress:p => { panel.style.setProperty('--p', p.toFixed(3)); },
      onDone:() => {
        panel.classList.add('unlocked');
        done?.classList.remove('hidden');
        CC.toast('Gesture recognised — you are signed in.','ok',3600);
        setTimeout(() => {
          if(ctx === 'doctor') CC.doctorLogin(null);
          else CC.patientLogin(null);
          hidePanel(ctx);
        }, 900);
      } });
    return rig;
  }

  function showPanel(ctx){
    const panel = $(`.unlock-panel[data-ctx="${ctx}"]`);
    if(!panel) return;
    const card = panel.closest('.auth-card') || panel.parentElement;
    card.querySelectorAll('.u-hide').forEach(el => el.classList.add('hidden'));
    panel.classList.remove('hidden');
    panel.focus({ preventScroll:true });
    requestAnimationFrame(() => startRig(panel, ctx));
    CC.toast('Gesture unlock: drag the heart into the ring and hold it still.','ok',4200);
  }
  function hidePanel(ctx){
    const panel = $(`.unlock-panel[data-ctx="${ctx}"]`);
    if(!panel) return;
    panel.classList.add('hidden');
    const card = panel.closest('.auth-card') || panel.parentElement;
    card.querySelectorAll('.u-hide').forEach(el => el.classList.remove('hidden'));
    rig?.destroy?.(); rig = null;
  }

  function mountUnlock(){
    /* patient sign-in: entry + panel inside the card */
    const card = $('#login-patient .auth-card');
    if(card && !$('.unlock-panel[data-ctx="patient"]')){
      $$('#login-patient .auth-card > *').forEach(el => {
        if(!el.classList.contains('divider')) el.classList.add('u-hide');
      });
      const entry = document.createElement('div');
      entry.className = 'unlock-entry u-hide';
      entry.innerHTML = `<div class="divider">or</div>
        <button class="btn ghost block" onclick="CC.showUnlock('patient')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" style="margin-right:8px;vertical-align:-3px">
            <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L4 15.2a1.7 1.7 0 0 1 2.6-2.1L9 15.4V11Z"/></svg>
          Unlock with the heart gesture</button>
        <p class="small center mt2">No typing — a paired-spring tracker follows your hand, weighs its momentum and asks you to hold still.</p>`;
      card.appendChild(entry);
      card.insertAdjacentHTML('beforeend', unlockPanelHTML('patient'));
    }
    const dp = $('.unlock-panel[data-ctx="patient"]');
    dp?.classList.add('hidden');
    const back = document.createElement('button');
    back.className = 'btn-ghostlink fs13 unlock-back';
    back.textContent = 'Use email and password instead';
    back.onclick = () => hidePanel('patient');
    dp?.insertAdjacentElement('afterend', back);

    /* clinician sign-in: entry inside the card, panel in a modal */
    const dcard = $('#login-doctor .auth-card');
    if(dcard && !$('#docUnlockEntry')){
      const e2 = document.createElement('div');
      e2.id = 'docUnlockEntry';
      e2.className = 'unlock-entry';
      e2.innerHTML = `<div class="divider">or</div>
        <button class="btn ghost block" onclick="CC.unlockModal('doctor')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" style="margin-right:8px;vertical-align:-3px">
            <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L4 15.2a1.7 1.7 0 0 1 2.6-2.1L9 15.4V11Z"/></svg>
          Clinician gesture unlock</button>`;
      dcard.appendChild(e2);
    }
  }

  function unlockModal(ctx){
    $('.scrim')?.classList.remove('scrim-dark');
    const host = document.getElementById('unlockModalHost') || (() => {
      const d = document.createElement('div');
      d.id = 'unlockModalHost'; d.className = 'unlock-host hidden';
      d.innerHTML = unlockPanelHTML('doctor');
      document.body.appendChild(d);
      return d;
    })();
    host.classList.remove('hidden');
    const panel = $('.unlock-panel', host);
    const close = document.createElement('button');
    close.className = 'btn ghost sm unlock-close';
    close.textContent = 'Cancel';
    close.onclick = () => { host.classList.add('hidden'); rig?.destroy?.(); rig = null; };
    panel.appendChild(close);
    requestAnimationFrame(() => startRig(panel, ctx));
  }

  /* ───────── emergency banner mount ───────── */
  function mountBanner(){
    const main = $('#app-patient .main');
    if(!main || $('#emgBanner')) return;
    const b = document.createElement('div');
    b.id = 'emgBanner'; b.className = 'emgbanner hidden';
    main.insertBefore(b, main.firstChild);
  }


  /* ───────── the three things worth clicking, one press each ───────── */
  const DEMOS = [
    { key:'unlock', hot:false, title:'Gesture unlock',
      text:'Hand-tracked physics unlock with dual mass-spring momentum.',
      icon:'<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L4 15.2a1.7 1.7 0 0 1 2.6-2.1L9 15.4V11Z"/>' },
    { key:'emergency', hot:true, title:'Emergency action',
      text:'1-touch Google Meet room, clinical PDF packet, and alert.',
      icon:'<path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z"/><path d="M4.9 11.6h3l1.2-2.3 1.8 4.4 1.5-3 .9 1h5.5" stroke="#fff"/>' },
    { key:'bench', hot:false, title:'Device bench',
      text:'Live 12 Hz sensor simulator: resting, stress, arrhythmia.',
      icon:'<path d="M2 12h4l2-5 3 10 3-8 2 3h6"/>' },
    { key:'day', hot:false, title:'Day in review',
      text:'24-hour continuous biometric timeline with sleep & activity.',
      icon:'<path d="M4 6h16M4 12h16M4 18h10"/>' },
  ];
  function mountDemo(){
    const hero = $('#site .hero'); if(!hero || $('#demoStrip')) return;
    const wrap = document.createElement('div');
    wrap.className = 'wrap demostrip'; wrap.id = 'demoStrip';
    wrap.innerHTML = `<div class="cap"><i></i> Interactive preview — click any tile to launch</div>
      <div class="demos">${DEMOS.map(d => `
        <button class="demotile ${d.hot ? 'hot' : ''}" onclick="CC.demo('${d.key}')">
          <span class="go">open ›</span>
          <span class="ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${d.hot ? '#E0453F' : '#0E9E9E'}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${d.icon}</svg></span>
          <b>${d.title}</b><span>${d.text}</span>
        </button>`).join('')}</div>`;
    hero.insertAdjacentElement('afterend', wrap);
    Motion.magnets(); Motion.lighting();
  }

  function demo(kind){
    if(kind === 'unlock'){
      CC.go('login-patient');
      setTimeout(() => CC.showUnlock('patient'), 320);
      if(document.body.dataset.screen === 'app-patient') CC.toast('You are signed in — the unlock panel is on the patient sign-in screen.','warn',4000);
    } else if(kind === 'emergency'){
      CC.onboarded() || CC.skipOnboarding();
      CC.goP('home');
      setTimeout(() => CC.trigger(), 340);
    } else if(kind === 'bench'){
      CC.onboarded() || CC.skipOnboarding();
      CC.goP('live');
    } else {
      CC.onboarded() || CC.skipOnboarding();
      CC.goP('day');
    }
  }

  /* ───────── sprung transitions: views and dialogs arrive with weight ───────── */
  function wireTransitions(){
    const wrapView = (fn) => function(view){
      const r = fn.apply(this, arguments);
      const el = [...document.querySelectorAll('.view')].find(v => v.dataset.view === view && v.classList.contains('on'));
      if(el) Motion.reveal(el, { y:16, s0:0.992, stagger:true });
      return r;
    };
    CC.goP = wrapView(CC.goP);
    CC.goD = wrapView(CC.goD);
    const _modal = CC.modal;
    CC.modal = function(){
      const r = _modal.apply(this, arguments);
      const m = document.getElementById('modal');
      if(m) Motion.reveal(m, { y:20, s0:0.975 });
      return r;
    };
    const _scrim = document.getElementById('scrim');
    if(_scrim) _scrim.style.transition = 'opacity .22s ease';
  }

  /* ───────── shortcut sheet ───────── */
  const KEYS = [
    ['⌘K / Ctrl K', 'Search and run a command'],
    ['?', 'Show this shortcut sheet'],
    ['G then H', 'Go to Home'],
    ['G then T', 'Go to Trends'],
    ['G then D', 'Go to Devices'],
    ['G then R', 'Clinician roster'],
    ['E', 'Export and download data'],
    ['P', 'Print or save the current report'],
    ['C', 'Run the device checks'],
    ['M', 'Medical ID (emergency card)'],
    ['S', 'Start or stop the ECG'],
    ['1 – 6', 'Switch trend range'],
    ['Esc', 'Close any dialog'],
    ['↑ / ↓', 'Move through the palette'],
  ];
  function keySheet(){
    CC.modal({ title:'Keyboard shortcuts', sub:'Move at the speed of the app', wide:true,
      body:`<div class="keys">${KEYS.map(([k, d]) => `<div><span class="mid">${d}</span><span class="kbd">${k}</span></div>`).join('')}</div>
            <div class="info-note mt3">Every action here is also reachable by pointer. Physics, magnets and parallax all switch off automatically when your system asks for reduced motion.</div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Close</button>
              <button class="btn" onclick="CC.closeModal();CC.toast('Preferences saved to this browser.','ok')">Got it</button>` });
  }

  function copyText(t){
    navigator.clipboard?.writeText(t).then(
      () => CC.toast('Copied — paste it anywhere.','ok'),
      () => CC.toast('Clipboard is blocked in this preview frame. Text: ' + t,'warn',7000));
  }

  /* ───────── keyboard wiring ───────── */
  let gKey = false;
  const GO = {
    h:() => CC.goP('home'), t:() => CC.goP('twin'), v:() => CC.goP('appts'), d:() => CC.goP('device'),
    l:() => CC.goP('lipids'), e:() => CC.goP('ecg'),
    r:() => (document.body.dataset.screen || '').startsWith('app-doctor') ? CC.goD('roster') : CC.goP('appts'),
  };
  function initKeys(){
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if(typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if(k === '?'){ e.preventDefault(); keySheet(); return; }
      if(k === 'escape'){ hidePanel('patient'); $('.unlock-host')?.classList.add('hidden'); return; }
      if(k === 'g'){ gKey = true; setTimeout(() => gKey = false, 900); return; }
      if(gKey && GO[k]){ gKey = false; GO[k](); return; }
      if(k === 'e') CC.exportModal();
      else if(k === 'p') CC.printReport((document.body.dataset.screen || '').startsWith('app-doctor') ? 'handover' : 'record');
      else if(k === 'c') CC.runChecks();
      else if(k === 'm'){ CC.goP('device'); CC.toast('Device and medical ID details.','ok',2600); }
      else if(k === 's' && (document.body.dataset.screen || '').startsWith('app-patient')) CC.startEcg();
    });
  }
  function init(){
    mountHero();
    mountUnlock();
    mountDemo();
    mountBanner();
    wireTransitions();
    initKeys();
    Motion.magnets();
    Motion.lighting();
    paintPhysical();
  }
  /* dark mode + reduced motion switch the light rig off */
  function paintPhysical(){
    $$('#stage').forEach(st => st.classList.toggle('live-light', !Motion.reduce()));
  }
  document.addEventListener('DOMContentLoaded', init);

  return {mountHero, mountUnlock, mountDemo, demo, mountBanner, keySheet, copyText, showUnlock:showPanel, hideUnlock:hidePanel, unlockModal, wireTransitions, paintPhysical};
})();
if (typeof window !== 'undefined') window.Shell = Shell;
