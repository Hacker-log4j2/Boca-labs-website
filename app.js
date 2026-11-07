// Boca Labs site behaviour: scroll reveal, nav state, and the feedback form.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  $('#y').textContent = new Date().getFullYear();

  // Nav border once scrolled
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- Feedback dialog ---------- */
  const dialog = $('#feedback');
  const form = $('#fb-form');
  const done = $('#fb-done');
  const errorEl = $('#fb-error');

  document.querySelectorAll('[data-open-feedback]').forEach((b) => b.addEventListener('click', () => {
    form.hidden = false; done.hidden = true; dialog.showModal();
  }));
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === dialog) dialog.close();
  });

  /* Location */
  const locBtn = $('#loc-btn'), locStatus = $('#loc-status'), locVal = $('#loc-val');
  locBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { locStatus.textContent = 'Location not supported on this device'; return; }
    locStatus.textContent = 'Getting location…';
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const la = lat.toFixed(5), ln = lng.toFixed(5);
      locVal.value = `${la}, ${ln} (±${Math.round(accuracy)}m) https://maps.google.com/?q=${la},${ln}`;
      locStatus.textContent = `✓ Location added (±${Math.round(accuracy)}m)`;
      locStatus.className = 'hint ok';
      locBtn.textContent = '📍 Update location';
    }, (err) => {
      locStatus.textContent = err.code === 1 ? 'Location permission was denied' : 'Couldn’t get location';
      locStatus.className = 'hint';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });

  /* Hold-to-record voice note */
  const mic = $('#mic'), recLabel = $('#rec-label'), recHint = $('#rec-hint');
  const recPlayer = $('#rec-player'), recAudio = $('#rec-audio');
  let recorder = null, chunks = [], stream = null, voiceFile = null, startedAt = 0, timer = null, holding = false;

  const pickMime = () => {
    if (!window.MediaRecorder) return '';
    return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
  };

  async function startRec() {
    holding = true;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      recHint.textContent = 'Voice recording isn’t supported in this browser'; return;
    }
    try {
      stream = stream || await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      recHint.textContent = 'Microphone permission was denied'; return;
    }
    if (!holding) return; // released while the permission prompt was open
    const mimeType = pickMime();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = finishRec;
    recorder.start();
    startedAt = Date.now();
    mic.classList.add('recording');
    recLabel.textContent = 'Recording… 0:00';
    recHint.textContent = 'Let go to stop';
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      recLabel.textContent = `Recording… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (s >= 120) stopRec(); // 2 minute cap keeps uploads small
    }, 250);
  }

  function stopRec() {
    holding = false;
    if (recorder && recorder.state === 'recording') recorder.stop();
  }

  function finishRec() {
    clearInterval(timer);
    mic.classList.remove('recording');
    const dur = Date.now() - startedAt;
    if (dur < 600) { recLabel.textContent = 'Hold to record'; recHint.textContent = 'Hold a little longer to record'; return; }
    const type = recorder.mimeType || 'audio/webm';
    const ext = type.includes('mp4') || type.includes('aac') ? 'm4a' : 'webm';
    const blob = new Blob(chunks, { type });
    voiceFile = new File([blob], `voice-note.${ext}`, { type });
    recAudio.src = URL.createObjectURL(blob);
    recPlayer.hidden = false;
    recLabel.textContent = 'Voice note added';
    recHint.textContent = 'Hold again to re-record';
  }

  mic.addEventListener('pointerdown', (e) => { e.preventDefault(); mic.setPointerCapture(e.pointerId); startRec(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => mic.addEventListener(t, stopRec));
  mic.addEventListener('contextmenu', (e) => e.preventDefault());
  mic.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startRec(); } });
  mic.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stopRec(); });
  $('#rec-del').addEventListener('click', () => {
    voiceFile = null; recAudio.removeAttribute('src'); recPlayer.hidden = true;
    recLabel.textContent = 'Hold to record'; recHint.textContent = 'Press and hold, let go to stop';
  });

  /* Photos (max 3, resized before upload to stay under Netlify's 8 MB limit) */
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
    } catch { return file; } // e.g. HEIC on browsers that can't decode it: send as-is
  }

  photoInput.addEventListener('change', async () => {
    const files = [...photoInput.files].slice(0, 3 - photos.length);
    photoInput.value = '';
    for (const f of files) {
      const small = await shrink(f);
      photos.push({ file: small, url: URL.createObjectURL(small) });
    }
    renderPhotos();
  });

  /* Submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const age = form.age.value.trim();
    const carpools = form.carpools.value;
    if (!age || +age < 1 || +age > 120) return showError('Please enter your age.', form.age);
    if (!carpools) return showError('Please choose how many carpools it took.');
    if (!form.feedback.value.trim() && !voiceFile && !photos.length) return showError('Add some feedback: type it, record a voice note, or add a photo.');

    const fd = new FormData();
    fd.append('form-name', 'feedback');
    fd.append('bot_field', form.bot_field.value);
    fd.append('age', age);
    fd.append('location', locVal.value);
    fd.append('carpools', carpools);
    fd.append('feedback', form.feedback.value.trim());
    if (voiceFile) fd.append('voice', voiceFile);
    photos.forEach((p, i) => fd.append(`photo${i + 1}`, p.file));

    const btn = $('#fb-submit');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch('/', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(res.status);
      form.reset(); photos = []; renderPhotos(); $('#rec-del').click();
      locVal.value = ''; locStatus.textContent = 'Optional'; locStatus.className = 'hint'; locBtn.textContent = '📍 Use my location';
      form.hidden = true; done.hidden = false;
    } catch {
      showError('Couldn’t send right now. Please try again in a moment.');
    } finally {
      btn.disabled = false; btn.textContent = 'Send feedback';
    }
  });

  function showError(msg, field) {
    errorEl.textContent = msg; errorEl.hidden = false;
    if (field) field.focus();
  }
})();
