// Shared module registry + helpers
// Each module registers itself as: window.Screensavers.modules[key] = { title, tagline, swatch, start(container, opts) -> { stop() } }
(function(){
  window.Screensavers = window.Screensavers || { modules: {} };

  // Canvas helper: creates a resizing canvas inside container, returns { canvas, ctx, dispose }
  window.Screensavers.mountCanvas = function(container, draw, onResize) {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let running = true;
    let t0 = performance.now();

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onResize) onResize(rect.width, rect.height);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    function loop(now){
      if (!running) return;
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      draw(ctx, canvas.clientWidth || container.clientWidth, canvas.clientHeight || container.clientHeight, dt, now / 1000);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      canvas, ctx,
      stop(){
        running = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  };

  // mouse tracking for a container, 0..1 normalized, returns { x, y, raw, dispose }
  window.Screensavers.trackMouse = function(container) {
    const state = { x: 0.5, y: 0.5, rawX: 0, rawY: 0, inside: false };
    function onMove(e) {
      const r = container.getBoundingClientRect();
      state.rawX = e.clientX - r.left;
      state.rawY = e.clientY - r.top;
      state.x = Math.max(0, Math.min(1, state.rawX / r.width));
      state.y = Math.max(0, Math.min(1, state.rawY / r.height));
      state.inside = true;
    }
    function onLeave() { state.inside = false; }
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return {
      state,
      dispose(){
        container.removeEventListener('mousemove', onMove);
        container.removeEventListener('mouseleave', onLeave);
      }
    };
  };

  // tiny PRNG for reproducible looks
  window.Screensavers.rand = (seed) => {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };
})();
