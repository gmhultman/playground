// Lava Flow — metaball liquid blobs (warm 70s palette)
(function(){
  const S = window.Screensavers;
  S.modules.lava = {
    title: "Lava Flow",
    tagline: "Warm liquid metaballs drift and merge.",
    swatch: "linear-gradient(135deg,#2a0b0b,#e05a1a 60%,#f8c458 95%)",
    start(container, opts){
      opts = opts || {};
      const density = opts.density ?? 0.5;
      const mouse = S.trackMouse(container);
      let W=0, H=0;
      let blobs = [];

      const seed = (w,h) => {
        blobs = [];
        const N = Math.floor(5 + density*14);
        for (let i=0;i<N;i++){
          blobs.push({
            x: Math.random()*w, y: Math.random()*h,
            vx: (Math.random()*2-1)*20, vy: (Math.random()*2-1)*20,
            r: 40 + Math.random()*90,
          });
        }
      };

      let field;
      const CELL = 10;

      const m = S.mountCanvas(container, (ctx, w, h, dt, t) => {
        if (w!==W || h!==H) { W=w; H=h; seed(w,h); }

        // background gradient (dark lamp interior)
        const g = ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0, '#1a0606');
        g.addColorStop(1, '#3a0e06');
        ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

        // update blobs
        for (const b of blobs){
          if (mouse.state.inside){
            const mx = mouse.state.x*w, my = mouse.state.y*h;
            const dx = mx - b.x, dy = my - b.y;
            const d = Math.hypot(dx,dy) || 1;
            if (d < 200){
              b.vx += (dx/d) * 30 * dt;
              b.vy += (dy/d) * 30 * dt;
            }
          }
          b.vy += Math.sin(t*0.3 + b.x*0.01)*6*dt;
          b.vx *= 0.99; b.vy *= 0.99;
          b.x += b.vx*dt; b.y += b.vy*dt;
          if (b.x < b.r) { b.x = b.r; b.vx *= -0.6; }
          if (b.x > w-b.r) { b.x = w-b.r; b.vx *= -0.6; }
          if (b.y < b.r) { b.y = b.r; b.vy *= -0.6; }
          if (b.y > h-b.r) { b.y = h-b.r; b.vy *= -0.6; }
        }

        // metaball field via low-res grid
        const cols = Math.ceil(w/CELL)+1;
        const rows = Math.ceil(h/CELL)+1;
        if (!field || field.length !== cols*rows) field = new Float32Array(cols*rows);

        for (let y=0;y<rows;y++){
          for (let x=0;x<cols;x++){
            const px = x*CELL, py = y*CELL;
            let v = 0;
            for (const b of blobs){
              const dx = px - b.x, dy = py - b.y;
              const d2 = dx*dx + dy*dy + 1;
              v += (b.r*b.r) / d2;
            }
            field[y*cols+x] = v;
          }
        }

        // draw — for each cell, color by threshold
        for (let y=0;y<rows-1;y++){
          for (let x=0;x<cols-1;x++){
            const v = field[y*cols+x];
            if (v > 0.6){
              const heat = Math.min(1, (v-0.6)*1.2);
              const hue = 20 - heat*15;
              const light = 25 + heat*45;
              ctx.fillStyle = `hsl(${hue}, 90%, ${light}%)`;
              ctx.fillRect(x*CELL, y*CELL, CELL+1, CELL+1);
            }
          }
        }

        // glow pass
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const b of blobs){
          const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r*1.4);
          rg.addColorStop(0, 'rgba(255,200,120,0.35)');
          rg.addColorStop(1, 'rgba(255,100,0,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(b.x-b.r*1.5, b.y-b.r*1.5, b.r*3, b.r*3);
        }
        ctx.restore();

        // lamp vignette
        const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.7);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vg; ctx.fillRect(0,0,w,h);
      });

      return { stop(){ m.stop(); mouse.dispose(); } };
    }
  };
})();
