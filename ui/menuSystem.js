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

  container.innerHTML = `
    <div id="menu">
      <div id="menuHeader">⚙️ <span>EyeNav Settings</span></div>
      <div id="menuBody">
        <label>
          Smoothing
          <input id="smoothRange" type="range" min="0" max="1" step="0.05" value="${window.EyeNavConfig.smoothing || 0.3}">
          <span id="smoothVal">${window.EyeNavConfig.smoothing || 0.3}</span>
        </label>
        <label>
          Dwell (ms)
          <input id="dwellRange" type="range" min="300" max="1500" step="50" value="${window.EyeNavConfig.dwellTime || 800}">
          <span id="dwellVal">${window.EyeNavConfig.dwellTime || 800}</span>
        </label>
        <label>
          Dead Zone (px)
          <input id="deadRange" type="range" min="0" max="50" step="2" value="${window.EyeNavConfig.deadZone || 12}">
          <span id="deadVal">${window.EyeNavConfig.deadZone || 12}</span>
        </label>
        <label>
          Brightness
          <input id="brightRange" type="range" min="0.5" max="2.0" step="0.05" value="${window.EyeNavConfig.brightness || 1.2}">
          <span id="brightVal">${window.EyeNavConfig.brightness || 1.2}</span>
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

  const smoothVal = document.getElementById('smoothVal');
  const dwellVal  = document.getElementById('dwellVal');
  const deadVal   = document.getElementById('deadVal');
  const brightVal = document.getElementById('brightVal');

  function updateVals() {
    smoothVal.textContent = parseFloat(smooth.value).toFixed(2);
    dwellVal.textContent = dwell.value;
    deadVal.textContent  = dead.value;
    brightVal.textContent = parseFloat(bright.value).toFixed(2);
  }

  [smooth, dwell, dead, bright].forEach(slider => {
    slider.addEventListener('input', () => {
      updateVals();
      window.EyeNavConfig.smoothing = parseFloat(smooth.value);
      window.EyeNavConfig.dwellTime = parseInt(dwell.value);
      window.EyeNavConfig.deadZone  = parseInt(dead.value);
      window.EyeNavConfig.brightness = parseFloat(bright.value);

      // Apply brightness live
      const video = document.getElementById('eyeVideo');
      if (video) video.style.filter = `brightness(${window.EyeNavConfig.brightness}) contrast(1.2)`;
    });
  });

  updateVals();

  document.getElementById('saveBtn').onclick = () => {
    saveSettings(window.EyeNavConfig);
    console.log('[EyeNav] Settings saved.');
  };

  document.getElementById('resetBtn').onclick = () => {
    resetSettings();
    const video = document.getElementById('eyeVideo');
    if (video) video.style.filter = `brightness(1.0) contrast(1.2)`;
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
