/**
 * EyeNav – tracker.js (rewritten for self-calibration)
 * - Loads WebGazer, normalizes gaze.
 * - Runs a brief automatic calibration routine (moving targets) to compute bias offsets.
 * - Emits: 'gazerready', 'eyegaze' (detail: {xNorm,yNorm,raw}), 'calibrationprogress' events.
 */

const CALIBRATION_SAMPLES = 60; // per target
const CALIBRATION_TARGETS = [
  {x: 0.1, y: 0.1},
  {x: 0.9, y: 0.1},
  {x: 0.5, y: 0.5},
  {x: 0.1, y: 0.9},
  {x: 0.9, y: 0.9}
];

let calibrationOffsets = {x:0,y:0,scaleX:1,scaleY:1};
let webgazerReady = false;
let gazeListener = null;

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, {detail}));
}

function showTempTarget(px, py) {
  let el = document.getElementById('eyenav-cal-target');
  if (!el) {
    el = document.createElement('div');
    el.id = 'eyenav-cal-target';
    Object.assign(el.style, {
      position: 'fixed',
      width: '20px',
      height: '20px',
      background: '#0f0',
      borderRadius: '50%',
      transform: 'translate(-50%,-50%)',
      zIndex: 999999,
      pointerEvents: 'none',
      boxShadow: '0 0 12px rgba(0,255,0,0.9)',
      transition: 'opacity 0.2s linear'
    });
    document.body.appendChild(el);
  }
  el.style.left = px + 'px';
  el.style.top = py + 'px';
  el.style.opacity = '1';
}

function hideTempTarget() {
  const el = document.getElementById('eyenav-cal-target');
  if (el) el.style.opacity = '0';
}

function applyCalibration(rawX, rawY) {
  const correctedX = (rawX - calibrationOffsets.x) * calibrationOffsets.scaleX;
  const correctedY = (rawY - calibrationOffsets.y) * calibrationOffsets.scaleY;
  const cx = Math.max(0, Math.min(window.innerWidth, correctedX));
  const cy = Math.max(0, Math.min(window.innerHeight, correctedY));
  return { x: cx, y: cy, xNorm: cx / window.innerWidth, yNorm: cy / window.innerHeight };
}

export async function initTracker(opts = {}) {
  console.log('[EyeNav] Tracker initializing (self-calibration mode)...');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('[EyeNav] Camera API unavailable. Ensure HTTPS or use localhost.');
    throw new Error('Camera API unavailable');
  }
  if (!window.webgazer) {
    console.error('[EyeNav] webgazer not loaded. Make sure the script tag is present.');
    throw new Error('webgazer not loaded');
  }

  try {
    await window.webgazer.setTracker('clmtrackr');
    await window.webgazer.setRegression('ridge');
    await window.webgazer.begin();
    try { window.webgazer.showVideoPreview(false); window.webgazer.showFaceOverlay(false); window.webgazer.showPredictionPoints(false); } catch(e){/*ignore*/}
    webgazerReady = true;
    dispatch('gazerready', {});
    console.log('[EyeNav] WebGazer initialized.');
  } catch (err) {
    console.error('[EyeNav] WebGazer init failed:', err);
    throw err;
  }

  if (gazeListener) {
    try { window.webgazer.setGazeListener(null); } catch(e){ }
    gazeListener = null;
  }
  gazeListener = function(data, elapsed) {
    if (!data) return;
    const rawX = data.x, rawY = data.y;
    const corrected = applyCalibration(rawX, rawY);
    dispatch('eyegaze', { x: corrected.xNorm, y: corrected.yNorm, raw: data });
  };
  window.webgazer.setGazeListener(gazeListener);

  try {
    await runAutoCalibration();
  } catch (e) {
    console.warn('[EyeNav] Auto-calibration failed:', e);
  }

  // listen for explicit requests to recalibrate
  document.addEventListener('requestAutoCalibration', async () => {
    try {
      await runAutoCalibration();
    } catch(e) {
      console.warn('[EyeNav] Recalibration failed', e);
    }
  });

  // allow wipe
  document.addEventListener('wipeCalibration', () => {
    calibrationOffsets = {x:0,y:0,scaleX:1,scaleY:1};
    dispatch('calibrationwiped', {});
    console.log('[EyeNav] Calibration wiped.');
  });

  return { stop: stopTracker };
}

