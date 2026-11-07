// Home page behaviour: nav state, reveals, hero tilt, scroll-driven needle story, rotation demo.
(() => {
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const y = $('#y'); if (y) y.textContent = new Date().getFullYear();

  /* Nav: white over violet sections, light glass over light sections */
  const nav = $('#nav');
  const darkSections = [...document.querySelectorAll('.hero, .story, .details')];
  const paintNav = () => {
    const probe = 36;
    const overDark = darkSections.some((s) => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
    nav.classList.toggle('on-light', !overDark);
  };

  /* Reveal on scroll */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* Hero: slight tilt toward the pointer (desktop only) */
  const product = $('#hero-product');
  if (product && !reduce && matchMedia('(hover: hover)').matches) {
    addEventListener('pointermove', (e) => {
      const x = e.clientX / innerWidth - 0.5, yv = e.clientY / innerHeight - 0.5;
      product.style.setProperty('--tx', `${x * 10}deg`);
      product.style.setProperty('--ty', `${-yv * 8}deg`);
    }, { passive: true });
  }

  /* Needle story: progress through the tall section drives the cartoon */
  const story = $('.story'), scene = $('#scene'), tag = $('#scene-tag');
  const steps = [...document.querySelectorAll('#steps li')];
  const labels = ['Seat', 'Bite', 'Guide', 'Watch'];
  let lastStep = -1;
  const paintStory = () => {
    if (!story) return;
    const r = story.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    const seat = clamp(p / 0.22), bite = clamp((p - 0.24) / 0.18), push = clamp((p - 0.44) / 0.46);
    scene.style.setProperty('--seat', seat.toFixed(3));
    scene.style.setProperty('--bite', bite.toFixed(3));
    scene.style.setProperty('--push', push.toFixed(3));
    scene.classList.toggle('arrived', push > 0.97);
    const i = p < 0.24 ? 0 : p < 0.44 ? 1 : p < 0.72 ? 2 : 3;
    if (i !== lastStep) {
      steps.forEach((li, n) => li.classList.toggle('active', n === i));
      tag.textContent = labels[i];
      lastStep = i;
    }
  };

  /* Rotation demo: gentle auto sweep until the visitor drags the slider */
  const arm = $('#arm'), read = $('#angle-read'), slider = $('#angle'), ticks = $('#ticks');
  if (ticks) {
    for (let a = -8; a <= 8; a += 1) {
      const rad = (a * Math.PI) / 180, r1 = 200, r2 = a % 4 === 0 ? 186 : 192;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', 200 + r1 * Math.sin(rad)); l.setAttribute('y1', 260 - r1 * Math.cos(rad));
      l.setAttribute('x2', 200 + r2 * Math.sin(rad)); l.setAttribute('y2', 260 - r2 * Math.cos(rad));
      ticks.appendChild(l);
    }
  }
  const setAngle = (a) => {
    arm.style.transform = `rotate(${a}deg)`;
    const v = Math.round(a * 2) / 2;
    read.textContent = `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}°`;
  };
  let auto = !reduce, t0 = performance.now(), dialVisible = false;
  if (slider) {
    slider.addEventListener('input', () => { auto = false; setAngle(+slider.value); });
    new IntersectionObserver(([e]) => { dialVisible = e.isIntersecting; }).observe($('.dial'));
    setAngle(0);
  }
  const loop = (now) => {
    if (auto && dialVisible) {
      const a = Math.sin((now - t0) / 1400) * 8;
      setAngle(a); slider.value = a;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { paintNav(); paintStory(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paintNav(); paintStory();
})();
