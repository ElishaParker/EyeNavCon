/**
  * EyeNav – cursorControl.js
  * Controls the visual gaze cursor, dwell detection, and click simulation.
  */
 
 import { playBlinkTone } from '../audio/sound.js';
 
 export async function initCursor() {
   console.log('[EyeNav] Cursor controller online…');
 
+  const config = window.EyeNavConfig || {};
+  const gazeEventTarget = window;
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


+  let dwellTime = config.dwellTime ?? 800;
+  let onsetDelay = config.onsetDelay ?? 300;
   let dwellTimer = null;
   let dwellStart = null;
   let currentTarget = null;
 
+  const mouseEvents = ['mousemove', 'mousedown', 'mouseup', 'click'];
+  const disableMouse = (e) => e.stopImmediatePropagation();
+  let mouseSuppressed = false;
+
+  function applyMouseSuppression(enabled) {
+    if (enabled === mouseSuppressed) return;
+    mouseSuppressed = enabled;
+    mouseEvents.forEach((evt) => {
+      if (enabled) {
+        window.addEventListener(evt, disableMouse, true);
+      } else {
+        window.removeEventListener(evt, disableMouse, true);
+      }
+    });
+    console.log(`[EyeNav] Mouse suppression ${enabled ? 'enabled' : 'disabled'}.`);
+  }
+
+  applyMouseSuppression(Boolean(config.suppressMouse));
+
   // Handle incoming gaze data only
-  document.addEventListener('gazeUpdate', e => {
+  gazeEventTarget.addEventListener('gazeUpdate', e => {
     targetX = e.detail.x;
     targetY = e.detail.y;
   });
 

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
@@ -118,33 +133,50 @@ export async function initCursor() {
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
+      const detail = {
+        targetId: el.id || null,
+        tagName: el.tagName || null,
+        timestamp: Date.now(),
+      };
+      [window, document].forEach((target) =>
+        target.dispatchEvent(new CustomEvent('EyeNavClick', { detail }))
+      );
       console.log('[EyeNav] Dwell click →', el.tagName || el.id || 'element');
     } catch (err) {
       console.warn('[EyeNav] Click dispatch failed:', err);
     }
   }
 
+  window.addEventListener('EyeNavConfigChanged', (event) => {
+    const updates = event.detail || {};
+    if (typeof updates.dwellTime === 'number') dwellTime = updates.dwellTime;
+    if (typeof updates.onsetDelay === 'number') onsetDelay = updates.onsetDelay;
+    if (typeof updates.suppressMouse === 'boolean') {
+      applyMouseSuppression(updates.suppressMouse);
+    }
+  });
+
   requestAnimationFrame(render);
 }
 
EOF
)
