import { MODE_FRAMES, STATE_TO_MODE, resolvePreset, paintFrame } from 'thinking-orbs/engine';

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
    let node = canvas;
    while (node) {
      if (node.classList && (node.classList.contains('live-test-theme-dark') || node.classList.contains('dark'))) {
        return true;
      }
      if (node.getAttribute && node.getAttribute('data-theme') === 'dark') {
        return true;
      }
      node = node.parentElement;
    }
    if (document.querySelector('.live-test-theme-dark')) return true;
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
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
    paintFrame(ctx, frameFn(size, tSec, preset.opts), isDark);
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

