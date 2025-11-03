/**
 * EyeNav - tracker.js
 * Initializes WebGazer, calibration, smoothing, and dead-zone gaze output.
 */

import { saveSettings } from './storage.js';

// Internal smoothing buffer
let smoothX = 0, smoothY = 0, initialized = false;

export async function initTracker() {
  console.log('[EyeNav] Starting WebGazer...');
  await window.webgazer.setRegression('ridge')
    .showVideoPreview(true)
    .showPredictionPoints(false)
    .begin();

  // Mirror feed toggle
  if (window.EyeNavConfig.mirror) {
    const vid = document.getElementById('eyeVideo');
    vid.style.transform = 'scaleX(-1)';
    window.webgazer.params.videoViewer = true;
  }

  initialized = true;
  startLoop();
}

window.webgazer.showVideo(false).showFaceOverlay(false);
const video = document.getElementById("eyeVideo");
navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(stream => {
    video.srcObject = stream;
    video.style.objectFit = "cover";
    video.style.width = "100vw";
    video.style.height = "100vh";
  })
  .catch(err => console.error("[EyeNav] Camera init failed:", err));

/**
 * Basic linear interpolation smoothing.
 */
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * Main gaze streaming loop (requestAnimationFrame synchronized)
 */
function startLoop() {
  const { smoothing, deadZone } = window.EyeNavConfig;
  const cursorEvent = new CustomEvent('gazeUpdate', { detail: { x: 0, y: 0 } });

  function loop() {
    const pred = window.webgazer.getCurrentPrediction();
    if (pred) {
      // Mirror correction
      let x = pred.x;
      if (window.EyeNavConfig.mirror)
        x = window.innerWidth - x;

      // Smoothing filter
      smoothX = lerp(smoothX || x, x, smoothing);
      smoothY = lerp(smoothY || pred.y, pred.y, smoothing);

      // Dead zone filter
      const dx = Math.abs(smoothX - x);
      const dy = Math.abs(smoothY - pred.y);
      if (dx < deadZone && dy < deadZone) {
        // hold
      } else {
        cursorEvent.detail.x = smoothX;
        cursorEvent.detail.y = smoothY;
        document.dispatchEvent(cursorEvent);
      }
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

/**
 * Trigger manual recalibration
 */
export async function recalibrate() {
  console.log('[EyeNav] Starting 9-point calibration...');
  const overlay = document.getElementById('overlayCanvas');
  const ctx = overlay.getContext('2d');
  const points = 3, stepX = window.innerWidth / (points + 1), stepY = window.innerHeight / (points + 1);

  for (let i = 1; i <= points; i++) {
    for (let j = 1; j <= points; j++) {
      const x = stepX * i, y = stepY * j;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,255,0.8)';
      ctx.fill();
      await new Promise(r => setTimeout(r, 500));
      window.webgazer.recordScreenPosition(x, y, 'click');
    }
  }
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  console.log('[EyeNav] Calibration complete.');
  await saveSettings('calibration', { timestamp: Date.now() });
}
