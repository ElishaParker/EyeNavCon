container.innerHTML = `
  <div id="menu">
    <div id="menuHeader">⚙️ <span>EyeNav Settings</span></div>
    <div id="menuBody">
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
      <div class="menuButtons">
        <button id="calibrateBtn">Re-Calibrate</button>
        <button id="saveBtn">💾 Save</button>
        <button id="resetBtn">♻️ Reset</button>
      </div>
    </div>
  </div>
`;

const header = document.getElementById("menuHeader");
const body = document.getElementById("menuBody");
header.onclick = () => body.classList.toggle("collapsed");
