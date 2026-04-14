/* ═══════════════════════════════════════════════════
   SONG ARCHITECT — Global JS v2
   UI/UX Pro Max: Interactive Cursor + Particles +
   Magnetic Buttons + Parallax + Waveform + All effects
   ═══════════════════════════════════════════════════ */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

/* ── Custom Cursor ────────────────────────────────── */
if (!prefersReduced && !isMobile()) {
  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursor-dot');

  if (cursor && dot) {
    let mx = 0, my = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      // Dot follows instantly
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    });

    // Outer ring lerps behind
    let raf;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function animateCursor() {
      cx = lerp(cx, mx, 0.12);
      cy = lerp(cy, my, 0.12);
      cursor.style.left = cx + 'px';
      cursor.style.top  = cy + 'px';
      raf = requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Cursor state changes
    document.addEventListener('mouseover', e => {
      const t = e.target;
      if (t.matches('a, button, [role="button"], .bento-card, .card, .testi-card, .path-option, .faq-q, .filter-btn, .track-card')) {
        document.body.classList.add('cursor-hover');
      } else if (t.matches('input, textarea, select')) {
        document.body.classList.add('cursor-text');
      }
    });
    document.addEventListener('mouseout', () => {
      document.body.classList.remove('cursor-hover', 'cursor-text', 'cursor-click');
    });
    document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
    document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));
    document.addEventListener('mouseleave', () => {
      if (cursor) cursor.style.opacity = '0';
      if (dot) dot.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      if (cursor) cursor.style.opacity = '1';
      if (dot) dot.style.opacity = '1';
    });
  }
}

/* ── Reading Progress Bar ─────────────────────────── */
const pb = document.getElementById('progress-bar');
if (pb) {
  window.addEventListener('scroll', () => {
    const s = document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    pb.style.width = Math.min(s / h * 100, 100) + '%';
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
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── Stagger children ────────────────────────────── */
const staggerObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      staggerObs.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.stagger-children').forEach(el => staggerObs.observe(el));

/* ── Animated number counters ────────────────────── */
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(ease * target) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    counterObs.unobserve(el);
  });
}, { threshold: 0.6 });
document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

/* ── Floating ambient particles ──────────────────── */
if (!prefersReduced) {
  const heroSection = document.querySelector('.hero, .page-hero');
  if (heroSection) {
    const container = document.createElement('div');
    container.className = 'particles-container';
    container.setAttribute('aria-hidden', 'true');
    heroSection.appendChild(container);

    const colors = ['rgba(163,122,250,', 'rgba(52,211,153,', 'rgba(99,102,241,', 'rgba(167,139,250,'];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1.5;
      const x = Math.random() * 100;
      const delay = Math.random() * 12;
      const duration = Math.random() * 10 + 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${x}%; bottom:${Math.random() * 60}%;
        background:${color}0.8);
        box-shadow: 0 0 ${size * 3}px ${color}0.6);
        animation-duration:${duration}s;
        animation-delay:${delay}s;
      `;
      container.appendChild(p);
    }
  }
}

/* ── Animated waveform bars in hero ──────────────── */
if (!prefersReduced) {
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    const waveEl = document.createElement('div');
    waveEl.className = 'wave-ambient';
    waveEl.setAttribute('aria-hidden', 'true');
    heroEl.appendChild(waveEl);

    const barHeights = [15,35,60,45,80,55,90,40,70,30,85,50,65,25,75,45,55,35,80,20,60,40,70,30,50,65,45,80,35,55,90,25];
    barHeights.forEach((h, i) => {
      const bar = document.createElement('div');
      bar.className = 'wa-bar';
      bar.style.cssText = `height:${h}%;animation-delay:${(i * 0.07).toFixed(2)}s;animation-duration:${(1.8 + Math.random() * 1.2).toFixed(2)}s;`;
      waveEl.appendChild(bar);
    });
  }
}

/* ── Magnetic button effect ──────────────────────── */
if (!prefersReduced && !isMobile()) {
  document.querySelectorAll('.btn-cta, .btn-primary, .nav-cta').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
      btn.style.transform = `translate(${x}px, ${y}px) scale(1.03)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.transition = 'transform 400ms cubic-bezier(0.16,1,0.3,1)';
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.transition = 'transform 100ms ease-out';
    });
  });
}

/* ── Card 3D tilt ────────────────────────────────── */
if (!prefersReduced && !isMobile()) {
  document.querySelectorAll('.card-tilt').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 7;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * -7;
      card.style.transform = `translateY(-6px) perspective(800px) rotateX(${y}deg) rotateY(${x}deg)`;
      // Subtle shine layer
      const shine = card.querySelector('.card-shine');
      if (shine) {
        const px = ((e.clientX - r.left) / r.width) * 100;
        const py = ((e.clientY - r.top)  / r.height) * 100;
        shine.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.06) 0%, transparent 60%)`;
      }
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      const shine = card.querySelector('.card-shine');
      if (shine) shine.style.background = '';
    });

    // Add shine layer
    const shine = document.createElement('div');
    shine.className = 'card-shine';
    shine.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;transition:background 200ms;z-index:1;';
    card.style.position = card.style.position || 'relative';
    card.appendChild(shine);
  });
}

/* ── Parallax hero background ────────────────────── */
if (!prefersReduced) {
  let ticking = false;
  const parallaxTargets = document.querySelectorAll('.hero-bg, .hero-bg-photo, .final-bg');
  if (parallaxTargets.length) {
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const sy = window.scrollY;
          parallaxTargets.forEach(el => {
            el.style.transform = `scale(1.06) translateY(${sy * 0.18}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
}

