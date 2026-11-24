"use strict";
// Hands-free cooking: voice commands (Web Speech API, pt-PT) and steps read aloud.
// Feature-detected: without speech recognition, steps can still be read aloud.

const handsFree = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canListen = !!SR;
  const canSpeak = "speechSynthesis" in window;
  const NUMS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
                 onze: 11, doze: 12, treze: 13, catorze: 14, quinze: 15, dezasseis: 16, dezassete: 17, dezoito: 18, dezanove: 19,
                 vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, noventa: 90 };
  const strip = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  /** "temporizador de vinte e cinco minutos" -> 1500; "meia hora" -> 1800 */
  function parseTimer(t) {
    if (/meia hora/.test(t)) return 1800;
    const m = t.match(/((?:\d+|[a-z]+)(?:\s+e\s+(?:\d+|[a-z]+))?)\s+(minutos?|segundos?|horas?)/);
    if (!m) return null;
    const n = m[1].split(/\s+e\s+/).reduce((a, w) => a + (/^\d+$/.test(w) ? +w : NUMS[w] || 0), 0);
    if (!n) return null;
    return n * (m[2].startsWith("hora") ? 3600 : m[2].startsWith("seg") ? 1 : 60);
  }

  /** Map an utterance to a command. */
  function command(raw) {
    const t = strip(raw).trim();
    if (/\b(temporizador|timer|alarme|cronometro)\b/.test(t) || /\b(minutos?|segundos?|meia hora)\b/.test(t)) {
      const secs = parseTimer(t);
      if (secs) return { type: "timer", secs };
    }
    if (/\b(seguinte|proximo|proxima|avanca|avancar|next|continua)\b/.test(t)) return { type: "next" };
    if (/\b(anterior|volta|voltar|recua|recuar|atras|back)\b/.test(t)) return { type: "prev" };
    if (/\b(repete|repetir|outra vez|le|ler|de novo)\b/.test(t)) return { type: "repeat" };
    if (/\bingrediente/.test(t)) return { type: "ingredients" };
    if (/\b(fechar|sair|terminar|acabei)\b/.test(t)) return { type: "close" };
    if (/\b(para de ouvir|parar|pausa|silencio)\b/.test(t)) return { type: "stop" };
    return null;
  }

  let voice = null;
  function pickVoice() {
    if (!canSpeak) return null;
    const vs = speechSynthesis.getVoices();
    return vs.find(v => v.lang === "pt-PT") || vs.find(v => v.lang?.startsWith("pt")) || null;
  }
  if (canSpeak) speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };

  function speak(text, onEnd) {
    if (!canSpeak || !text) return onEnd?.();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-PT"; voice = voice || pickVoice(); if (voice) u.voice = voice;
    u.rate = 0.98;
    u.onend = u.onerror = () => onEnd?.();
    speechSynthesis.speak(u);
  }

  /** Start a session; handlers: {onCommand(cmd), onHeard(text), onState(listening:boolean)} */
  function session(handlers) {
    let active = true, rec = null, speaking = false;
    const start = () => {
      if (!canListen || !active || speaking) return;
      try {
        rec = new SR();
        rec.lang = "pt-PT"; rec.continuous = true; rec.interimResults = false; rec.maxAlternatives = 3;
        rec.onresult = e => {
          const res = e.results[e.results.length - 1];
          const alts = [...res].map(a => a.transcript);
          handlers.onHeard?.(alts[0]);
          for (const a of alts) { const c = command(a); if (c) { handlers.onCommand(c); break; } }
        };
        rec.onend = () => { handlers.onState?.(false); if (active && !speaking) setTimeout(start, 250); };  // iOS stops after silence
        rec.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { active = false; handlers.onDenied?.(); } };
        rec.start(); handlers.onState?.(true);
      } catch {}
    };
    start();
    return {
      say(text) {   // pause listening while talking so the app doesn't hear itself
        speaking = true; try { rec?.abort(); } catch {}
        speak(text, () => { speaking = false; start(); });
      },
      stop() { active = false; try { rec?.abort(); } catch {} if (canSpeak) speechSynthesis.cancel(); handlers.onState?.(false); },
    };
  }

  return { canListen, canSpeak, session, speak, command, parseTimer };
})();
