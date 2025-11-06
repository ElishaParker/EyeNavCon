/**
 * EyeNav – blinkDetector.js (adaptive baseline)
 * - Computes rolling baseline for intensity / frame-difference.
 * - Emits 'eyeblink' events: detail {duration, strength}
 */

const BASELINE_WINDOW = 120; // frames (~4s at 30fps)
const MIN_BLINK_MS = 40;
const MAX_BLINK_MS = 350;

export async function initBlinkDetector(opts={}) {
  console.log('[EyeNav] Blink detector initializing (adaptive)...');
  const video = document.getElementById('eyeVideo');
  if (!video) {
    console.warn('[EyeNav] No #eyeVideo element found for blink detection.');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let baseline = [];
  let lastFrameData = null;
  let blinkStart = 0;
  let blinkActive = false;

  function pushBaseline(val) {
    baseline.push(val);
    if (baseline.length > BASELINE_WINDOW) baseline.shift();
  }
  function baselineStats() {
    if (!baseline.length) return {mean:0, stdev:0};
    const mean = baseline.reduce((a,b)=>a+b,0)/baseline.length;
    const stdev = Math.sqrt(baseline.reduce((a,b)=>a+(b-mean)**2,0)/baseline.length);
    return {mean, stdev};
  }

  function analyzeFrame() {
    try {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(analyzeFrame);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0,0,canvas.width, canvas.height);
      let sum = 0, count = 0;
      for (let i=0;i<img.data.length;i+=16) {
        const r = img.data[i], g = img.data[i+1], b = img.data[i+2];
        sum += (0.299*r + 0.587*g + 0.114*b);
        count++;
      }
      const intensity = sum / count;

      let intensityChange = 0;
      if (lastFrameData != null) {
        intensityChange = Math.abs(intensity - lastFrameData);
      }
      lastFrameData = intensity;
      pushBaseline(intensity);

      const {mean, stdev} = baselineStats();
      const dropThreshold = Math.max(10, stdev * 1.0);

      if (!blinkActive && intensityChange > dropThreshold && intensity < mean - (stdev*0.6)) {
        blinkActive = true;
        blinkStart = performance.now();
      } else if (blinkActive && intensityChange > dropThreshold && intensity > mean - (stdev*0.3)) {
        const duration = performance.now() - blinkStart;
        blinkActive = false;
        if (duration > MIN_BLINK_MS && duration < MAX_BLINK_MS) {
          const event = new CustomEvent('eyeblink', { detail: { duration: Math.round(duration), strength: intensityChange }});
          document.dispatchEvent(event);
          console.log('[EyeNav] Blink detected', Math.round(duration), 'ms');
        }
      }

    } catch (e) {
      console.warn('[EyeNav] blink analyze error', e);
    }
    requestAnimationFrame(analyzeFrame);
  }

  requestAnimationFrame(analyzeFrame);
  return { stop: ()=>{/* noop */} };
}
