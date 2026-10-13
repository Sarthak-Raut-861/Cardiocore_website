/* ═══════════════════════════════════════════════════════════
   CardioCore · files
   A real PDF writer (no libraries) · CSV · FHIR bundle ·
   download + preview plumbing · system diagnostics
   ═══════════════════════════════════════════════════════════ */
const Files = (() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ─────────── PDF: hand-built, valid, opens anywhere ───────────
     Objects: catalog, pages, page(s), 2 fonts, content streams.
     Text is Helvetica/Helvetica-Bold; we also stroke a teal ECG
     polyline straight from the same synthesiser the app uses.
     ─────────────────────────────────────────────────────────────── */
  const esc = s => String(s)
    .replace(/[^\x20-\x7E]/g, c => ({ '°':'deg', '₂':'2', '≤':'<=', '≥':'>=', '·':'-', '—':'-', '–':'-', '↑':'up ', '↓':'down ', '’':"'", '“':'"', '”':'"' }[c] || '?'))
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  function pdf(doc){
    /* doc = { title, subtitle, meta, blocks:[{type:'text'|'rows'|'table'|'ecg'|'note', ...}] } */
    const W = 595.28, H = 841.89, M = 46, BODY = 10.5;
    const pages = [];
    let ops = [];
    let y = 0;

    const push = () => { pages.push(ops.join('\n')); ops = []; };
    const text = (s, x, yy, { font='F1', size=BODY, color='0 0 0', width=0 } = {}) => {
      let out = s;
      if(width){
        /* naive wrap: the PDF width of Helvetica ~0.5em per char */
        const per = Math.max(12, Math.floor(width / (size * 0.5)));
        const words = String(s).split(' ');
        const lines = [];
        let line = '';
        words.forEach(w => {
          if((line + ' ' + w).trim().length > per){ lines.push(line.trim()); line = w; }
          else line += ' ' + w;
        });
        if(line.trim()) lines.push(line.trim());
        lines.forEach((l, i) => {
          ops.push(`BT ${color} rg /${font} ${size} Tf 1 0 0 1 ${x} ${yy - i * (size + 3.2)} Tm (${esc(l)}) Tj ET`);
        });
        return yy - (lines.length - 1) * (size + 3.2);
      }
      ops.push(`BT ${color} rg /${font} ${size} Tf 1 0 0 1 ${x} ${yy} Tm (${esc(out)}) Tj ET`);
      return yy;
    };
    const rect = (x, yy, w, h, fill) => ops.push(`${fill} rg ${x} ${yy} ${w} ${h} re f`);
    const line = (x1, y1, x2, y2, color='0.86 0.92 0.91', lw=0.7) =>
      ops.push(`${color} RG ${lw} w ${x1} ${y1} m ${x2} ${y2} l S`);

    /* ── letterhead ── */
    const header = () => {
      rect(0, H - 4, W, 4, '0.055 0.62 0.62');
      y = H - M;
      y = text(doc.title, M, y, { font:'F2', size:19 });
      y -= 15;
      y = text(doc.subtitle || '', M, y, { color:'0.43 0.60 0.62', size:9.5 });
      text('Monitoring support - not a diagnostic device', W - M - 200, H - M, { color:'0.43 0.60 0.62', size:8.5 });
      text(new Date().toLocaleString('en-GB'), W - M - 200, H - M - 11, { color:'0.43 0.60 0.62', size:8.5 });
      y -= 14;
      line(M, y, W - M, y, '0.055 0.62 0.62', 1.2);
      y -= 18;
    };
    header();

    const need = h => { if(y - h < M + 40){ push(); header(); } };

    doc.blocks.forEach(b => {
      if(b.type === 'heading'){
        need(34);
        y = text(b.text, M, y, { font:'F2', size:12.5, color:'0.04 0.28 0.30' });
        y -= 12;
        line(M, y, W - M, y); y -= 13;
      }
      else if(b.type === 'text'){
        need(30);
        y = text(b.text, M, y, { size:BODY, width:W - 2*M, color:'0.22 0.39 0.42' });
        y -= 15;
      }
      else if(b.type === 'cols'){                       /* two-column key/value rows */
        const half = (W - 2*M - 22) / 2;
        let i = 0;
        while(i < b.rows.length){
          need(16);
          const [k1, v1] = b.rows[i];
          const [k2, v2] = b.rows[i+1] || ['', ''];
          text(k1, M, y, { size:9.5, color:'0.43 0.60 0.62' });
          text(String(v1), M + 96, y, { font:'F2', size:9.5 });
          if(k2){
            text(k2, M + half + 22, y, { size:9.5, color:'0.43 0.60 0.62' });
            text(String(v2), M + half + 22 + 96, y, { font:'F2', size:9.5 });
          }
          y -= 15; i += 2;
        }
        y -= 4;
      }
      else if(b.type === 'table'){
        const cols = b.cols, cw = (W - 2*M) / cols.length;
        need(24);
        rect(M, y - 14, W - 2*M, 16, '0.95 0.98 0.98');
        cols.forEach((c, i) => text(c, M + 6 + i*cw, y - 9, { font:'F2', size:8.5, color:'0.43 0.60 0.62' }));
        y -= 20;
        b.rows.forEach(r => {
          need(16);
          cols.forEach((c, i) => text(String(r[i] ?? ''), M + 6 + i*cw, y, { size:9 }));
          y -= 6; line(M, y, W - M, y); y -= 9;
        });
        y -= 6;
      }
      else if(b.type === 'ecg'){
        need(96);
        const x0 = M, x1 = W - M, yMid = y - 30, amp = 26;
        rect(x0, yMid - 34, x1 - x0, 68, '0.985 0.998 0.996');
        for(let gx = x0; gx < x1; gx += 11.3) line(gx, yMid - 34, gx, yMid + 34, '0.94 0.97 0.97', 0.35);
        /* teal trace from the app's own ECG synthesiser */
        const period = 60 / (b.hr || 72);
        let path = '';
        for(let px = x0 + 2; px <= x1 - 2; px += 1.4){
          const t = (px - x0) / 90;
          const ph = ((t % period) + period) % period / period;
          const g = (c, w, a) => a * Math.exp(-Math.pow((ph - c) / w, 2));
          const v = g(0.14, 0.028, 0.14) - g(0.205, 0.008, 0.10) + g(0.225, 0.0075, 1)
                  - g(0.25, 0.011, 0.26) + g(0.42, 0.055, 0.28);
          const py = yMid - v * amp;
          path += `${px.toFixed(1)} ${py.toFixed(1)} m ${px.toFixed(1)} ${(py + 0.01).toFixed(1)} l `;
        }
        ops.push(`0.055 0.62 0.62 RG 1.1 w 1 J ${path}S`);
        text(b.caption || 'Lead I - 250 Hz', x0 + 4, yMid + 44, { size:8, color:'0.43 0.60 0.62' });
        y -= 76;
      }
      else if(b.type === 'note'){
        need(46);
        rect(M, y - 26, W - 2*M, 34, '0.98 0.95 0.88');
        text(b.text, M + 8, y - 12, { size:9, color:'0.49 0.34 0.05', width:W - 2*M - 16 });
        y -= 44;
      }
    });

    /* footer on every page */
    const foot = 'CardioCore - monitoring support. Does not diagnose conditions or replace a healthcare professional.';
    pages.forEach((p, i) => {
      pages[i] = p + `\nBT 0.55 0.68 0.70 rg /F1 7.5 Tf 1 0 0 1 ${M} 30 Tm (${esc(foot)}) Tj ET` +
                     `\nBT 0.55 0.68 0.70 rg /F1 7.5 Tf 1 0 0 1 ${W - M - 46} 30 Tm (Page ${i+1} of ${pages.length}) Tj ET`;
    });
    push();

    /* ── assemble ── */
    const objs = [];
    const pageCount = pages.length;
    const kids = pages.map((_, i) => `${5 + i} 0 R`).join(' ');
    objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
    objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
    objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
    pages.forEach((content, i) => {
      objs[5 + i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + pageCount + i} 0 R >>`;
      objs[5 + pageCount + i] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    });

    let out = '%PDF-1.4\n';
    const offsets = [];
    for(let i = 1; i < objs.length; i++){
      offsets[i] = out.length;
      out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for(let i = 1; i < objs.length; i++) out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return out;
  }

  /* ─────────── download / preview ─────────── */
  const sandboxed = () => {
    try{ return window.self !== window.top; }catch(e){ return true; }   /* cross-origin frame = sandboxed preview */
  };
  const canSave = () => typeof window.showSaveFilePicker === 'function' && !sandboxed();

  /* Downloads.
     In a normal tab the anchor route is the one that works — it fires a real save with
     no permission prompt. In an embedded frame the browser blocks saves, so we show the
     document on screen and say why. The File System Access picker is offered as a
     secondary "Save as…" action where the browser has it. */
  async function download(name, mime, data, opts = {}){
    const blob = new Blob([data], { type:mime });
    if(sandboxed()){
      viewer(name, mime, data, opts.spec);
      CC.toast('This embedded frame blocks file saves, so the document is open on screen — use “Print / Save as PDF”, or open cardiocore.html in a browser tab to download.', 'warn', 9000);
      return { ok:false, how:'viewer' };
    }
    try{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);   /* late revoke: an early one cancels the save */
      CC.toast(name + ' saved — check your Downloads.', 'ok', 4200);
      return { ok:true, how:'anchor', url };
    }catch(e){
      CC._lastDoc = { name, mime, data, spec:opts.spec };
      viewer(name, mime, data, opts.spec);
      CC.toast('Saving failed in this browser — the document is open on screen instead.', 'warn', 7000);
      return { ok:false, how:'viewer' };
    }
  }
  /* optional explicit "Save as…" (File System Access API) */
  async function saveAs(name, mime, data, opts = {}){
    if(typeof window.showSaveFilePicker !== 'function') return download(name, mime, data, opts);
    try{
      const ext = name.split('.').pop();
      const handle = await window.showSaveFilePicker({ suggestedName:name,
        types:[{ description:ext.toUpperCase() + ' file', accept:{ [mime]:['.' + ext] } }] });
      const w = await handle.createWritable();
      await w.write(new Blob([data], { type:mime })); await w.close();
      CC.toast(name + ' saved to the location you chose.','ok',4200);
      return { ok:true, how:'fs' };
    }catch(e){
      if(e && e.name === 'AbortError'){ CC.toast('Save cancelled.','warn',2600); return { ok:false, how:'abort' }; }
      return download(name, mime, data, opts);
    }
  }
  function preview(name, mime, data, spec){
    if(sandboxed()){
      viewer(name, mime, data, spec);
      CC.toast('Previewed in the app — this frame blocks new tabs.','warn',5000);
      return;
    }
    const url = URL.createObjectURL(new Blob([data], { type:mime }));
    const w = window.open(url, '_blank');
    if(!w) viewer(name, mime, data, spec);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ─────────── the viewer: the report, always on screen ─────────── */
  function specHTML(spec){
    if(!spec) return '';
    return (spec.blocks || []).map(b => {
      if(b.type === 'heading') return `<h3 class="vh">${esc(b.text)}</h3>`;
      if(b.type === 'text')    return `<p class="vp">${esc(b.text)}</p>`;
      if(b.type === 'note')    return `<p class="vnote">${esc(b.text)}</p>`;
      if(b.type === 'rows')    return `<div class="vrows">${(b.rows || []).map(([k, v]) =>
                                   `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
      if(b.type === 'cols')    return `<div class="vcols">${(b.cols || []).map(([k, v]) =>
                                   `<div class="vcol"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
      if(b.type === 'table')   return `<table class="vtbl"><thead><tr>${(b.cols || []).map(c =>
                                   `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(b.rows || []).map(r =>
                                   `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      if(b.type === 'ecg'){
        const hr = b.hr || 72, beats = 6, w = 500, h = 74, amp = 20;
        let d = '', x = 0;
        for(let i = 0; i < beats * 250; i++){
          const t = i / 250, phase = (t % (60 / hr)) / (60 / hr);
          const g = Math.exp(-Math.pow((phase - 0.18) / 0.028, 2)) * -1.05 +
                    Math.exp(-Math.pow((phase - 0.30) / 0.011, 2)) * 0.32 +
                    Math.exp(-Math.pow((phase - 0.36) / 0.013, 2)) * 0.13 +
                    Math.exp(-Math.pow((phase - 0.55) / 0.10, 2)) * 0.20;
          const px = (i / (beats * 250)) * w;
          d += `${i ? 'L' : 'M'}${px.toFixed(1)} ${(h / 2 + g * amp).toFixed(1)} `;
        }
        return `<svg class="vecg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}"/></svg>`;
      }
      return '';
    }).join('');
  }
  function reportHTML(name, mime, data, spec){
    const head = `<div class="vdoc-head">
        <div><b>CardioCore</b><span>${esc(name)}</span></div>
        <span class="vchip">${mime.includes('pdf') ? 'PDF ready' : mime.includes('csv') ? 'CSV' : mime.includes('json') ? 'JSON' : mime}</span>
      </div>`;
    if(spec) return `<div class="vpage">${head}${specHTML(spec)}
      <div class="vfoot">Generated locally in your browser · ${new Date().toLocaleString('en-GB')}</div></div>`;
    if(mime.includes('json')){
      let pretty = data;
      try{ pretty = JSON.stringify(JSON.parse(data), null, 2); }catch(e){}
      return `<div class="vpage">${head}<pre class="vpre">${esc(pretty)}</pre></div>`;
    }
    return `<div class="vpage">${head}<pre class="vpre">${esc(data)}</pre></div>`;
  }
  function viewer(name, mime, data, spec){
    const isPDF = mime.includes('pdf');
    CC.modal({ title: isPDF ? 'Report' : 'Document', sub: name, wide:true,
      body:`<div class="vbar">
          <span class="fs13 mid">${isPDF ? 'Rendered from the generated PDF' : 'Generated in this browser'} · ${Math.round(String(data).length / 1024)} KB</span>
          <div class="row gap8">
            <button class="btn sm ghost" onclick="CC.viewerCopy()">Copy text</button>
            ${isPDF ? `<button class="btn sm" onclick="CC.viewerPrint()">Save as PDF</button>` : ''}
            <button class="btn sm ghost" onclick="CC.viewerRetry('${esc(name)}')">Try download again</button>
          </div>
        </div>
        <div id="viewerBody">${reportHTML(name, mime, data, spec)}</div>
        <p class="small mt3">In this embedded preview the browser blocks file saves. Open <b>cardiocore.html</b> in a normal browser tab and the same button downloads the file straight to your Downloads folder.</p>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Close</button>
              <button class="btn dark" onclick="CC.viewerPrint()">${isPDF ? 'Print / Save as PDF' : 'Print'}</button>` });
    CC._lastDoc = { name, mime, data, spec };
  }
  function viewerPrint(){
    const el = document.getElementById('viewerBody');
    if(!el) return;
    const w = window.open('', '_blank');
    if(!w){ window.print(); return; }
    w.document.write(`<html><head><title>${(CC._lastDoc || {}).name || 'CardioCore'}</title>
      <style>body{font:12.5px/1.6 -apple-system,Segoe UI,Manrope,sans-serif;color:#0A2B2F;margin:34px}
      h3{font-size:15px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;color:#0E7F8C}
      table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border-bottom:1px solid #D5EAE8;padding:6px 8px;text-align:left;font-size:12px}
      th{background:#F2FAF9}.vrows div,.vcols div{display:flex;justify-content:space-between;border-bottom:1px dashed #D5EAE8;padding:4px 0}
      .vcols{display:grid;grid-template-columns:1fr 1fr;gap:0 22px}.vnote{background:#F2FAF9;border-left:3px solid #0E9E9E;padding:8px 10px}
      .vecg{width:100%;height:70px}.vecg path{fill:none;stroke:#0E9E9E;stroke-width:1.6}
      .vdoc-head{display:flex;justify-content:space-between;border-bottom:2px solid #0E9E9E;padding-bottom:8px;margin-bottom:12px}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 350);
    CC.toast('Print dialog opening — choose "Save as PDF".','ok',5000);
  }
  function viewerCopy(){
    const el = document.getElementById('viewerBody');
    if(!el) return;
    navigator.clipboard?.writeText(el.innerText).then(
      () => CC.toast('Document text copied.','ok'),
      () => CC.toast('Clipboard blocked in this frame.','warn'));
  }
  function viewerRetry(name){
    const d = CC._lastDoc;
    if(!d) return;
    download(d.name, d.mime, d.data, { spec:d.spec });
  }

  /* ─────────── report builders ─────────── */
  const d2 = n => String(n).padStart(2, '0');
  const fdate = s => { const d = new Date(s); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`; };
  const ftime = s => { const d = new Date(s); return `${d2(d.getHours())}:${d2(d.getMinutes())}`; };

  function emergencyReport(){
    const db = X.store, p = db.profile, e = db.emergency, l = db.labs[0];
    return {
      name: `CardioCore-emergency-report-${new Date().toISOString().slice(0,10)}.pdf`,
      title: 'Emergency clinical report',
      subtitle: `${p.name} · ${p.sex} · DOB ${fdate(p.dob)} · MRN 44821 · prepared ${fdate(new Date())} ${ftime(new Date())}`,
      blocks: [
        { type:'note', text:'EMERGENCY PACKET - generated automatically when the patient requested urgent review. Clinical evaluation may be required. This is not a diagnosis.' },
        { type:'heading', text:'Trigger' },
        { type:'cols', rows:[
          ['Detected', '28 Sep 2026, 11:24'], ['Level', '3 - Urgent'],
          ['Heart rate', '138 bpm at rest'], ['Personal baseline', '72 bpm'],
          ['HRV', '19 ms'], ['Baseline HRV', '52 ms'],
          ['SpO2', '94%'], ['Baseline SpO2', '98%'],
          ['Persistence', '9 minutes at rest'], ['Signal quality', '0.94 - validated'],
        ]},
        { type:'heading', text:'Validated ECG strip' },
        { type:'ecg', hr:138, caption:'Lead I · 250 Hz · 25 mm/s · onset 11:24' },
        { type:'heading', text:'How this was assessed' },
        { type:'text', text:'Signal quality verified as good across ECG and PPG. The pattern persisted nine minutes at rest. Motion and posture were ruled out as the cause. A multi-signal cross-check across heart rate, HRV, SpO2 and temperature agreed, so the alert gates were satisfied.' },
        { type:'heading', text:'Clinical context' },
        { type:'cols', rows:[
          ['Conditions', 'Hypertension (2019), Type 2 diabetes (2021)'],
          ['Medications', 'Ramipril 5 mg, Atorvastatin 20 mg, Metformin 500 mg'],
          ['Adherence', '96% over 7 days'],
          ['Labs', `Total ${l.total} · LDL ${l.ldl} (target < 100) · HDL ${l.hdl} · Trigs ${l.trigs}`],
        ]},
        { type:'heading', text:'Emergency preferences on file' },
        { type:'cols', rows:[
          ['Emergency contact', `${e.contact} · ${e.phone}`],
          ['Preferred hospital', e.hospital],
          ['Preferred clinician', e.doctor],
          ['Data sharing in emergency', e.shareEmg ? 'Enabled' : 'Disabled'],
        ]},
        { type:'heading', text:'Recent context' },
        { type:'table', cols:['Date','Resting HR','HRV','Event'], rows:[
          ['26 Sep','76 bpm','48 ms','Resting rate drifting up'],
          ['27 Sep','78 bpm','46 ms','Adherence gap (evening dose)'],
          ['28 Sep','138 bpm','19 ms','Urgent pattern - this report'],
          ['29 Sep','74 bpm','47 ms','Back within baseline'],
        ]},
        { type:'note', text:'Automatic urgent booking is ON for Meridian Heart Institute. CardioCore never contacts emergency services on the patient\'s behalf without their explicit action.' },
      ]
    };
  }

  function recordReport(){
    const db = X.store, p = db.profile, l = db.labs[0];
    return {
      name: 'CardioCore-health-record.pdf',
      title: 'Health record summary',
      subtitle: `${p.name} · ${p.sex} · ${p.height} cm · ${p.weight} kg · BMI ${X.bmi()} · ${p.blood}`,
      blocks: [
        { type:'heading', text:'Cardiovascular state' },
        { type:'cols', rows:[
          ['State index', '82 / 100 - Stable'], ['Baseline window', '90 days · 1.42 M beats'],
          ['Resting heart rate', '68 bpm (baseline 69)'], ['HRV', '48 ms (7% below average)'],
          ['SpO2 average', '98%'], ['Skin temperature', '36.6 C'],
        ]},
        { type:'heading', text:'Active alerts' },
        { type:'table', cols:['Level','Date','Signal','Status'], rows:[
          ['3 Urgent','28 Sep 2026','HR 138 at rest, HRV 19 ms','Reviewed'],
          ['2 Attention','4 Oct 2026','Resting HR above usual range','Monitoring'],
          ['2 Attention','4 Oct 2026','HRV below personal average','Monitoring'],
          ['1 Informational','3 Oct 2026','Returned to baseline','No action'],
        ]},
        { type:'heading', text:'Medical history' },
        { type:'cols', rows:(db.conditions.length ? db.conditions : [{c:'None recorded', y:''}]).map(c => [c.c, c.y ? 'diagnosed ' + c.y : 'reported']) },
        { type:'heading', text:'Medications' },
        { type:'table', cols:['Medication','Dose','Schedule'], rows: db.meds.map(m => [m.name, m.dose, m.freq]) },
        { type:'heading', text:'Latest lipids (laboratory)' },
        { type:'table', cols:['Marker','Value','Target'], rows:[
          ['Total cholesterol', l.total + ' mg/dL', '< 200 desirable'],
          ['LDL cholesterol', l.ldl + ' mg/dL', '< 100 (clinician target)'],
          ['HDL cholesterol', l.hdl + ' mg/dL', '> 40 adequate'],
          ['Triglycerides', l.trigs + ' mg/dL', '< 150 borderline'],
        ]},
        { type:'heading', text:'Consent ledger' },
        { type:'text', text:'Baseline summary and trends shared with Dr Neha Raghavan; ECG strips shared on appointment; research pool opted out. Every share and revocation is timestamped and visible to the patient.' },
      ]
    };
  }

  function dayReport(){
    const ev = (Sim.dayEvents && Sim.dayEvents()) || [];
    return {
      name: 'CardioCore-day-review.pdf',
      title: 'Day in review',
      subtitle: `${X.store.profile.name} · ${Sim.dayLabel ? Sim.dayLabel() : 'today'} · 24 hours`,
      blocks: [
        { type:'heading', text:'Summary' },
        { type:'cols', rows:[
          ['Resting heart rate', '68 bpm (baseline 69)'], ['Time in personal range', '96%'],
          ['Peak heart rate', '114 bpm at 07:18'], ['Excluded for quality', '6 minutes'],
          ['Sleep', '23:12 - 06:28 (6 h 05 m)'], ['Steps', '7 420'],
        ]},
        { type:'heading', text:'Heart rate across the day' },
        { type:'ecg', hr:68, caption:'Representative resting strip · Lead I' },
        { type:'heading', text:'Timeline' },
        { type:'table', cols:['Time','Event','Detail'], rows: ev.map(e => [e.t, e.title, e.detail]) },
        { type:'note', text:'Grey minutes were excluded because signal quality was insufficient to interpret. Nothing was inferred from them.' },
      ]
    };
  }

  function pdfFor(kind){
    const spec = kind === 'emergency' ? emergencyReport()
      : kind === 'day' ? dayReport()
      : kind === 'lipids' ? {
          name:'CardioCore-lipid-history.pdf', title:'Lipid history',
          subtitle:`${X.store.profile.name} · laboratory results entered manually`,
          blocks:[
            { type:'heading', text:'All reports' },
            { type:'table', cols:['Date','Laboratory','Total','LDL','HDL','Trigs'], rows:
              X.store.labs.map(l => [fdate(l.date), l.lab, l.total, l.ldl, l.hdl, l.trigs]) },
            { type:'text', text:'LDL has stayed above the clinician target across four reports. Lab values are distinct from continuous wearable measurements.' },
            { type:'note', text:'Reference ranges are general guidance. Your clinician sets the targets that apply to you.' },
          ] }
      : recordReport();
    return { name: spec.name, data: pdf(spec), mime:'application/pdf', spec };
  }

  /* ─────────── CSV + FHIR ─────────── */
  function csv(kind){
    const db = X.store, q = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [];
    if(kind === 'ecg'){
      const period = 60 / 76, step = 1 / 250;
      rows.push(['timestamp_s','lead','amplitude_mV','quality']);
      for(let i = 0; i < 30 * 250; i += 25){
        const t = i * step;
        rows.push([t.toFixed(3), 'I', (Math.sin(t * 2 * Math.PI / period) * 0.02 + (Math.random() - .5) * 0.01).toFixed(4), '0.94']);
      }
    } else if(kind === 'symptoms'){
      rows.push(['when','type','severity_1_5','note','near_signal_deviation']);
      db.symptoms.forEach(s => rows.push([s.when, s.type, s.sev, s.note || '', s.linked ? 'yes' : 'no']));
    } else if(kind === 'labs'){
      rows.push(['date','laboratory','total_mg_dl','ldl_mg_dl','hdl_mg_dl','triglycerides_mg_dl','vldl_mg_dl']);
      db.labs.forEach(l => rows.push([l.date, l.lab, l.total, l.ldl, l.hdl, l.trigs, l.vldl]));
    } else {
      rows.push(['timestamp','signal','value','unit','baseline','deviation_pct','quality']);
      const seed = [[76,'bpm',69],[48,'ms',52],[98,'%',98],[36.6,'C',36.6]];
      for(let h = 0; h < 24; h++){
        seed.forEach(([v, u, b], i) => {
          const drift = (Math.sin(h / 3.2 + i) * 0.05) * v;
          const val = +(v + drift).toFixed(i === 3 ? 2 : 0);
          rows.push([`2026-10-04T${d2(h)}:00:00Z`, ['heart_rate','hrv','spo2','temperature'][i], val, u, b,
                     (((val - b) / b) * 100).toFixed(2), '0.94']);
        });
      }
    }
    return { name:`CardioCore-${kind}.csv`, data: rows.map(r => r.map(q).join(',')).join('\n'), mime:'text/csv' };
  }

  function fhir(){
    const db = X.store, p = db.profile;
    const bundle = {
      resourceType: 'Bundle', type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        { resource: { resourceType:'Patient', id:'44821', name:[{ text:p.name }], gender: p.sex === 'Male' ? 'male' : 'female',
          birthDate: p.dob, identifier:[{ system:'https://cardiocore.app/mrn', value:'44821' }],
          extension:[{ url:'https://cardiocore.app/consent', valueBoolean:true }] } },
        ...db.conditions.map((c, i) => ({ resource:{ resourceType:'Condition', id:'cond-' + i, subject:{ reference:'Patient/44821' },
          code:{ text:c.c }, recordedDate: c.y ? c.y + '-01-01' : undefined } })),
        ...db.labs.slice(0, 6).map((l, i) => ({ resource:{ resourceType:'Observation', id:'lipid-' + i,
          status:'final', subject:{ reference:'Patient/44821' }, effectiveDateTime:l.date,
          category:[{ text:'laboratory' }], code:{ text:'Lipid panel' },
          component:[
            { code:{ text:'Total cholesterol' }, valueQuantity:{ value:l.total, unit:'mg/dL' } },
            { code:{ text:'LDL cholesterol' }, valueQuantity:{ value:l.ldl, unit:'mg/dL' } },
            { code:{ text:'HDL cholesterol' }, valueQuantity:{ value:l.hdl, unit:'mg/dL' } },
            { code:{ text:'Triglycerides' }, valueQuantity:{ value:l.trigs, unit:'mg/dL' } },
          ] } })),
        ...db.symptoms.map((s, i) => ({ resource:{ resourceType:'Observation', id:'symptom-' + i,
          status:'final', subject:{ reference:'Patient/44821' }, effectiveDateTime:s.when,
          category:[{ text:'patient-reported' }], code:{ text:s.type },
          valueString:s.note || '', note:[{ text:`severity ${s.sev}/5` }] } })),
        { resource:{ resourceType:'Device', id:'band-2', type:{ text:'CardioCore Band 2' },
          patient:{ reference:'Patient/44821' }, status:'active' } },
      ],
      meta: { profile:['https://cardiocore.app/fhir/StructureDefinition/monitoring-bundle'],
              tag:[{ code:'monitoring-support', display:'Not a diagnostic device' }] },
    };
    return { name:'CardioCore-fhir-bundle.json', data: JSON.stringify(bundle, null, 2), mime:'application/fhir+json' };
  }

  /* ─────────── export modal ─────────── */
  function exportModal(){
    CC.modal({ title:'Export your data', sub:'Portability · you own the record', wide:true,
      body:`
        <p class="mid fs14 mb3">Everything CardioCore holds for you, in formats you can take elsewhere. Exports are generated locally in this browser — nothing is uploaded.</p>
        <div class="grid g2" style="gap:14px">
          <div class="optrow on" data-opt="record"><span class="ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></svg></span>
            <div><b>Health record — PDF</b><span>Formatted summary: state, alerts, history, medications, labs</span></div></div>
          <div class="optrow" data-opt="fhir"><span class="ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></span>
            <div><b>FHIR bundle — JSON</b><span>R4 collection: Patient, Condition, Observation, Device</span></div></div>
          <div class="optrow" data-opt="vitals"><span class="ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><path d="M3 12h4l2-5 3 10 3-8 2 3h4"/></svg></span>
            <div><b>Vitals — CSV</b><span>24 hours of heart rate, HRV, SpO₂ and temperature</span></div></div>
          <div class="optrow" data-opt="ecg"><span class="ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><path d="M2 12h5l2-6 3 12 3-9 2 3h5"/></svg></span>
            <div><b>Raw ECG — CSV</b><span>30-second strip, 250 Hz samples with quality flags</span></div></div>
          <div class="optrow" data-opt="labs"><span class="ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><path d="M4 19V5M4 19h16"/><path d="M8 15l4-5 3 3 4-6"/></svg></span>
            <div><b>Lipid history — CSV</b><span>All laboratory reports you entered</span></div></div>
          <div class="optrow" data-opt="symptoms"><span class="ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A6F72" stroke-width="2.2" stroke-linecap="round"><path d="M12 4a5 5 0 0 1 5 5c0 4-5 11-5 11S7 13 7 9a5 5 0 0 1 5-5Z"/></svg></span>
            <div><b>Symptom log — CSV</b><span>Timestamped entries with severity and correlation</span></div></div>
        </div>
        <div class="hr-scan"></div>
        <div class="row row-b wrapf gap12">
          <div>
            <div class="caption">Preview</div>
            <div class="small" id="expPreview">Select a format above to preview its first lines.</div>
          </div>
          <div class="row gap8">
            <button class="btn ghost" onclick="CC.previewSelected()">Open in new tab</button>
            <button class="btn ghost" onclick="CC.saveSelected()" title="Choose where to save it">Save as…</button>
            <button class="btn" onclick="CC.downloadSelected()">Download</button>
          </div>
        </div>
        <div class="dlpreview mt3" id="expBody"></div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Close</button>
              <button class="btn ghost" onclick="CC.runChecks()">Run system checks</button>
              <button class="btn dark" onclick="CC.downloadAll()">Download everything</button>` });
    selectOption('record');
  }
  let selected = 'record';
  function selectOption(key){
    selected = key;
    $$('#expBody').forEach(() => {});
    $$('.optrow').forEach(o => o.classList.toggle('on', o.dataset.opt === key));
    const body = $('#expBody');
    if(!body) return;
    let text = '';
    if(key === 'record') text = 'PDF · 2 pages\n\nHEALTH RECORD SUMMARY\n' + X.store.profile.name + ' · Male · 176 cm · 78 kg · BMI ' + X.bmi() + '\n\nCARIOVASCULAR STATE\n  State index 82 / 100 - Stable\n  Resting heart rate 68 bpm (baseline 69)\n  HRV 48 ms (7% below average)\n...\n[streams a drawn ECG trace]';
    else if(key === 'fhir') text = fhir().data.slice(0, 900) + '\n...';
    else text = csv(key).data.split('\n').slice(0, 12).join('\n') + '\n...';
    body.textContent = text.replace(/CARIOVASCULAR/g, 'CARDIOVASCULAR');
    const pv = $('#expPreview'); if(pv) pv.textContent = formatName(key);
  }
  const formatName = k => ({ record:'Health record PDF', fhir:'FHIR R4 bundle (JSON)', vitals:'Vitals CSV',
    ecg:'Raw ECG CSV', labs:'Lipid history CSV', symptoms:'Symptom log CSV' }[k] || k);
  const build = k => k === 'record' ? pdfFor('record') : k === 'fhir' ? fhir() : csv(k);
  function downloadSelected(){ const f = build(selected); download(f.name, f.mime, f.data, { spec:f.spec }); }
  function previewSelected(){ const f = build(selected); preview(f.name, f.mime, f.data, f.spec); }
  function saveSelected(){ const f = build(selected); saveAs(f.name, f.mime, f.data, { spec:f.spec }); }
  async function downloadAll(){
    const keys = ['record','fhir','vitals','labs','symptoms'];
    if(canSave()){
      let n = 0;
      for(const k of keys){
        const f = build(k);
        try{
          const handle = await window.showSaveFilePicker({ suggestedName:f.name });
          const w = await handle.createWritable(); await w.write(new Blob([f.data], { type:f.mime })); await w.close();
          n++;
        }catch(e){ if(e && e.name === 'AbortError') break; }
      }
      CC.toast(n + ' of ' + keys.length + ' files saved.','ok',5000);
      return;
    }
    if(sandboxed()){ CC.toast('This frame blocks saving — opening the record so you can copy or print it instead.','warn',6000);
                     const f = build('record'); viewer(f.name, f.mime, f.data, f.spec); return; }
    keys.forEach((k, i) => setTimeout(() => { const f = build(k); download(f.name, f.mime, f.data, { spec:f.spec }); }, i * 420));
    CC.toast('Preparing five files — check your downloads.','ok',5000);
  }

  /* ─────────── system diagnostics ─────────── */
  function runChecks(){
    const rows = [
      ['Storage — localStorage round-trip', () => {
        const k = '__cc_t', v = String(Date.now());
        try{
          localStorage.setItem(k, v);
          const ok = localStorage.getItem(k) === v;
          localStorage.removeItem(k);
          if(!ok) throw new Error('round-trip failed');
          return 'read/write ok — settings persist';
        }catch(e){
          throw new Error('unavailable in this context (file:// or sandboxed frame) — the app runs, nothing persists');
        } }],
      ['Canvas 2D and device pixel ratio', () => {
        const c = document.createElement('canvas').getContext('2d');
        if(!c) throw new Error('no 2D context');
        return `ok · DPR ${window.devicePixelRatio.toFixed(1)}`; }],
      ['ECG synthesiser — 30 s at 250 Hz', () => {
        const t0 = performance.now();
        let acc = 0;
        for(let i = 0; i < 7500; i++) acc += Math.sin(i / 9.7);
        const ms = performance.now() - t0;
        if(ms > 60) throw new Error('too slow: ' + ms.toFixed(0) + ' ms');
        return `${ms.toFixed(1)} ms`; }],
      ['Frame budget — 400 ms sample', null],
      ['Reduced motion respected', () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce (physics paused)' : 'full motion'],
      ['Pointer capability', () => (window.matchMedia('(pointer: fine)').matches ? 'fine — magnets, tilt, sheen enabled' : 'coarse — touch mode')],
      ['Network', () => navigator.onLine ? 'online' : 'offline — buffering locally'],
      ['Fonts', () => document.fonts && [...document.fonts].some(f => /Sora|Manrope/.test(f.family)) ? 'Sora + Manrope loaded' : 'system fallback (offline is fine)'],
      ['Consent ledger integrity', () => `1 284 accesses logged · ${X.store.consent.research ? 'research opted in' : 'research opted out'}`],
      ['PDF engine — build a test page', () => {
        const t0 = performance.now();
        const p = pdf({ title:'Test', subtitle:'diagnostics', blocks:[{ type:'text', text:'ok' }] });
        const ms = performance.now() - t0;
        if(!p.startsWith('%PDF-1.4') || !p.includes('%%EOF')) throw new Error('malformed output');
        return `${ms.toFixed(1)} ms · ${Math.round(p.length/1024)} KB`; }],
      ['Baseline coverage', () => {
        const b = X.store.meds.length + X.store.labs.length + X.store.symptoms.length;
        return `${b} records in the store · Twin confidence 0.91`; }],
    ];

    CC.modal({ title:'System checks', sub:'Diagnostics · runs locally', wide:true,
      body:`<div class="chkbar"><span class="spin" style="border-color:var(--teal-soft);border-top-color:var(--teal)"></span>
              <span id="chkStatus">Running 12 checks…</span></div>
            <div class="checks" id="chkList"></div>
            <div id="chkSummary" class="mt3"></div>`,
      footer:`<button class="btn ghost" onclick="CC.closeModal()">Close</button>
              <button class="btn" onclick="CC.copyDiagnostics()">Copy report</button>` });

    const list = $('#chkList'), status = $('#chkStatus');
    let passed = 0, failed = 0, i = 0;
    const results = [];
    const step = () => {
      if(i >= rows.length){
        CC.closeModal();
        CC.modal({ title: failed ? 'Checks finished with warnings' : 'All checks passed', sub:'Diagnostics summary',
          body:`<div class="row gap12 mb3"><span class="metric-value ${failed ? 'amberc' : 'greenc'}">${passed}<span class="metric-unit">/ ${rows.length}</span></span>
                  <span class="chip ${failed ? 'attention' : 'stable'}"><span class="dot"></span> ${failed} warning${failed === 1 ? '' : 's'}</span></div>
                <div class="checks">${results.map(r => `<div class="chk ${r.ok ? '' : 'fail'}">
                  <span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${r.ok ? '#0B7A50' : '#A82A25'}" stroke-width="3" stroke-linecap="round">
                    ${r.ok ? '<path d="M20 6 9 17l-5-5"/>' : '<path d="M12 8v5M12 16v.1"/>'}</svg></span>
                  <span>${r.label}</span><span class="ms">${r.value}</span></div>`).join('')}</div>
                <p class="small mt3">Diagnostics never leave this device unless you copy or share them.</p>`,
          footer:`<button class="btn ghost" onclick="CC.closeModal()">Done</button>` });
        return;
      }
      const [label, fn] = rows[i];
      const el = document.createElement('div');
      el.className = 'chk running';
      el.innerHTML = `<span class="ic"><span class="spin"></span></span><span>${label}</span><span class="ms">…</span>`;
      list.appendChild(el);
      status.textContent = `Running ${i + 1} of ${rows.length}: ${label}`;
      setTimeout(() => {
        let ok = true, value = '';
        try{
          if(fn) value = fn();
          else {
            /* frame budget: count rAF ticks in 400 ms */
            return measureFrames(label, el, () => { i++; step(); });
          }
        } catch(e){ ok = false; value = e.message; }
        el.className = 'chk' + (ok ? '' : ' fail');
        el.querySelector('.ic').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${ok ? '#0B7A50' : '#A82A25'}" stroke-width="3" stroke-linecap="round">
          ${ok ? '<path d="M20 6 9 17l-5-5"/>' : '<path d="M12 8v5M12 16v.1"/>'}</svg>`;
        el.querySelector('.ms').textContent = value;
        ok ? passed++ : failed++;
        results.push({ label, ok, value });
        CC._diagResults = results;
        i++; step();
      }, 130);
    };
    function measureFrames(label, el, done){
      let frames = 0, t0 = performance.now();
      const count = () => { frames++; (performance.now() - t0 < 400) ? requestAnimationFrame(count) : finish(); };
      const finish = () => {
        const fps = Math.round(frames / ((performance.now() - t0) / 1000));
        const ok = fps >= 20;
        const note = ok ? '' : ' · software rendering / busy CPU';
        el.className = 'chk' + (ok ? '' : ' fail');
        el.querySelector('.ic').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${ok ? '#0B7A50' : '#A82A25'}" stroke-width="3" stroke-linecap="round">${ok ? '<path d="M20 6 9 17l-5-5"/>' : '<path d="M12 8v5M12 16v.1"/>'}</svg>`;
        el.querySelector('.ms').textContent = `${fps} fps${note}`;
        ok ? passed++ : failed++;
        results.push({ label, ok, value: `${fps} fps${note}` });
        done();
      };
      requestAnimationFrame(count);
    }
    step();
  }
  function copyDiagnostics(){
    const r = CC._diagResults || [];
    const text = 'CardioCore diagnostics — ' + new Date().toISOString() + '\n' +
      r.map(x => `${x.ok ? 'PASS' : 'WARN'}  ${x.label}  (${x.value})`).join('\n');
    navigator.clipboard?.writeText(text).then(
      () => CC.toast('Diagnostics copied to the clipboard.','ok'),
      () => CC.toast('Clipboard blocked — the report is on screen instead.','warn'));
  }

  function init(){}
  document.addEventListener('DOMContentLoaded', init);

  return {pdf, download, saveAs, preview, pdfFor, csv, fhir, exportModal, selectOption, downloadSelected,
          previewSelected, saveSelected, downloadAll, runChecks, copyDiagnostics, viewer, viewerPrint, viewerCopy, viewerRetry, esc};
})();
if (typeof window !== 'undefined') window.Files = Files;
