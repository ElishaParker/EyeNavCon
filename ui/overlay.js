/**
 * EyeNav – overlay.js
 * Manages canvas for cursor and dwell feedback.
 */

export function initOverlay() {
  const canvas = document.getElementById('overlayCanvas');
  const ctx = canvas.getContext('2d');
  resize();

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawCursor(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  return { clear, drawCursor };
}
