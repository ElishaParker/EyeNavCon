/**
  * EyeNav – connectToEyeNav.js
  * Bridge module for integrating EyeNav’s output and diagnostics with external systems.
  * 
  * Exposes:
  *   connectToEyeNav({ onGaze, onBlink, onClick }) – attach listeners.
  *   EyeNavDiagnostics.enable() / disable() – console + visual feedback.
  */
 
 export function connectToEyeNav(callbacks = {}) {
   const { onGaze, onBlink, onClick } = callbacks;
 
   console.log("[EyeNav] Integration bridge active.");
 
+  const eventTarget = window;
+  const listenerRegistry = [];
+
   // Hook gaze updates
   if (onGaze) {
-    document.addEventListener("gazeUpdate", e => onGaze(e.detail.x, e.detail.y));
+    const handler = (e) => onGaze(e.detail.x, e.detail.y);
+    eventTarget.addEventListener("gazeUpdate", handler);
+    listenerRegistry.push(["gazeUpdate", handler]);
   }
 
   // Hook blink events
   if (onBlink) {
-    document.addEventListener("eyeblink", e => onBlink(e.detail));
+    const handler = (e) => onBlink(e.detail);
+    eventTarget.addEventListener("eyeblink", handler);
+    listenerRegistry.push(["eyeblink", handler]);
   }
 
   // Hook synthetic click (from dwell)
   if (onClick) {
-    document.addEventListener("EyeNavClick", e => onClick(e.detail));
+    const handler = (e) => onClick(e.detail);
+    eventTarget.addEventListener("EyeNavClick", handler);
+    listenerRegistry.push(["EyeNavClick", handler]);
   }
 
   return {
     disconnect: () => {
-      document.removeEventListener("gazeUpdate", onGaze);
-      document.removeEventListener("eyeblink", onBlink);
-      document.removeEventListener("EyeNavClick", onClick);
+      listenerRegistry.forEach(([evt, handler]) => {
+        eventTarget.removeEventListener(evt, handler);
+      });
+      listenerRegistry.length = 0;
       console.log("[EyeNav] Integration bridge disconnected.");
     }
   };
 }
 
 /**
  * Simple diagnostic overlay that prints gaze coordinates and blink counts.
  */
 export const EyeNavDiagnostics = (() => {
   let overlay, blinkCount = 0, enabled = false;
 
   function init() {
     overlay = document.createElement("div");
     overlay.id = "EyeNavDiag";
     Object.assign(overlay.style, {
       position: "fixed",
       bottom: "10px",
       right: "10px",
       background: "rgba(0,0,0,0.6)",
       color: "cyan",
       fontFamily: "monospace",
       fontSize: "12px",
       padding: "6px 10px",
       borderRadius: "6px",
       zIndex: "50"
     });
     overlay.textContent = "EyeNav Diag Ready";
     document.body.appendChild(overlay);
   }
 
   function enable() {
     if (enabled) return;
     if (!overlay) init();
     enabled = true;
-    document.addEventListener("gazeUpdate", handleGaze);
-    document.addEventListener("eyeblink", handleBlink);
+    window.addEventListener("gazeUpdate", handleGaze);
+    window.addEventListener("eyeblink", handleBlink);
     console.log("[EyeNav] Diagnostics enabled.");
   }
 
   function disable() {
     if (!enabled) return;
     enabled = false;
-    document.removeEventListener("gazeUpdate", handleGaze);
-    document.removeEventListener("eyeblink", handleBlink);
+    window.removeEventListener("gazeUpdate", handleGaze);
+    window.removeEventListener("eyeblink", handleBlink);
     if (overlay) overlay.remove();
     overlay = null;
     console.log("[EyeNav] Diagnostics disabled.");
   }
 
   function handleGaze(e) {
     if (!overlay) return;
     overlay.textContent = `x:${e.detail.x.toFixed(0)} y:${e.detail.y.toFixed(0)} | blinks:${blinkCount}`;
   }
 
   function handleBlink() {
     blinkCount++;
   }
 
   return { enable, disable };
 })();
 
EOF
)
