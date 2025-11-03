/**
 * EyeNav – tracker.js
 * Stable, smoothed, and rate-limited gaze tracking pipeline.
 * Bright video feed + WebGazer integration + single visual cursor.
 */

export async function initTracker() {
  console.log('[EyeNav] Tracker initializing...');

  // -------------------------------------------------
  // 1. Fullscreen mirrored webcam background
  // -------------------------------------------------
  const video = document.getElementById('eyeVideo');
  if (!video) {
    console.error('[EyeNav] #eyeVideo not found');
    return;
  }

  Object.assign(video.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    zIndex: '-1',
  });

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        advanced: [
          { exposureMode: 'continuous' },
          { exposureCompensation: 1.0 },
          { brightness: 1.0 },
        ],
      },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    console.log('[EyeNav] Webcam stream active.');

    // apply brightness config
    const brightness = window.EyeNavConfig?.brightness || 1.4;
    video.style.filter = `brightness(${brightness}) contrast(1.2)`;
  } catch (err) {
    console.error('[EyeNav] Camera access failed:', err);
    alert('Please allow camera access for EyeNav tracking to work.');
    return;
  }

  // -------------------------------------------------
  // 2. Initialize WebGazer for gaze data
  // -------------------------------------------------
  if (!window.webgazer) {
    console.error('[EyeNav] WebGazer.js not loaded.');
    return;
  }

  // purge any old internal overlays (ghost dots, etc.)
  document.querySelectorAll('[id^="webgazer"]').forEach((el) => el.remove());

  // Rate-limited gaze listener
  let lastEmit = 0;
  const emitInterval = 1000 / 30; // 30Hz cap for performance

  window.webgazer
    .showVideoPreview(false)
    .showPredictionPoints(false)
    .showFaceOverlay(false)
    .setRegression('ridge')
    .setTracker('clmtrackr')
    .setGazeListener((data, elapsedTime) => {
      if (!data) return;
      const now = performance.now();
      if (now - lastEmit < emitInterval) return;
      lastEmit = now;

      const x = Math.min(Math.max(data.x, 0), window.innerWidth);
      const y = Math.min(Math.max(data.y, 0), window.innerHeight);
      document.dispatchEvent(
        new CustomEvent('gazeUpdate', { detail: { x, y, t: elapsedTime } })
      );
    })
    .begin()
    .then(() => {
      setTimeout(() => {
        document.querySelectorAll('[id^="webgazer"]').forEach((el) => el.remove());
        console.log('[EyeNav] WebGazer overlays purged.');
      }, 1500);
    });

  console.log('[EyeNav] WebGazer started.');

  // -------------------------------------------------
  // 3. Brightness boost for internal WebGazer feed
  // -------------------------------------------------
  setTimeout(() => {
    const wgVideo =
      document.querySelector('#webgazerVideoFeed') ||
      document.querySelector('video[src^="blob"]');
    if (wgVideo) {
      const brightness = window.EyeNavConfig?.brightness || 1.6;
      Object.assign(wgVideo.style, {
        filter: `brightness(${brightness}) contrast(1.3)`,
        opacity: '1',
        display: 'block',
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        objectFit: 'cover',
        transform: 'scaleX(-1)',
        zIndex: '-2',
      });
      console.log('[EyeNav] Brightness filter applied to internal WebGazer video.');
    }
  }, 2500);

  // -------------------------------------------------
  // 4. Auto-recovery if WebGazer stalls
  // -------------------------------------------------
  let lastUpdate = performance.now();
  document.addEventListener('gazeUpdate', () => (lastUpdate = performance.now()));

  setInterval(() => {
    const now = performance.now();
    if (now - lastUpdate > 5000) {
      console.warn('[EyeNav] WebGazer appears idle. Restarting...');
      try {
        window.webgazer.pause();
        window.webgazer.resume();
        lastUpdate = now;
      } catch (e) {
        console.error('[EyeNav] WebGazer recovery failed:', e);
      }
    }
  }, 5000);

  // -------------------------------------------------
  // 5. Smooth visual overlay cursor
  // -------------------------------------------------
  const overlay = document.getElementById('overlayCanvas');
  if (overlay) {
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    const ctx = overlay.getContext('2d');

    let smoothX = window.innerWidth / 2;
    let smoothY = window.innerHeight / 2;
    const smoothingFactor = 0.15;

    document.addEventListener('gazeUpdate', (e) => {
      smoothX = (1 - smoothingFactor) * smoothX + smoothingFactor * e.detail.x;
      smoothY = (1 - smoothingFactor) * smoothY + smoothingFactor * e.detail.y;
    });

    function drawDot() {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.beginPath();
      ctx.arc(smoothX, smoothY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,255,0.3)';
      ctx.fill();
      requestAnimationFrame(drawDot);
    }
    drawDot();
  }

  // -------------------------------------------------
  // 6. Resize safety
  // -------------------------------------------------
  window.addEventListener('resize', () => {
    video.width = window.innerWidth;
    video.height = window.innerHeight;
    if (overlay) {
      overlay.width = window.innerWidth;
      overlay.height = window.innerHeight;
    }
  });

  console.log('[EyeNav] Tracker fully initialized.');
}
