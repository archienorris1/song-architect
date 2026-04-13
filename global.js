/* ═══════════════════════════════════════════════════
   SONG ARCHITECT — Global JS
   ═══════════════════════════════════════════════════ */

/* ── Progress Bar ────────────────────────────────── */
const pb = document.getElementById('progress-bar');
if (pb) {
  window.addEventListener('scroll', () => {
    const s = document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    pb.style.width = (s / h * 100) + '%';
  }, { passive: true });
}

/* ── Nav scroll tint ──────────────────────────────── */
const nav = document.querySelector('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 56);
  }, { passive: true });
}

/* ── Active nav link ─────────────────────────────── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

/* ── Reveal on scroll ────────────────────────────── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.13 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── Stat counters ───────────────────────────────── */
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(ease * target) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    counterObs.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

/* ── Modal ───────────────────────────────────────── */
let _lastFocused = null;

function openModal() {
  _lastFocused = document.activeElement;
  document.getElementById('modal-backdrop').classList.add('open');
  const m = document.getElementById('modal');
  m.classList.add('open');
  m.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const first = m.querySelector('input, button:not(.modal-close)');
    if (first) first.focus();
  }, 320);
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  const m = document.getElementById('modal');
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (_lastFocused) _lastFocused.focus();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const modalEl = document.getElementById('modal');
if (modalEl) {
  modalEl.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = modalEl.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault(); (e.shiftKey ? last : first).focus();
    }
  });
}

function selectPath(el, value) {
  document.querySelectorAll('.path-option').forEach(o => {
    o.classList.remove('selected'); o.setAttribute('aria-pressed','false');
  });
  el.classList.add('selected'); el.setAttribute('aria-pressed','true');
}

function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = "Sent! We'll be in touch ✓";
  btn.style.background = '#059669';
  btn.disabled = true;
  setTimeout(() => {
    closeModal();
    setTimeout(() => {
      btn.textContent = 'Send it →';
      btn.style.background = '';
      btn.disabled = false;
    }, 400);
  }, 2600);
}

/* ── Ripple ──────────────────────────────────────── */
const rippleStyle = document.createElement('style');
rippleStyle.textContent = '@keyframes ripple{to{transform:scale(8);opacity:0;}}';
document.head.appendChild(rippleStyle);

document.querySelectorAll('.btn-cta, .btn-ghost, .btn-primary, .form-submit').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const r = document.createElement('span');
    r.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,0.22);
      transform:scale(0);animation:ripple 550ms ease-out;
      left:${e.clientX-rect.left-20}px;top:${e.clientY-rect.top-20}px;
      width:40px;height:40px;pointer-events:none;`;
    this.style.position='relative'; this.style.overflow='hidden';
    this.appendChild(r); setTimeout(()=>r.remove(),600);
  });
});

/* ── Subtle parallax (hero bg) ───────────────────── */
const parallaxEl = document.querySelector('.page-hero-bg, .hero-bg-photo');
if (parallaxEl && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        parallaxEl.style.transform = `scale(1.05) translateY(${window.scrollY * 0.2}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ── Card tilt ───────────────────────────────────── */
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  document.querySelectorAll('.card-tilt').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 8;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * -8;
      card.style.transform = `translateY(-6px) perspective(900px) rotateX(${y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* ── Play buttons ────────────────────────────────── */
document.querySelectorAll('.play-btn').forEach(btn => {
  let playing = false;
  btn.addEventListener('click', () => {
    playing = !playing;
    btn.querySelector('svg').innerHTML = playing
      ? '<rect x="2" y="1" width="4" height="12" fill="white"/><rect x="8" y="1" width="4" height="12" fill="white"/>'
      : '<polygon points="3,1 13,7 3,13"/>';
    btn.setAttribute('aria-label',
      playing ? btn.getAttribute('aria-label').replace('Play','Pause')
              : btn.getAttribute('aria-label').replace('Pause','Play'));
  });
});
