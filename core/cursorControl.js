/**
 * EyeNav – cursorControl.js
 * Controls the visual gaze cursor, dwell detection, and click simulation.
 */

import { playBlinkTone } from '../audio/sound.js';

export async function initCursor() {
  console.log('[EyeNav] Cursor controller online…');

  const dot = document.getElementById('cursorDot');
  const canvas = document.getElementById('overlayCanvas');
  const ctx = canvas.getContext('2d');

  // Safety: make sure our layers never intercept real mouse events
  dot.style.pointerEvents = 'none';
  canvas.style.pointerEvents = 'none';

  // Position state
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let targetX = x, targetY = y;

  // Dwell timing config (loaded from global config)
  const dwellTime = window.EyeNavConfig?.dwellTime || 800;
  const onsetDelay = window.EyeNavConfig?.onsetDelay || 300;
  let dwellTimer = null;
  let dwellStart = null;
  let currentTarget = null;

  // Handle incoming gaze data only
  document.addEventListener('gazeUpdate', e => {
    targetX = e.detail.x;
    targetY = e.detail.y;
  });

  // Prevent real mouse from interfering
  const disableMouse = e => e.stopImmediatePropagation();
  ['mousemove', 'mousedown', 'mouseup', 'click'].forEach(evt =>
    window.addEventListener(evt, disableMouse, true)
  );

  /**
   * Render loop – update dot position and dwell ring
   */
  function render() {
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      requestAnimationFrame(render);
      return;
    }

    // Smooth movement
    x += (targetX - x) * 0.5;
    y += (targetY - y) * 0.5;
    dot.style.transform = `translate(${x}px, ${y}px)`;

    // Instead of real DOM hit-testing, use virtual dwell zone
    const el = findNearestClickable(x, y);
    handleDwell(el);

    requestAnimationFrame(render);
  }

  /**
   * Virtual target finder (avoids elementFromPoint feedback)
   * Finds closest visible clickable element by bounding box distance
   */
  function findNearestClickable(cx, cy) {
    const clickables = [...document.querySelectorAll('button, a, input, [onclick]')];
    let best = null, bestDist = Infinity;
    for (const el of clickables) {
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - cx, 0, cx - r.right);
      const dy = Math.max(r.top - cy, 0, cy - r.bottom);
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist && dist < 60) { // 60px snap radius
        best = el;
        bestDist = dist;
      }
    }
    return best;
  }

  /**
   * Visual progress indicator for dwell clicks
   */
  function drawRing(progress) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = 'rgba(0,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /**
   * Main dwell click logic
   */
  function handleDwell(el) {
    if (!el) return cancelDwell(true);

    if (el !== currentTarget) {
      currentTarget = el;
      cancelDwell();
      dwellStart = performance.now() + onsetDelay;
    }

    const now = performance.now();

    // After onset delay, start countdown
    if (dwellStart && now > dwellStart) {
      if (!dwellTimer) dwellTimer = now;
      const progress = Math.min((now - dwellTimer) / dwellTime, 1);
      drawRing(progress);

      if (progress >= 1) {
        activateClick(el);
        cancelDwell(true);
      }
    }
  }

  /**
   * Cancel dwell sequence
   */
  function cancelDwell(resetRing = false) {
    dwellTimer = null;
    dwellStart = null;
    if (resetRing) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Simulated click on target (virtual only)
   */
  function activateClick(el) {
    if (!el) return;
    try {
      const evt = new MouseEvent('click', {
        bubbles: true, cancelable: true, view: window
      });
      el.dispatchEvent(evt);
      playBlinkTone();
      console.log('[EyeNav] Dwell click →', el.tagName || el.id || 'element');
    } catch (err) {
      console.warn('[EyeNav] Click dispatch failed:', err);
    }
  }

  requestAnimationFrame(render);
}
