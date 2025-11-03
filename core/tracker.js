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
  // 3. Unified feed normalization (cross-browser)
  // -------------------------------------------------
  function ensureFeedConsistency() {
    const wgVideo =
      document.querySelector('#webgazerVideoFeed') ||
      document.querySelector('video[src^="blob"]');
    if (!wgVideo) return;

    const brightness = window.EyeNavConfig?.brightness || 1.6;
    Object.assign(wgVideo.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      objectFit: 'cover',
      transform: 'scaleX(-1)',
      filter: `brightness(${brightness}) contrast(1.3)`,
      opacity: '1',
      zIndex: '-2',
      pointerEvents: 'none',
    });

    // normalize coordinates across browsers
    if (window.webgazer?.params) {
      window.webgazer.params.videoWidth = window.innerWidth;
      window.webgazer.params.videoHeight = window.innerHeight;
      window.webgazer.params.screenshotWidth = window.innerWidth;
      window.webgazer.params.screenshotHeight = window.innerHeight;
    }
    console.log('[EyeNav] Unified feed + viewport normalization applied.');
  }

  // Apply after model load + on DOM changes
  setTimeout(ensureFeedConsistency, 1500);
  const observer = new MutationObserver(ensureFeedConsistency);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', ensureFeedConsistency);

  // -------------------------------------------------
 // -------------------------------------------------
// 4. Normalize all WebGazer layers + coordinate scaling
// -------------------------------------------------
function resizeAllWebGazerLayers() {
  const brightness = window.EyeNavConfig?.brightness || 1.6;

  // Include the container div too
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

  console.log('[EyeNav] All WebGazer layers + container resized to viewport.');
}

// Run after model load
setTimeout(resizeAllWebGazerLayers, 1500);
window.addEventListener('resize', resizeAllWebGazerLayers);
new MutationObserver(resizeAllWebGazerLayers)
  .observe(document.body, { childList: true, subtree: true });

// -------------------------------------------------
// 5. Gaze listener with coordinate normalization
// -------------------------------------------------
let lastEmit = 0;
const emitInterval = 1000 / 30; // 30Hz

window.webgazer.setGazeListener((data, elapsedTime) => {
  if (!data) return;
  const now = performance.now();
  if (now - lastEmit < emitInterval) return;
  lastEmit = now;

  // Normalize if WebGazer is using a smaller base resolution
  const videoW = window.webgazer.params?.videoWidth || 320;
  const videoH = window.webgazer.params?.videoHeight || 240;
  const scaleX = window.innerWidth / videoW;
  const scaleY = window.innerHeight / videoH;

  const x = Math.min(Math.max(data.x * scaleX, 0), window.innerWidth);
  const y = Math.min(Math.max(data.y * scaleY, 0), window.innerHeight);

  document.dispatchEvent(
    new CustomEvent('gazeUpdate', { detail: { x, y, t: elapsedTime } })
  );
});

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
  // 7. Resize safety
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
  // 8. Post-calibration cleanup option
  // -------------------------------------------------
  window.hideWebGazerDebug = () => {
    window.webgazer.showVideoPreview(false);
    window.webgazer.showFaceOverlay(false);
    window.webgazer.showPredictionPoints(false);
    console.log('[EyeNav] WebGazer debug overlays hidden.');
  };

  console.log('[EyeNav] Tracker fully initialized.');
}