export function stopTracker() {
  try {
    if (window.webgazer) {
      window.webgazer.clearGazeListener && window.webgazer.clearGazeListener();
      window.webgazer.end && window.webgazer.end();
    }
    webgazerReady = false;
    hideTempTarget();
  } catch(e) {
    console.warn('[EyeNav] stopTracker error', e);
  }
}

async function runAutoCalibration() {
  console.log('[EyeNav] Running auto-calibration...');
  const pairs = [];
  for (let t=0; t<CALIBRATION_TARGETS.length; t++) {
    const target = CALIBRATION_TARGETS[t];
    const px = Math.round(target.x * window.innerWidth);
    const py = Math.round(target.y * window.innerHeight);
    showTempTarget(px, py);
    await new Promise(r => setTimeout(r, 400));
    const samples = [];
    for (let s=0; s<CALIBRATION_SAMPLES; s++) {
      const datum = await sampleOnce(120);
      if (datum) samples.push({x: datum.x, y: datum.y});
      const progress = { targetIndex: t, sampleIndex: s+1, totalSamples: CALIBRATION_SAMPLES };
      dispatch('calibrationprogress', progress);
    }
    hideTempTarget();
    if (samples.length === 0) {
      pairs.push({target:{x:px,y:py}, median:{x:px,y:py}});
      continue;
    }
    const xs = samples.map(s=>s.x).sort((a,b)=>a-b);
    const ys = samples.map(s=>s.y).sort((a,b)=>a-b);
    const mid = Math.floor(xs.length/2);
    const median = { x: xs[mid], y: ys[mid] };
    pairs.push({target:{x:px,y:py}, median});
  }

  const rawXs = pairs.map(p=>p.median.x), rawYs = pairs.map(p=>p.median.y);
  const tgtXs = pairs.map(p=>p.target.x), tgtYs = pairs.map(p=>p.target.y);
  const rawRangeX = Math.max(...rawXs) - Math.min(...rawXs) || window.innerWidth;
  const rawRangeY = Math.max(...rawYs) - Math.min(...rawYs) || window.innerHeight;
  const tgtRangeX = Math.max(...tgtXs) - Math.min(...tgtXs) || window.innerWidth;
  const tgtRangeY = Math.max(...tgtYs) - Math.min(...tgtYs) || window.innerHeight;
  const scaleX = tgtRangeX / rawRangeX;
  const scaleY = tgtRangeY / rawRangeY;
  const meanRawX = rawXs.reduce((a,b)=>a+b,0)/rawXs.length;
  const meanRawY = rawYs.reduce((a,b)=>a+b,0)/rawYs.length;
  const meanTgtX = tgtXs.reduce((a,b)=>a+b,0)/tgtXs.length;
  const meanTgtY = tgtYs.reduce((a,b)=>a+b,0)/tgtYs.length;
  const offsetX = meanTgtX - (meanRawX * scaleX);
  const offsetY = meanTgtY - (meanRawY * scaleY);

  calibrationOffsets = { x: offsetX, y: offsetY, scaleX: scaleX, scaleY: scaleY };
  console.log('[EyeNav] Auto-calibration complete', calibrationOffsets);
  dispatch('calibrationdone', { offsets: calibrationOffsets, pairsCount: pairs.length });
  return calibrationOffsets;
}

function sampleOnce(timeoutMs=100) {
  return new Promise(resolve => {
    try {
      const start = performance.now();
      const iv = setInterval(()=>{
        const now = performance.now();
        const pred = window.webgazer && window.webgazer.getCurrentPrediction && window.webgazer.getCurrentPrediction();
        if (pred && typeof pred.x === 'number' && typeof pred.y === 'number') {
          clearInterval(iv);
          resolve({x: pred.x, y: pred.y});
        } else if (now - start > timeoutMs) {
          clearInterval(iv);
          resolve(null);
        }
      }, 16);
    } catch(e) {
      resolve(null);
    }
  });
}
