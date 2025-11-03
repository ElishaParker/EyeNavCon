/**
 * EyeNav – menuSystem.js
 * On-screen configuration panel for dwell, smoothing, and calibration.
 * Updates global config live and persists changes via storage.js.
 */

import { saveSettings } from "../core/storage.js";
import { recalibrate } from "../core/tracker.js";

export async function initMenu() {
  console.log("[EyeNav] Initializing settings menu…");
  const container = document.getElementById("menuContainer");

  container.innerHTML = `
    <div id="menu">
      <h3>⚙️ EyeNav Settings</h3>
      <label>Smoothing 
        <input id="smoothRange" type="range" min="0" max="1" step="0.05" value="${window.EyeNavConfig.smoothing}">
        <span id="smoothVal">${window.EyeNavConfig.smoothing}</span>
      </label>
      <label>Dwell (ms) 
        <input id="dwellRange" type="range" min="300" max="1500" step="50" value="${window.EyeNavConfig.dwellTime}">
        <span id="dwellVal">${window.EyeNavConfig.dwellTime}</span>
      </label>
      <label>Dead Zone (px) 
        <input id="deadRange" type="range" min="0" max="50" step="2" value="${window.EyeNavConfig.deadZone}">
        <span id="deadVal">${window.EyeNavConfig.deadZone}</span>
      </label>
      <button id="calibrateBtn">Re-Calibrate</button>
      <button id="saveBtn">💾 Save</button>
      <button id="resetBtn">♻️ Reset</button>
    </div>
  `;

  // live updates
  const update = (key, val) => {
    window.EyeNavConfig[key] = val;
    document.getElementById(`${key === "smoothing" ? "smooth" : key === "dwellTime" ? "dwell" : "dead"}Val`).textContent = val;
  };

  document.getElementById("smoothRange").oninput = e => update("smoothing", parseFloat(e.target.value));
  document.getElementById("dwellRange").oninput  = e => update("dwellTime", parseInt(e.target.value));
  document.getElementById("deadRange").oninput   = e => update("deadZone", parseInt(e.target.value));

  document.getElementById("saveBtn").onclick = async () => {
    await saveSettings("config", window.EyeNavConfig);
    alert("Settings saved!");
  };

  document.getElementById("resetBtn").onclick = () => {
    localStorage.clear();
    alert("Settings cleared. Reloading…");
    location.reload();
  };

  document.getElementById("calibrateBtn").onclick = () => recalibrate();
}
