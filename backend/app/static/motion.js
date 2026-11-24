"use strict";
// Tiny dependency-free motion kit following Apple's "Designing Fluid Interfaces":
// springs parameterised by damping ratio + response, velocity handoff,
// momentum projection, rubber-banding and a pointer velocity tracker.

const motion = (() => {
  const mq = q => window.matchMedia?.(q);
  const reduceMQ = mq("(prefers-reduced-motion: reduce)");
  const reducedMotion = () => !!reduceMQ?.matches;

  /**
   * A 1-D spring that always animates from its *current* value and velocity, so
   * retargeting mid-flight (interruption, gesture reversal) never jumps or hits a
   * "brick wall". damping: 1 = no overshoot, <1 = bouncy. response: seconds (not duration).
   */
  class Spring {
    constructor({ value = 0, damping = 1, response = 0.4, onUpdate = () => {}, onRest = () => {} } = {}) {
      Object.assign(this, { value, velocity: 0, target: value, damping, response, onUpdate, onRest });
      this.raf = 0;
    }
    get running() { return this.raf !== 0; }
    /** Jump without animating (used while a finger is tracking 1:1). */
    set(value) { this.stop(); this.value = this.target = value; this.velocity = 0; this.onUpdate(value); }
    stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
    /** Animate to target. `velocity` is the gesture's release velocity in units/s. */
    to(target, { velocity, damping, response } = {}) {
      this.target = target;
      if (velocity !== undefined) this.velocity = velocity;
      if (damping !== undefined) this.damping = damping;
      if (response !== undefined) this.response = response;
      if (reducedMotion()) { // no travel: settle instantly; CSS handles a gentle cross-fade
        this.set(target); this.onRest(target); return this;
      }
      if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(t => this.tick(t)); }
      return this;
    }
    tick(now) {
      // Apple's mapping: stiffness = (2π / response)², damping coefficient = 4π·ζ / response (mass 1)
      const k = (2 * Math.PI / this.response) ** 2;
      const c = 4 * Math.PI * this.damping / this.response;
      let dt = Math.min(0.064, (now - this.last) / 1000);
      this.last = now;
      const step = 1 / 240; // fixed sub-steps keep the integration stable at any frame rate
      while (dt > 0) {
        const h = Math.min(step, dt);
        const a = -k * (this.value - this.target) - c * this.velocity;
        this.velocity += a * h;
        this.value += this.velocity * h;
        dt -= h;
      }
      if (Math.abs(this.velocity) < 2 && Math.abs(this.value - this.target) < 0.25) {
        this.value = this.target; this.velocity = 0; this.raf = 0;
        this.onUpdate(this.value); this.onRest(this.value);
        return;
      }
      this.onUpdate(this.value);
      this.raf = requestAnimationFrame(t => this.tick(t));
    }
  }

  /** Apple's projection: where a flick would come to rest (scroll-style exponential decay). */
  const project = (velocity, decelerationRate = 0.998) =>
    (velocity / 1000) * decelerationRate / (1 - decelerationRate);

  /** Soft boundary: the further past the edge, the less the element follows. */
  const rubberband = (overshoot, dimension, constant = 0.55) =>
    (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

  /** Keeps ~100ms of pointer history to compute release velocity (px/s). */
  class VelocityTracker {
    constructor() { this.pts = []; }
    add(x, y, t = performance.now()) {
      this.pts.push({ x, y, t });
      while (this.pts.length > 2 && t - this.pts[0].t > 100) this.pts.shift();
    }
    velocity() {
      const p = this.pts;
      if (p.length < 2) return { x: 0, y: 0 };
      const a = p[0], b = p[p.length - 1], dt = (b.t - a.t) / 1000;
      if (dt <= 0 || performance.now() - b.t > 80) return { x: 0, y: 0 }; // finger stopped before lifting
      return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
    }
  }

  /**
   * Pointer drag recogniser with ~10px hysteresis and axis locking.
   * handlers: { start(e) -> bool, move({dx, dy, axis}), end({dx, dy, vx, vy, axis}), axes: 'x'|'y'|'xy' }
   */
  function drag(el, handlers) {
    const { axes = "xy", slop = 10 } = handlers;
    let s = null;
    // Moves and release are tracked on the window: the move that crosses the slop
    // threshold may already be outside `el` (e.g. pulling a sheet upward over the scrim).
    const onMove = e => {
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
      s.vt.add(e.clientX, e.clientY);
      if (!s.axis) {
        if (Math.hypot(dx, dy) < slop) return;
        const axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (!axes.includes(axis)) { cleanup(); return; } // not our gesture: let the browser have it
        s.axis = axis;
        try { el.setPointerCapture(e.pointerId); } catch {}
        handlers.begin?.({ axis });
      }
      handlers.move({ dx, dy, axis: s.axis });
    };
    const onEnd = e => {
      if (!s || e.pointerId !== s.id) return;
      const cur = s; cleanup();
      if (!cur.axis) return;
      const v = e.type === "pointercancel" ? { x: 0, y: 0 } : cur.vt.velocity();
      handlers.end({ dx: e.clientX - cur.x0, dy: e.clientY - cur.y0, vx: v.x, vy: v.y, axis: cur.axis });
    };
    const cleanup = () => {
      s = null;
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onEnd);
      removeEventListener("pointercancel", onEnd);
    };
    el.addEventListener("pointerdown", e => {
      if (e.button !== 0 || s || (handlers.start && handlers.start(e) === false)) return;
      // Mouse: stop text selection / native drag-and-drop from hijacking the gesture (it fires pointercancel).
      if (e.pointerType === "mouse" && !e.target.closest("input, textarea, select, [contenteditable]")) e.preventDefault();
      s = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: null, vt: new VelocityTracker() };
      s.vt.add(e.clientX, e.clientY);
      addEventListener("pointermove", onMove);
      addEventListener("pointerup", onEnd);
      addEventListener("pointercancel", onEnd);
    });
  }

  /** Light haptic tick for meaningful moments only (no-op where unsupported, e.g. iOS Safari). */
  const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };

  return { Spring, project, rubberband, VelocityTracker, drag, haptic, reducedMotion };
})();
