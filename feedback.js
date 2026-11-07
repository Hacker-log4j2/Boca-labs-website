// Feedback page: built for dentists to fill in between procedures, as fast as possible.
// One question per step, taps auto-advance, voice first, location attached in the background.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const form = $('#fb');
  const steps = [...form.querySelectorAll('.q')];
  const total = steps.length;
  const backBtn = $('#back'), skipBtn = $('#skip'), nextBtn = $('#next');
  const errorEl = $('#fb-error');
  const optional = new Set([5, 6]); // "what didn't work" and photos can be skipped
  const autoAdvance = new Set([2, 3]); // single-tap answers
  let step = 1;

  function show(n) {
    step = n;
    steps.forEach((s) => { s.hidden = +s.dataset.step !== n; });
    $('#fb-count').textContent = `${n} of ${total}`;
    $('#fb-bar').style.width = `${(n / total) * 100}%`;
    backBtn.hidden = n === 1;
    skipBtn.hidden = !optional.has(n);
    skipBtn.textContent = n === 5 ? 'Nothing, it worked' : n === total ? 'Skip & send' : 'Skip';
    nextBtn.hidden = autoAdvance.has(n);
    nextBtn.textContent = n === total ? 'Send feedback' : 'Next';
    errorEl.hidden = true;
    const current = steps[n - 1];
    current.classList.remove('enter'); void current.offsetWidth; current.classList.add('enter');
  }

  function validate(n) {
    if (n === 4) {
      const picked = [...form.querySelectorAll('input[name=anomaly]:checked')];
      if (!picked.length) return 'Tap "None" or pick the anomalies you saw.';
      if (picked.some((c) => c.dataset.other !== undefined) && !$('#anomaly-other').value.trim()) return 'Describe the other anomaly.';
    }
    if (n === 5 && !form.feedback.value.trim() && !voiceFile) return 'Hold the mic to talk, type it, or tap "Nothing, it worked".';
    return '';
  }

  const advance = () => (step < total ? show(step + 1) : send());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = validate(step);
    if (err) { errorEl.textContent = err; errorEl.hidden = false; return; }
    advance();
  });
  backBtn.addEventListener('click', () => show(step - 1));
  skipBtn.addEventListener('click', () => {
    if (step === 5) { form.feedback.value = ''; clearVoice(); }
    advance();
  });

  /* 1. Age slider */
  const age = $('#age'), ageVal = $('#age-val');
  const paintAge = () => {
    ageVal.textContent = age.value;
    const pct = ((age.value - age.min) / (age.max - age.min)) * 100;
    age.style.setProperty('--fill', `${pct}%`);
  };
  age.addEventListener('input', paintAge);
  form.querySelectorAll('[data-nudge]').forEach((b) => b.addEventListener('click', () => {
    age.value = Math.min(+age.max, Math.max(+age.min, +age.value + +b.dataset.nudge)); paintAge();
  }));
  paintAge();

  /* 2 + 3. Single-tap answers move on automatically */
  form.querySelectorAll('input[name=side], input[name=carpules]').forEach((r) => r.addEventListener('change', () => {
    const at = step;
    setTimeout(() => step === at && advance(), 200);
  }));
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input[type=text], input:not([type]), textarea, input[type=number]')) return;
    const k = e.key.toLowerCase();
    const pick = (sel) => { const r = form.querySelector(sel); if (r) { r.checked = true; r.dispatchEvent(new Event('change')); } };
    if (step === 2 && (k === 'l' || k === 'r')) pick(`input[name=side][value=${k === 'l' ? 'Left' : 'Right'}]`);
    if (step === 3 && ['1', '2', '3'].includes(k)) pick(`input[name=carpules][value="${k}"]`);
  });

  /* 4. Anomalies: "None" clears the rest; "Other" shows a text box */
  const chips = form.querySelectorAll('input[name=anomaly]');
  const otherInput = $('#anomaly-other');
  chips.forEach((c) => c.addEventListener('change', () => {
    if (c.checked && c.dataset.none !== undefined) chips.forEach((o) => { if (o !== c) o.checked = false; });
    if (c.checked && c.dataset.none === undefined) form.querySelector('[data-none]').checked = false;
    const otherOn = form.querySelector('[data-other]').checked;
    otherInput.hidden = !otherOn;
    if (otherOn && c.dataset.other !== undefined) otherInput.focus();
  }));

  /* Location: requested once on the first tap, attached quietly if allowed */
  const locVal = $('#loc-val'), locChip = $('#loc-chip');
  let locAsked = false;
  const askLocation = () => {
    if (locAsked || !navigator.geolocation) return;
    locAsked = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const la = latitude.toFixed(5), ln = longitude.toFixed(5);
      locVal.value = `${la}, ${ln} (±${Math.round(accuracy)}m) https://maps.google.com/?q=${la},${ln}`;
      locChip.hidden = false;
    }, () => {}, { enableHighAccuracy: false, timeout: 20000, maximumAge: 10 * 60 * 1000 });
  };
  document.addEventListener('pointerdown', askLocation, { once: true });
  document.addEventListener('keydown', askLocation, { once: true });

  /* 5. Hold-to-talk voice note */
  const mic = $('#mic'), recLabel = $('#rec-label'), recHint = $('#rec-hint');
  const recPlayer = $('#rec-player'), recAudio = $('#rec-audio');
  let recorder = null, chunks = [], stream = null, voiceFile = null, startedAt = 0, timer = null, holding = false;
  const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
    .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';

  async function startRec() {
    holding = true;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { recHint.textContent = 'Voice recording isn’t supported in this browser. Type it below.'; return; }
    try { stream = stream || await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { recHint.textContent = 'Microphone permission was denied. Type it below.'; return; }
    if (!holding) return;
    const mimeType = pickMime();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = finishRec;
    recorder.start();
    startedAt = Date.now();
    mic.classList.add('recording');
    recHint.textContent = 'Let go to stop';
    const tick = () => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      recLabel.textContent = `Recording… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (s >= 120) stopRec();
    };
    tick(); timer = setInterval(tick, 250);
  }
  function stopRec() { holding = false; if (recorder?.state === 'recording') recorder.stop(); }
  function finishRec() {
    clearInterval(timer);
    mic.classList.remove('recording');
    if (Date.now() - startedAt < 600) { recLabel.textContent = 'Hold to talk'; recHint.textContent = 'Hold a little longer to record'; return; }
    const type = recorder.mimeType || 'audio/webm';
    const blob = new Blob(chunks, { type });
    voiceFile = new File([blob], `voice-note.${/mp4|aac/.test(type) ? 'm4a' : 'webm'}`, { type });
    recAudio.src = URL.createObjectURL(blob);
    recPlayer.hidden = false;
    recLabel.textContent = 'Voice note added';
    recHint.textContent = 'Hold again to re-record';
    errorEl.hidden = true;
  }
  function clearVoice() {
    voiceFile = null; recAudio.removeAttribute('src'); recPlayer.hidden = true;
    recLabel.textContent = 'Hold to talk'; recHint.textContent = 'Press and hold, let go to stop';
  }
  mic.addEventListener('pointerdown', (e) => { e.preventDefault(); mic.setPointerCapture(e.pointerId); startRec(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => mic.addEventListener(t, stopRec));
  mic.addEventListener('contextmenu', (e) => e.preventDefault());
  mic.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startRec(); } });
  mic.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stopRec(); });
  $('#rec-del').addEventListener('click', clearVoice);

  /* 6. Photos: max 3, resized so a submission stays under Netlify's 8 MB limit */
  const photosEl = $('#photos'), photoInput = $('#photo-input'), addPhoto = $('.add-photo');
  let photos = [];
  function renderPhotos() {
    photosEl.querySelectorAll('.thumb').forEach((t) => t.remove());
    photos.forEach((p, i) => {
      const t = document.createElement('div');
      t.className = 'thumb';
      t.innerHTML = `<img alt="Photo ${i + 1}"><button type="button" aria-label="Remove photo ${i + 1}">✕</button>`;
      t.querySelector('img').src = p.url;
      t.querySelector('button').onclick = () => { URL.revokeObjectURL(p.url); photos.splice(i, 1); renderPhotos(); };
      photosEl.insertBefore(t, addPhoto);
    });
    addPhoto.hidden = photos.length >= 3;
  }
  async function shrink(file, max = 1600, quality = 0.82) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
      return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch { return file; }
  }
  photoInput.addEventListener('change', async () => {
    const files = [...photoInput.files].slice(0, 3 - photos.length);
    photoInput.value = '';
    for (const f of files) { const small = await shrink(f); photos.push({ file: small, url: URL.createObjectURL(small) }); }
    renderPhotos();
  });

  /* Send */
  async function send() {
    const anomalies = [...form.querySelectorAll('input[name=anomaly]:checked')].map((c) => c.value).join(', ');
    const fd = new FormData();
    fd.append('form-name', 'feedback');
    fd.append('bot_field', form.bot_field.value);
    fd.append('patient_age', age.value);
    fd.append('side', form.side.value);
    fd.append('carpules', form.carpules.value);
    fd.append('anomalies', anomalies);
    fd.append('anomalies_other', otherInput.hidden ? '' : otherInput.value.trim());
    fd.append('feedback', form.feedback.value.trim());
    fd.append('location', locVal.value);
    if (voiceFile) fd.append('voice', voiceFile);
    photos.forEach((p, i) => fd.append(`photo${i + 1}`, p.file));

    nextBtn.hidden = false; nextBtn.disabled = true; nextBtn.textContent = 'Sending…';
    try {
      const res = await fetch('/', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(res.status);
      form.hidden = true;
      $('#fb-done').hidden = false;
    } catch {
      errorEl.textContent = 'Couldn’t send right now. Please try again in a moment.';
      errorEl.hidden = false;
    } finally {
      nextBtn.disabled = false; nextBtn.textContent = 'Send feedback';
    }
  }

  // "Log another" keeps location, resets the answers, and starts over for the next patient.
  $('#again').addEventListener('click', () => {
    const keepLoc = locVal.value;
    form.reset(); locVal.value = keepLoc;
    otherInput.hidden = true; clearVoice();
    photos.forEach((p) => URL.revokeObjectURL(p.url)); photos = []; renderPhotos();
    paintAge();
    $('#fb-done').hidden = true; form.hidden = false; show(1);
  });

  show(1);
})();
