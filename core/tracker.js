/**
 * EyeNav – tracker.js
 * Initializes WebGazer gaze tracking and webcam feed for EyeNav.
 * Fullscreen mirrored video background with brightness control and fallback.
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

  // Fullscreen & mirrored
  Object.assign(video.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    zIndex: '-1'
  });

  try {
    // requestUserMedia with exposure bias (some browsers ignore)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        advanced: [
          { exposureMode: 'continuous' },
          { exposureCompensation: 1.0 },
          { brightness: 1.0 }
        ]
      },
      audio: false
    });

    video.srcObject = stream;
    video.play().catch(() => {});
    console.log('[EyeNav] Webcam stream active.');

    // Apply current brightness from config
    const brightness = window.EyeNavConfig?.brightness || 1.4;
    video.style.filter = `brightness(${brightness}) contrast(1.2)`;
  } catch (err) {
    console.error('[EyeNav] Camera access failed:', err);
    alert('Please allow camera access for EyeNav tracking to work.');
  }

  // ------------------------------------
  // 2. Initialize WebGazer for gaze data
  // ------------------------------------
   // ------------------------------------
  // 2. Initialize WebGazer for gaze data
  // ------------------------------------
  if (!window.webgazer) {
    console.error('[EyeNav] WebGazer.js not loaded.');
    return;
  }

  // Forcefully remove any old prediction or overlay elements
  document.querySelectorAll('[id^="webgazer"]').forEach(el => el.remove());

  // Start WebGazer with minimal visual footprint
  window.webgazer
    .showVideoPreview(false)
    .showPredictionPoints(false)
    .showFaceOverlay(false)
    .setRegression('ridge')
    .setTracker('clmtrackr')
    .setGazeListener((data, elapsedTime) => {
      if (!data) return;

      const x = Math.min(Math.max(data.x, 0), window.innerWidth);
      const y = Math.min(Math.max(data.y, 0), window.innerHeight);

      // Dispatch unified event
      const evt = new CustomEvent('gazeUpdate', { detail: { x, y, t: elapsedTime } });
      document.dispatchEvent(evt);
    })
    .begin()
    .then(() => {
      // After start, remove any residual prediction canvas again
      setTimeout(() => {
        document.querySelectorAll('[id^="webgazer"]').forEach(el => el.remove());
        console.log('[EyeNav] WebGazer overlays purged.');
      }, 1500);
    });

  console.log('[EyeNav] WebGazer started (clean mode).');


  // ------------------------------------------
  // 3. Apply brightness to internal WebGazer feed
  // ------------------------------------------
  setTimeout(() => {
    const wgVideo =
      document.querySelector('#webgazerVideoFeed') ||
      document.querySelector('video[src^="blob"]');

    if (wgVideo) {
      const brightness = window.EyeNavConfig?.brightness || 1.6;
      wgVideo.style.filter = `brightness(${brightness}) contrast(1.3)`;
      wgVideo.style.opacity = '1';
      wgVideo.style.display = 'block';
      wgVideo.style.position = 'fixed';
      wgVideo.style.top = '0';
      wgVideo.style.left = '0';
      wgVideo.style.width = '100vw';
      wgVideo.style.height = '100vh';
      wgVideo.style.objectFit = 'cover';
      wgVideo.style.transform = 'scaleX(-1)';
      wgVideo.style.zIndex = '-2';
      console.log('[EyeNav] Brightness filter applied to internal WebGazer video.');
    } else {
      console.warn('[EyeNav] Internal WebGazer video not found (might be renamed).');
    }
  }, 2500);

  // ------------------------------------------
  // 4. Fallback + auto-recovery if WebGazer stalls
  // ------------------------------------------
  let lastUpdate = performance.now();
  document.addEventListener('gazeUpdate', () => (lastUpdate = performance.now()));

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
  // 5. Mirror safety and resize handling
  // ------------------------------------------
  window.addEventListener('resize', () => {
    video.width = window.innerWidth;
    video.height = window.innerHeight;
  });

  // ------------------------------------------
  // 6. Basic debug overlay
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
