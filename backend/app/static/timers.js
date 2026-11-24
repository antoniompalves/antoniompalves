"use strict";
// Step timers: times written in a step ("15 min", "1 hora", "meia hora", "1h30", "30 segundos",
// "15-20 minutes") become tappable chips. Running timers live in a small glass tray that survives
// navigation and reloads (end times are stored, not countdowns).

const timers = (() => {
  const KEY = "timers";
  const UNIT = "(horas?|hours?|hrs?|h|minutos?|minutes?|mins?|min|segundos?|seconds?|secs?|seg|s)";
  const NUM = "(\\d+(?:[.,]\\d+)?)";
  const RE = new RegExp(`\\b(?:(meia hora|half an hour)|(\\d+)\\s*h\\s*(\\d{1,2})\\b|${NUM}(?:\\s*(?:-|–|a|to|ou|or)\\s*${NUM})?\\s*${UNIT}\\b(?!\\s*°))`, "gi");

  const toSecs = (n, unit) => {
    const u = unit.toLowerCase();
    if (/^h|^hora|^hour|^hr/.test(u)) return n * 3600;
    if (/^s|^seg|^sec/.test(u)) return n;
    return n * 60;
  };
  const fmt = s => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  };
  const label = s => s >= 3600 ? `${Math.floor(s / 3600)} h${s % 3600 ? ` ${Math.round((s % 3600) / 60)} min` : ""}` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`;

  /** Escaped step text with time phrases turned into timer buttons. */
  function linkify(text, context = "") {
    const src = String(text ?? "");
    let out = "", last = 0;
    for (const m of src.matchAll(RE)) {
      let secs;
      if (m[1]) secs = 1800;
      else if (m[2]) secs = (+m[2]) * 3600 + (+m[3]) * 60;
      else {
        const a = parseFloat(m[4].replace(",", "."));
        secs = Math.round(toSecs(a, m[6]));       // ranges start at the lower bound: check early
      }
      if (!secs || secs > 12 * 3600) continue;
      out += esc(src.slice(last, m.index)) +
        `<button type="button" class="timer-chip" data-secs="${secs}" data-ctx="${esc(context)}" aria-label="Iniciar temporizador de ${label(secs)}">` +
        `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M10 3h4"/></svg>${esc(m[0])}</button>`;
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  // ------------------------------------------------------------------ state
  let list = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };
  const remaining = t => t.paused ? t.left : (t.end - Date.now()) / 1000;
  let tick = null, audio = null;

  function start(secs, ctx) {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch {}
    list.push({ id: Math.random().toString(36).slice(2), secs, ctx, end: Date.now() + secs * 1000, paused: false, done: false });
    save(); render(); haptic(8);
    toast(`Temporizador de ${label(secs)} iniciado`);
  }

  function beep() {
    if (!audio) return;
    try {
      const t0 = audio.currentTime;
      [0, 0.35, 0.7].forEach(dt => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(0.25, t0 + dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.25);
        o.start(t0 + dt); o.stop(t0 + dt + 0.3);
      });
    } catch {}
  }

  async function finished(t) {
    t.done = true; save();
    beep();
    try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
    const body = t.ctx ? `${t.ctx}: ${label(t.secs)} terminaram` : `${label(t.secs)} terminaram`;
    try {
      if (Notification?.permission === "granted") {
        const reg = await navigator.serviceWorker?.getRegistration();
        reg?.showNotification("⏱ Tempo!", { body, tag: `timer-${t.id}`, renotify: true, data: { url: location.href } });
      }
    } catch {}
  }

  function render() {
    let tray = document.getElementById("timerTray");
    if (!list.length) { tray?.remove(); clearInterval(tick); tick = null; return; }
    if (!tray) {
      tray = document.createElement("div");
      tray.id = "timerTray"; tray.className = "timer-tray"; tray.setAttribute("role", "region"); tray.setAttribute("aria-label", "Temporizadores");
      document.body.append(tray);
      tray.addEventListener("click", e => {
        const b = e.target.closest("button[data-act]"); if (!b) return;
        const t = list.find(x => x.id === b.dataset.id); if (!t) return;
        if (b.dataset.act === "x") list = list.filter(x => x !== t);
        else if (b.dataset.act === "pause") { t.left = remaining(t); t.paused = true; }
        else if (b.dataset.act === "play") { t.end = Date.now() + t.left * 1000; t.paused = false; }
        else if (b.dataset.act === "plus") { t.done = false; t.paused ? (t.left += 60) : (t.end = Math.max(t.end, Date.now()) + 60000); }
        save(); render();
      });
    }
    for (const t of list) if (!t.done && !t.paused && remaining(t) <= 0) finished(t);
    tray.innerHTML = list.map(t => {
      const r = remaining(t);
      const done = t.done || r <= 0;
      return `<div class="timer-pill ${done ? "done" : ""} ${t.paused ? "paused" : ""}">
        <span class="t-time" aria-live="${done ? "assertive" : "off"}">${done ? "Tempo!" : fmt(r)}</span>
        ${t.ctx ? `<span class="t-ctx">${esc(t.ctx)}</span>` : ""}
        ${done ? `<button data-act="plus" data-id="${t.id}" aria-label="Mais 1 minuto">+1</button>`
               : `<button data-act="${t.paused ? "play" : "pause"}" data-id="${t.id}" aria-label="${t.paused ? "Retomar" : "Pausar"}">${t.paused ? "▶" : "❚❚"}</button>`}
        <button data-act="x" data-id="${t.id}" aria-label="Fechar temporizador">✕</button></div>`;
    }).join("");
    if (!tick) tick = setInterval(render, 500);
  }

  // Start a timer from any chip on the page (recipe steps, cook mode).
  document.addEventListener("click", e => {
    const chip = e.target.closest(".timer-chip");
    if (!chip) return;
    e.preventDefault(); e.stopPropagation();
    start(+chip.dataset.secs, chip.dataset.ctx || "");
  });
  addEventListener("DOMContentLoaded", render);

  return { linkify, start, render, _re: RE };
})();
