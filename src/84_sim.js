/* ═══════════════════════════════════════════════════════════
   CardioCore · Sim   —  device bench + day in review
   Drives the real screens: vitals, state index, live ECG.
   ═══════════════════════════════════════════════════════════ */
const Sim = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ─────────────── scenarios ─────────────── */
  const SCENARIOS = {
    rest:       { hr:72, hrv:52, spo2:98, temp:36.6, motion:'very low',  posture:'Seated',
                  note:'Reading, still. Signal quality good across ECG and PPG.' },
    walk:       { hr:104, hrv:34, spo2:97, temp:36.9, motion:'moderate', posture:'Upright',
                  note:'Walking — a rise during activity is expected and is excluded from resting comparisons.' },
    sleep:      { hr:54, hrv:62, spo2:97, temp:36.2, motion:'none',     posture:'Lying',
                  note:'Asleep. Rate and HRV sit inside your usual overnight range.' },
    stress:     { hr:88, hrv:36, spo2:98, temp:36.7, motion:'low',      posture:'Seated',
                  note:'Psychological stress: rate up, HRV down — expected physiology, not an arrhythmia.' },
    arrhythmia: { hr:141, hrv:19, spo2:94, temp:36.8, motion:'moderate', posture:'Seated',
                  note:'Sustained rise at rest with reduced variability. Two of four urgent gates satisfied.' },
    recovery:   { hr:64, hrv:56, spo2:98, temp:36.5, motion:'low',      posture:'Seated',
                  note:'Recovery: the Twin tracks the return to baseline rather than judging the peak.' },
  };
  const BASE = { hr:69, hrv:52, spo2:98, temp:36.6 };
  let scenario = 'rest', elapsed = 0, running = false, timer = null;
  const hist = { hr:[], hrv:[], spo2:[], temp:[] };
  const state = { hr:72, hrv:52, spo2:98, temp:36.6 };
  let drive = false;

  const now = () => `${String(Math.floor(elapsed / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`;

  function log(kind, text){
    const host = $('#simLog'); if(!host) return;
    const ev = document.createElement('div');
    ev.className = 'ev ' + kind;
    ev.innerHTML = `<span class="t">${now()}</span><span>${text}</span>`;
    host.prepend(ev);
    while(host.children.length > 40) host.lastChild.remove();
  }

  function paintSparks(){
    [['hr','#0E9E9E','simHRc'],['hrv','#7A6BF0','simHRVc'],['spo2','#12A6CF','simSpO2c'],['temp','#12A06A','simTempc']]
      .forEach(([k, color, id]) => {
        const cv = document.getElementById(id); if(!cv) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = 300, h = 52;
        if(cv.width !== w * dpr){ cv.width = w * dpr; cv.height = h * dpr; }
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const v = hist[k]; if(v.length < 2) return;
        const mn = Math.min(...v), mx = Math.max(...v), sp = (mx - mn) || 1;
        const X = i => i * w / (v.length - 1), Y = n => 6 + (1 - (n - mn) / sp) * (h - 16);
        const path = new Path2D();
        v.forEach((n, i) => i ? path.lineTo(X(i), Y(n)) : path.moveTo(X(i), Y(n)));
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke(path);
        ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.stroke(path);
        ctx.beginPath(); ctx.arc(X(v.length - 1), Y(v[v.length - 1]), 3.4, 0, 7);
        ctx.fillStyle = color; ctx.fill();
      });
  }

  function paint(){
    const s = SCENARIOS[scenario];
    $('#simHR').textContent = Math.round(state.hr);
    $('#simHRV').textContent = Math.round(state.hrv);
    $('#simSpO2').textContent = Math.round(state.spo2);
    $('#simTemp').textContent = state.temp.toFixed(1);
    $('#simNote').textContent = s.note;
    $('#simMotionTxt').textContent = s.motion;
    $('#simPosture').textContent = s.posture;
    const hrDev = Math.round(state.hr - BASE.hr);
    $('#simHRDev').textContent = (hrDev >= 0 ? '+' : '') + hrDev + ' bpm';
    $('#simHRDev').className = Math.abs(hrDev) > 20 ? 'redc b700' : Math.abs(hrDev) > 8 ? 'amberc b700' : 'greenc b700';
    const hrvDev = Math.round((state.hrv - BASE.hrv) / BASE.hrv * 100);
    $('#simHRVDev').textContent = Math.abs(hrvDev) < 6 ? 'within range' : (hrvDev > 0 ? '+' : '') + hrvDev + '% vs baseline';
    $('#simHRVDev').className = hrvDev <= -20 ? 'redc b700' : hrvDev <= -6 ? 'amberc b700' : 'greenc b700';
    $('#simSpO2Dev').textContent = state.spo2 < 95 ? 'desaturation' : 'no desaturation';
    $('#simSpO2Dev').className = state.spo2 < 95 ? 'amberc b700' : 'greenc b700';
    $('#simTempDev').textContent = Math.abs(state.temp - BASE.temp) > 0.7 ? 'elevated' : 'stable';
    $('#simTempDev').className = Math.abs(state.temp - BASE.temp) > 0.7 ? 'amberc b700' : 'greenc b700';

    /* gates */
    const quality = scenario === 'arrhythmia' ? 0.94 : 0.96;
    $('#simQuality').innerHTML = `<span class="dot"></span> quality ${quality.toFixed(2)}`;
    const gate = (id, ok, txt) => { const el = $(id); if(!el) return;
      el.className = 'chip ' + (ok === true ? 'stable' : ok === 'warn' ? 'attention' : 'neutral');
      el.innerHTML = ok === true ? `<span class="dot"></span> ${txt}` : txt; };
    const hrHigh = state.hr >= BASE.hr * 1.3;
    const hrvLow = state.hrv <= BASE.hrv * 0.75;
    const agree = [hrHigh, hrvLow, state.spo2 < 95, Math.abs(state.temp - BASE.temp) > 0.7].filter(Boolean).length;
    gate('#gateQuality', true, 'pass');
    gate('#gateMotion', s.motion === 'very low' || s.motion === 'none' ? true : 'warn',
         s.motion === 'very low' || s.motion === 'none' ? 'pass' : 'motion present');
    gate('#gatePersist', elapsed >= 8 && (hrHigh || hrvLow) ? true : 'neutral', elapsed >= 8 ? 'met' : `${elapsed}/8 min`);
    gate('#gateMulti', agree >= 2 ? true : 'neutral', `${agree} of 4`);

    const urgent = hrHigh && hrvLow && elapsed >= 8;
    $('#simUrgentCard').style.display = urgent ? 'block' : 'none';

    const ecg = $('#simEcg'); if(ecg) ecg.dataset.hr = String(Math.round(state.hr));
    paintSparks();

    if(drive){
      /* Units.write stamps the raw value on the tagged wrapper, so switching unit
         systems later still converts from the measurement — never from a repaint */
      const set = (id, v) => (Units.write ? Units.write(id, v)
                                          : (document.getElementById(id) || {}).textContent = v);
      set('vHR', Math.round(state.hr)); set('vHRV', Math.round(state.hrv));
      set('vSpO2', Math.round(state.spo2)); set('vTemp', state.temp.toFixed(1));
      const chip = $('#vHRChip');
      if(chip){
        const st = Math.abs(state.hr - BASE.hr) > 20 ? ['urgent','Urgent'] : Math.abs(state.hr - BASE.hr) > 8 ? ['attention','Attention'] : ['stable','Stable'];
        chip.className = 'chip ' + st[0];
        chip.innerHTML = `<span class="dot"></span> ${st[1]}`;
      }
      const idx = Math.max(28, Math.min(98, Math.round(92 - Math.abs(state.hr - BASE.hr) * 0.9 - Math.max(0, (BASE.hrv - state.hrv)) * 0.6)));
      $$('[data-twin-index]').forEach(el => { el.textContent = idx; });
      Units.paint();                     /* the bench writes raw values — re-render in the chosen units */
    }
  }

  function tick1s(){
    elapsed++;
    $('#simClock').textContent = now() + ' elapsed';
    const s = SCENARIOS[scenario];
    const ease = 0.28;
    ['hr','hrv','spo2','temp'].forEach(k => {
      const jitter = k === 'temp' ? 0.04 : k === 'spo2' ? 0.25 : 1.6;
      state[k] += (s[k] - state[k]) * ease + (Math.random() - 0.5) * jitter;
    });
    state.hr = Math.max(42, Math.min(186, state.hr));
    state.hrv = Math.max(9, Math.min(96, state.hrv));
    state.spo2 = Math.max(88, Math.min(100, state.spo2));
    state.temp = Math.max(35.2, Math.min(38.4, state.temp));
    ['hr','hrv','spo2','temp'].forEach(k => {
      hist[k].push(state[k]); if(hist[k].length > 40) hist[k].shift();
    });
    if(elapsed % 5 === 0) log('gate', `Quality gate passed · ECG ${(0.93 + Math.random() * 0.04).toFixed(2)} · sample stored`);
    if(scenario === 'arrhythmia' && elapsed === 8) log('alert', 'Two urgent criteria satisfied — alert gates armed (persistence met)');
    if(scenario === 'walk' && elapsed === 4) log('ok', 'Activity detected — the rate rise is attributed to exercise, not raised as an alert');
    if(scenario === 'sleep' && elapsed === 6) log('ok', 'Overnight range confirmed against your personal baseline');
    paint();
  }

  function setScenario(key){
    scenario = key; elapsed = 0;
    $$('#simScenarios .tab').forEach(t => t.classList.toggle('on', t.dataset.scn === key));
    const s = SCENARIOS[key];
    log('gate', `<b>Scenario: ${key}</b> — ${s.note}`);
    if(key === 'arrhythmia') log('warn', 'Observing. Nothing escalates until persistence and agreement gates both pass.');
    paint();
  }
  function reset(){
    ['hr','hrv','spo2','temp'].forEach(k => { hist[k].length = 0; });
    setScenario('rest');
    log('gate', 'Simulator reset to resting state.');
    CC.toast('Bench reset to your resting baseline.','ok');
  }
  function init(){
    if(!$('#simLog')) return;
    $$('#simScenarios .tab').forEach(t => t.onclick = () => setScenario(t.dataset.scn));
    $('#simApply')?.addEventListener('change', e => {
      drive = e.target.checked;
      CC.toast(drive ? 'Simulation now driving Home, Twin index and the live ECG.' : 'Detached from the app screens.', 'ok');
    });
    setScenario('rest');
    $('#simClock').textContent = '00:00 elapsed';
    paint();
    if(!timer) timer = setInterval(tick1s, 1000);
  }

  /* ─────────────── day in review ─────────────── */
  let dayOffset = 0;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayLabel = () => {
    const d = new Date(2026, 9, 4); d.setDate(d.getDate() + dayOffset);
    return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const seeded = () => {
    let s = 977 * (dayOffset + 7);
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };
  function buildDay(){
    const r = seeded();
    const labels = [], vals = [], quality = [];
    for(let h = 0; h < 24; h++){
      for(let q = 0; q < 4; q++){
        const t = h + q / 4;
        let base = 62;
        if(t < 6.5) base = 54;                                   /* asleep */
        else if(t > 6.6 && t < 7.6) base = 104;                   /* walk */
        else if(t > 8 && t < 22) base = 70 + Math.sin(t / 2.1) * 4;
        else base = 64;
        const v = Math.round(base + (r() - 0.5) * 6);
        labels.push(`${String(h).padStart(2,'0')}:${q * 15 ? q * 15 : '00'}`);
        vals.push(v);
        quality.push(r() > 0.035 ? 1 : 0.4);
      }
    }
    return { labels, vals, quality };
  }
  let DAY = buildDay();

  const EVENTS = [
    { at:6.6,  icon:'walk',     title:'Morning walk', detail:'Peak 114 bpm for 11 minutes · attributed to activity, not raised' },
    { at:7.5,  icon:'ecg',      title:'ECG recorded', detail:'30 s · 76 bpm · good quality · saved to your recordings' },
    { at:8.2,  icon:'insight',  title:'HRV insight raised', detail:'Level 2 · 48 ms against a personal average of 52 ms' },
    { at:9.0,  icon:'ecg',      title:'ECG recorded', detail:'30 s · 72 bpm · good quality' },
    { at:13.4, icon:'quality',  title:'6 minutes excluded', detail:'Electrode contact lost while exercising · nothing inferred' },
    { at:16.0, icon:'stable',   title:'Back within baseline', detail:'Informational · no action needed' },
    { at:19.5, icon:'med',      title:'Evening dose logged', detail:'Metformin 500 mg · adherence 96% over 7 days' },
    { at:23.2, icon:'sleep',    title:'Sleep onset detected', detail:'Fell asleep 23:12 · overnight HR range 51–58 bpm' },
  ];
  const hhmm = a => `${String(Math.floor(a)).padStart(2,'0')}:${String(Math.round((a % 1) * 60)).padStart(2,'0')}`;

  const ICONS = {
    walk:'M4 20V8l8-5 8 5v12z', ecg:'M2 12h4l2-5 3 10 3-8 2 3h6',
    insight:'M12 3v2M12 19v2M3 12h2M19 12h2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    quality:'M5 12h14', stable:'M20 6 9 17l-5-5', med:'M3 8h18v9H3zM12 8v9', sleep:'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
  };
  const TONES = { walk:'teal', ecg:'cyan', insight:'amber', quality:'muted', stable:'green', med:'violet', sleep:'violet' };

  function renderDay(){
    const lb = $('#dayLabel'); if(lb) lb.textContent = dayLabel();
    const host = $('#dayEvents');
    if(host){
      host.innerHTML = EVENTS.map(e => {
        const tone = TONES[e.icon] || 'teal';
        const bg = tone === 'muted' ? 'var(--tint)' : `var(--${tone}-soft)`;
        const stroke = tone === 'muted' ? 'var(--muted)' : `var(--${tone === 'teal' ? 'teal' : tone})`;
        return `<div class="lrow" style="align-items:flex-start">
          <span class="lic" style="background:${bg};width:38px;height:38px">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"><path d="${ICONS[e.icon]}"/></svg></span>
          <div class="grow"><div class="row row-b wrapf gap8"><b class="fs14">${e.title}</b><span class="fs12 muted">${hhmm(e.at)}</span></div>
            <div class="fs13 mid">${e.detail}</div></div></div>`;
      }).join('');
    }
    const cv = document.querySelector('canvas[data-chart=day]');
    if(cv){ delete cv.dataset.painted; CC.drawAll(document); }
  }
  function dayShift(n){ dayOffset += n; DAY = buildDay(); renderDay();
    CC.toast(n > 0 ? 'Showing the next day in the same format.' : 'Showing the previous day.', 'ok', 2200); }

  /* custom chart renderer for the 24-hour view */
  CC._renderers.day = function(ctx, w, h, cfg){
    const {PAL, hexA} = CC._helpers;
    const pad = {l:38, r:16, t:22, b:30}, n = cfg.vals.length;
    const mn = Math.min(...cfg.vals) - 6, mx = Math.max(...cfg.vals) + 6;
    const X = i => pad.l + i * (w - pad.l - pad.r) / (n - 1);
    const Y = v => pad.t + (1 - (v - mn) / (mx - mn)) * (h - pad.t - pad.b);

    /* day-part bands */
    const band = (a, b, color, label) => {
      const x0 = X(a / 24 * (n - 1)), x1 = X(b / 24 * (n - 1));
      ctx.fillStyle = color; ctx.fillRect(x0, pad.t, x1 - x0, h - pad.t - pad.b);
      ctx.fillStyle = PAL.axis; ctx.font = '700 10px Manrope, sans-serif';
      ctx.fillText(label, x0 + 6, pad.t + 12);
    };
    band(0, 6.6, hexA('#7A6BF0', .07), 'sleep');
    band(6.6, 8.6, hexA('#12A6CF', .07), 'activity');
    band(22, 24, hexA('#7A6BF0', .07), 'sleep');

    /* excluded minutes */
    cfg.quality.forEach((q, i) => {
      if(q < 1){
        ctx.fillStyle = PAL.empty;
        ctx.fillRect(X(i) - 2, pad.t, 5, h - pad.t - pad.b);
      }
    });

    /* grid + axes */
    ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
    for(let i = 0; i <= 3; i++){ const y = pad.t + i * (h - pad.t - pad.b) / 3;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillStyle = PAL.axis; ctx.font = '700 10px Manrope, sans-serif';
      ctx.fillText(String(Math.round(mx - i * (mx - mn) / 3)), 6, y + 3);
    }
    [0, 6, 12, 18, 24].forEach(hh => {
      const x = X(hh / 24 * (n - 1)); if(x > w - pad.r) return;
      ctx.fillStyle = PAL.axis; ctx.font = '700 10px Manrope, sans-serif';
      ctx.fillText(String(hh).padStart(2,'0') + ':00', x - 14, h - 8);
    });

    /* baseline band */
    const b0 = Y(69 * 1.045), b1 = Y(69 * 0.955);
    ctx.fillStyle = hexA('#0E9E9E', .08);
    ctx.fillRect(pad.l, Math.min(b0, b1), w - pad.l - pad.r, Math.abs(b1 - b0));
    ctx.setLineDash([4, 5]); ctx.strokeStyle = hexA('#0E9E9E', .4); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pad.l, b0); ctx.lineTo(w - pad.r, b0); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = hexA('#0E9E9E', .85); ctx.fillText('baseline 69', pad.l + 4, b0 - 4);

    /* the trace */
    const path = new Path2D();
    cfg.vals.forEach((v, i) => i ? path.lineTo(X(i), Y(v)) : path.moveTo(X(i), Y(v)));
    ctx.strokeStyle = PAL.halo; ctx.lineWidth = 5.5; ctx.lineJoin = 'round'; ctx.stroke(path);
    ctx.strokeStyle = '#0E9E9E'; ctx.lineWidth = 2.4; ctx.stroke(path);

    /* event markers */
    EVENTS.forEach(e => {
      const i = Math.round(e.at / 24 * (n - 1));
      const x = X(i), y = Y(cfg.vals[i]);
      const color = { walk:'#12A6CF', ecg:'#0E9E9E', insight:'#D98314', quality:'#6E9A9E', stable:'#12A06A', med:'#7A6BF0', sleep:'#7A6BF0' }[e.icon];
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = PAL.surface; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, pad.t + 2);
      ctx.strokeStyle = hexA(color, .35); ctx.lineWidth = 1; ctx.stroke();
    });
  };

  /* expose for the PDF builder + tooltips */
  const dayEvents = () => EVENTS.map(e => ({ t:hhmm(e.at), title:e.title, detail:e.detail }));
  const getDay = () => DAY;

  function initDay(){
    if(!$('#dayEvents')) return;
    const cv = document.querySelector('canvas[data-chart=day]');
    if(cv) CC._charts.day = { type:'day', vals:DAY.vals, quality:DAY.quality, unit:'bpm', labels:DAY.labels };
    renderDay();
  }
  document.addEventListener('DOMContentLoaded', () => { init(); initDay(); });

  return {init, setScenario, reset, dayShift, dayLabel, dayEvents, getDay, _charts:CC._charts};
})();
if (typeof window !== 'undefined') window.Sim = Sim;