/* ── Ripple effect on buttons ────────────────────── */
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripple { to { transform:scale(8); opacity:0; } }
  .ripple-dot { position:absolute; border-radius:50%; background:rgba(255,255,255,0.2); transform:scale(0); animation:ripple 600ms ease-out; pointer-events:none; }
`;
document.head.appendChild(rippleStyle);

document.querySelectorAll('.btn-cta, .btn-ghost, .btn-primary, .form-submit').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'ripple-dot';
    r.style.cssText = `left:${e.clientX-rect.left-20}px;top:${e.clientY-rect.top-20}px;width:40px;height:40px;`;
    const prev = this.style.position;
    if (!prev || prev === 'static') this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(r);
    setTimeout(() => r.remove(), 650);
  });
});

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
    const first = m.querySelector('input, button:not(.modal-close), [tabindex="0"]');
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
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
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
  const orig = btn.textContent;
  btn.textContent = "Sent! We'll be in touch ✓";
  btn.style.background = 'linear-gradient(135deg, #059669, #047857)';
  btn.disabled = true;
  setTimeout(() => {
    closeModal();
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
      btn.disabled = false;
    }, 400);
  }, 2800);
}

/* ── FAQ accordion ───────────────────────────────── */
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('open');
    const q = i.querySelector('.faq-q');
    if (q) q.setAttribute('aria-expanded','false');
  });
  if (!isOpen) {
    item.classList.add('open');
    el.setAttribute('aria-expanded','true');
  }
}

/* ── Work page filter ────────────────────────────── */
function filterTracks(btn, genre) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.track-card').forEach(card => {
    const show = genre === 'all' || card.dataset.genre === genre;
    card.style.display = show ? '' : 'none';
    if (show) {
      card.style.animation = 'none';
      card.offsetHeight; // reflow
      card.style.animation = '';
    }
  });
}

/* ── Contact page path toggle ────────────────────── */
function togPath(el, val) {
  document.querySelectorAll('.ptog').forEach(p => {
    p.classList.remove('sel'); p.setAttribute('aria-pressed','false');
  });
  el.classList.add('sel'); el.setAttribute('aria-pressed','true');
}
function submitContact(e) {
  e.preventDefault();
  const btn = document.getElementById('c-btn');
  btn.textContent = "Sent! We'll be in touch soon ✓";
  btn.style.background = 'linear-gradient(135deg,#059669,#047857)';
  btn.disabled = true;
}

/* ── Play button state toggle ────────────────────── */
document.querySelectorAll('.play-btn').forEach(btn => {
  let playing = false;
  btn.addEventListener('click', () => {
    playing = !playing;
    btn.querySelector('svg').innerHTML = playing
      ? '<rect x="3" y="2" width="3.5" height="12" fill="white" rx="1"/><rect x="9" y="2" width="3.5" height="12" fill="white" rx="1"/>'
      : '<polygon points="3,1 13,7 3,13"/>';
    btn.setAttribute('aria-label', playing
      ? btn.getAttribute('aria-label').replace('Play','Pause')
      : btn.getAttribute('aria-label').replace('Pause','Play'));
  });
});

/* ── Gradient text shimmer on headings ───────────── */
if (!prefersReduced) {
  document.querySelectorAll('.section-heading, h1').forEach(el => {
    if (!el.querySelector('.gradient-text')) return;
    // already animated via CSS
  });
}

/* ── Platform strip hover glow ───────────────────── */
document.querySelectorAll('.platform').forEach(p => {
  p.addEventListener('mouseenter', () => {
    p.style.textShadow = '0 0 20px rgba(163,122,250,0.5)';
  });
  p.addEventListener('mouseleave', () => {
    p.style.textShadow = '';
  });
});

/* ── Intersection count trigger for non-data-count stats ── */
const statObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.transform = 'scale(1)';
      e.target.style.opacity = '1';
      statObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num:not([data-count])').forEach(el => {
  el.style.transform = 'scale(0.8)';
  el.style.opacity = '0';
  el.style.transition = 'transform 600ms cubic-bezier(0.16,1,0.3,1), opacity 600ms ease-out';
  statObs.observe(el);
});

/* ── Scroll-triggered section chapter colors ─────── */
if (!prefersReduced) {
  const sections = document.querySelectorAll('.section');
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > 0.3) {
        // subtle pulse on section enter
        e.target.style.transition = 'opacity 400ms ease';
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => sectionObs.observe(s));
}
