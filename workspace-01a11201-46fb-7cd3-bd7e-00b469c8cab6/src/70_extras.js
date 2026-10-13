/* ═══════════════════════════════════════════════════════════
   CardioCore · extras
   persistence · theme · onboarding · command palette ·
   detail views · chart tooltips · print · accessibility
   ═══════════════════════════════════════════════════════════ */
const X = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ─────────────────────────── store ─────────────────────────── */
  const KEY = 'cardiocore.v2';
  const mem = {};
  const LS = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return mem[k] ?? null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){ mem[k] = v; } }
  };
  const DEFAULTS = {
    theme:'light', onboarded:false, online:true, step:1, range:'7D',
    profile:{name:'Aarav Menon', dob:'1982-03-14', sex:'Male', blood:'B+', height:176, weight:78},
    conditions:[{c:'Hypertension', y:'2019'},{c:'Type 2 diabetes', y:'2021'}],
    meds:[{name:'Ramipril', dose:'5 mg', freq:'Once daily · morning', cls:'ACE inhibitor', since:'2019'},
          {name:'Atorvastatin', dose:'20 mg', freq:'Once daily · night', cls:'Statin', since:'2022'},
          {name:'Metformin', dose:'500 mg', freq:'Twice daily', cls:'Biguanide', since:'2021'}],
    labs:[{date:'2026-09-24', lab:'Apollo Diagnostics', total:192, ldl:112, hdl:46, trigs:168, vldl:34},
          {date:'2026-03-11', lab:'Apollo Diagnostics', total:198, ldl:108, hdl:44, trigs:156, vldl:31},
          {date:'2025-09-02', lab:'City Care Labs', total:204, ldl:116, hdl:43, trigs:172, vldl:34},
          {date:'2025-03-08', lab:'City Care Labs', total:196, ldl:110, hdl:42, trigs:150, vldl:30}],
    family:{father:'Coronary artery disease', fatherAge:58, mother:'No cardiovascular events', sibling:'Not added'},
    emergency:{contact:'Priya Menon', phone:'+91 98200 00210', hospital:'Meridian Heart Institute',
               doctor:'Dr Neha Raghavan', autoBook:true, shareEmg:true, notify:true, delivery:['push','sms']},
    consent:{baseline:true, ecg:true, research:false, family:false, twofa:true},
    bookings:[], taken:{rAM:true, mAM:true}, readAlerts:[], notes:[],
    symptoms:[
      {id:1, when:'2026-09-28T11:31', type:'Light-headedness', sev:2, note:'Passed in about ten minutes while sitting and reading.', linked:true},
      {id:2, when:'2026-09-29T08:05', type:'Shortness of breath on stairs', sev:1, note:'Mild. Resolved on resting.', linked:false},
      {id:3, when:'2026-10-02T22:14', type:'Palpitations', sev:2, note:'Lasted ~3 minutes in bed, no pain.', linked:true}
    ],
    prefs:{push:true, sms:true, email:false, quiet:true}
  };
  let db = (() => {
    try { return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), JSON.parse(LS.get(KEY) || '{}')); }
    catch(e){ return JSON.parse(JSON.stringify(DEFAULTS)); }
  })();
  const save = () => LS.set(KEY, JSON.stringify(db));

  /* ─────────────────────────── theme ─────────────────────────── */
  function applyTheme(name){
    db.theme = name; save();
    document.documentElement.dataset.theme = name;
    CC.setPalette?.(name);
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', name === 'dark' ? '#071C21' : '#FFFFFF');
  }
  const toggleTheme = () => {
    const next = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
    applyTheme(next);
    CC.toast(next === 'dark'
      ? 'Dark theme on — the palette the design system was drawn in.'
      : 'Light theme on — the clinical palette.', 'ok', 2600);
  };

  /* ─────────────────────────── charts: new series ─────────────────────────── */
  const C = CC._charts;
  C.ldlTrend = {kind:'chol', type:'multi', color:'#D98314', target:100, unit:'mg/dL',
    labels:['Mar 25','Sep 25','Mar 26','Sep 26'],
    series:[{color:'#D98314', vals:[110,116,108,112], label:'LDL'}]};
  C.lipidOverlay = {kind:'chol', type:'multi', unit:'mg/dL', labels:['Mar 25','Sep 25','Mar 26','Sep 26'],
    series:[{color:'#D98314', vals:[110,116,108,112], label:'LDL'},
            {color:'#12A06A', vals:[42,43,44,46], label:'HDL'}]};
  C.symptomOverlap = {type:'bars', color:'#7A6BF0', labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    vals:[0,1,2,0,1,0,0], max:2};

  /* multi-series line renderer: shares the axis across series, marks targets */
  CC._renderers.multi = function(ctx, w, h, cfg){
    const {PAL, hexA} = CC._helpers;
    const pad = {l:10, r:44, t:20, b:24}, n = cfg.labels.length;
    const all = cfg.series.flatMap(s => s.vals).concat(cfg.target ? [cfg.target] : []);
    const mn = Math.min(...all) * 0.9, mx = Math.max(...all) * 1.08;
    const X = i => pad.l + i * (w-pad.l-pad.r) / (n-1);
    const Y = v => pad.t + (1-(v-mn)/(mx-mn)) * (h-pad.t-pad.b);

    ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
    for(let i=0;i<=4;i++){ const y = pad.t + i*(h-pad.t-pad.b)/4;
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke(); }

    if(cfg.target){
      ctx.setLineDash([5,5]); ctx.strokeStyle = '#12A06A'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(pad.l,Y(cfg.target)); ctx.lineTo(w-pad.r,Y(cfg.target)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#12A06A'; ctx.font = '700 10px Manrope, sans-serif';
      ctx.fillText('target ' + cfg.target, pad.l+2, Y(cfg.target)-5);
    }
    cfg.series.forEach(s => {
      const p = new Path2D();
      s.vals.forEach((v,i) => i ? p.lineTo(X(i),Y(v)) : p.moveTo(X(i),Y(v)));
      ctx.strokeStyle = PAL.halo; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke(p);
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.8; ctx.stroke(p);
      s.vals.forEach((v,i) => { ctx.beginPath(); ctx.arc(X(i),Y(v),3.6,0,7);
        ctx.fillStyle = PAL.surface; ctx.fill(); ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.stroke(); });
      ctx.fillStyle = s.color; ctx.font = '700 11px Manrope, sans-serif';
      ctx.fillText('● ' + s.label, w-pad.r+6, Y(s.vals[n-1]) - 2);
    });
    ctx.fillStyle = PAL.axis; ctx.font = '700 11px Manrope, sans-serif';
    cfg.labels.forEach((l,i) => {                       /* clamp to the canvas so edge labels stay readable */
      const tw = ctx.measureText(l).width;
      ctx.fillText(l, Math.max(1, Math.min(X(i)-tw/2, w-tw-1)), h-6); });
  };

  /* ─────────────────────────── chart tooltips ─────────────────────────── */
  function chartTooltip(){
    $$('canvas[data-chart]').forEach(cv => {
      if(cv.dataset.tip) return;
      cv.dataset.tip = '1';
      const host = cv.parentElement;
      host.classList.add('chart-host');
      const tip = document.createElement('div');
      tip.className = 'chart-tip';
      host.appendChild(tip);

      const move = e => {
        const cfg = cv._cfg; if(!cfg || !cfg.series && !cfg.vals) return;
        if(cv._reveal !== undefined && cv._reveal < 1) return;      /* wait for the draw-in */
        const r = cv.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width * (cv._w || cv.width);
        const n = (cfg.vals || cfg.series[0].vals).length;
        const padL = (cfg.type === 'multi') ? 10 : 6, padR = (cfg.type === 'multi') ? 44 : 6;
        const span = (cv._w || cv.width) - padL - padR;
        let i = Math.round((px - padL) / span * (n-1));
        i = Math.max(0, Math.min(n-1, i));
        const label = cfg.labels ? cfg.labels[i] : 'now';
        const rows = cfg.series
          ? cfg.series.map(s2 => { const k = s2.kind || cfg.kind;
              const txt = (k && Units.DEF[k]) ? Units.fmt(k, s2.vals[i]) : `${s2.vals[i]} ${s2.unit || cfg.unit || ''}`;
              return `<div style="color:${s2.color}">${s2.label ? s2.label + ' · ' : ''}<b>${txt}</b></div>`; }).join('')
          : `<b>${(cfg.kind && Units.DEF[cfg.kind]) ? Units.fmt(cfg.kind, cfg.vals[i]) : `${cfg.vals[i]} ${cfg.unit || ''}`}</b>`;
        tip.innerHTML = `<span>${label}</span>${rows}`;
        tip.style.left = (i/(n-1) * (100 - (padL+padR)/(cv._w||cv.width)*100) + padL/(cv._w||cv.width)*100) + '%';
        tip.style.top  = '34%';
        tip.classList.add('on');
      };
      cv.addEventListener('pointermove', move);
      cv.addEventListener('pointerleave', () => tip.classList.remove('on'));
    });
  }

  /* ─────────────────────────── dynamic views ─────────────────────────── */
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = iso => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const fmtTime = iso => { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const money = v => Units.both('chol', v);

  const NOTIFS = [
    {id:'n1', t:'today', time:'11:24', kind:'health', level:'urgent',  title:'Significant change detected', body:'Urgent review workflow started · Meridian Heart Institute', route:()=>CC.urgentModal()},
    {id:'n2', t:'today', time:'08:02', kind:'insights', level:'attention', title:'HRV below your usual range', body:'48 ms against a personal average of 52 ms — tap to see what changed', route:()=>CC.goP('health')},
    {id:'n3', t:'today', time:'07:41', kind:'health', level:'stable', title:'Your ECG recording is ready', body:'30 s strip · good quality · added to your recordings', route:()=>CC.goP('ecg')},
    {id:'n4', t:'earlier', time:'Yest.', kind:'appts', level:'stable', title:'Appointment tomorrow, 10:30', body:'Dr Neha Raghavan · Meridian Heart Institute', route:()=>CC.goP('appts')},
    {id:'n5', t:'earlier', time:'2 d', kind:'device', level:'attention', title:'Wearable battery low', body:'15% remaining at the time · charge with the supplied dock', route:()=>CC.goP('device')},
    {id:'n6', t:'earlier', time:'3 d', kind:'health', level:'stable', title:'Back within your baseline', body:'Measurements returned to normal after activity', route:()=>CC.goP('health')}
  ];
  function renderNotifications(filter='all'){
    const host = $('#notifList'); if(!host) return;
    const rows = NOTIFS.filter(n => filter === 'all' || n.kind === filter);
    const groups = [['today','Today'],['earlier','Earlier']];
    host.innerHTML = groups.map(([key, label]) => {
      const items = rows.filter(r => r.t === key);
      if(!items.length) return '';
      return `<div class="card mb3">
        <div class="caption mb2">${label}</div>
        ${items.map(n => {
          const read = db.readAlerts.includes(n.id);
          const tone = {urgent:'var(--red)', attention:'var(--amber)', stable:'var(--teal)'}[n.level];
          const ic = n.level === 'urgent'
            ? '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 9v5M12 17.2v.1"/>'
            : n.level === 'attention' ? '<path d="M12 3v2M12 19v2M3 12h2M19 12h2"/><circle cx="12" cy="12" r="3.5"/>'
            : '<path d="M20 6 9 17l-5-5"/>';
          return `<div class="lrow clickable" style="cursor:pointer;${read ? 'opacity:.5' : ''}" data-nid="${n.id}">
            <span class="lic" style="background:${n.level==='urgent'?'var(--red-soft)':n.level==='attention'?'var(--amber-soft)':'var(--teal-soft)'}">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${tone}" stroke-width="2.3" stroke-linecap="round">${ic}</svg></span>
            <div class="grow"><b class="fs14">${n.title}</b><div class="fs12 muted">${n.body}</div></div>
            <span class="fs12 muted" style="white-space:nowrap">${n.time}</span>
          </div>`;
        }).join('')}
      </div>`;
    }).join('') || '<div class="card"><p class="mid fs14">Nothing in this category yet.</p></div>';
    $$('[data-nid]', host).forEach(el => el.addEventListener('click', () => {
      const n = NOTIFS.find(x => x.id === el.dataset.nid);
      if(!db.readAlerts.includes(n.id)){ db.readAlerts.push(n.id); save(); renderNotifications(filter); }
      n.route();
    }));
  }
  function markAllRead(){
    NOTIFS.forEach(n => { if(!db.readAlerts.includes(n.id)) db.readAlerts.push(n.id); });
    save(); renderNotifications($$('[data-nfilter].on')[0]?.dataset.nfilter || 'all');
    $$('.icon-btn .badge').forEach(b => b.remove());
    CC.toast('All notifications marked as read.','ok');
  }

  function renderLipids(){
    const tiles = $('#lipidTiles'), rows = $('#lipidRows');
    if(!tiles || !rows) return;
    const latest = db.labs[0], prev = db.labs[1];
    const spec = [['Total cholesterol', latest.total, 'mg/dL', 'SI target < 5.17 mmol/L', 'greenc'],
                  ['LDL cholesterol', latest.ldl, 'mg/dL', 'above target < 100', 'amberc'],
                  ['HDL cholesterol', latest.hdl, 'mg/dL', 'adequate > 40', 'greenc'],
                  ['Triglycerides', latest.trigs, 'mg/dL', 'borderline < 150', 'amberc']];
    tiles.innerHTML = spec.map(([k,v,u,note,cls], i) => {
      const delta = v - [prev.total, prev.ldl, prev.hdl, prev.trigs][i];
      const arrow = delta === 0 ? 'no change' : (delta > 0 ? '↑ ' + delta : '↓ ' + Math.abs(delta));
      const good = (i === 2) ? delta >= 0 : delta <= 0;
      return `<div class="card"><div class="caption">${k}</div>
        <div class="metric-value ${cls}" style="font-size:30px">${v}<span class="metric-unit">${u}</span></div>
        <div class="fs12 muted">${note}</div>
        <div class="fs12 ${delta===0?'muted':good?'greenc':'amberc'}" style="font-weight:700">${arrow} vs last</div></div>`;
    }).join('');
    rows.innerHTML = db.labs.map(l => `<tr><td class="b700">${fmtDate(l.date)}</td><td>${l.total}</td>
      <td class="${l.ldl >= 100 ? 'amberc b700' : 'greenc b700'}">${l.ldl}</td><td>${l.hdl}</td>
      <td class="${l.trigs >= 150 ? 'amberc' : ''}">${l.trigs}</td></tr>`).join('');
    const v = $('#ldlValue'); if(v) v.textContent = latest.ldl;
    const asc = () => [...db.labs].reverse();
    C.ldlTrend.series[0].vals = asc().map(l => l.ldl);
    setLipidSeries($$('[data-lipid].on')[0]?.dataset.lipid || 'ldl');
  }
  function setLipidSeries(kind){
    const asc = () => [...db.labs].reverse();
    const line = (color, key, label) => ({color, vals: asc().map(l => l[key]), label});
    C.lipidOverlay.labels = asc().map(l => fmtDate(l.date).replace(/ \d{4}$/, m => m).slice(0,7));
    C.lipidOverlay.series = kind === 'hdl' ? [line('#12A06A','hdl','HDL')]
      : kind === 'trigs' ? [line('#0E9E9E','trigs','Triglycerides')]
      : kind === 'ldl'   ? [line('#D98314','ldl','LDL')]
      : [line('#D98314','ldl','LDL'), line('#12A06A','hdl','HDL')];
  }

  function renderSymptoms(){
    const host = $('#symptomList'); if(!host) return;
    const cnt = $('#symptomCount'); if(cnt) cnt.textContent = `${db.symptoms.length} entr${db.symptoms.length===1?'y':'ies'}`;
    host.innerHTML = db.symptoms.slice().reverse().map(s => {
      const dots = Array.from({length:5}, (_,i) => `<i class="${i < s.sev ? 'on' : ''}"></i>`).join('');
      const tone = s.sev >= 4 ? 'red' : s.sev >= 2 ? 'amber' : 'teal';
      return `<div class="lrow" style="align-items:flex-start;padding:15px 0">
        <span class="lic" style="background:var(--${tone}-soft);width:42px;height:42px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--${tone})" stroke-width="2.3" stroke-linecap="round"><path d="M12 4a5 5 0 0 1 5 5c0 4-5 11-5 11S7 13 7 9a5 5 0 0 1 5-5Z"/><circle cx="12" cy="9" r="1.6"/></svg></span>
        <div class="grow">
          <div class="row row-b wrapf gap8"><b>${s.type}</b><span class="fs12 muted">${fmtDate(s.when)} · ${fmtTime(s.when)}</span></div>
          <div class="fs13 mid mt1">${s.note || 'No note added.'}</div>
          <div class="row gap12 mt2 wrapf">
            <span class="sev s${s.sev}">${dots}</span>
            <span class="fs12 muted">severity ${s.sev}/5</span>
            ${s.linked ? '<span class="chip attention" style="padding:2px 9px"><span class="dot"></span> near a signal deviation</span>' : '<span class="chip neutral" style="padding:2px 9px">no matching deviation</span>'}
          </div>
        </div>
        <button class="btn xs ghost" onclick="X.shareSymptom(${s.id})">Share</button>
      </div>`;
    }).join('');
  }

  function renderDevice(){
    const on = db.online;
    const map = {'#battPct': on ? '78' : '78', '#battEta': on ? '2 days 4 h' : '2 days 4 h',
                 '#lastSync': on ? '2 minutes ago' : '8 minutes ago',
                 '#bufferCount': on ? '12 measurements' : '12 measurements (unsynced)'};
    Object.entries(map).forEach(([sel, val]) => { const el = $(sel); if(el) el.textContent = val; });
    const chip = $('#connChip');
    if(chip) chip.outerHTML = on
      ? '<span class="chip stable" id="connChip"><span class="dot"></span> Connected</span>'
      : '<span class="chip attention" id="connChip"><span class="dot"></span> Offline — buffering</span>';
  }

  function renderStore(){
    const p = db.profile, first = p.name.split(' ')[0], ini = p.name.split(' ').map(w => w[0]).join('').slice(0,2);
    $$('.side .who b').forEach(el => el.textContent = p.name);
    const greet = $('.view[data-view=home] .page-h h1'); if(greet) greet.textContent = `Good morning, ${first}`;
    const greet2 = $('.view[data-view=offline] .page-h h1'); if(greet2) greet2.textContent = `Good morning, ${first}`;
    const profName = $('.view[data-view=profile] h2.h3'); if(profName) profName.textContent = p.name;
    $$('.view[data-view=profile] .avatar.av-teal').forEach(a => { if(a.style.width === '74px') a.textContent = ini; });
    const who = $('.side .who .avatar'); if(who) who.textContent = ini;
    const meta = $('.view[data-view=profile] .mid.fs14');
    if(meta) meta.textContent = `${new Date().getFullYear() - new Date(p.dob).getFullYear()} y · ${p.height} cm · ${p.weight} kg · BMI ${bmi()} · ${p.blood}`;

    /* medical history card */
    const hist = findCard('Medical history');
    if(hist){
      const body = hist.querySelectorAll('.lrow, .hr-scan, .caption, .row');
      [...body].forEach(n => n.remove());
      const html = db.conditions.map(c => `<div class="lrow"><span class="lic" style="background:var(--amber-soft);width:34px;height:34px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94600B" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
        <div><b class="fs14">${c.c}</b>${c.y ? `<div class="fs12 muted">diagnosed ${c.y}</div>` : ''}</div></div>`).join('');
      hist.insertAdjacentHTML('beforeend', html + `<p class="small mt2">Only add conditions diagnosed by a healthcare professional. CardioCore does not diagnose.</p>`);
    }
    /* medications list */
    const medCard = findCard('Current medications');
    if(medCard){
      [...medCard.querySelectorAll('.lrow')].forEach(n => n.remove());
      medCard.insertAdjacentHTML('beforeend', db.meds.map((m,i) => {
        const taken = db.taken['m' + i];
        return `<div class="lrow" style="padding:14px 0">
          <span class="lic" style="background:var(--teal-soft);width:42px;height:42px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M12 8v9"/></svg></span>
          <div class="grow"><div class="row gap8 wrapf"><b>${m.name} ${m.dose}</b>
            <span class="chip ${taken?'neutral':'attention'}">${taken?'taken today':'due later'}</span></div>
            <div class="fs12 muted">${m.freq}${m.cls?' · '+m.cls:''}${m.since?' · prescribed '+m.since:''}</div></div>
          <button class="btn xs ghost" data-med="${i}">${taken?'Taken':'Mark taken'}</button></div>`;
      }).join(''));
    }
    /* emergency preferences */
    const emg = findCard('Emergency care preferences');
    if(emg){
      [...emg.querySelectorAll('.kv')].forEach(n => n.remove());
      const e = db.emergency;
      emg.querySelector('.caption').insertAdjacentHTML('afterend',
        `<div class="kv"><span class="mid">Emergency contact</span><b>${e.contact} · ${e.phone.replace(/\d{2}(?=\d{4})/g,'••')}</b></div>
         <div class="kv"><span class="mid">Preferred hospital</span><b>${e.hospital}</b></div>
         <div class="kv"><span class="mid">Preferred doctor</span><b>${e.doctor}</b></div>
         <div class="kv"><span class="mid">Automatic urgent booking</span><b class="${e.autoBook?'greenc':'muted'}">${e.autoBook?'ON':'OFF'}</b></div>
         <div class="kv"><span class="mid">Share data in emergency</span><b class="${e.shareEmg?'greenc':'muted'}">${e.shareEmg?'ON':'OFF'}</b></div>
         <div class="kv"><span class="mid">Notify emergency contact</span><b class="${e.notify?'greenc':'muted'}">${e.notify?'ON':'OFF'}</b></div>`);
    }
    /* next appointment card */
    const b = db.bookings[0];
    if(b){
      const card = findCard('Next appointment');
      if(card){
        card.innerHTML = `<div class="caption mb2">Next appointment</div>
          <div class="row gap12 mb2"><span class="avatar av-teal">${b.doctor.split(' ').slice(-1)[0].slice(0,1)}${b.doctor.split(' ')[1]?.[0]||''}</span>
            <div><b>${b.doctor}</b><div class="fs12 muted">${b.spec}</div></div></div>
          <div class="card flat" style="background:var(--surface-2);padding:14px">
            <div class="row row-b"><span class="mid fs14">${b.when}</span><span class="chip stable"><span class="dot"></span> Confirmed</span></div>
            <div class="fs12 muted mt1">${b.mode} · booking ${b.ref}</div></div>
          <div class="row gap8 mt2"><button class="btn sm grow" onclick="CC.joinVideo()">Join video</button>
            <button class="btn sm ghost grow" data-pview="appts">Details</button></div>
          <p class="small mt2">Your baseline summary and 3 recent ECG strips will be shared per your consent settings.</p>`;
        CC.wire(card);
      }
    }
    renderLipids(); renderSymptoms(); renderDevice();
  }
  function findCard(title){
    return $$('.card').find(c => c.querySelector('.card-t, .caption')?.textContent.trim() === title) || null;
  }
  const bmi = () => { const p = db.profile; const m = p.height/100; return (p.weight/(m*m)).toFixed(1); };

  /* ─────────────────────────── onboarding ─────────────────────────── */
  const onboarded = () => !!db.onboarded;
  function onbShow(step){
    db.step = step; save();
    $$('#onboard .onb-step').forEach(s => s.classList.toggle('hidden', +s.dataset.step !== step));
    $('#onbCount').textContent = `Step ${step} of 8`;
    $('#onbProgress').style.width = (step/8*100) + '%';
    $('#onbBack').disabled = step === 1;
    $('#onbNext').textContent = step === 8 ? 'Finish setup' : 'Continue';
    $('#onbHint').classList.toggle('hidden', step !== 8);
    window.scrollTo({top:0, behavior:'smooth'});
  }
  function onbStep(dir){
    const cur = db.step;
    if(dir > 0){
      if(cur === 2 && (!$('#obName').value.trim())){ CC.toast('Add a name so we can label your record.','warn'); return; }
      if(cur === 8) return finishOnboarding();
      onbShow(Math.min(8, cur + 1));
      if(cur === 4) renderOnbMeds();
    } else onbShow(Math.max(1, cur - 1));
  }
  function renderOnbMeds(){
    const host = $('#obMedList'); if(!host) return;
    const list = db.meds.length ? db.meds : [];
    host.innerHTML = list.map((m,i) => `<div class="lrow" style="padding:11px 0">
      <span class="lic" style="background:var(--teal-soft)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M12 8v9"/></svg></span>
      <div class="grow"><b class="fs14">${m.name} ${m.dose}</b><div class="fs12 muted">${m.freq}</div></div>
      <button class="btn xs ghost" data-delmed="${i}">Remove</button></div>`).join('')
      || '<p class="mid fs14" style="padding:10px 0">No medications added yet — skip if this doesn\'t apply.</p>';
    $$('[data-delmed]', host).forEach(b => b.onclick = () => { db.meds.splice(+b.dataset.delmed,1); save(); renderOnbMeds(); });
  }
  function addOnbMed(){
    const name = $('#obMedName').value.trim(); if(!name){ CC.toast('Type a medication name first.','warn'); return; }
    db.meds.push({name, dose:$('#obMedDose').value.trim() || '—', freq:$('#obMedFreq').value, cls:'', since:''});
    save(); $('#obMedName').value = ''; $('#obMedDose').value = '';
    renderOnbMeds(); CC.toast(name + ' added to your medication list.','ok');
  }
  function finishOnboarding(){
    const p = db.profile;
    p.name = $('#obName').value.trim() || p.name;
    p.dob = $('#obDob').value; p.sex = $('#obSex').value; p.blood = $('#obBlood').value;
    p.height = +$('#obHeight').value || p.height; p.weight = +$('#obWeight').value || p.weight;
    db.conditions = $$('#obConditions .pick.on').map(b => ({c:b.dataset.c, y:b.dataset.y || null}));
    const other = $('#obOther').value.trim(); if(other) db.conditions.push({c:other, y:null});
    db.labs[0] = {date:$('#obLabDate').value, lab:$('#obLabName').value,
      total:+$('#obChol').value, ldl:+$('#obLdl').value, hdl:+$('#obHdl').value,
      trigs:+$('#obTrigs').value, vldl:+$('#obVldl').value};
    db.family = {father:$('#obFather').value, fatherAge:+$('#obFatherAge').value,
                 mother:$('#obMother').value, sibling:$('#obSibling').value};
    db.emergency = {...db.emergency, contact:$('#obContactName').value, phone:$('#obContactNo').value,
      hospital:$('#obHospital').value, doctor:$('#obDoctor').value,
      autoBook:$('#obAutoBook').checked, shareEmg:$('#obShareEmg').checked, notify:$('#obNotifyContact').checked};
    db.consent = {baseline:$('#obShareBaseline').checked, ecg:$('#obShareEcg').checked,
                  research:$('#obResearch').checked, family:$('#obFamily').checked, twofa:$('#ob2fa').checked};
    db.onboarded = true; save();
    renderStore();
    CC.goP('home');
    CC.toast('Baseline setup complete. Your Twin starts learning from today — insights unlock after 14 days.','ok',6000);
  }
  function skipOnboarding(){
    db.onboarded = true; save();
    CC.goP('home');
    CC.toast('Skipped for now — you can finish setup any time from your profile.','warn',4200);
  }
  function restartOnboarding(){
    CC.go('onboard'); onbShow(1);
    $$('#obConditions .pick').forEach(b => b.classList.toggle('on', db.conditions.some(c => c.c === b.dataset.c)));
    CC.toast('Re-running onboarding. Nothing is deleted — you are editing the same record.','ok');
  }
  function calcBmi(){
    const h = +$('#obHeight').value / 100, w = +$('#obWeight').value;
    if(!h || !w) return;
    const v = (w/(h*h)).toFixed(1);
    $('#obBmi').textContent = v;
    const tag = $('#obBmiTag');
    const state = v < 18.5 ? ['attention','Underweight'] : v < 25 ? ['stable','Normal range']
                  : v < 30 ? ['attention','Slightly high'] : ['urgent','High'];
    tag.className = 'chip ' + state[0];
    tag.innerHTML = `<span class="dot"></span> ${state[1]}`;
  }

  /* ─────────────────────────── command palette ─────────────────────────── */
  let palIdx = 0, palItems = [];
  const ACTIONS = [
    {label:'Record a 30-second ECG', hint:'Action · patient', icon:'M2 12h4l2-5 3 10 3-8 2 3h6', run:()=>{CC.goP('ecg');CC.startEcg();}},
    {label:'Book an appointment', hint:'Action · patient', icon:'M12 5v14M5 12h14', run:()=>CC.bookModal()},
    {label:'Share data with Dr Raghavan', hint:'Action · consent', icon:'M4 12v7h16v-7M12 3v12M8 11l4 4 4-4', run:()=>CC.shareModal()},
    {label:'Log a symptom', hint:'Action · patient', icon:'M12 5v14M5 12h14', run:()=>CC.symptomModal()},
    {label:'Add a lab result', hint:'Action · patient', icon:'M12 5v14M5 12h14', run:()=>CC.addLabModal()},
    {label:'Simulate going offline', hint:'Action · device', icon:'M5 12h14', run:()=>CC.toggleOnline()},
    {label:'Toggle dark theme', hint:'Action · appearance', icon:'M12 4V2M12 22v-2M4 12H2M22 12h-2', run:toggleTheme},
    {label:'Open the urgent assessment (Level 3)', hint:'Action · demo', icon:'M12 3 2.5 20h19L12 3z', run:()=>CC.urgentModal()},
    {label:'Export health record as PDF', hint:'Action · record', icon:'M12 3v12M8 11l4 4 4-4M4 21h16', run:()=>printReport('record')},
    {label:'Generate clinician handover', hint:'Action · clinician', icon:'M6 3h9l4 4v14H6z', run:()=>CC.goD('handover')}
  ];
  function palette(query = ''){
    const scrim = $('#paletteScrim'), input = $('#paletteInput'), list = $('#paletteList');
    if(!scrim) return;
    scrim.classList.remove('hidden');
    input.value = query; input.focus();
    paintPalette(query);
    palIdx = 0; markPal();
  }
  function closePalette(){ $('#paletteScrim')?.classList.add('hidden'); }
  function paintPalette(q){
    const list = $('#paletteList'); if(!list) return;
    const ql = q.trim().toLowerCase();
    const hit = t => !ql || t.toLowerCase().includes(ql);
    const hl = t => ql ? t.replace(new RegExp('('+ql.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'), '<mark>$1</mark>') : t;
    const groups = [];

    const views = [
      ['home','Home & state','Cardiovascular state, vitals, live ECG'],['health','Health & trends','Resting HR, HRV, SpO₂, temperature'],
      ['ecg','ECG lab','Record and review strips'],['twin','Digital Twin','Contributions and recalibrations'],
      ['alerts','Alert centre','Levels 1–3'],['notifications','Notifications','Everything you were told'],
      ['appts','Appointments','Book, join, history'],['meds','Medications','Doses and adherence'],
      ['records','Health record','History, labs, family'],['lipids','Lipid profile','LDL, HDL, cholesterol, triglycerides'],
      ['marker','LDL cholesterol detail','Result, reference range, four-report trend'],
      ['symptoms','Symptom log','How you felt, timestamped'],['device','Device & sync','Battery, firmware, quality'],
      ['profile','Profile & consent','Privacy, emergency preferences']
    ].map(([v,t,s]) => ({label:t, hint:'Patient view · '+s, icon:'M4 11 12 4l8 7v9H4z', run:()=>CC.goP(v), hay:v+' '+t+' '+s}));
    const dviews = [
      ['roster','Triage roster','Ranked by alert level'],['appts','Appointments','Today and upcoming'],
      ['patients','Patients','Consented cohort'],['review','ECG review','Pending strips'],
      ['messages','Messages','Secure in-record'],['analytics','Analytics','Cohort metrics'],
      ['schedule','Availability','Weekly template'],['handover','Handover & referral','Printable summary'],
      ['dprofile','Profile & credentials','Registration and audit']
    ].map(([v,t,s]) => ({label:t, hint:'Clinician view · '+s, icon:'M9 3v4a3 3 0 0 0 6 0V3M12 10v3a5 5 0 0 0 5 5h1', run:()=>CC.goD(v), hay:v+' '+t+' '+s}));

    const people = [];
    const P = CC._patients || {};
    Object.entries(P).forEach(([id,p]) => people.push({
      label:p.name, hint:`Patient · ${p.levelTxt} · ${p.meta.split('·')[0].trim()}`,
      icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6',
      run:()=>{ CC.goD('roster'); CC.openPatient(id); }, hay:id+' '+p.name+' '+p.meta+' '+p.levelTxt
    }));
    [['Dr Neha Raghavan','Cardiology · Meridian Heart Institute'],['Dr Samuel Okafor','Electrophysiology · Northbridge Clinic'],
     ['Dr Amara Khan','Preventive cardiology · City Care'],['Dr Luca Moretti','General cardiology · Riverside']]
      .forEach(([n,h]) => people.push({label:n, hint:'Clinician · '+h, icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6',
        run:()=>{CC.goP('appts'); CC.bookModal(null, n);}, hay:n+' '+h}));

    const acts = ACTIONS.map(a => ({...a, hay:a.label+' '+a.hint+' '+a.label.split(' ').join('')}));

    if(views.filter(v => hit(v.hay)).length) groups.push(['Patient', views.filter(v => hit(v.hay))]);
    if(dviews.filter(v => hit(v.hay)).length) groups.push(['Clinician', dviews.filter(v => hit(v.hay))]);
    if(people.filter(v => hit(v.hay)).length) groups.push(['People', people.filter(v => hit(v.hay)).slice(0,6)]);
    if(acts.filter(v => hit(v.hay)).length) groups.push(['Actions', acts.filter(v => hit(v.hay))]);

    palItems = groups.flatMap(([,items]) => items);
    if(!palItems.length){
      list.innerHTML = `<div class="palette-empty">Nothing matched <b>“${q}”</b>.<br><span class="fs12">Try a patient name, MRN, “LDL”, “ECG”, or “offline”.</span></div>`;
      return;
    }
    list.innerHTML = groups.map(([title, items]) => `<div class="pgroup">${title}</div>` + items.map(it => {
      const i = palItems.indexOf(it);
      return `<div class="pitem" data-i="${i}">
        <span class="pic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E9E9E" stroke-width="2.2" stroke-linecap="round"><path d="${it.icon}"/></svg></span>
        <div class="grow"><b>${hl(it.label)}</b><span>${it.hint}</span></div>
        <span class="kbd">↵</span></div>`;
    }).join('')).join('');
    $$('#paletteList .pitem').forEach(el => {
      el.onmouseenter = () => { palIdx = +el.dataset.i; markPal(); };
      el.onclick = () => { const it = palItems[+el.dataset.i]; closePalette(); it.run(); };
    });
  }
  function markPal(){
    $$('#paletteList .pitem').forEach(el => el.classList.toggle('on', +el.dataset.i === palIdx));
    const on = $('#paletteList .pitem.on'); if(on) on.scrollIntoView({block:'nearest'});
  }

  /* ─────────────────────────── modals: lab, symptom, share-symptom ─────────────────────────── */
  function addLabModal(){
    CC.modal({title:'Add a lab result', sub:'Lab data · entered manually',
      body:`<div class="info-note mb3">These are laboratory results, not wearable measurements. Reference ranges are general guidance — your clinician sets the targets that apply to you.</div>
        <div class="grid g2" style="gap:14px">
          <div class="field"><label>Report date</label><input class="input" id="labDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="field"><label>Laboratory</label><input class="input" id="labName" value="Apollo Diagnostics"></div>
          <div class="field"><label>Total cholesterol (mg/dL)</label><input class="input" id="labTotal" type="number" value="${db.labs[0].total}"></div>
          <div class="field"><label>LDL cholesterol (mg/dL) · target &lt; 100</label><input class="input" id="labLdl" type="number" value="${db.labs[0].ldl}"></div>
          <div class="field"><label>HDL cholesterol (mg/dL) · adequate &gt; 40</label><input class="input" id="labHdl" type="number" value="${db.labs[0].hdl}"></div>
          <div class="field"><label>Triglycerides (mg/dL) · borderline &lt; 150</label><input class="input" id="labTrigs" type="number" value="${db.labs[0].trigs}"></div>
        </div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
              <button class="btn" onclick="X.saveLab()">Save result</button>`});
  }
  function saveLab(){
    db.labs.unshift({date:$('#labDate').value, lab:$('#labName').value, total:+$('#labTotal').value,
      ldl:+$('#labLdl').value, hdl:+$('#labHdl').value, trigs:+$('#labTrigs').value, vldl:Math.round(+$('#labTrigs').value/5)});
    save(); CC.closeModal(); renderStore(); if($('.view[data-view=lipids]').classList.contains('on')) CC.drawAll(document);
    CC.toast('Lab result saved. Lipid trends updated — this is lab information, not a wearable measurement.','ok',5200);
  }
  function symptomModal(){
    CC.modal({title:'Log a symptom', sub:'Symptom log',
      body:`<div class="warn-note mb3">Chest pain, severe breathlessness or fainting are emergencies — call local emergency services, do not log them here first.</div>
        <div class="field"><label>What did you feel?</label>
          <select class="input" id="symType"><option>Light-headedness</option><option>Palpitations</option><option>Chest tightness</option><option>Shortness of breath on stairs</option><option>Swelling in ankles</option><option>Fatigue</option><option>Other</option></select></div>
        <div class="field"><label>Severity — 1 mild, 5 severe</label>
          <div class="row gap8" id="symSev">${[1,2,3,4,5].map(n => `<button class="tab ${n===2?'on':''}" data-sev="${n}">${n}</button>`).join('')}</div></div>
        <div class="grid g2" style="gap:14px">
          <div class="field"><label>When</label><input class="input" id="symWhen" type="datetime-local" value="${new Date().toISOString().slice(0,16)}"></div>
          <div class="field"><label>Duration</label>
            <select class="input" id="symDur"><option>Minutes</option><option>Under an hour</option><option>Hours</option><option>Most of the day</option></select></div>
        </div>
        <div class="field"><label>Note (optional)</label><textarea class="input" rows="3" style="resize:vertical" id="symNote" placeholder="What were you doing? Anything that helped?"></textarea></div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
              <button class="btn" onclick="X.saveSymptom()">Save entry</button>`});
    $$('#symSev .tab').forEach(b => b.onclick = () => { $$('#symSev .tab').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  }
  function saveSymptom(){
    const sev = +($('#symSev .tab.on')?.dataset.sev || 2);
    db.symptoms.push({id:Date.now(), when:$('#symWhen').value || new Date().toISOString().slice(0,16),
      type:$('#symType').value, sev, note:$('#symNote').value.trim(), linked:sev >= 2});
    save(); CC.closeModal(); renderSymptoms(); CC.goP('symptoms');
    CC.toast('Symptom saved and timestamped against your signals.','ok');
  }
  function shareSymptom(id){
    const s = db.symptoms.find(x => x.id === id);
    CC.modal({title:'Share this entry?', sub:'Consent · symptom log',
      body:`<p class="mid fs14 mb3">Sending <b>${s.type}</b> (${fmtDate(s.when)}, severity ${s.sev}/5) to Dr Neha Raghavan, together with the measurements recorded in the same window.</p>
        <div class="lrow"><div class="grow"><b class="fs14">Include the ±30 minute signal window</b><div class="fs12 muted">HR, HRV, SpO₂, temperature</div></div><input type="checkbox" checked style="accent-color:var(--teal);width:20px;height:20px"></div>
        <div class="lrow"><div class="grow"><b class="fs14">Include medications taken that day</b><div class="fs12 muted">Doses and timing</div></div><input type="checkbox" checked style="accent-color:var(--teal);width:20px;height:20px"></div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
              <button class="btn" onclick="CC.closeModal();CC.toast('Symptom entry shared with Dr Neha Raghavan.','ok')">Share entry</button>`});
  }

  /* ─────────────────────────── device, sync, offline ─────────────────────────── */
  function syncNow(){
    if(!db.online){ CC.toast('Still offline — the band keeps recording locally.','warn'); return; }
    CC.toast('Syncing… 12 measurements uploaded in order.','ok',2400);
    setTimeout(()=>{ const el = $('#lastSync'); if(el) el.textContent = 'just now'; CC.toast('Sync complete. Insights resumed.','ok'); }, 1900);
  }
  function toggleOnline(){
    db.online = !db.online; save();
    const banner = $('#netBanner');
    banner?.classList.toggle('hidden', db.online);
    renderDevice();
    if(!db.online){
      if(!$('#app-doctor').classList.contains('hidden')) CC.toast('Clinician views keep working offline for records already loaded.','warn');
      CC.goP('offline');
      CC.toast('Offline mode simulated — nothing is lost, the band buffers locally.','warn',4200);
    } else {
      CC.goP('device');
      CC.toast('Back online. 12 buffered measurements synced.','ok');
    }
  }

  /* ─────────────────────────── bookings persistence ─────────────────────────── */
  const _confirm = CC.confirmBooking;
  CC.confirmBooking = function(){
    const sel = $('#bkDoc')?.value || 'Dr Neha Raghavan';
    const doctor = sel.split('—')[0].trim();
    const spec = (sel.split('—')[1] || ' cardiology').trim() + ' · Meridian Heart Institute';
    const slot = $$('.modal .tab.on').map(t => t.textContent.trim())[0] || 'Tue 6 Oct · 10:30';
    db.bookings.unshift({doctor, spec, when:slot.includes('Oct') ? slot : 'Tue 6 Oct · ' + slot,
      mode:'In-person', ref:'CC-' + (48120 + db.bookings.length + 1)});
    save();
    return _confirm.apply(this, arguments);
  };
  const _afterModal = CC.afterModal;
  CC.afterModal = function(box){
    _afterModal?.(box);
    trapFocus(box);
  };

  /* ─────────────────────────── print / PDF report ─────────────────────────── */
  function printReport(kind = 'record'){
    const host = $('#printReport'); if(!host) return;
    const p = db.profile, e = db.emergency, l = db.labs[0];
    const head = (title, sub) => `<div class="print-h">
      <div><h1>CardioCore — ${title}</h1><div style="font-size:12px;color:#6E9A9E">${sub}</div></div>
      <div style="text-align:right;font-size:11px;color:#6E9A9E">Generated ${fmtDate(new Date().toISOString())} ${fmtTime(new Date().toISOString())}<br>
      Monitoring support — not a diagnostic device</div></div>`;
    const row = (k,v) => `<div class="print-row"><span>${k}</span><b>${v}</b></div>`;
    const box = (h, body) => `<div class="print-box"><h4>${h}</h4>${body}</div>`;
    const foot = `<p class="print-note">This report is generated from patient-entered data and wearable measurements processed by CardioCore.
      It is monitoring support only. It does not diagnose conditions and does not replace a healthcare professional.
      Interpretation, diagnosis and treatment decisions remain clinical decisions.</p>`;

    if(kind === 'lipids'){
      host.innerHTML = head('Lipid history', `${p.name} · ${p.sex} · DOB ${fmtDate(p.dob)}`) +
        `<table class="print-table"><thead><tr><th>Date</th><th>Laboratory</th><th>Total</th><th>LDL</th><th>HDL</th><th>Triglycerides</th><th>VLDL</th></tr></thead><tbody>` +
        db.labs.map(x => `<tr><td>${fmtDate(x.date)}</td><td>${x.lab}</td><td>${x.total}</td><td>${x.ldl}</td><td>${x.hdl}</td><td>${x.trigs}</td><td>${x.vldl}</td></tr>`).join('') +
        `</tbody></table><div class="print-grid">${box('Clinician targets', row('LDL target','< 100 mg/dL') + row('Non-HDL target','< 130 mg/dL') + row('Set by','Dr Neha Raghavan · 12 Jun 2026'))}
        ${box('Note', '<div style="font-size:12px;color:#37646A">LDL has stayed above target across four reports. Lab values are entered manually and are distinct from wearable measurements.</div>')}</div>` + foot;
    } else if(kind === 'handover'){
      const id = $('#handoverPatient')?.value || 'aarav';
      const pt = CC._patients[id];
      host.innerHTML = head('Clinical handover', `${pt.name} · ${pt.meta} · prepared by Dr Neha Raghavan (MMC-2010-44821)`) +
        `<div class="print-grid">
          ${box('Current state', row('Alert level', pt.levelTxt) + row('Heart rate', pt.hr + ' bpm (' + pt.hrNote + ')') +
            row('HRV', pt.hrv + ' ms (' + pt.hrvNote + ')') + row('SpO₂', pt.spo2 + '% (' + pt.spo2Note + ')'))}
          ${box('Why this was raised', `<div style="font-size:12px;color:#37646A">${pt.why}</div>`)}
          ${box('Clinical context', row('Conditions', pt.cond) + row('Medications', pt.meds) + row('Labs', pt.labs))}
          ${box('Consent scope', `<div style="font-size:12px;color:#37646A">${pt.consent}</div>`)}
        </div>` + foot;
    } else {
      host.innerHTML = head('Health record summary', `${p.name} · ${p.sex} · DOB ${fmtDate(p.dob)} · ${p.height} cm · ${p.weight} kg · BMI ${bmi()} · ${p.blood}`) +
        `<div class="print-grid">
          ${box('Cardiovascular state', row('State index','82 / 100 · Stable') + row('Baseline window','90 days · 1.42 M beats') +
            row('Resting heart rate','68 bpm (baseline 69)') + row('HRV','48 ms (7% below average)') + row('SpO₂ / temp','98% · 36.6 °C'))}
          ${box('Active alerts', row('Level 3','1 · 28 Sep 2026 (reviewed)') + row('Level 2','2 · HR drift, HRV decline') + row('Level 1','6 · informational'))}
          ${box('Medical history', (db.conditions.map(c => row(c.c, c.y ? 'diagnosed ' + c.y : 'reported')).join('') || row('Recorded','none')) )}
          ${box('Medications', db.meds.map(m => row(`${m.name} ${m.dose}`, m.freq)).join(''))}
          ${box('Latest lipids', row('Total cholesterol', money(l.total)) + row('LDL', money(l.ldl) + ' (target < 100)') + row('HDL', money(l.hdl)) + row('Triglycerides', money(l.trigs)) + row('Reported', fmtDate(l.date) + ' · ' + l.lab))}
          ${box('Emergency preferences', row('Contact', e.contact + ' · ' + e.phone) + row('Preferred hospital', e.hospital) + row('Preferred doctor', e.doctor) + row('Automatic booking', e.autoBook ? 'ON' : 'OFF'))}
        </div>` + foot;
    }
    CC.toast('Print view prepared — choose “Save as PDF” in the print dialog.','ok');
    setTimeout(() => window.print(), 350);
  }

  /* ─────────────────────────── cohort filtering (clinician) ─────────────────────────── */
  function wireCohorts(){
    $$('[data-cohort]').forEach(tab => {
      if(tab.dataset.wiredCohort) return; tab.dataset.wiredCohort = '1';
      tab.addEventListener('click', () => {
        const key = tab.dataset.cohort;
        $$('[data-cohort]').forEach(t => t.classList.toggle('on', t === tab));
        let shown = 0;
        $$('.view[data-view=patients] tbody tr').forEach(tr => {
          const tags = (tr.dataset.cohort || '').split(' ');
          const match = key === 'all' || tags.includes(key);
          tr.style.display = match ? '' : 'none';
          if(match) shown++;
        });
        const cnt = $('#cohortCount'); if(cnt) cnt.textContent = shown + ' patients';
      });
    });
  }

  /* ─────────────────────────── handover sheet (screen) ─────────────────────────── */
  function handover(){
    const host = $('#handoverSheet'); if(!host) return;
    const id = $('#handoverPatient')?.value || 'aarav';
    const p = CC._patients[id];
    const tone = {urgent:'var(--red)', attention:'var(--amber)', stable:'var(--green)', neutral:'var(--muted)'}[p.level];
    host.innerHTML = `
      <div class="row row-b wrapf gap16 mb3">
        <div class="row gap12">
          <span class="avatar ${p.av}" style="width:52px;height:52px;border-radius:16px;font-size:17px">${p.ini}</span>
          <div><h2 class="h3">${p.name}</h2><div class="fs13 mid">${p.meta}</div></div>
        </div>
        <div class="center">
          <div class="caption">Alert level</div>
          <span class="chip ${p.level === 'neutral' ? 'neutral' : p.level}"><span class="dot"></span> ${p.levelTxt}</span>
        </div>
      </div>
      <div class="grid g3 mb3" style="gap:12px">
        <div class="card flat" style="background:var(--surface-2);padding:14px;border-left:3px solid ${tone}"><div class="caption">Heart rate</div><b class="fs14">${p.hr} bpm</b><div class="fs12 muted">${p.hrNote}</div></div>
        <div class="card flat" style="background:var(--surface-2);padding:14px"><div class="caption">HRV</div><b class="fs14">${p.hrv} ms</b><div class="fs12 muted">${p.hrvNote}</div></div>
        <div class="card flat" style="background:var(--surface-2);padding:14px"><div class="caption">SpO₂</div><b class="fs14">${p.spo2}%</b><div class="fs12 muted">${p.spo2Note}</div></div>
      </div>
      <div class="caption mb1">Why this was raised</div>
      <p class="fs14 mid mb3">${p.why}</p>
      <div class="caption mb1">Clinical context</div>
      <div class="kv"><span class="mid">Conditions</span><b class="fs13" style="text-align:right;max-width:60%">${p.cond}</b></div>
      <div class="kv"><span class="mid">Medications</span><b class="fs13" style="text-align:right;max-width:60%">${p.meds}</b></div>
      <div class="kv"><span class="mid">Labs</span><b class="fs13" style="text-align:right;max-width:60%">${p.labs}</b></div>
      <div class="caption mt3 mb1">Consent scope for this handover</div>
      <p class="fs13 mid">${p.consent}</p>
      <div class="info-note mt3">Prepared by Dr Neha Raghavan · registration MMC-2010-44821 · ${fmtDate(new Date().toISOString())}. This handover is logged and visible to the patient.</div>`;
  }

  /* ─────────────────────────── accessibility ─────────────────────────── */
  let lastFocus = null;
  function trapFocus(box){
    lastFocus = document.activeElement;
    const focusables = () => $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', box)
      .filter(el => !el.disabled && el.offsetParent !== null);
    const first = focusables()[0];
    if(first && !box.contains(document.activeElement)) setTimeout(() => first.focus(), 60);
    if(box.dataset.trapped) return;
    box.dataset.trapped = '1';
    box.addEventListener('keydown', e => {
      if(e.key !== 'Tab') return;
      const f = focusables(); if(!f.length) return;
      const firstEl = f[0], lastEl = f[f.length - 1];
      if(e.shiftKey && document.activeElement === firstEl){ e.preventDefault(); lastEl.focus(); }
      else if(!e.shiftKey && document.activeElement === lastEl){ e.preventDefault(); firstEl.focus(); }
    });
  }
  function initA11y(){
    document.body.insertAdjacentHTML('afterbegin',
      '<a href="#" class="skip-link" onclick="const m=document.querySelector(\'.view.on, #site\'); if(m){m.setAttribute(\'tabindex\',\'-1\');m.focus();} return false;">Skip to content</a>');
    /* mark the active sidebar item for screen readers */
    const mark = () => {
      $$('.nav-item').forEach(n => n.removeAttribute('aria-current'));
      const on = $('.nav-item.on'); if(on) on.setAttribute('aria-current', 'page');
    };
    mark();
    document.addEventListener('click', e => {
      if(e.target.closest('.nav-item')) setTimeout(mark, 10);
    });
    $$('.menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    $$('canvas[data-chart]').forEach(cv => cv.setAttribute('role', 'img'));
  }

  /* ─────────────────────────── global keys + wiring ─────────────────────────── */
  function init(){
    applyTheme(db.theme || 'light');
    $('#onbProgress') && onbShow(db.step || 1);
    $$('#obConditions .pick').forEach(b => {
      b.classList.toggle('on', db.conditions.some(c => c.c === b.dataset.c));
      b.addEventListener('click', () => b.classList.toggle('on'));
    });
    renderOnbMeds();
    renderStore(); renderNotifications(); handover(); wireCohorts(); initA11y();

    /* palette */
    document.addEventListener('keydown', e => {
      const meta = e.metaKey || e.ctrlKey;
      if(meta && e.key.toLowerCase() === 'k'){ e.preventDefault(); palette(); return; }
      if(e.key === 'Escape'){ closePalette(); return; }
      if(e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)){
        e.preventDefault(); palette(); return;
      }
      if($('#paletteScrim') && !$('#paletteScrim').classList.contains('hidden')){
        if(e.key === 'ArrowDown'){ e.preventDefault(); palIdx = Math.min(palIdx+1, palItems.length-1); markPal(); }
        if(e.key === 'ArrowUp'){ e.preventDefault(); palIdx = Math.max(palIdx-1, 0); markPal(); }
        if(e.key === 'Enter'){ e.preventDefault(); const it = palItems[palIdx]; closePalette(); it?.run(); }
      }
    });
    $('#paletteInput')?.addEventListener('input', e => { palIdx = 0; paintPalette(e.target.value); markPal(); });
    $('#paletteScrim')?.addEventListener('click', e => { if(e.target.id === 'paletteScrim') closePalette(); });

    /* notification + lipid + patient doc filters */
    $$('[data-nfilter]').forEach(t => t.addEventListener('click', () => {
      $$('[data-nfilter]').forEach(x => x.classList.toggle('on', x === t));
      renderNotifications(t.dataset.nfilter);
    }));
    $$('[data-lipid]').forEach(t => t.addEventListener('click', () => {
      $$('[data-lipid]').forEach(x => x.classList.toggle('on', x === t));
      setLipidSeries(t.dataset.lipid);
      const cv = document.querySelector('canvas[data-chart=lipidOverlay]');
      if(cv){ delete cv.dataset.painted; }                    /* force a repaint with the new series */
      CC.drawAll(document);
    }));

    /* medication "mark taken" + consent/notification toggles + prefs */
    document.addEventListener('click', e => {
      const med = e.target.closest('[data-med]');
      if(med){
        const i = med.dataset.med, key = 'm' + i;
        db.taken[key] = !db.taken[key]; save();
        med.textContent = db.taken[key] ? 'Taken' : 'Mark taken';
        med.classList.toggle('ghost', !db.taken[key]);
        const taken = Object.values(db.taken).filter(Boolean).length;
        CC.toast(db.taken[key] ? 'Dose marked as taken.' : 'Dose marked as not taken yet.', db.taken[key] ? 'ok' : 'warn');
        return;
      }
    });
    $$('[data-pref]').forEach(cb => cb.addEventListener('change', () => { db.prefs[cb.dataset.pref] = cb.checked; save(); }));
    $$('.view[data-view=profile] input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
      save(); CC.toast('Consent updated. Every change is timestamped in your ledger.','ok',3200);
    }));

    /* charts: add the hover readouts once canvases exist */
    setTimeout(chartTooltip, 300);

    /* keep the print host fresh */
    window.addEventListener('beforeprint', () => { if(!$('#printReport').innerHTML.trim()) printReport('record'); });
  }
  document.addEventListener('DOMContentLoaded', init);

  return {store:db, save, applyTheme, toggleTheme, onboarded, onbShow, onbStep, skipOnboarding,
          restartOnboarding, calcBmi, addOnbMed, finishOnboarding, renderOnbMeds,
          palette, closePalette, markAllRead, renderNotifications, renderLipids, renderSymptoms,
          renderDevice, renderStore, addLabModal, saveLab, symptomModal, saveSymptom, shareSymptom,
          syncNow, toggleOnline, printReport, handover, wireCohorts, bmi, setLipidSeries};
})();

/* markup calls everything through CC — publish the extras API there too */
if (typeof window !== 'undefined') window.X = X;
Object.assign(CC, X);
