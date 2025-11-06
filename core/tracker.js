+(function attachInitTracker(global) {
+  async function initTracker() {
+    console.log('[EyeNav] Tracker initializing...');
+
+    const config = global.EyeNavConfig || {};
+    const gazeEventTargets = Array.isArray(config.gazeEventTargets)
+      ? config.gazeEventTargets
+      : [global, global.document];
+    const gazeListenerTarget = config.gazeListenerTarget || global;
+
+    // -------------------------------------------------
+    // 1. Fullscreen mirrored webcam background
+    // -------------------------------------------------
+    const video = global.document.getElementById('eyeVideo');
+    if (!video) {
+      console.error('[EyeNav] #eyeVideo not found');
+      return;
+    }
+
+    Object.assign(video.style, {
+      position: 'fixed',
+      top: '0',
+      left: '0',
+      width: '100vw',
+      height: '100vh',
+      objectFit: 'cover',
+      transform: 'scaleX(-1)',
+      zIndex: '-1',
+    });
+
+    try {
+      const stream = await global.navigator.mediaDevices.getUserMedia({
+        video: {
+          facingMode: 'user',
+          advanced: [
+            { exposureMode: 'continuous' },
+            { exposureCompensation: 1.0 },
+            { brightness: 1.0 },
+          ],
+        },
+        audio: false,
+      });
+      video.srcObject = stream;
+      await video.play();
+      console.log('[EyeNav] Webcam stream active.');
+
+      const brightness = config.brightness ?? 1.2;
+      video.style.filter = `brightness(${brightness}) contrast(1.2)`;
+    } catch (err) {
+      console.error('[EyeNav] Camera access failed:', err);
+      if (typeof global.alert === 'function') {
+        global.alert('Please allow camera access for EyeNav tracking to work.');
+      }
+      return;
+    }
+
+    // -------------------------------------------------
+    // 2. Initialize WebGazer
+    // -------------------------------------------------
+    if (!global.webgazer) {
+      console.error('[EyeNav] WebGazer.js not loaded.');
+      return;
+    }
+
+    global.document.querySelectorAll('[id^="webgazer"]').forEach((el) => el.remove());
+    console.log('[EyeNav] Loading WebGazer model…');
+
+    try {
+      await global.webgazer.setTracker('clmtrackr');
+      await global.webgazer.setRegression('ridge');
+      await global.webgazer.begin();
+      console.log('[EyeNav] WebGazer model loaded.');
+    } catch (err) {
+      console.error('[EyeNav] WebGazer initialization failed:', err);
+      return;
+    }
+
+    const diagnosticsEnabled = Boolean(config.enableDiagnostics);
+
+    // -------------------------------------------------
+    // 3. Full cross-browser WebGazer viewport normalization
+    // -------------------------------------------------
+    function normalizeWebGazerLayers() {
+      const dynamicConfig = global.EyeNavConfig || {};
+      const brightness = dynamicConfig.brightness ?? 1.2;
+      const selectors = [
+        '#webgazerContainer',
+        '#webgazerVideoFeed',
+        '#webgazerVideoCanvas',
+        '#webgazerFaceOverlay',
+        '#webgazerTargetDot',
+        'video[src^="blob"]'
+      ];
+
+      for (const sel of selectors) {
+        const el = global.document.querySelector(sel);
+        if (!el) continue;
+
+        Object.assign(el.style, {
+          position: 'fixed',
+          top: '0',
+          left: '0',
+          width: '100vw',
+          height: '100vh',
+          objectFit: 'cover',
+          transform: 'scaleX(-1)',
+          zIndex: '-3',
+          pointerEvents: 'none',
+        });
+
+        if (el.tagName === 'VIDEO') {
+          el.style.filter = `brightness(${brightness}) contrast(1.3)`;
+          el.style.opacity = '1';
+        }
+      }
+
+      // Ensure WebGazer coordinates map to full viewport
+      if (global.webgazer?.params) {
+        global.webgazer.params.videoWidth = global.innerWidth;
+        global.webgazer.params.videoHeight = global.innerHeight;
+        global.webgazer.params.screenshotWidth = global.innerWidth;
+        global.webgazer.params.screenshotHeight = global.innerHeight;
+      }
+
+      console.log('[EyeNav] WebGazer layers normalized to viewport.');
+    }
+
+    let overlayObserver = null;
+
+    function showWebGazerDebug() {
+      global.webgazer.showVideoPreview(true);
+      global.webgazer.showFaceOverlay(true);
+      global.webgazer.showPredictionPoints(true);
+      if (!overlayObserver) {
+        overlayObserver = new MutationObserver(normalizeWebGazerLayers);
+        overlayObserver.observe(global.document.body, { childList: true, subtree: true });
+        global.addEventListener('resize', normalizeWebGazerLayers);
+      }
+      normalizeWebGazerLayers();
+      setTimeout(normalizeWebGazerLayers, 1500);
+      console.log('[EyeNav] Face overlay and prediction points enabled.');
+    }
+
+    function hideWebGazerDebug() {
+      global.webgazer.showVideoPreview(false);
+      global.webgazer.showFaceOverlay(false);
+      global.webgazer.showPredictionPoints(false);
+      if (overlayObserver) {
+        overlayObserver.disconnect();
+        overlayObserver = null;
+      }
+      global.removeEventListener('resize', normalizeWebGazerLayers);
+      console.log('[EyeNav] WebGazer debug overlays hidden.');
+    }
+
+    if (diagnosticsEnabled) {
+      showWebGazerDebug();
+    } else {
+      hideWebGazerDebug();
+    }
+
+    // -------------------------------------------------
+    // 4. Calibrated gaze listener – cross-browser scaling and normalization
+    // -------------------------------------------------
+    let lastEmit = 0;
+    const emitInterval = 1000 / 30; // 30Hz
+    let previewRect = null;
+    let gazeActive = false;
+
+    function getPreviewRect() {
+      const preview = global.document.querySelector('#webgazerVideoFeed')
+        || global.document.querySelector('video[src^="blob"]');
+      if (!preview) return null;
+      const rect = preview.getBoundingClientRect();
+      return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
+    }
+
+    function remapToViewport(data) {
+      if (!previewRect) previewRect = getPreviewRect();
+      if (!previewRect) return { x: data.x, y: data.y };
+
+      // If Chrome gives 0–1 normalized coords, rescale to viewport
+      let gx = data.x, gy = data.y;
+      if (gx <= 1 && gy <= 1) {
+        gx *= previewRect.w;
+        gy *= previewRect.h;
+      }
+
+      const px = gx / previewRect.w;
+      const py = gy / previewRect.h;
+
+      const vx = px * global.innerWidth;
+      const vy = py * global.innerHeight;
+      return { x: vx, y: vy };
+    }
+
+    function attachScaledGazeListener() {
+      if (gazeActive) return;
+      gazeActive = true;
+      console.log('[EyeNav] Scaled gaze listener attached.');
+
+      global.webgazer.setGazeListener((data, elapsedTime) => {
+        if (!data) return;
+        const now = performance.now();
+        if (now - lastEmit < emitInterval) return;
+        lastEmit = now;
+
+        const mapped = remapToViewport(data);
+        const x = Math.min(Math.max(mapped.x, 0), global.innerWidth);
+        const y = Math.min(Math.max(mapped.y, 0), global.innerHeight);
+
+        const detail = { x, y, t: elapsedTime };
+        gazeEventTargets.forEach((target) => {
+          if (!target) return;
+          const eventTarget = target === global.document ? global.document : target;
+          if (typeof eventTarget.dispatchEvent === 'function') {
+            eventTarget.dispatchEvent(new CustomEvent('gazeUpdate', { detail }));
+          }
+        });
+      });
+    }
+
+    // Dynamic rect refresh
+    global.addEventListener('resize', () => (previewRect = getPreviewRect()));
+    new MutationObserver(() => (previewRect = getPreviewRect()))
+      .observe(global.document.body, { childList: true, subtree: true });
+
+    // Wait for WebGazer to initialize
+    const waitForReady = setInterval(() => {
+      if (global.webgazer && global.webgazer.isReady) {
+        attachScaledGazeListener();
+        clearInterval(waitForReady);
+      }
+    }, 500);
+
+    // Fallback: force attach after 4s even if .isReady is unreliable
+    setTimeout(() => {
+      if (!gazeActive) attachScaledGazeListener();
+    }, 4000);
+
+    // -------------------------------------------------
+    // 5. Auto-recovery if WebGazer stalls
+    // -------------------------------------------------
+    let lastUpdate = performance.now();
+    gazeListenerTarget.addEventListener('gazeUpdate', () => (lastUpdate = performance.now()));
+
+    setInterval(() => {
+      const now = performance.now();
+      if (now - lastUpdate > 5000) {
+        console.warn('[EyeNav] WebGazer appears idle. Restarting...');
+        try {
+          global.webgazer.pause();
+          global.webgazer.resume();
+          lastUpdate = now;
+        } catch (e) {
+          console.error('[EyeNav] WebGazer recovery failed:', e);
+        }
+      }
+    }, 5000);
+
+    // -------------------------------------------------
+    // 6. Smooth debug overlay dot
+    // -------------------------------------------------
+    const overlay = global.document.getElementById('overlayCanvas');
+    if (overlay) {
+      overlay.width = global.innerWidth;
+      overlay.height = global.innerHeight;
+      const ctx = overlay.getContext('2d');
+
+      let smoothX = global.innerWidth / 2;
+      let smoothY = global.innerHeight / 2;
+      const smoothingFactor = 0.15;
+
+      gazeListenerTarget.addEventListener('gazeUpdate', (e) => {
+        smoothX = (1 - smoothingFactor) * smoothX + smoothingFactor * e.detail.x;
+        smoothY = (1 - smoothingFactor) * smoothY + smoothingFactor * e.detail.y;
+      });
+
+      function drawDot() {
+        ctx.clearRect(0, 0, overlay.width, overlay.height);
+        ctx.beginPath();
+        ctx.arc(smoothX, smoothY, 4, 0, Math.PI * 2);
+        ctx.fillStyle = 'rgba(0,255,255,0.3)';
+        ctx.fill();
+        requestAnimationFrame(drawDot);
+      }
+      drawDot();
+    }
+
+    // -------------------------------------------------
+    // 7. Resize safety for overlay and background
+    // -------------------------------------------------
+    global.addEventListener('resize', () => {
+      video.width = global.innerWidth;
+      video.height = global.innerHeight;
+      if (overlay) {
+        overlay.width = global.innerWidth;
+        overlay.height = global.innerHeight;
+      }
+    });
+
+    // -------------------------------------------------
+    // 8. Debug overlay toggle
+    // -------------------------------------------------
+    global.hideWebGazerDebug = hideWebGazerDebug;
+    global.showWebGazerDebug = showWebGazerDebug;
+
+    global.document.addEventListener('keydown', (e) => {
+      if (e.code === 'F2') {
+        const state = global.webgazer.isVideoShown;
+        if (state) global.hideWebGazerDebug();
+        else global.showWebGazerDebug();
+      }
+    });
+
+    global.addEventListener('EyeNavConfigChanged', (event) => {
+      const updates = event.detail || {};
+      if (typeof updates.brightness === 'number') {
+        video.style.filter = `brightness(${updates.brightness}) contrast(1.2)`;
+      }
+      if (typeof updates.enableDiagnostics === 'boolean') {
+        if (updates.enableDiagnostics) global.showWebGazerDebug();
+        else global.hideWebGazerDebug();
+      }
+    });
+
+    console.log('[EyeNav] Tracker fully initialized.');
+  }
+
+  global.initTracker = initTracker;
+})(typeof window !== 'undefined' ? window : globalThis);
