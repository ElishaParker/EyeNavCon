/**
 * EyeNav – storage.js
 * Manages persistent configuration in localStorage.
 * Exports saveSettings() and resetSettings() used by menuSystem.js.
 */

const STORAGE_KEY = 'EyeNavConfig';

// Default configuration values
const DEFAULT_CONFIG = {
  smoothing: 0.3,
  dwellTime: 800,
  deadZone: 12
};

/**
 * Restores settings from localStorage (or defaults).
 * Attaches the result to window.EyeNavConfig for global use.
 */
export async function restoreSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      window.EyeNavConfig = JSON.parse(saved);
      console.log('[EyeNav] Settings restored from storage:', window.EyeNavConfig);
    } else {
      window.EyeNavConfig = { ...DEFAULT_CONFIG };
      console.log('[EyeNav] Using default settings.');
    }
  } catch (err) {
    console.error('[EyeNav] Failed to load settings:', err);
    window.EyeNavConfig = { ...DEFAULT_CONFIG };
  }
}

/**
 * Saves the given config object to localStorage.
 */
export function saveSettings(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log('[EyeNav] Settings saved to storage:', config);
  } catch (err) {
    console.error('[EyeNav] Failed to save settings:', err);
  }
}

/**
 * Resets all settings to default and clears storage.
 */
export function resetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.EyeNavConfig = { ...DEFAULT_CONFIG };
    console.log('[EyeNav] Settings reset to default.');
  } catch (err) {
    console.error('[EyeNav] Failed to reset settings:', err);
  }
}
