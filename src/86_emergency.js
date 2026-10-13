/* ═══════════════════════════════════════════════════════════
   CardioCore · emergency response
   one press → Google Meet link · report compiled & shared ·
   downloadable PDF · contact + hospital notified · audited
   ═══════════════════════════════════════════════════════════ */
const Emergency = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Meet-style room code: xxx-xxxx-xxx */
  const meetCode = () => {
    const L = 'abcdefghijkmnopqrstuvwxyz';
    const r = n => Array.from({ length:n }, () => L[Math.floor(Math.random() * L.length)]).join('');
    return `${r(3)}-${r(4)}-${r(3)}`;
  };
  const meetLink = () => 'https://meet.google.com/' + meetCode();

  const session = () => X.store.session || null;
  function setSession(s){ X.store.session = s; X.save(); paintBanner(); }

  /* ───────── banner that survives the modal ───────── */
  function paintBanner(){
    const s = session(), host = $('#emgBanner');
    if(!host) return;
    if(!s || s.ended){ host.classList.add('hidden'); return; }
    host.classList.remove('hidden');
    host.innerHTML = `
      <span class="dot-live" style="background:#fff"></span>
      <b>Emergency session active</b>
      <span class="fs13" style="opacity:.9">${s.doctor} is joining · started ${elapsed(s.started)} ago</span>
      <div class="row gap8" style="margin-left:auto">
        <button class="btn xs white" onclick="CC.copyMeet()">Copy Meet link</button>
        <button class="btn xs white" onclick="CC.openMeet()">Join Google Meet</button>
        <button class="btn xs white" onclick="CC.downloadEmergencyReport()">Report PDF</button>
        <button class="btn xs ghost" onclick="CC.endEmergency()">End session</button>
      </div>`;
  }
  function elapsed(iso){
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  setInterval(() => { if(session() && !session().ended) paintBanner(); }, 1000);

  /* ───────── the flow ───────── */
  const STEPS = [
    { key:'detect',  label:'Level 3 pattern confirmed', detail:'HR 138 at rest · HRV 19 ms · persisted 9 min · quality 0.94', ms:420 },
    { key:'meet',    label:'Secure video room created', detail:'Google Meet link generated for the care team', ms:640 },
    { key:'pdf',     label:'Emergency report compiled', detail:'Vitals, ECG strip, medications, labs, preferences', ms:700 },
    { key:'share',   label:'Report shared with Dr Neha Raghavan', detail:'Secure link + SMS · expires in 24 h', ms:620 },
    { key:'hospital',label:'Meridian Heart Institute notified', detail:'Urgent slot requested · emergency bay flagged', ms:560 },
    { key:'contact', label:'Priya Menon notified', detail:'SMS with live location and Meet link', ms:500 },
    { key:'audit',   label:'Consent ledger updated', detail:'Emergency share logged, visible to you', ms:380 },
  ];

  function trigger(){
    if(session() && !session().ended){ openPanel(); return; }

    const meet = meetLink();
    CC.modal({ title:'Emergency response', sub:'Level 3 · Urgent', accent:'urgent', wide:true,
      body:`
        <div class="row row-b wrapf gap12 mb3">
          <div class="row gap12">
            <span class="avatar av-red" style="width:52px;height:52px;border-radius:16px;font-size:17px">AM</span>
            <div><b style="font-family:var(--font-display);font-size:17px">Aarav Menon · 44 y</b>
              <div class="fs13 mid">MRN 44821 · consent active · preferred hospital Meridian Heart Institute</div></div>
          </div>
          <div class="center"><div class="caption">Ordered</div><div class="fs13 b700">${new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</div></div>
        </div>
        <div class="card flat mb3" style="background:var(--red-soft);border-color:#F7C9C6;padding:14px 16px">
          <b>Running the emergency response now</b>
          <div class="fs13 mid mt1">Video room, clinical report, sharing, hospital and next-of-kin notification — in parallel, all logged.</div>
        </div>
        <div class="emg-steps" id="emgSteps">
          ${STEPS.map((s, i) => `<div class="emg-step" data-k="${s.key}">
            <span class="ic"><span class="n">${i + 1}</span></span>
            <div class="grow"><b>${s.label}</b><div class="fs12 muted">${s.detail}</div></div>
            <span class="st st-wait">queued</span>
          </div>`).join('')}
        </div>
        <div id="emgResult"></div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal();CC.toast('Emergency response continues in the background — the banner stays at the top.','warn')">Minimise</button>
              <button class="btn danger" onclick="CC.dialEmergency()">Call emergency services</button>` });

    /* set session immediately so the Meet link exists from second zero */
    setSession({ meet, doctor:'Dr Neha Raghavan', started:new Date().toISOString(), ended:false,
                 shared:[], report:null, code:meet.split('/').pop() });

    /* stagger the steps like real work happening */
    let t = 0;
    STEPS.forEach((s, i) => {
      t += s.ms;
      setTimeout(() => {
        const el = $(`#emgSteps .emg-step[data-k="${s.key}"]`);
        if(!el) return;
        el.classList.add('run');
        el.querySelector('.st').className = 'st st-run';
        el.querySelector('.st').textContent = 'working';
        setTimeout(() => {
          el.classList.remove('run'); el.classList.add('done');
          el.querySelector('.st').className = 'st st-done';
          el.querySelector('.st').textContent = s.key === 'pdf' ? 'ready' : 'done';
          el.querySelector('.ic').innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B7A50" stroke-width="3.2" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>';
          if(s.key === 'pdf'){
            const f = Files.pdfFor('emergency');
            const s2 = session(); s2.report = { name:f.name, size:Math.round(f.data.length / 1024), built:new Date().toISOString() };
            setSession(s2);
            CC._emgPdf = f;
          }
          if(s.key === 'share'){
            const s2 = session();
            s2.shared = [{ who:'Dr Neha Raghavan', how:'secure link + SMS', at:new Date().toISOString() }];
            setSession(s2);
          }
          if(i === STEPS.length - 1) finishPanel();
        }, 260);
      }, t);
    });
  }

  function finishPanel(){
    const host = $('#emgResult');
    if(!host) return;
    const s = session();
    const steps = $('#emgSteps');
    if(steps && !steps.dataset.folded){
      steps.dataset.folded = '1';
      const secs = ((Date.now() - new Date(s.started).getTime()) / 1000).toFixed(1);
      steps.outerHTML = `<div class="emg-fold">
        <span class="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B7A50" stroke-width="3.2" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <b>Response complete</b><span class="fs13 mid">7 actions in ${secs} s · video room open · report shared · all logged</span>
        <button class="btn xs ghost" style="margin-left:auto" onclick="CC.exportModal()">All exports</button></div>`;
    }
    host.innerHTML = `
      <div class="hr-scan"></div>
      <div class="row row-b wrapf gap12 mb2">
        <div><span class="tag urgent">Response live</span><h3 class="h4" style="margin-top:2px">Everything is in place</h3></div>
        <span class="chip stable"><span class="dot"></span> shared ${elapsed(s.shared[0]?.at || s.started)} ago</span>
      </div>
      <div class="meetcard mb2">
        <div>
          <div class="caption">Google Meet · secure room</div>
          <b class="mono" id="meetLinkText">${s.meet}</b>
          <div class="fs12 muted">Dr Neha Raghavan and the on-call registrar can join from this link</div>
        </div>
        <div class="row gap8">
          <button class="btn sm ghost" onclick="CC.copyMeet()">Copy</button>
          <a class="btn sm" href="${s.meet}" target="_blank" rel="noopener">Join</a>
        </div>
      </div>
      <div class="grid g2" style="gap:12px">
        <div class="card flat" style="background:var(--surface-2);padding:14px">
          <div class="caption">Report</div>
          <b class="fs14">${s.report?.name || 'compiling…'}</b>
          <div class="fs12 muted">${s.report?.size || 0} KB · vitals, ECG, meds, labs, preferences</div>
          <div class="row gap8 mt2">
            <button class="btn xs" onclick="CC.downloadEmergencyReport()">Download PDF</button>
            <button class="btn xs ghost" onclick="Emergency.openReport()">Open in tab</button>
          </div>
        </div>
        <div class="card flat" style="background:var(--surface-2);padding:14px">
          <div class="caption">Who has it</div>
          <div class="fs13 mid">· Dr Neha Raghavan — secure link + SMS<br>· Meridian Heart Institute — emergency bay<br>· Priya Menon — SMS with location</div>
          <button class="btn xs ghost mt2" onclick="CC.endEmergency()">End session and revoke</button>
        </div>
      </div>
      <div class="warn-note mt3">This is not a diagnosis. If there is chest pain, severe breathlessness or fainting, call emergency services now — do not wait for a video call.</div>`;
  }

  function openPanel(){
    const s = session(); if(!s) return;
    CC.modal({ title:'Emergency session', sub:'Level 3 · Urgent', accent:'urgent', wide:true,
      body:`<p class="mid fs14 mb3">Session started ${elapsed(s.started)} ago. The report has been shared; the video room is open.</p>
            <div id="emgResult"></div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Close</button>
              <button class="btn danger" onclick="CC.dialEmergency()">Call emergency services</button>` });
    finishPanel();
  }

  /* ───────── individual actions ───────── */
  function copyMeet(){
    const s = session(); if(!s) return;
    navigator.clipboard?.writeText(s.meet).then(
      () => CC.toast('Google Meet link copied — paste it to anyone joining.','ok'),
      () => CC.toast('Clipboard blocked in this preview frame. The link is on screen to copy by hand.','warn',5000));
  }
  function openMeet(){
    const s = session(); if(!s) return;
    const w = window.open(s.meet, '_blank', 'noopener');
    if(!w) CC.toast('Pop-ups are blocked here — copy the link instead.','warn',4600);
    else CC.toast('Opening the secure room in a new tab.','ok');
  }
  async function downloadEmergencyReport(){
    const s = session();
    const f = CC._emgPdf || Files.pdfFor('emergency');
    CC._emgPdf = f;
    const r = await Files.download(f.name, f.mime, f.data, { spec:f.spec });
    if(r && r.ok) CC.toast('Emergency report saved — ' + Math.round(f.data.length / 1024) + ' KB, ready to hand to any clinician.', 'ok', 5200);
  }
  function endEmergency(){
    const s = session(); if(!s) return;
    s.ended = true; s.endedAt = new Date().toISOString(); setSession(s);
    CC.closeModal();
    CC.toast('Session closed. Emergency sharing revoked — the record of who saw what remains in your ledger.','ok',5200);
  }
  function dialEmergency(){
    CC.modal({ title:'Call emergency services', sub:'Level 3 · Urgent', accent:'urgent',
      body:`<p class="mid fs14 mb2">CardioCore never contacts emergency services on your behalf without your explicit action. This prototype would dial your local emergency number.</p>
        <div class="card flat mb2" style="background:var(--red-soft);border-color:#F7C9C6;padding:16px">
          <b>Location would be shared</b><div class="fs13 mid mt1">Meridian Heart Institute catchment · last fix 3 minutes ago</div></div>
        <div class="card flat" style="background:var(--surface-2);padding:16px">
          <b>Meet link ready for the ambulance crew</b>
          <div class="fs13 mid mt1" id="emgMeetEcho">${session()?.meet || '—'}</div></div>
        <p class="small mt3">If this is a real emergency, call your local emergency number directly.</p>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
              <button class="btn danger" onclick="CC.closeModal();CC.toast('Demo only — in a live build this would dial emergency services.','warn',6000)">Call now</button>` });
  }

  function init(){
    paintBanner();
    /* the existing panic button now runs the full response */
    CC.panic = trigger;
    /* make the urgent sheet's primary action start the response */
    const _urgent = CC.urgentModal;
    CC.urgentModal = function(){
      _urgent.apply(this, arguments);
      const btn = $$('#modal .modal-f .btn').find(b => /urgent medical review/i.test(b.textContent));
      if(btn){
        btn.onclick = () => { CC.closeModal(); trigger(); };
        btn.textContent = 'Get urgent review + start video';
      }
    };
  }
  document.addEventListener('DOMContentLoaded', init);

  return {trigger, copyMeet, openMeet, downloadEmergencyReport, endEmergency, dialEmergency, session,
          meetCode, meetLink,
          openReport:() => { const f = CC._emgPdf || Files.pdfFor('emergency');
                             Files.viewer(f.name, f.mime, f.data, f.spec); }};
})();
if (typeof window !== 'undefined') window.Emergency = Emergency;
