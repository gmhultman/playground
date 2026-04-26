// Warp Drive — starfield with motion streaks
(function(){
  const S = window.Screensavers;
  S.modules.warp = {
    title: "Warp Drive",
    tagline: "Plunge through an endless field of stars.",
    swatch: "linear-gradient(135deg,#0a0420,#6c2bd9 60%,#fff 95%)",
    start(container, opts){
      opts = opts || {};
      const density = opts.density ?? 0.5;
      const mouse = S.trackMouse(container);
      const stars = [];
      const N = Math.floor(160 + density * 540);
      const reseed = (w, h) => {
        stars.length = 0;
        for (let i=0;i<N;i++){
          stars.push({
            x: (Math.random()*2-1) * w,
            y: (Math.random()*2-1) * h,
            z: Math.random() * 1,
            pz: 0,
            hue: Math.random() < 0.1 ? (180 + Math.random()*80) : (220 + Math.random()*40),
            sat: Math.random() < 0.15 ? 80 : 10,
          });
        }
      };
      let W=0, H=0;
      const m = S.mountCanvas(container, (ctx, w, h, dt, t) => {
        if (w !== W || h !== H) { W=w; H=h; reseed(w,h); }
        // background with subtle nebula
        ctx.fillStyle = 'rgba(6,4,16,0.35)';
        ctx.fillRect(0,0,w,h);

        // nebula puffs
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i=0;i<3;i++){
          const cx = w*(0.25 + 0.25*i) + Math.sin(t*0.05 + i)*40;
          const cy = h*(0.5) + Math.cos(t*0.07 + i*2)*30;
          const g = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*0.4);
          g.addColorStop(0, `rgba(${80+i*40},${30+i*20},${180-i*30},0.04)`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0,0,w,h);
        }
        ctx.restore();

        const cx = w/2 + (mouse.state.inside ? (mouse.state.x - 0.5) * 80 : 0);
        const cy = h/2 + (mouse.state.inside ? (mouse.state.y - 0.5) * 80 : 0);
        const speed = 0.4 + density * 0.9;

        for (let i=0;i<stars.length;i++){
          const s = stars[i];
          s.pz = s.z;
          s.z -= dt * speed * 0.45;
          if (s.z <= 0.02) {
            s.x = (Math.random()*2-1) * w;
            s.y = (Math.random()*2-1) * h;
            s.z = 1; s.pz = 1;
          }
          const sx = s.x / s.z + cx;
          const sy = s.y / s.z + cy;
          const px = s.x / s.pz + cx;
          const py = s.y / s.pz + cy;
          const size = Math.max(0.4, (1 - s.z) * 2.4);
          const alpha = Math.min(1, (1 - s.z) * 1.6);
          ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${70 + (1-s.z)*25}%, ${alpha})`;
          ctx.lineWidth = size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
      });

      return {
        stop(){ m.stop(); mouse.dispose(); }
      };
    }
  };
})();
