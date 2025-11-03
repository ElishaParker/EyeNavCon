/**
 * EyeNav – menuSystem.js
 * Dropdown settings menu for smoothing, dwell, and dead zone values.
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

  // Collapse / expand toggle
  header.onclick = () => body.classList.toggle('collapsed');

  // Sliders
  const smooth = document.getElementById('smoothRange');
  const dwell = document.getElementById('dwellRange');
  const dead  = document.getElementById('deadRange');
  const smoothVal = document.getElementById('smoothVal');
  const dwellVal  = document.getElementById('dwellVal');
  const deadVal   = document.getElementById('deadVal');

  function updateVals() {
    smoothVal.textContent = parseFloat(smooth.value).toFixed(2);
    dwellVal.textContent = dwell.value;
    deadVal.textContent  = dead.value;
  }

  [smooth, dwell, dead].forEach(slider => {
    slider.addEventListener('input', () => {
      updateVals();
      window.EyeNavConfig.smoothing = parseFloat(smooth.value);
      window.EyeNavConfig.dwellTime = parseInt(dwell.value);
      window.EyeNavConfig.deadZone  = parseInt(dead.value);
    });
  });

  updateVals();

  // Buttons
  document.getElementById('saveBtn').onclick = () => {
    saveSettings(window.EyeNavConfig);
    console.log('[EyeNav] Settings saved.');
  };

  document.getElementById('resetBtn').onclick = () => {
    resetSettings();
    console.log('[EyeNav] Settings reset.');
  };

  document.getElementById('calibrateBtn').onclick = () => {
    if (window.webgazer) {
      window.webgazer.clearData();
      alert('Calibration reset. Look at the screen edges to re-train.');
    } else {
      console.warn('[EyeNav] WebGazer not available.');
    }
  };
}
