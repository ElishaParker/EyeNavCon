 /**
  * EyeNav – blinkDetector.js
  * In-browser blink detection via intensity + frame-difference.
  * Emits a CustomEvent('eyeblink', { detail: { duration, strength } }).
  */
 
 export async function initBlinkDetector() {
   console.log('[EyeNav] Blink detector online…');
   const video = document.getElementById('eyeVideo');
   const canvas = document.createElement('canvas');
   const ctx = canvas.getContext('2d', { willReadFrequently: true });
 
+  const eventTargets = [window, document];
+
   // working state
   let lastIntensity = null;
   let lastFrame = null;
   let blinkActive = false;
   let blinkStart = 0;
 
   // adaptive thresholds
   const INTENSITY_THRESHOLD = 25;   // Δ brightness indicating eyelid closure
   const MOTION_THRESHOLD = 10;      // frame-to-frame avg diff
   const MIN_BLINK_MS = 50;          // ignore microflickers
   const MAX_BLINK_MS = 800;         // ignore long eye closures
 
   function analyzeFrame() {
     if (!video.videoWidth || !video.videoHeight) {
       return requestAnimationFrame(analyzeFrame);
     }
 
     canvas.width = video.videoWidth;
     canvas.height = video.videoHeight;
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
 
     const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const pixels = frame.data;
     let sum = 0, diffSum = 0;
 
@@ -43,38 +45,38 @@ export async function initBlinkDetector() {
 
     const avgIntensity = sum / (pixels.length / 4);
     const avgMotion = lastFrame ? diffSum / (pixels.length / 4) : 0;
     lastFrame = frame;
 
     // baseline adaptive
     if (lastIntensity === null) {
       lastIntensity = avgIntensity;
       return requestAnimationFrame(analyzeFrame);
     }
 
     const intensityChange = avgIntensity - lastIntensity;
     lastIntensity = avgIntensity;
 
     // blink enter
     if (!blinkActive && intensityChange > INTENSITY_THRESHOLD && avgMotion > MOTION_THRESHOLD) {
       blinkActive = true;
       blinkStart = performance.now();
     }
 
     // blink exit
     if (blinkActive && intensityChange < 0) {
       const duration = performance.now() - blinkStart;
       blinkActive = false;
       if (duration > MIN_BLINK_MS && duration < MAX_BLINK_MS) {
-        const event = new CustomEvent('eyeblink', {
-          detail: { duration, strength: intensityChange }
-        });
-        document.dispatchEvent(event);
+        const detail = { duration, strength: intensityChange };
+        eventTargets.forEach((target) =>
+          target.dispatchEvent(new CustomEvent('eyeblink', { detail }))
+        );
         console.log('[EyeNav] Blink detected (', Math.round(duration), 'ms )');
       }
     }
 
     requestAnimationFrame(analyzeFrame);
   }
 
   requestAnimationFrame(analyzeFrame);
 }
 
EOF
)
