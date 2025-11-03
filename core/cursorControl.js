/**
 * EyeNav – cursorControl.js
 * Controls the visual gaze cursor, dwell detection, and click simulation.
 */

import { playBlinkTone } from '../audio/sound.js';

export async function initCursor() {
  console.log('[EyeNav] Cursor controller online…');
  const dot = document.getElementById('cursorDot');
  const dwellRing = document.getElementById('overlayCanvas').getContext('2d');

  // Position state
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let targetX = x, targetY = y;

  // Dwell timing config (loaded from global config)
  const dwellTime = window.EyeNavConfig.dwellTime;
  const onsetDelay = window.EyeNavConfig.onsetDelay;
  let dwellTimer = null;
  let dwellStart = null;
  let currentTarget = null;

  // Handle incoming gaze data
  document.addEventListener('gazeUpdate', e => {
    targetX = e.detail.x;
    targetY = e.detail.y;
  });

  /**
   * Renders cursor and calls dwell logic each frame
   */
  function render() {
    // Move cursor dot smoothly
    x += (targetX - x) * 0.5;
    y += (targetY - y) * 0.5;
    dot.style.transform = `translate(${x}px, ${y}px)`;

    // Find current element under gaze
    const el = document.elementFromPoint(x, y);
    handleDwell(el);

    requestAnimationFrame(render);
  }

  /**
   * Visual progress indicator for dwell clicks
   */
  function drawRing(progress) {
    const canvas = document.getElementById('overlayCanvas');
    const ctx = dwellRing;
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
    if (!el) return cancelDwell();

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
    if (resetRing) dwellRing.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  /**
   * Simulated click on target
   */
  function activateClick(el) {
    const evt = new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window
    });
    el.dispatchEvent(evt);
    playBlinkTone();
    console.log('[EyeNav] Dwell click →', el.tagName || el.id || 'element');
  }

  requestAnimationFrame(render);
}
