/* EQ Training — site interactions (vanilla JS, no dependencies) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EQ = window.EQ || { msg: {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- Header: solid on scroll, hide on scroll down ---------- */
  const header = $('[data-header]');
  let lastY = 0;
  const onScrollHeader = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const inIce = document.body.dataset.inIce === '1';
    header.classList.toggle('is-hidden', !inIce && y > 500 && y > lastY && !header.classList.contains('nav-open'));
    lastY = y;
  };

  /* ---------- Mobile nav ---------- */
  const toggle = $('[data-nav-toggle]');
  const nav = $('#main-nav');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open);
    nav.classList.toggle('is-open', open);
    header.classList.toggle('nav-open', open);
  });

  /* ---------- Language menu: hover on desktop, tap on touch ---------- */
  const langMenu = $('[data-lang-menu]');
  if (langMenu) {
    const btn = $('.lang-current', langMenu);
    const setOpen = (on) => { langMenu.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', on); };
    btn.addEventListener('click', () => setOpen(!langMenu.classList.contains('is-open')));
    const hover = matchMedia('(hover: hover)');
    langMenu.addEventListener('mouseenter', () => { if (hover.matches) btn.setAttribute('aria-expanded', 'true'); });
    langMenu.addEventListener('mouseleave', () => { if (hover.matches) setOpen(false); });
    langMenu.addEventListener('focusout', (e) => { if (!langMenu.contains(e.relatedTarget)) setOpen(false); });
    document.addEventListener('click', (e) => { if (!langMenu.contains(e.target)) setOpen(false); });
    langMenu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); btn.focus(); } });
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el, i) => {
    const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('reveal')) : [];
    el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 70 + 'ms';
    io.observe(el);
  });

  /* ---------- Count-up numbers ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.count;
      countIO.unobserve(el);
      if (reduced) return;
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Hero rotator (torch-style tab bar) ---------- */
  const rot = $('[data-rotator]');
  if (rot) {
    // Only the first phrase is in the HTML (clean H1); the others are decorative and added here.
    const holder = $('[data-words]', rot);
    if (holder) JSON.parse(holder.dataset.words).forEach((w) => {
      const s = document.createElement('span');
      s.className = 'rotator-word'; s.dataset.rotWord = ''; s.setAttribute('aria-hidden', 'true'); s.textContent = w;
      holder.appendChild(s);
    });
    const words = $$('[data-rot-word]', rot), proofs = $$('[data-rot-proof]', rot), tabs = $$('[data-rot-tab]', rot);
    const count = $('[data-rot-count]', rot), bar = $('.hero-tabs', rot);
    const MS = 5000;
    bar.style.setProperty('--rot-ms', MS + 'ms');
    let i = 0, timer = null;
    const go = (n) => {
      const prev = i;
      i = (n + words.length) % words.length;
      if (prev !== i) {
        words[prev].classList.add('is-leaving');
        setTimeout(() => words[prev].classList.remove('is-leaving'), 600);
      }
      [words, proofs].forEach((arr) => arr.forEach((el, k) => el.classList.toggle('is-active', k === i)));
      tabs.forEach((el, k) => {
        el.classList.remove('is-active'); el.setAttribute('aria-selected', k === i);
        void el.offsetWidth; // restart fill animation
        if (k === i) el.classList.add('is-active');
      });
      count.textContent = i + 1;
      schedule();
    };
    const schedule = () => { clearTimeout(timer); if (!reduced) timer = setTimeout(() => go(i + 1), MS); };
    tabs.forEach((t, k) => t.addEventListener('click', () => go(k)));
    rot.addEventListener('mouseenter', () => { clearTimeout(timer); bar.classList.add('is-paused'); });
    rot.addEventListener('mouseleave', () => { bar.classList.remove('is-paused'); go(i); });
    schedule();
  }

  /* ---------- ICEBERG pinned-scroll story ----------
     Static without JS or with reduced motion; .is-live turns it into the pinned story.
     Scroll map (fraction of the pinned distance): steps 0–1 above water, a text-free
     dive, then steps 2–7 below the surface. */
  const ice = $('[data-ice]');
  let updateIce = () => {};
  if (ice && !reduced) {
    ice.classList.add('is-live');
    const stage = $('.ice-stage', ice), scene = $('[data-ice-scene]', ice), svg = $('.ice-svg', ice);
    const items = $$('[data-steps]', ice).map((el) => {
      const [a, b] = el.dataset.steps.split('-').map(Number);
      return [el, a, b === undefined || Number.isNaN(b) ? a : b];
    });
    const focus = $$('[data-focus]', ice), dots = $$('[data-dot]', ice);
    const STARTS = [0, .11, .30, .41, .52, .63, .75, .87]; // where each step begins
    const DIVE = [.22, .30];                                // camera dives here, no text on screen
    const ART = { peak: 159, water: 720, cx: 900, bergW: 800, w: 1440, h: 2000 }; // SVG units (tools/iceberg_gen.py)
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const smooth = (t) => t * t * (3 - 2 * t);
    let L = {}, target = 0, current = 0, raf = 0, lastStep = null;

    // Frame the iceberg for this viewport: waterline ~74% down, peak clear of the header.
    const layout = () => {
      const vw = innerWidth, vh = stage.clientHeight || innerHeight, hh = header.offsetHeight;
      const narrow = vw <= 960;
      const water = vh * (narrow ? .72 : .74);
      let s = (water - hh - (narrow ? 40 : 56)) / (ART.water - ART.peak);
      if (narrow) s = Math.min(s, (vw * 1.08) / ART.bergW);
      s = clamp(s, .4, 1.6);
      const top = water - ART.water * s, left = vw * (narrow ? .56 : .66) - ART.cx * s;
      Object.assign(svg.style, { width: ART.w * s + 'px', height: ART.h * s + 'px', left: left + 'px', top: top + 'px' });
      L = { vh, dive: water - vh * .12, sink: vh * .4, maxPan: Math.max(0, top + ART.h * s - vh) };
    };

    const stepAt = (p) => {
      if (p >= DIVE[0] && p < DIVE[1]) return 'dive';
      let k = 0;
      STARTS.forEach((s, i) => { if (p >= s) k = i; });
      return k;
    };
    const setStep = (step) => {
      if (step === lastStep) return;
      lastStep = step;
      stage.dataset.step = step;
      const n = step === 'dive' ? -1 : step;
      items.forEach(([el, a, b]) => { el.classList.toggle('is-on', n >= a && n <= b); el.classList.toggle('is-now', n === a); });
      focus.forEach((el) => el.classList.toggle('is-focus', n === +el.dataset.focus));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === (step === 'dive' ? 1 : n)));
    };
    // Camera eases towards its target so wheel scrolling feels continuous, not stepped.
    const animate = () => {
      current += (target - current) * .14;
      if (Math.abs(target - current) < .3) current = target;
      scene.style.setProperty('--pan', current.toFixed(1));
      raf = current !== target ? requestAnimationFrame(animate) : 0;
    };

    updateIce = () => {
      const r = ice.getBoundingClientRect(), total = r.height - L.vh;
      const p = clamp(-r.top / total, 0, 1);
      document.body.dataset.inIce = (r.top <= 1 && r.bottom >= L.vh - 1) ? '1' : '0';
      const dive = smooth(clamp((p - DIVE[0]) / (DIVE[1] - DIVE[0]), 0, 1));
      const sink = clamp((p - DIVE[1]) / (1 - DIVE[1]), 0, 1);
      target = Math.min(L.maxPan, dive * L.dive + sink * L.sink);
      if (!raf) raf = requestAnimationFrame(animate);
      setStep(stepAt(p));
    };

    const scrollToStep = (k, animated) => {
      const total = ice.offsetHeight - innerHeight;
      const end = k === 1 ? DIVE[0] : (k < 7 ? STARTS[k + 1] : 1);
      scrollTo({ top: ice.offsetTop + total * ((STARTS[k] + end) / 2), behavior: animated ? 'smooth' : 'instant' });
    };
    dots.forEach((d, k) => d.addEventListener('click', () => scrollToStep(k, true)));
    // Keyboard: focusing a link inside a hidden step brings that step on screen.
    ice.addEventListener('focusin', (e) => {
      const host = e.target.closest('[data-steps]');
      if (host && !host.classList.contains('is-on')) scrollToStep(parseInt(host.dataset.steps, 10), false);
    });
    addEventListener('resize', () => { layout(); updateIce(); });

    layout(); updateIce();
    current = target; scene.style.setProperty('--pan', current.toFixed(1));
  }

  /* ---------- Problem → solution switcher (course page) ---------- */
  $$('[data-ps]').forEach((ps) => {
    const tabs = $$('[data-ps-tab]', ps), panels = $$('[data-ps-panel]', ps);
    let auto = null, idx = 0;
    const show = (n, user) => {
      idx = n;
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === n); t.setAttribute('aria-selected', k === n); });
      panels.forEach((p, k) => {
        p.hidden = k !== n; p.classList.toggle('is-active', k === n);
        if (k === n) { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; }
      });
      if (user) clearInterval(auto);
    };
    tabs.forEach((t, k) => {
      t.addEventListener('click', () => show(k, true));
      t.addEventListener('mouseenter', () => matchMedia('(hover: hover)').matches && show(k, true));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const n = (idx + (e.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
          show(n, true); tabs[n].focus();
        }
      });
    });
    // Auto-advance while visible, until the user interacts
    if (!reduced) {
      new IntersectionObserver(([en]) => {
        clearInterval(auto);
        if (en.isIntersecting) auto = setInterval(() => show((idx + 1) % tabs.length), 4500);
      }, { threshold: 0.5 }).observe(ps);
      ps.addEventListener('pointerdown', () => clearInterval(auto), { once: true });
    }
  });

  /* ---------- Programme page: participant app screens ---------- */
  $$('[data-screens]').forEach((box) => {
    const tabs = $$('[data-screen-tab]', box), panels = $$('[data-screen-panel]', box), imgs = $$('[data-screen-img]', box);
    const show = (n) => {
      tabs.forEach((t, k) => { const on = k === n; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      panels.forEach((p, k) => { p.hidden = k !== n; });
      imgs.forEach((im, k) => { im.hidden = k !== n; });
    };
    tabs.forEach((t, k) => {
      t.addEventListener('click', () => show(k));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = (k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        show(n); tabs[n].focus();
      });
    });
  });

  /* ---------- Goleman model: tap a domain to focus it ---------- */
  $$('[data-model]').forEach((m) => {
    const ds = $$('[data-domain]', m);
    ds.forEach((d) => d.addEventListener('click', () => {
      const on = !d.classList.contains('is-active');
      ds.forEach((x) => { x.classList.remove('is-active'); x.setAttribute('aria-pressed', 'false'); });
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-pressed', on);
      m.classList.toggle('has-active', on);
    }));
  });

  /* ---------- Services: audience tabs (deep-linkable via #ceos, #teams, #orgs, #keynotes) ---------- */
  const audWrap = $('[data-aud-tabs]');
  if (audWrap) {
    const tabs = $$('[data-aud-tab]'), panels = $$('[data-aud-panel]');
    const ids = tabs.map((t) => t.dataset.audTab);
    const select = (id, scroll) => {
      if (!ids.includes(id)) return;
      tabs.forEach((t) => { const on = t.dataset.audTab === id; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
      panels.forEach((p) => { p.hidden = p.dataset.audPanel !== id; });
      if (scroll) {
        const y = $('.svc-panels').getBoundingClientRect().top + scrollY - 160;
        if (scrollY > y + 40 || scrollY < y - 400) scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      }
    };
    tabs.forEach((t) => {
      t.addEventListener('click', () => { select(t.dataset.audTab, true); history.replaceState(null, '', '#' + t.dataset.audTab); });
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = ids.indexOf(t.dataset.audTab) + (e.key === 'ArrowRight' ? 1 : -1);
        const n = tabs[(i + tabs.length) % tabs.length]; n.focus(); n.click();
      });
    });
    const fromHash = () => select(location.hash.slice(1), false);
    addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ---------- Press filter ---------- */
  $$('[data-press-filter]').forEach((bar) => {
    const btns = $$('button', bar), cards = $$('.press-card');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', x === b); });
      cards.forEach((c) => { c.hidden = b.dataset.f !== 'all' && c.dataset.type !== b.dataset.f; c.classList.add('is-in'); });
    }));
  });

  /* ---------- Blog: category filter + "more articles" (no JS = every card is shown) ---------- */
  const blog = $('[data-blog]');
  if (blog) {
    const bar = $('[data-blog-filter]', blog), btns = bar ? $$('button', bar) : [];
    const lead = $('.post-lead', blog), grid = $('[data-blog-grid]', blog), cards = $$('.post-card', grid);
    const more = $('[data-blog-more]', blog), status = $('[data-blog-status]', blog);
    const per = +grid.dataset.per || 12;
    let cat = '', shown = per;
    // The lead post is also in the grid as a hidden copy, used only while a category is selected.
    const pool = () => cards.filter((c) => (c.hasAttribute('data-lead-dup') ? cat && c.dataset.cat === cat : !cat || c.dataset.cat === cat));
    const render = (user) => {
      const list = pool();
      if (lead) lead.hidden = !!cat;
      cards.forEach((c) => { c.hidden = true; });
      list.forEach((c, i) => { c.hidden = i >= shown; if (user && !c.hidden) c.classList.add('is-in'); });
      if (more) more.hidden = list.length <= shown;
      if (user && status) status.textContent = status.dataset.tpl.replace('%d', list.length + (!cat && lead ? 1 : 0));
      return list;
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      cat = b.dataset.cat; shown = per;
      btns.forEach((x) => x.setAttribute('aria-pressed', x === b));
      render(true);
    }));
    more?.addEventListener('click', () => {
      const from = shown, total = pool().length;
      shown = total - (shown + per) < 4 ? total : shown + per;   // no lonely last batch
      const next = render(true)[from];
      next?.querySelector('a')?.focus({ preventScroll: true });
    });
    if (bar) bar.hidden = false;
    render(false);
  }

  /* ---------- YouTube lightbox (privacy-enhanced, loads only on click) ---------- */
  const vModal = $('[data-video-modal]');
  if (vModal) {
    const frame = $('[data-video-frame]', vModal), ytLink = $('[data-video-yt]', vModal);
    const closeV = () => { frame.innerHTML = ''; if (vModal.open) vModal.close(); };
    $$('[data-yt]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.yt.replace(/[^\w-]/g, '');
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Video"></iframe>';
      ytLink.href = 'https://www.youtube.com/watch?v=' + id;
      vModal.showModal();
    }));
    $('[data-video-close]', vModal).addEventListener('click', closeV);
    vModal.addEventListener('click', (e) => { if (e.target === vModal) closeV(); });
    vModal.addEventListener('close', () => { frame.innerHTML = ''; });
  }

  /* ---------- Ecosystem rings <-> list ---------- */
  $$('[data-eco]').forEach((eco) => {
    const items = $$('[data-eco-item]', eco), rings = $$('[data-ring]', eco), labels = $$('[data-ring-label]', eco);
    const set = (n) => {
      items.forEach((it) => {
        const on = +it.dataset.ecoItem === n;
        it.classList.toggle('is-active', on); it.setAttribute('aria-expanded', on);
        it.nextElementSibling.hidden = !on;
      });
      rings.forEach((r) => { const k = +r.dataset.ring; r.classList.toggle('is-active', k === n); r.classList.toggle('is-inner', k < n); });
      labels.forEach((l) => l.classList.toggle('is-on', +l.dataset.ringLabel <= n));
    };
    items.forEach((it) => it.addEventListener('click', () => set(+it.dataset.ecoItem)));
    rings.forEach((r) => r.addEventListener('click', () => set(+r.dataset.ring)));
    $$('[data-goto-tab]', eco).forEach((a) => a.addEventListener('click', (e) => {
      const tab = $('[data-aud-tab="' + a.dataset.gotoTab + '"]');
      if (tab) { e.preventDefault(); tab.click(); }
    }));
    set(0);
  });

  /* ---------- Lead submission helper ---------- */
  const sendLead = async (form, extra = {}) => {
    const fd = new FormData(form);
    fd.append('csrf', EQ.csrf);
    Object.entries(extra).forEach(([k, v]) => fd.set(k, v));
    const res = await fetch(EQ.leadUrl, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || res.status);
    return json;
  };

  /* ---------- Contact form ---------- */
  $$('[data-lead-form]').forEach((form) => {
    const status = $('.form-status', form), btn = $('button[type=submit]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach((f) => {
        const bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle('is-invalid', bad);
        if (bad) ok = false;
      });
      status.className = 'form-status';
      if (!ok) { status.textContent = EQ.msg.invalid; status.classList.add('err'); return; }
      const label = btn.innerHTML;
      btn.disabled = true; btn.textContent = EQ.msg.sending;
      try {
        await sendLead(form);
        form.reset();
        status.textContent = EQ.msg.ok; status.classList.add('ok');
      } catch (err) {
        status.textContent = EQ.msg.err; status.classList.add('err');
      } finally {
        btn.disabled = false; btn.innerHTML = label;
      }
    });
  });

  /* ---------- DAMIANA video agent ---------- */
  const agent = $('[data-agent]');
  if (agent) {
    const panel = $('#agent-panel'), toggleBtn = $('[data-agent-toggle]', agent);
    const video = $('[data-agent-video]', agent), soundBtn = $('[data-agent-sound]', agent);
    const soundLbl = $('[data-agent-sound-label]', agent), teaser = $('[data-agent-teaser]', agent);
    const form = $('[data-agent-form]', agent), emailRow = $('.agent-email', agent), status = $('.agent-status', agent);

    const setSound = (on) => {
      if (!video) return;
      video.muted = !on;
      soundBtn?.setAttribute('aria-pressed', on);
      if (soundLbl) soundLbl.textContent = on ? EQ.msg.mute : EQ.msg.unmute;
    };
    const open = (withSound = false) => {
      agent.dataset.state = 'open';
      panel.hidden = false;
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.setAttribute('aria-label', toggleBtn.dataset.labelClose);
      if (teaser) teaser.hidden = true;
      store.set('eq_agent_seen', '1');
      if (video) {
        if (withSound) { video.currentTime = 0; setSound(true); }
        video.play().catch(() => { setSound(false); video.play().catch(() => {}); });
      }
    };
    const close = () => {
      agent.dataset.state = 'closed';
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', toggleBtn.dataset.labelOpen);
      if (video) { video.pause(); setSound(false); }
    };

    toggleBtn.addEventListener('click', () => (agent.dataset.state === 'open' ? close() : open(true)));
    teaser?.addEventListener('click', () => open(true));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && agent.dataset.state === 'open') { close(); toggleBtn.focus(); } });

    soundBtn?.addEventListener('click', () => {
      const on = video.muted;
      if (on) video.currentTime = 0;
      setSound(on);
      video.play().catch(() => {});
    });

    // Any "book a meeting" CTA on the page opens Damiana instead of navigating
    $$('[data-open-agent]').forEach((el) => el.addEventListener('click', (e) => {
      e.preventDefault();
      if (nav?.classList.contains('is-open')) toggle.click();
      open(true);
    }));

    // Gentle teaser after a few seconds, once per session
    if (teaser && !store.get('eq_agent_seen')) {
      setTimeout(() => { if (agent.dataset.state !== 'open') teaser.hidden = false; }, 6000);
    }

    // Ask form: message → email → send
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = form.elements.message, em = form.elements.email;
      if (!q.value.trim()) { q.focus(); return; }
      if (emailRow.hidden) { emailRow.hidden = false; em.focus(); return; }
      if (!/^\S+@\S+\.\S+$/.test(em.value)) { em.focus(); status.textContent = EQ.msg.invalid; return; }
      status.textContent = EQ.msg.sending;
      try {
        await sendLead(form, { name: '' });
        form.reset(); emailRow.hidden = true;
        status.textContent = EQ.msg.thanks;
      } catch (err) {
        status.textContent = EQ.msg.err;
      }
    });
  }

  /* ---------- Scroll loop ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateIce(); onScrollHeader(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateIce(); onScrollHeader();
})();
