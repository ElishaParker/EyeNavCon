/**
 * EyeNav – menuSystem.js (simplified)
 * - Removed manual sliders and replaced with auto-calibrate and minimal toggles.
 * - Exposes initMenu() to create a compact settings panel.
 */

export async function initMenu() {
  console.log('[EyeNav] Menu initializing (minimal)...');
  let container = document.getElementById('eyenav-menu');
  if (!container) {
    container = document.createElement('div');
    container.id = 'eyenav-menu';
    Object.assign(container.style, {
      position: 'fixed',
      right: '12px',
      top: '12px',
      background: 'rgba(0,0,0,0.6)',
      color: '#fff',
      padding: '8px 10px',
      borderRadius: '8px',
      zIndex: 999999,
      fontFamily: 'monospace',
      fontSize: '13px'
    });
    document.body.appendChild(container);
  } else {
    container.innerHTML = '';
  }

  const title = document.createElement('div'); title.textContent = 'EyeNav • Settings';
  title.style.fontWeight = '700';
  title.style.marginBottom = '6px';
  container.appendChild(title);

  const btn = document.createElement('button');
  btn.textContent = 'Auto-Calibrate';
  Object.assign(btn.style, {display:'block', marginBottom:'6px', padding:'6px 8px', cursor:'pointer'});
  btn.onclick = () => {
    document.dispatchEvent(new CustomEvent('requestAutoCalibration', {}));
    btn.disabled = true;
    btn.textContent = 'Calibrating...';
    const onDone = (e) => {
      btn.disabled = false;
      btn.textContent = 'Auto-Calibrate';
      document.removeEventListener('calibrationdone', onDone);
    };
    document.addEventListener('calibrationdone', onDone);
  };
  container.appendChild(btn);

  const diagToggle = document.createElement('button');
  diagToggle.textContent = 'Toggle Diagnostics';
  Object.assign(diagToggle.style, {display:'block', marginBottom:'6px', padding:'6px 8px', cursor:'pointer'});
  diagToggle.onclick = () => {
    document.dispatchEvent(new CustomEvent('toggleDiagnostics', {}));
  };
  container.appendChild(diagToggle);

  const wipe = document.createElement('button');
  wipe.textContent = 'Wipe Calibration';
  Object.assign(wipe.style, {display:'block', marginBottom:'6px', padding:'6px 8px', cursor:'pointer'});
  wipe.onclick = () => {
    document.dispatchEvent(new CustomEvent('wipeCalibration', {}));
  };
  container.appendChild(wipe);

  return { container };
}
