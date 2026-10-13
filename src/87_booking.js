/* ═══════════════════════════════════════════════════════════
   CardioCore · Booking    —  week calendar, ICS, video rooms
   ═══════════════════════════════════════════════════════════ */
const Booking = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const SLOTS = ['09:15', '10:30', '11:45', '14:00', '15:15', '16:30'];
  const MON   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const TODAY = new Date(2026, 9, 4);              /* demo anchor: Sun 4 Oct 2026 */
  const dow = d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(d.getDay() + 6) % 7];
  let weekOffset = 0, picked = null, mode = 'in';

  const dayAt = (wi, i) => { const d = new Date(TODAY); d.setDate(d.getDate() + wi * 7 + i); return d; };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const iso = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

  /* deterministic availability so the grid never flickers */
  const rand = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  function slotState(wi, dayI, si){
    const d = dayAt(wi, dayI);
    const epochDay = Math.floor(d.getTime() / 864e5);
    const today = sameDay(d, TODAY);
    if(d.getDay() === 0 && !today) return 'off';                    /* Sundays: closed */
    if(d < TODAY) return 'off';
    if(today && SLOTS[si] < '15:15') return 'off';                  /* today: this afternoon onward */
    if(wi === 0 && dayI === 2 && si === 1) return 'free';           /* Tue 6 Oct 10:30 — the demo slot */
    if(today && si === 4) return 'urgent';                          /* earliest urgent review: today 15:15 */
    const r = rand(epochDay, si);
    if(r > 0.66) return 'busy';
    return 'free';
  }

  function weekLabel(){
    const a = dayAt(weekOffset, 0), b = dayAt(weekOffset, 6);
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()}–${b.getDate()} ${MON[a.getMonth()]} ${a.getFullYear()}`
      : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}`;
  }
  function renderWeek(){
    const host = $('#bkWk'); if(!host) return;
    const head = `<div class="hcell" style="border-right:1px solid var(--border)"></div>` +
      [...Array(7).keys()].map(i => {
        const d = dayAt(weekOffset, i);
        const isToday = sameDay(d, TODAY);
        return `<div class="hcell ${d.getDay() === 0 ? 'colhead-sun' : d.getDay() === 6 ? 'colhead-sat' : ''}">
          <b ${isToday ? 'style="color:var(--teal-700)"' : ''}>${dow(d)} ${d.getDate()} ${MON[d.getMonth()]}</b>
          <span>${isToday ? 'Today' : d.getDay() === 0 ? 'Closed' : 'Open'}</span></div>`;
      }).join('');
    const rows = SLOTS.map((t, si) =>
      `<div class="tcell">${t}</div>` +
      [...Array(7).keys()].map(di => {
        const st = slotState(weekOffset, di, si);
        const d = dayAt(weekOffset, di);
        const on = picked && picked.time === t && sameDay(picked.date, d);
        const cls = st === 'busy' ? 'busy' : st === 'off' ? 'off' : st === 'urgent' ? 'urgent' : '';
        const dis = st === 'busy' || st === 'off';
        const txt = st === 'busy' ? 'booked' : st === 'off' ? '—' : st === 'urgent' ? 'urgent' : 'free';
        return `<div class="cell"><button class="slot ${cls} ${on ? 'on' : ''}" ${dis ? 'disabled' : ''}
          onclick="CC.pickDaySlot(this,${di},${si})" aria-label="${dow(d)} ${t} ${txt}">${on ? t : txt}</button></div>`;
      }).join('')).join('');
    host.innerHTML = head + rows;
    const lb = $('#bkWkLabel'); if(lb) lb.textContent = weekLabel();
  }
  function shiftWeek(n){ weekOffset += n; picked = null; renderWeek(); setPickedText(); }

  function pickDaySlot(el, di, si){
    const d = dayAt(weekOffset, di);
    picked = { date:d, time:SLOTS[si] };
    renderWeek(); setPickedText();
    Motion.magnets();
  }
  function setPickedText(){
    const t = $('#bkPicked');
    if(!t) return;
    if(!picked){ t.innerHTML = '<span class="mid">Pick any free slot — urgent reviews are highlighted in amber.</span>'; return; }
    const d = picked.date;
    t.innerHTML = `<span class="chip stable"><span class="dot"></span> ${dow(d)} ${d.getDate()} ${MON[d.getMonth()]} · ${picked.time}</span>
      <span class="fs12 mid">with ${$('#bkDoc')?.value.split('—')[0].trim() || 'Dr Neha Raghavan'}</span>`;
  }

  /* ─────────── the modal ─────────── */
  function bookModal(m, doctor){
    mode = m === 'video' ? 'video' : 'in';
    picked = { date:dayAt(0, 2), time:'10:30' };   /* Tue 6 Oct, the appointment already on the home card */
    weekOffset = 0;
    CC.modal({
      title:'Book an appointment', sub:'Care network · Cardiology', wide:true,
      body:`
        <div class="row row-b wrapf mb2">
          <div>
            <div class="caption">Choose a slot</div>
            <div class="fs13 mid">Booked slots are locked — nothing double-books. Sundays are closed except today.</div>
          </div>
          <div class="row gap8">
            <button class="icon-btn" onclick="CC.shiftWeek(-1)" aria-label="Previous week"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></button>
            <span class="fs13 b700" id="bkWkLabel">${weekLabel()}</span>
            <button class="icon-btn" onclick="CC.shiftWeek(1)" aria-label="Next week"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button>
          </div>
        </div>
        <div class="weekwrap"><div class="week" id="bkWk"></div></div>
        <div class="slotmeta">
          <span><i style="background:var(--teal-soft)"></i> free</span>
          <span><i style="background:var(--surface-2)"></i> booked</span>
          <span><i style="background:var(--amber-soft)"></i> earliest urgent review</span>
          <span><i style="background:var(--surface-2);opacity:.6"></i> closed / past</span>
        </div>
        <div class="row row-b wrapf mt2" id="bkPicked"></div>
        <div class="hr-scan mt3"></div>
        <div class="grid g2 mt3" style="gap:20px">
          <div>
            <div class="field"><label>Visit type</label>
              <div class="seg w100" style="display:flex;width:100%">
                <button class="grow ${mode === 'in' ? 'on' : ''}" onclick="CC.bookingType(this,'in')">In-person</button>
                <button class="grow ${mode === 'video' ? 'on' : ''}" onclick="CC.bookingType(this,'video')">Video consult</button>
              </div>
            </div>
            <div class="field"><label>Clinician</label>
              <select class="input" id="bkDoc" onchange="CC.refreshPicked()">${CC._docs.map(d => `<option ${doctor === d.name ? 'selected' : ''}>${d.name} — ${d.spec.split('·')[0].trim()}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Institution</label>
              <select class="input"><option>Meridian Heart Institute</option><option>Northbridge Clinic</option><option>City Care Hospital</option><option>Riverside Medical</option></select>
            </div>
          </div>
          <div>
            <div class="field"><label>Reason (visible to your clinician)</label>
              <textarea class="input" rows="3" style="resize:vertical">Review of elevated resting heart rate on 28 September and reduced HRV over two days.</textarea>
            </div>
            <div class="caption mb2">What will be shared</div>
            <div class="row row-b wrapf gap8">
              <span class="chip"><span class="dot"></span> Baseline summary · 90 days</span>
              <span class="chip"><span class="dot"></span> 7-day trends</span>
              <span class="chip"><span class="dot"></span> 3 ECG strips</span>
              <span class="chip neutral">Meds · on request</span>
              <span class="chip neutral">Lipids · on request</span>
            </div>
            <div class="info-note mt3">Slots update live against the clinician's diary. You can revoke any shared item afterwards — sharing expires when the appointment closes.</div>
          </div>
        </div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Cancel</button>
               <button class="btn" onclick="CC.confirmBooking()">Confirm booking</button>` });
    renderWeek(); setPickedText();
    Motion.magnets();
  }
  function bookingType(el, m){
    mode = m;
    [...el.parentNode.children].forEach(c => c.classList.remove('on'));
    el.classList.add('on');
  }

  /* ─────────── confirmation ─────────── */
  function confirmBooking(){
    if(!picked){ CC.toast('Pick a slot in the week grid first.','warn'); return; }
    const doc = $('#bkDoc')?.value || 'Dr Neha Raghavan — Interventional cardiology';
    const d = picked.date, time = picked.time;
    const meet = mode === 'video' ? Emergency.meetLink() : null;
    const ref = 'CC-' + (48120 + Math.floor(rand(d.getDate(), 7) * 900));
    CC.closeModal();
    setTimeout(() => {
      CC.modal({ title:'Appointment confirmed', sub:'Booking reference ' + ref, accent:'stable', wide:!!meet,
        body:`
          <div class="row gap16 mb3">
            <span class="avatar av-teal" style="width:56px;height:56px;font-size:18px">NR</span>
            <div><b style="font-family:var(--font-display);font-size:17px">${doc}</b>
              <div class="fs13 mid">Meridian Heart Institute</div>
              <div class="row gap8 mt2">
                <span class="chip"><span class="dot"></span> ${dow(d)} ${d.getDate()} ${MON[d.getMonth()]} · ${time}</span>
                <span class="chip ${mode==='video'?'':'neutral'}">${mode==='video'?'Video consult':'In-person'}</span></div>
            </div>
          </div>
          ${meet ? `<div class="meetcard mb3">
            <div><div class="caption">Google Meet · room for this consult</div>
              <b class="mono" id="meetLinkText">${meet}</b>
              <div class="fs12 muted">Opens 10 minutes before the appointment. Your clinician gets the same link.</div></div>
            <div class="row gap8"><button class="btn sm ghost" onclick="CC.copyText('${meet}')">Copy</button>
              <a class="btn sm" href="${meet}" target="_blank" rel="noopener">Open</a></div>
          </div>` : ''}
          <div class="grid g2" style="gap:12px">
            <div class="card flat" style="background:var(--surface-2);padding:14px">
              <div class="caption">Add to your calendar</div>
              <div class="fs13 mid mb2">Invite with the appointment details and the report that will be shared.</div>
              <button class="btn xs" onclick="CC.ics('${iso(d)}','${time}','${doc.replace(/'/g,"")}','${meet || ''}','${ref}')">Download .ics</button>
            </div>
            <div class="card flat" style="background:var(--surface-2);padding:14px">
              <div class="caption">Before you go</div>
              <div class="fs13 mid">Your 90-day summary and 3 ECG strips were packaged automatically.</div>
              <button class="btn xs ghost mt2" onclick="CC.closeModal();CC.goP('visits')">View in visits</button>
            </div>
          </div>`,
        footer:`<button class="btn ghost" onclick="CC.closeModal()">Done</button>
                <button class="btn" onclick="CC.exportModal()">Download the shared report</button>` });
    }, 240);
  }

  /* ─────────── calendar file ─────────── */
  function ics(date, time, doctor, meet, ref){
    const [Y, M, D] = [date.slice(0,4), date.slice(4,6), date.slice(6,8)];
    const [hh, mm] = time.split(':');
    const stamp = `${Y}${M}${D}T${hh}${mm}00`;
    const end = `${Y}${M}${D}T${String(+hh + 1).padStart(2,'0')}${mm}00`;
    const body = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CardioCore//Appointments//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${ref}@cardiocore.health`, `DTSTAMP:${stamp}`, `DTSTART:${stamp}`, `DTEND:${end}`,
      `SUMMARY:Cardiology appointment — ${doctor.replace(/,/g,'')}`,
      'LOCATION:Meridian Heart Institute',
      `DESCRIPTION:Booking ${ref}. CardioCore will share your 90-day baseline summary\\, 7-day trends and 3 ECG strips.${meet ? ' Video room: ' + meet : ''}`,
      'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:Cardiology appointment in 2 hours','END:VALARM',
      'END:VEVENT','END:VCALENDAR',''].join('\r\n');
    Files.download(`cardiocore-appointment-${date}.ics`, 'text/calendar', body);
    CC.toast('Calendar invite downloaded — open it to add the appointment to your calendar.','ok',5200);
  }

  return {bookModal, confirmBooking, pickDaySlot, shiftWeek, bookingType, refreshPicked:setPickedText, ics};
})();
if (typeof window !== 'undefined') window.Booking = Booking;
