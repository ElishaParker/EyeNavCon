/**
 * EyeNav – tracker.js
 * Initializes WebGazer gaze tracking and webcam feed for EyeNav.
 * Fullscreen mirrored video background with graceful startup and fallback.
 */

export async function initTracker() {
  console.log('[EyeNav] Tracker initializing...');

  // -----------------------------
  // 1. Fullscreen mirrored webcam
  // -----------------------------
  const video = document.getElementById('eyeVideo');
  if (!video) {
    console.error('[EyeNav] #eyeVideo not found');
    return;
  }

  // Force fullscreen fit + mirror
  Object.assign(video.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    opacity: '0.25',
    zIndex: '-1',
  });

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });
    video.srcObject = stream;
    video.play().catch(() => {});
    console.log('[EyeNav] Webcam stream active.');
  } catch (err) {
    console.error('[EyeNav] Camera access failed:', err);
    alert('Please allow camera access for EyeNav tracking to work.');
  }

  // ------------------------------------
  // 2. Initialize WebGazer for gaze data
  // ------------------------------------
  if (!window.webgazer) {
    console.error('[EyeNav] WebGazer.js not loaded.');
    return;
  }

  // Hide WebGazer's internal preview and overlay
  window.webgazer.showVideoPreview(false).showPredictionPoints(false).showFaceOverlay(false);

  // Basic calibration model
  window.webgazer.setRegression('ridge')
    .setGazeListener((data, elapsedTime) => {
      if (!data) return;

      // Normalize to viewport size
      const x = Math.min(Math.max(data.x, 0), window.innerWidth);
      const y = Math.min(Math.max(data.y, 0), window.innerHeight);

      // Dispatch custom event
      const evt = new CustomEvent('gazeUpdate', { detail: { x, y, t: elapsedTime } });
      document.dispatchEvent(evt);
    })
    .begin();

  console.log('[EyeNav] WebGazer started.');

  // ------------------------------------------
  // 3. Fallback + auto-recovery if WebGazer stalls
  // ------------------------------------------
  let lastUpdate = performance.now();
  document.addEventListener('gazeUpdate', () => lastUpdate = performance.now());

  setInterval(() => {
    const now = performance.now();
    if (now - lastUpdate > 5000) {
      console.warn('[EyeNav] WebGazer appears idle. Attempting restart...');
      try {
        window.webgazer.pause();
        window.webgazer.resume();
        lastUpdate = now;
      } catch (e) {
        console.error('[EyeNav] WebGazer recovery failed:', e);
      }
    }
  }, 5000);

  // ------------------------------------------
  // 4. Mirror safety and resize handling
  // ------------------------------------------
  window.addEventListener('resize', () => {
    video.width = window.innerWidth;
    video.height = window.innerHeight;
  });

  // ------------------------------------------
  // 5. Basic debug overlay
  // ------------------------------------------
  const overlay = document.getElementById('overlayCanvas');
  if (overlay) {
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    const ctx = overlay.getContext('2d');

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    document.addEventListener('gazeUpdate', (e) => {
      x = e.detail.x;
      y = e.detail.y;
    });

    function drawDot() {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,255,0.3)';
      ctx.fill();
      requestAnimationFrame(drawDot);
    }
    drawDot();
  }

  console.log('[EyeNav] Tracker fully initialized.');
}
