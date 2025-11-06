/**
  * EyeNav – menuSystem.js
  * Dropdown settings menu for smoothing, dwell, dead zone, and brightness.
  * Provides Save, Reset, and Re-Calibrate controls.
  */
 
 import { saveSettings, resetSettings } from '../core/storage.js';
 
 export function initMenu() {
   console.log('[EyeNav] Menu system initialized');
 
   const container = document.getElementById('menuContainer');
   if (!container) {
     console.error('[EyeNav] #menuContainer not found');
     return;
   }
 
+  const config = window.EyeNavConfig || {};
+
+  function broadcastConfigUpdate(partial) {
+    window.dispatchEvent(new CustomEvent('EyeNavConfigChanged', { detail: partial }));
+  }
+
   container.innerHTML = `
     <div id="menu">
       <div id="menuHeader">⚙️ <span>EyeNav Settings</span></div>
       <div id="menuBody">
         <label>
           Smoothing
-          <input id="smoothRange" type="range" min="0" max="1" step="0.05" value="${window.EyeNavConfig.smoothing || 0.3}">
-          <span id="smoothVal">${window.EyeNavConfig.smoothing || 0.3}</span>
+          <input id="smoothRange" type="range" min="0" max="1" step="0.05" value="${config.smoothing ?? 0.3}">
+          <span id="smoothVal">${config.smoothing ?? 0.3}</span>
         </label>
         <label>
           Dwell (ms)
-          <input id="dwellRange" type="range" min="300" max="1500" step="50" value="${window.EyeNavConfig.dwellTime || 800}">
-          <span id="dwellVal">${window.EyeNavConfig.dwellTime || 800}</span>
+          <input id="dwellRange" type="range" min="300" max="1500" step="50" value="${config.dwellTime ?? 800}">
+          <span id="dwellVal">${config.dwellTime ?? 800}</span>
         </label>
         <label>
           Dead Zone (px)
-          <input id="deadRange" type="range" min="0" max="50" step="2" value="${window.EyeNavConfig.deadZone || 12}">
-          <span id="deadVal">${window.EyeNavConfig.deadZone || 12}</span>
+          <input id="deadRange" type="range" min="0" max="50" step="2" value="${config.deadZone ?? 12}">
+          <span id="deadVal">${config.deadZone ?? 12}</span>
         </label>
         <label>
           Brightness
-          <input id="brightRange" type="range" min="0.5" max="2.0" step="0.05" value="${window.EyeNavConfig.brightness || 1.2}">
-          <span id="brightVal">${window.EyeNavConfig.brightness || 1.2}</span>
+          <input id="brightRange" type="range" min="0.5" max="2.0" step="0.05" value="${config.brightness ?? 1.2}">
+          <span id="brightVal">${config.brightness ?? 1.2}</span>
+        </label>
+        <label>
+          Onset Delay (ms)
+          <input id="onsetRange" type="range" min="0" max="600" step="25" value="${config.onsetDelay ?? 300}">
+          <span id="onsetVal">${config.onsetDelay ?? 300}</span>
+        </label>
+
+        <label class="toggleRow">
+          <input id="suppressMouseToggle" type="checkbox" ${config.suppressMouse ? 'checked' : ''}>
+          <span>Suppress native mouse</span>
+        </label>
+        <label class="toggleRow">
+          <input id="diagnosticsToggle" type="checkbox" ${config.enableDiagnostics ? 'checked' : ''}>
+          <span>Enable diagnostics overlays</span>
         </label>
 
         <div class="menuButtons">
           <button id="calibrateBtn">Re-Calibrate</button>
           <button id="saveBtn">💾 Save</button>
           <button id="resetBtn">♻️ Reset</button>
         </div>
       </div>
     </div>
   `;
 
   const header = document.getElementById('menuHeader');
   const body = document.getElementById('menuBody');
   header.onclick = () => body.classList.toggle('collapsed');
 
   // Sliders
   const smooth = document.getElementById('smoothRange');
   const dwell = document.getElementById('dwellRange');
   const dead  = document.getElementById('deadRange');
   const bright = document.getElementById('brightRange');
+  const onset = document.getElementById('onsetRange');
+  const suppressToggle = document.getElementById('suppressMouseToggle');
+  const diagnosticsToggle = document.getElementById('diagnosticsToggle');
 
   const smoothVal = document.getElementById('smoothVal');
   const dwellVal  = document.getElementById('dwellVal');
   const deadVal   = document.getElementById('deadVal');
   const brightVal = document.getElementById('brightVal');
+  const onsetVal  = document.getElementById('onsetVal');
 
   function updateVals() {
     smoothVal.textContent = parseFloat(smooth.value).toFixed(2);
     dwellVal.textContent = dwell.value;
     deadVal.textContent  = dead.value;
     brightVal.textContent = parseFloat(bright.value).toFixed(2);
+    onsetVal.textContent  = onset.value;
   }
 
-  [smooth, dwell, dead, bright].forEach(slider => {
+  [smooth, dwell, dead, bright, onset].forEach(slider => {
     slider.addEventListener('input', () => {
       updateVals();
       window.EyeNavConfig.smoothing = parseFloat(smooth.value);
       window.EyeNavConfig.dwellTime = parseInt(dwell.value);
       window.EyeNavConfig.deadZone  = parseInt(dead.value);
       window.EyeNavConfig.brightness = parseFloat(bright.value);
+      window.EyeNavConfig.onsetDelay = parseInt(onset.value);
 
       // Apply brightness live
       const video = document.getElementById('eyeVideo');
       if (video) video.style.filter = `brightness(${window.EyeNavConfig.brightness}) contrast(1.2)`;
+
+      broadcastConfigUpdate({
+        smoothing: window.EyeNavConfig.smoothing,
+        dwellTime: window.EyeNavConfig.dwellTime,
+        deadZone: window.EyeNavConfig.deadZone,
+        brightness: window.EyeNavConfig.brightness,
+        onsetDelay: window.EyeNavConfig.onsetDelay,
+      });
     });
   });
 
   updateVals();
 
+  if (suppressToggle) {
+    suppressToggle.addEventListener('change', () => {
+      window.EyeNavConfig.suppressMouse = suppressToggle.checked;
+      broadcastConfigUpdate({ suppressMouse: suppressToggle.checked });
+    });
+  }
+
+  if (diagnosticsToggle) {
+    diagnosticsToggle.addEventListener('change', () => {
+      window.EyeNavConfig.enableDiagnostics = diagnosticsToggle.checked;
+      broadcastConfigUpdate({ enableDiagnostics: diagnosticsToggle.checked });
+      if (window.webgazer) {
+        if (diagnosticsToggle.checked) {
+          window.webgazer.showVideoPreview(true);
+          window.webgazer.showFaceOverlay(true);
+          window.webgazer.showPredictionPoints(true);
+        } else if (typeof window.hideWebGazerDebug === 'function') {
+          window.hideWebGazerDebug();
+        }
+      }
+    });
+  }
+
   document.getElementById('saveBtn').onclick = () => {
     saveSettings(window.EyeNavConfig);
     console.log('[EyeNav] Settings saved.');
   };
 
   document.getElementById('resetBtn').onclick = () => {
     resetSettings();
     const video = document.getElementById('eyeVideo');
-    if (video) video.style.filter = `brightness(1.0) contrast(1.2)`;
+    if (video) video.style.filter = `brightness(${window.EyeNavConfig.brightness}) contrast(1.2)`;
+    smooth.value = window.EyeNavConfig.smoothing;
+    dwell.value = window.EyeNavConfig.dwellTime;
+    dead.value = window.EyeNavConfig.deadZone;
+    bright.value = window.EyeNavConfig.brightness;
+    onset.value = window.EyeNavConfig.onsetDelay;
+    if (suppressToggle) suppressToggle.checked = window.EyeNavConfig.suppressMouse;
+    if (diagnosticsToggle) diagnosticsToggle.checked = window.EyeNavConfig.enableDiagnostics;
+    updateVals();
+    broadcastConfigUpdate(window.EyeNavConfig);
     console.log('[EyeNav] Settings reset.');
   };
 
   //document.getElementById('calibrateBtn').onclick = () => {
    // if (window.webgazer) {
    //   window.webgazer.clearData();
   //    alert('Calibration reset. Look at the screen edges to re-train.');
    // } else {
   //    console.warn('[EyeNav] WebGazer not available.');
 //    }
 //  };
 }
 
EOF
)
