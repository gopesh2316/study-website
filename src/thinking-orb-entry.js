import { MODE_FRAMES, STATE_TO_MODE, resolvePreset } from 'thinking-orbs/engine';

/**
 * Custom frame painter ensuring:
 * - In white/light theme: dots & lines are crisp, deep black (rgba(0..35, 0..35, 0..35, alpha))
 * - In dark theme: dots & lines are bright white (rgba(180..255, 180..255, 180..255, alpha))
 */
function paintOrbFrame(ctx, frame, isDark) {
  // 1. Paint lines if present
  if (frame.lines && frame.lines.length) {
    for (const l of frame.lines) {
      const alpha = l.a ?? 1;
      if (alpha < 0.02) continue;
      const w = Math.min(1, Math.max(0, l.white ?? 0));
      const g = isDark ? Math.round((1 - w * 0.3) * 255) : Math.round(w * 35);
      ctx.strokeStyle = `rgba(${g},${g},${g},${alpha})`;
      ctx.lineWidth = l.w;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }
  }

  // 2. Paint dots
  if (frame.dots && frame.dots.length) {
    for (const d of frame.dots) {
      const alpha = d.a ?? 1;
      if (alpha < 0.02) continue;
      const w = Math.min(1, Math.max(0, d.white ?? 0));
      const g = isDark ? Math.round((1 - w * 0.3) * 255) : Math.round(w * 35);
      ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(0.3, d.r), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function createThinkingOrb({
  state = 'solving',
  size = 64,
  speed = 1,
  dark = null,
  paused = false,
  className = 'thinking-orb-canvas',
  ariaLabel
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', ariaLabel || `AI ${state} orb`);
  
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.display = 'block';

  let running = false;
  let rafId = 0;
  let isPaused = paused;

  const validSize = size === 20 ? 20 : (size === 32 ? 32 : 64);
  const preset = resolvePreset(state, validSize);
  const frameFn = MODE_FRAMES[preset.mode];
  const effSpeed = preset.speed * speed;

  const ctx = canvas.getContext('2d');

  function resolveDark() {
    if (typeof dark === 'boolean') return dark;
    
    // Check canvas and its ancestors
    if (canvas && typeof canvas.closest === 'function') {
      const darkContainer = canvas.closest('.live-test-theme-dark, .dark, [data-theme="dark"]');
      if (darkContainer) return true;
      const lightContainer = canvas.closest('.live-test-wrapper:not(.live-test-theme-dark), .test-session-container:not(.live-test-theme-dark)');
      if (lightContainer) return false;
    }

    // Check active visible test session
    const activeTestSession = document.querySelector('.test-session-container:not(.hidden)');
    if (activeTestSession) {
      return activeTestSession.classList.contains('live-test-theme-dark');
    }

    // Check active modal or main content
    const activeModal = document.querySelector('.live-test-modal:not(.hidden)');
    if (activeModal) {
      return activeModal.classList.contains('live-test-theme-dark');
    }

    const mainArea = document.querySelector('.main-content-area');
    if (mainArea) {
      return mainArea.classList.contains('live-test-theme-dark');
    }

    if (document.body.classList.contains('live-test-theme-dark') || document.documentElement.classList.contains('live-test-theme-dark')) {
      return true;
    }

    // Default to false (white theme -> black orb)
    return false;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }

  resize();

  function draw(tSec) {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const isDark = resolveDark();
    paintOrbFrame(ctx, frameFn(size, tSec, preset.opts), isDark);
  }

  function loop() {
    if (!running || isPaused) return;
    draw((performance.now() / 1000) * effSpeed);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || isPaused) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // Draw initial frame immediately
  draw(0.6 * effSpeed);

  // Auto start
  start();

  // Watch visibility & intersection
  let io = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && document.visibilityState !== 'hidden') {
        start();
      } else {
        stop();
      }
    });
    io.observe(canvas);
  }

  const onVisChange = () => {
    if (document.visibilityState === 'hidden') stop();
    else if (!isPaused) start();
  };
  document.addEventListener('visibilitychange', onVisChange);

  // Expose controls on element
  canvas.startOrb = start;
  canvas.stopOrb = stop;
  canvas.setPaused = (p) => {
    isPaused = p;
    if (isPaused) stop();
    else start();
  };
  canvas.destroyOrb = () => {
    stop();
    if (io) io.disconnect();
    document.removeEventListener('visibilitychange', onVisChange);
  };

  return canvas;
}

// Global attachment
if (typeof window !== 'undefined') {
  window.ThinkingOrb = {
    create: createThinkingOrb
  };
  window.createThinkingOrb = createThinkingOrb;
}

