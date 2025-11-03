/**
 * EyeNav – sound.js
 * Generates auditory feedback for blink/dwell clicks.
 */

export function playBlinkTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 222;

    osc.connect(gain).connect(ctx.destination);

    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.5);
    gain.gain.linearRampToValueAtTime(0, t + 2);

    osc.start(t);
    osc.stop(t + 2);
  } catch (e) {
    console.warn('[EyeNav] Audio init failed:', e);
  }
}
