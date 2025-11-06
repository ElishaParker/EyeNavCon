/**
 * EyeNav – tracker.js
 * Stable, smoothed, and rate-limited gaze tracking pipeline.
 * Includes explicit WebGazer model loading, full-viewport normalization,
 * face/eye debug overlay, and auto-recovery handling.
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

    const brightness = window.EyeNavConfig?.brightness || 1.5;
    video.style.filter = `brightness(${brightness}) contrast(1.2)`;
  } catch (err) {
    console.error('[EyeNav] Camera access failed:', err);
    alert('Please allow camera access for EyeNav tracking to work.');
    return;
  }

  // -------------------------------------------------
  // 2. Initialize WebGazer
  // -------------------------------------------------
  if (!window.webgazer) {
    console.error('[EyeNav] WebGazer.js not loaded.');
    return;
  }

  document.querySelectorAll('[id^="webgazer"]').forEach((el) => el.remove());
  console.log('[EyeNav] Loading WebGazer model…');

  try {
    await window.webgazer.setTracker('clmtrackr');
    await window.webgazer.setRegression('ridge');
    await window.webgazer.begin();
    console.log('[EyeNav] WebGazer model loaded.');
  } catch (err) {
    console.error('[EyeNav] WebGazer initialization failed:', err);
    return;
  }

  // Calibration overlays for testing
  window.webgazer.showVideoPreview(true);
  window.webgazer.showFaceOverlay(true);
  window.webgazer.showPredictionPoints(true);
  console.log('[EyeNav] Face overlay and prediction points enabled.');

  // -------------------------------------------------
  // 3. Full cross-browser WebGazer viewport normalization
  // -------------------------------------------------
  function normalizeWebGazerLayers() {
    const brightness = window.EyeNavConfig?.brightness || 1.6;
    const selectors = [
      '#webgazerContainer',
      '#webgazerVideoFeed',
      '#webgazerVideoCanvas',
      '#webgazerFaceOverlay',
      '#webgazerTargetDot',
      'video[src^="blob"]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;

      Object.assign(el.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        objectFit: 'cover',
        transform: 'scaleX(-1)',
        zIndex: '-3',
        pointerEvents: 'none',
      });

      if (el.tagName === 'VIDEO') {
        el.style.filter = `brightness(${brightness}) contrast(1.3)`;
        el.style.opacity = '1';
      }
    }

    // Ensure WebGazer coordinates map to full viewport
    if (window.webgazer?.params) {
      window.webgazer.params.videoWidth = window.innerWidth;
      window.webgazer.params.videoHeight = window.innerHeight;
      window.webgazer.params.screenshotWidth = window.innerWidth;
      window.webgazer.params.screenshotHeight = window.innerHeight;
    }

    console.log('[EyeNav] WebGazer layers normalized to viewport.');
  }

  setTimeout(normalizeWebGazerLayers, 1500);
  window.addEventListener('resize', normalizeWebGazerLayers);
  new MutationObserver(normalizeWebGazerLayers)
    .observe(document.body, { childList: true, subtree: true });

  // -------------------------------------------------
  // -------------------------------------------------
// 4. Calibrated gaze listener – cross-browser scaling and normalization
// -------------------------------------------------
let lastEmit = 0;
const emitInterval = 1000 / 30; // 30Hz
let previewRect = null;
let gazeActive = false;

function getPreviewRect() {
  const preview = document.querySelector('#webgazerVideoFeed') || document.querySelector('video[src^="blob"]');
  if (!preview) return null;
  const rect = preview.getBoundingClientRect();
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
}

function remapToViewport(data) {
  if (!previewRect) previewRect = getPreviewRect();
  if (!previewRect) return { x: data.x, y: data.y };

  // If Chrome gives 0–1 normalized coords, rescale to viewport
  let gx = data.x, gy = data.y;
  if (gx <= 1 && gy <= 1) {
    gx *= previewRect.w;
    gy *= previewRect.h;
  }

  const px = gx / previewRect.w;
  const py = gy / previewRect.h;

  const vx = px * window.innerWidth;
  const vy = py * window.innerHeight;
  return { x: vx, y: vy };
}

function attachScaledGazeListener() {
  if (gazeActive) return;
  gazeActive = true;
  console.log('[EyeNav] Scaled gaze listener attached.');

  window.webgazer.setGazeListener((data, elapsedTime) => {
    if (!data) return;
    const now = performance.now();
    if (now - lastEmit < emitInterval) return;
    lastEmit = now;

    const mapped = remapToViewport(data);
    const x = Math.min(Math.max(mapped.x, 0), window.innerWidth);
    const y = Math.min(Math.max(mapped.y, 0), window.innerHeight);

    window.dispatchEvent(
      new CustomEvent('gazeUpdate', { detail: { x, y, t: elapsedTime } })
    );
  });
}

// Dynamic rect refresh
window.addEventListener('resize', () => (previewRect = getPreviewRect()));
new MutationObserver(() => (previewRect = getPreviewRect())).observe(document.body, { childList: true, subtree: true });

// Wait for WebGazer to initialize
const waitForReady = setInterval(() => {
  if (window.webgazer && window.webgazer.isReady) {
    attachScaledGazeListener();
    clearInterval(waitForReady);
  }
}, 500);

// Fallback: force attach after 4s even if .isReady is unreliable
setTimeout(() => {
  if (!gazeActive) attachScaledGazeListener();
}, 4000);

// -------------------------------------------------
// 5. Auto-recovery if WebGazer stalls
// -------------------------------------------------
let lastUpdate = performance.now();
window.addEventListener('gazeUpdate', () => (lastUpdate = performance.now()));

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
  // 6. Smooth debug overlay dot
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
  // 7. Resize safety for overlay and background
  // -------------------------------------------------
  window.addEventListener('resize', () => {
    video.width = window.innerWidth;
    video.height = window.innerHeight;
    if (overlay) {
      overlay.width = window.innerWidth;
      overlay.height = window.innerHeight;
    }
  });

  // -------------------------------------------------
  // 8. Debug overlay toggle
  // -------------------------------------------------
  window.hideWebGazerDebug = () => {
    window.webgazer.showVideoPreview(false);
    window.webgazer.showFaceOverlay(false);
    window.webgazer.showPredictionPoints(false);
    console.log('[EyeNav] WebGazer debug overlays hidden.');
  };

  document.addEventListener('keydown', (e) => {
    if (e.code === 'F2') {
      const state = window.webgazer.isVideoShown;
      if (state) window.hideWebGazerDebug();
      else {
        window.webgazer.showVideoPreview(true);
        window.webgazer.showFaceOverlay(true);
        window.webgazer.showPredictionPoints(true);
        console.log('[EyeNav] WebGazer debug overlays shown.');
      }
    }
  });

  console.log('[EyeNav] Tracker fully initialized.');
}
