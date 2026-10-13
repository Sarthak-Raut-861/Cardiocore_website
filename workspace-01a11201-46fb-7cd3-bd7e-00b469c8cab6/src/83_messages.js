/* ═══════════════════════════════════════════════════════════
   CardioCore · Messages
   One shared thread store. What a patient sends, the clinician
   sees — and the other way round — without a reload.
   ═══════════════════════════════════════════════════════════ */
const Messages = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  /* ───────── the people ───────── */
  const PEOPLE = {
    patient:  { name:'Aarav Menon',      ini:'AM', av:'av-teal',  role:'Patient · 44 y' },
    clinician:{ name:'Dr Neha Raghavan', ini:'NR', av:'av-violet', role:'Interventional cardiology' },
    nurse:    { name:'Anita Rao',        ini:'AR', av:'av-green',  role:'Cardiac care coordinator' },
    ep:       { name:'Dr Samuel Okafor', ini:'SO', av:'av-cyan',   role:'Electrophysiology' },
  };

  const SEED = [
    { id:'t-aarav', patient:'patient', staff:'clinician', subject:'Elevated resting heart rate',
      msgs:[
        { from:'patient',   at:'2026-09-28T11:31', text:'I saw the alert on 28 September. My heart rate was 138 while I was sitting reading. I felt a bit light-headed but it passed in about ten minutes. Should I be worried?' },
        { from:'clinician', at:'2026-09-28T12:04', text:"I've reviewed the strip — signal quality was good and the pattern persisted nine minutes at rest. I'd like to see you before changing anything. Continue your current medication exactly as prescribed and attend on 6 Oct at 10:30. If you feel chest pain, severe breathlessness or faint, treat it as an emergency and call local services immediately." },
        { from:'patient',   at:'2026-09-29T08:12', text:'Understood. HRV has been lower than usual for two days — I attached the report. Sleep has been short.' },
        { from:'clinician', at:'2026-09-29T09:10', text:'Noted. Short sleep explains part of the HRV change. Nothing further needed before your visit.' },
      ] },
    { id:'t-nurse', patient:'patient', staff:'nurse', subject:'Preparation for your visit',
      msgs:[
        { from:'nurse', at:'2026-10-02T16:20', text:'Hello Aarav — for Tuesday, please avoid caffeine for four hours before the appointment and bring the charger for your wearable. The room will be 4B.' },
        { from:'patient', at:'2026-10-02T17:02', text:'Thanks Anita, noted. Should I take my morning tablet as usual?' },
        { from:'nurse', at:'2026-10-03T09:15', text:'Yes, take it as usual — your clinician will review the timing at the visit.' },
      ] },
    { id:'t-ep', patient:'patient', staff:'ep', subject:'Second opinion on the 28 September recording',
      msgs:[
        { from:'clinician', at:'2026-10-03T14:40', text:'I have asked Dr Okafor for a second opinion on the 28 September recording — he specialises in rhythm. He has your consent to review the ECG only.' },
        { from:'ep', at:'2026-10-03T18:05', text:'Reviewed. The trace is technically good and the morphology is consistent across the strip. Nothing here changes the plan for 6 October.' },
      ] },
  ];

  const REPLIES = {
    patient: [
      'Understood — thank you.',
      'That helps. I will keep monitoring and let you know if anything changes.',
      'Noted. I have logged it in the app.',
      'Thanks, I will bring the readings with me on the day.',
    ],
    clinician: [
      'Thanks for flagging this. I have your readings on screen — nothing here needs a change before your visit.',
      'Received. I will review the strip again and get back to you today.',
      'That matches what your baseline shows. Keep the wearable on and I will look at the trend tomorrow.',
      'Good to know. If it happens again at rest, use the emergency button rather than waiting.',
    ],
    nurse: [
      'Thanks Aarav — I have added that to your visit notes.',
      'No problem at all. I will confirm the room details with you on Monday.',
    ],
    ep: [ 'Confirmed on my side as well.' ],
  };

  /* ───────── store ───────── */
  function db(){
    const s = X.store;
    if(!s.threads) s.threads = JSON.parse(JSON.stringify(SEED));
    return s.threads;
  }
  const at = iso => new Date(iso);
  const hhmm = iso => at(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  const dayKey = iso => at(iso).toDateString();
  const when = iso => {
    const d = at(iso), today = new Date('2026-10-04T12:00'), diff = Math.round((today - d) / 864e5);
    if(diff <= 0) return 'Today ' + hhmm(iso);
    if(diff === 1) return 'Yesterday ' + hhmm(iso);
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' }) + ' ' + hhmm(iso);
  };
  const nowIso = () => {
    /* demo clock: the app lives on 4 Oct 2026 */
    const d = new Date();
    const iso = `2026-10-04T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    return iso;
  };

  const thread = id => db().find(t => t.id === id) || db()[0];
  const forSide = side => db().filter(t => side === 'doctor' ? true : t.patient === 'patient');
  const lastOf = t => t.msgs[t.msgs.length - 1];
  const unread = (t, side) => t.msgs.filter(m => m.unreadFor && m.unreadFor.includes(side)).length;
  const totalUnread = side => forSide(side).reduce((n, t) => n + unread(t, side), 0);
  const initialsOf = t => PEOPLE[t.staff] ? PEOPLE[t.staff].ini : 'NR';
  const avOf = t => PEOPLE[t.staff] ? PEOPLE[t.staff].av : 'av-violet';
  const nameOf = t => PEOPLE[t.staff] ? PEOPLE[t.staff].name : 'Care team';
  const labelOf = (t, side) => side === 'doctor' ? PEOPLE[t.patient].name : nameOf(t);

  /* ───────── mutations ───────── */
  function send(threadId, from, text, opts = {}){
    const t = thread(threadId);
    if(!t || !String(text).trim()) return null;
    const m = { from, at:nowIso(), text:String(text).trim(), id:'m' + Date.now(), attach:opts.attach || null };
    const other = from === 'patient' ? 'doctor' : 'patient';
    m.unreadFor = [other];
    t.msgs.push(m);
    t.updated = m.at;
    X.save();
    paint();
    return m;
  }
  function markRead(threadId, side){
    const t = thread(threadId); if(!t) return;
    let changed = false;
    t.msgs.forEach(m => { if(m.unreadFor && m.unreadFor.includes(side)){ m.unreadFor = m.unreadFor.filter(s => s !== side); changed = true; } });
    if(changed) X.save();
    paint();
  }
  /* the other side answers — this is what makes the demo feel alive */
  function autoReply(threadId, from){
    const side = from === 'patient' ? 'doctor' : 'patient';
    setTimeout(() => {
      typing[threadId] = { side, until: Date.now() + 1500 };
      paint();
      setTimeout(() => {
        delete typing[threadId];
        const pool = REPLIES[from === 'patient' ? 'clinician' : 'patient'] || REPLIES.clinician;
        send(threadId, side === 'doctor' ? thread(threadId).staff : 'patient',
             pool[Math.floor(Math.random() * pool.length)]);
        const who = side === 'doctor' ? nameOf(thread(threadId)) : 'Aarav';
        CC.toast('New message from ' + who + '.', 'ok', 4200);
      }, 1600);
    }, 900 + Math.random() * 900);
  }
  const typing = {};

  /* ───────── rendering ───────── */
  let openId = null;
  function mountSide(side){
    const host = document.getElementById(side === 'doctor' ? 'docMsgs' : 'patMsgs');
    if(!host) return;
    if(!openId) openId = forSide(side)[0]?.id;
    paint(side);
  }
  let lastSigs = { doctor:'', patient:'' };
  function paint(side, force=false){
    ['doctor', 'patient'].forEach(s => {
      if(side && side !== s) return;
      const list = document.getElementById(s === 'doctor' ? 'msgThreads' : 'patMsgThreads');
      const pane = document.getElementById(s === 'doctor' ? 'docMsgs' : 'patMsgs');
      const badge = document.getElementById(s === 'doctor' ? 'msgBadgeDoc' : 'msgBadgePat');
      if(!list && !pane) return;
      const items = forSide(s);
      if(!openId || !items.some(t => t.id === openId)) openId = items[0]?.id;

      const n2 = totalUnread(s);
      const curThread = thread(openId);
      const msgCount = curThread ? (curThread.msgs || []).length : 0;
      const isTyping = typing[openId] ? typing[openId].side : '0';
      const sig = `${openId}_${n2}_${msgCount}_${isTyping}`;

      if(!force && lastSigs[s] === sig) return;
      lastSigs[s] = sig;

      if(list){
        list.innerHTML = items.map(t => {
          const last = lastOf(t) || { text:'', at:'2026-10-04T09:00' };
          const n = unread(t, s);
          const on = t.id === openId;
          return `<button class="lrow msgthread ${on ? 'on' : ''}" onclick="CC.openThread('${t.id}','${s}')">
            <span class="avatar ${avOf(t)}" style="width:38px;height:38px;border-radius:12px;font-size:13px">${initialsOf(t)}</span>
            <span class="grow" style="text-align:left;min-width:0">
              <b class="fs14">${esc(labelOf(t, s))}</b>
              <span class="fs12 muted ellipsis">${esc(last.text.slice(0, 44))}${last.text.length > 44 ? '…' : ''}</span>
            </span>
            <span class="col" style="align-items:flex-end;gap:5px">
              <span class="fs11 muted">${hhmm(last.at)}</span>
              ${n ? `<span class="pill" style="font-size:11px;font-weight:800;background:var(--red);color:#fff;border-radius:99px;padding:2px 7px">${n}</span>` : ''}
            </span></button>`;
        }).join('');
      }
      [badge, document.getElementById(s === 'doctor' ? 'docTopBadge' : 'patTopBadge')].forEach(b => {
        if(!b) return;
        b.textContent = n2;
        b.classList.toggle('hidden', n2 === 0);
      });
      const ut = document.getElementById('docUnreadTxt');
      if(ut) ut.textContent = n2 + ' unread';
      if(pane) pane.innerHTML = chatHTML(s);
      const box = document.getElementById(s === 'doctor' ? 'docMsgsScroll' : 'patMsgsScroll');
      if(box) box.scrollTop = box.scrollHeight;
    });
  }
  function chatHTML(side){
    const t = thread(openId);
    if(!t) return '<p class="mid">No conversations yet.</p>';
    const who = side === 'doctor' ? PEOPLE[t.patient] : PEOPLE[t.staff];
    const mine = side === 'doctor' ? 'clinician' : 'patient';
    let lastDay = '';
    const bubbles = t.msgs.map((m, i) => {
      const isMine = (side === 'doctor')
        ? (m.from !== 'patient')
        : (m.from === 'patient');
      const key = dayKey(m.at);
      let sep = '';
      if(key !== lastDay){ lastDay = key; sep = `<div class="msgsep">${when(m.at).split(' ')[0]}</div>`; }
      const author = PEOPLE[m.from] || PEOPLE.clinician;
      return sep + `<div class="msgrow ${isMine ? 'mine' : ''}">
        ${isMine ? '' : `<span class="avatar ${author.av}" style="width:26px;height:26px;border-radius:9px;font-size:10.5px">${author.ini}</span>`}
        <div class="bubble ${isMine ? 'mine' : ''}">
          <div class="meta">${isMine ? 'You' : esc(author.name)} · ${hhmm(m.at)}${m.from === 'nurse' || m.from === 'ep' ? ' · ' + esc(author.role.split(' ')[0]) : ''}</div>
          <div>${esc(m.text)}</div>
          ${m.attach ? `<div class="attach"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21.4 11.1 12.3 20a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l8.1-8.1"/></svg> ${esc(m.attach)}</div>` : ''}
          ${isMine ? `<div class="ticks">${m.delivered === false ? 'sending…' : 'delivered ✓✓'}</div>` : ''}
        </div></div>`;
    }).join('');
    const typ = typing[t.id];
    return `
      <div class="card-h msghead">
        <div class="row gap12">
          <span class="avatar ${side === 'doctor' ? PEOPLE[t.patient].av : PEOPLE[t.staff].av}" style="width:44px;height:44px;border-radius:14px;font-size:14px">
            ${side === 'doctor' ? PEOPLE[t.patient].ini : PEOPLE[t.staff].ini}</span>
          <div><b>${esc(who.name)}</b>
            <div class="fs12 muted">${esc(who.role)} · ${esc(t.subject)}</div></div>
        </div>
        <div class="row gap8">
          <button class="btn sm ghost" onclick="CC.goP('records');CC.toast('Record opened for sharing.','ok')">Share data</button>
          <button class="btn sm ghost" onclick="CC.attachReport()">Attach report</button>
        </div>
      </div>
      <div class="msgscroll" id="${side === 'doctor' ? 'docMsgsScroll' : 'patMsgsScroll'}">
        ${bubbles}
        ${typ && typ.side !== (side === 'doctor' ? 'doctor' : 'patient')
          ? `<div class="msgrow"><div class="bubble typing"><i></i><i></i><i></i></div></div>` : ''}
      </div>
      <div class="composer">
        <textarea class="input grow" id="${side === 'doctor' ? 'docMsgIn' : 'patMsgIn'}" rows="1"
          placeholder="Write a secure message…"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();CC.sendMsg('${side}')}"
          oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
        <button class="btn" onclick="CC.sendMsg('${side}')">Send</button>
      </div>
      <div class="quickrow">
        <span class="fs12 muted">Quick replies</span>
        ${(side === 'doctor'
          ? ['Reviewed — no change needed', 'Come in earlier', 'Keep the wearable on']
          : ['I understand, thank you', 'It happened again today', 'I need an earlier appointment'])
          .map(q => `<button class="chip ghostchip" onclick="CC.quickReply('${side}','${q.replace(/'/g, '')}')">${q}</button>`).join('')}
        <span class="fs11 muted" style="margin-left:auto">Messages are part of the health record and visible to both sides.</span>
      </div>`;
  }

  /* ───────── actions ───────── */
  function openThread(id, side){ openId = id; markRead(id, side); paint(side); }
  function sendMsg(side){
    const box = document.getElementById(side === 'doctor' ? 'docMsgIn' : 'patMsgIn');
    if(!box) return;
    const text = box.value.trim(); if(!text) return;
    box.value = ''; box.style.height = 'auto';
    const from = side === 'doctor' ? 'clinician' : 'patient';
    send(openId, from, text);
    autoReply(openId, from);
  }
  function quickReply(side, text){
    const box = document.getElementById(side === 'doctor' ? 'docMsgIn' : 'patMsgIn');
    if(box){ box.value = text; sendMsg(side); }
  }
  function attachReport(){
    const f = Files.pdfFor('record');
    send(openId, 'patient', 'I have attached the health record export from the app.', { attach:f.name });
    CC.toast('Attached ' + f.name + ' to the conversation.','ok',4200);
    Files.viewer(f.name, f.mime, f.data, f.spec);
  }
  /* a nudge so the thread visibly updates while you are looking at it */
  function liveNudge(side){
    const t = thread(openId); if(!t) return;
    const from = side === 'doctor' ? 'clinician' : 'patient';
    const pool = REPLIES[side === 'doctor' ? 'clinician' : 'patient'];
    send(t.id, from, pool[Math.floor(Math.random() * pool.length)]);
    CC.toast(side === 'doctor' ? 'The patient replied — thread updated.' : 'Your clinician replied.', 'ok', 4600);
  }

  /* ───────── lifecycle ───────── */
  function simOnce(){
    /* one inbound message per session, ~14 s in, so the badge and the
       thread visibly move without any user action */
    if(simOnce.done) return;
    simOnce.done = true;
    const nudge = () => {
      const screen = document.body.dataset.screen || '';
      if(screen.startsWith('app-patient')){
        const t = thread('t-nurse');
        send(t.id, 'nurse', 'Just a reminder about Tuesday — please charge the wearable the night before so the readings are complete.');
        CC.toast('Anita Rao sent you a message.','ok',5000);
      }
    };
    setTimeout(nudge, 14000);
  }
  function init(){
    if(!document.getElementById('patMsgs') && !document.getElementById('docMsgs')) return;
    db();
    mountSide('patient'); mountSide('doctor');
    window.addEventListener('storage', e => {
      if(!e.key || e.key.indexOf('cardiocore') !== 0) return;
      try{
        const fresh = JSON.parse(e.newValue || '{}');
        if(fresh.threads){ X.store.threads = fresh.threads; paint(); }   /* the other tab wrote */
      }catch(err){}
    });
    setInterval(() => { if(!document.hidden) paint(); }, 1500);   /* keep both panes honest */
    simOnce();
  }
  document.addEventListener('DOMContentLoaded', init);

  return {send, sendMsg, quickReply, openThread, attachReport, paint, mountSide, totalUnread, db, liveNudge,
          _thread:thread, _people:PEOPLE};
})();
if (typeof window !== 'undefined') window.Messages = Messages;
