/**
 * EyeNav - storage.js
 * Persistent configuration management using localStorage.
 */

const PREFIX = 'EyeNav_';

export async function saveSettings(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.warn('[EyeNav] Failed to save settings:', err);
  }
}

export async function loadSetting(key, fallback = null) {
  try {
    const data = localStorage.getItem(PREFIX + key);
    return data ? JSON.parse(data) : fallback;
  } catch (err) {
    console.warn('[EyeNav] Load failed:', err);
    return fallback;
  }
}

export async function restoreSettings() {
  console.log('[EyeNav] Restoring persistent settings...');
  const defaults = {
    smoothing: 0.3,
    deadZone: 12,
    dwellTime: 800,
    onsetDelay: 200,
    mirror: true,
  };
  // Merge defaults with stored user values
  const current = (await loadSetting('config')) || {};
  window.EyeNavConfig = { ...defaults, ...current };
  console.log('[EyeNav] Active config:', window.EyeNavConfig);
}
