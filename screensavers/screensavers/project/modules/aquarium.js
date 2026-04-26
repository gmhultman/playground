// Aquarium — fish, seaweed, bubbles. Soft cel-shaded.
(function(){
  const S = window.Screensavers;
  S.modules.aquarium = {
    title: "Aquarium",
    tagline: "A calm tank of fish, kelp, and rising bubbles.",
    swatch: "linear-gradient(135deg,#053954,#22a0b8 60%,#f6e6a0 95%)",
    start(container, opts){
      opts = opts || {};
      const density = opts.density ?? 0.5;
      const mouse = S.trackMouse(container);

      let W=0, H=0;
      let fish = [], bubbles = [], kelp = [];

      const seed = (w,h) => {
        fish.length = 0; bubbles.length = 0; kelp.length = 0;
        const Nf = Math.floor(6 + density*18);
        for (let i=0;i<Nf;i++){
          const size = 14 + Math.random()*28;
          fish.push({
            x: Math.random()*w, y: 60 + Math.random()*(h-120),
            vx: (Math.random()<0.5?-1:1) * (20 + Math.random()*40),
            vy: 0, size,
            hue: [18, 32, 45, 200, 330, 12][Math.floor(Math.random()*6)],
            wobble: Math.random()*Math.PI*2,
            tailPhase: Math.random()*Math.PI*2,
          });
        }
        const Nb = Math.floor(20 + density*60);
        for (let i=0;i<Nb;i++){
          bubbles.push({
            x: Math.random()*w,
            y: h + Math.random()*h,
            r: 1 + Math.random()*4,
            vy: 20 + Math.random()*40,
            wobble: Math.random()*Math.PI*2,
          });
        }
        const Nk = 6 + Math.floor(density*6);
        for (let i=0;i<Nk;i++){
          kelp.push({ x: (i+0.5)/Nk * w + (Math.random()*40-20), h: 120 + Math.random()*180, phase: Math.random()*Math.PI*2, hue: 120 + Math.random()*40 });
        }
      };

      const m = S.mountCanvas(container, (ctx, w, h, dt, t) => {
        if (w!==W || h!==H) { W=w; H=h; seed(w,h); }

        // water gradient
        const g = ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0, '#0b4f70');
        g.addColorStop(0.5, '#0f6d8f');
        g.addColorStop(1, '#073b55');
        ctx.fillStyle = g;
        ctx.fillRect(0,0,w,h);

        // sunbeams
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i=0;i<5;i++){
          const sx = (i+0.5)/5 * w + Math.sin(t*0.2 + i)*30;
          ctx.fillStyle = 'rgba(255,240,180,0.04)';
          ctx.beginPath();
          ctx.moveTo(sx-20, 0); ctx.lineTo(sx+20, 0);
          ctx.lineTo(sx+80, h); ctx.lineTo(sx-80, h);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // sand
        ctx.fillStyle = '#d9b875';
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x=0;x<=w;x+=20){
          ctx.lineTo(x, h - 20 - Math.sin(x*0.02)*8);
        }
        ctx.lineTo(w,h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, h-22, w, 2);

        // kelp
        for (const k of kelp){
          ctx.strokeStyle = `hsl(${k.hue},55%,28%)`;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          const baseY = h - 20;
          ctx.moveTo(k.x, baseY);
          const seg = 10;
          for (let i=1;i<=seg;i++){
            const f = i/seg;
            const sx = k.x + Math.sin(t*0.8 + k.phase + f*2)*14*f;
            const sy = baseY - k.h*f;
            ctx.lineTo(sx, sy);
          }
          ctx.stroke();
          ctx.strokeStyle = `hsl(${k.hue},55%,40%)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // fish
        for (const f of fish){
          f.wobble += dt*2;
          f.tailPhase += dt*8;
          const mouseInfluence = mouse.state.inside ? 1 : 0;
          if (mouseInfluence){
            const mx = mouse.state.x * w, my = mouse.state.y * h;
            const dx = f.x - mx, dy = f.y - my;
            const d = Math.hypot(dx,dy);
            if (d < 120){
              f.vx += (dx/d) * 40 * dt;
              f.vy += (dy/d) * 40 * dt;
            }
          }
          f.vy += Math.sin(f.wobble)*4*dt;
          f.vx *= 0.995; f.vy *= 0.9;
          f.x += f.vx*dt; f.y += f.vy*dt;
          if (f.x < -60) { f.x = w+60; }
          if (f.x > w+60) { f.x = -60; }
          if (f.y < 40) f.y = 40;
          if (f.y > h-40) f.y = h-40;

          const dir = Math.sign(f.vx) || 1;
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.scale(dir, 1);
          // tail
          const tailWag = Math.sin(f.tailPhase)*f.size*0.2;
          ctx.fillStyle = `hsl(${f.hue},70%,40%)`;
          ctx.beginPath();
          ctx.moveTo(-f.size*0.8, 0);
          ctx.lineTo(-f.size*1.5, -f.size*0.4 + tailWag);
          ctx.lineTo(-f.size*1.5,  f.size*0.4 + tailWag);
          ctx.closePath(); ctx.fill();
          // body
          ctx.fillStyle = `hsl(${f.hue},75%,55%)`;
          ctx.beginPath();
          ctx.ellipse(0, 0, f.size, f.size*0.55, 0, 0, Math.PI*2);
          ctx.fill();
          // belly
          ctx.fillStyle = `hsl(${f.hue},55%,75%)`;
          ctx.beginPath();
          ctx.ellipse(0, f.size*0.2, f.size*0.7, f.size*0.25, 0, 0, Math.PI*2);
          ctx.fill();
          // fin
          ctx.fillStyle = `hsl(${f.hue},70%,45%)`;
          ctx.beginPath();
          ctx.moveTo(0,-f.size*0.3);
          ctx.lineTo(-f.size*0.1, -f.size*0.8);
          ctx.lineTo(f.size*0.3, -f.size*0.3);
          ctx.closePath(); ctx.fill();
          // eye
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(f.size*0.55, -f.size*0.1, f.size*0.14, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(f.size*0.6, -f.size*0.1, f.size*0.07, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }

        // bubbles
        for (const b of bubbles){
          b.y -= b.vy*dt;
          b.wobble += dt;
          b.x += Math.sin(b.wobble*2)*0.4;
          if (b.y < -10) { b.y = h + 10; b.x = Math.random()*w; }
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath(); ctx.arc(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.3, 0, Math.PI*2); ctx.fill();
        }
      });
      return { stop(){ m.stop(); mouse.dispose(); } };
    }
  };
})();
