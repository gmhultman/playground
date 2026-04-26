// Sky Mail — paper planes soaring through clouds (flat vector daytime)
(function(){
  const S = window.Screensavers;
  S.modules.planes = {
    title: "Sky Mail",
    tagline: "Paper planes drift across a bright cloudy sky.",
    swatch: "linear-gradient(135deg,#7ec8e8,#c8e8f0 60%,#fff 95%)",
    start(container, opts){
      opts = opts || {};
      const density = opts.density ?? 0.5;
      const mouse = S.trackMouse(container);

      let W=0, H=0;
      let clouds = [], planes = [];

      const seed = (w,h) => {
        clouds = []; planes = [];
        const Nc = Math.floor(8 + density*20);
        for (let i=0;i<Nc;i++){
          clouds.push({
            x: Math.random()*w,
            y: Math.random()*h*0.8,
            s: 0.4 + Math.random()*1.4,
            v: 4 + Math.random()*12,
          });
        }
        const Np = Math.floor(3 + density*9);
        for (let i=0;i<Np;i++){
          planes.push({
            x: Math.random()*w,
            y: 40 + Math.random()*(h-80),
            vx: 40 + Math.random()*80,
            vy: 0,
            size: 18 + Math.random()*16,
            tilt: 0,
            trail: [],
            hue: [0, 20, 200, 0, 0][Math.floor(Math.random()*5)], // mostly white
            sat: Math.random() < 0.3 ? 70 : 0,
          });
        }
      };

      const m = S.mountCanvas(container, (ctx, w, h, dt, t) => {
        if (w!==W || h!==H) { W=w; H=h; seed(w,h); }

        // sky gradient
        const g = ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0, '#9bd4ee');
        g.addColorStop(0.6, '#c6e4f2');
        g.addColorStop(1, '#e9f3ee');
        ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

        // sun
        const sx = w*0.82, sy = h*0.22;
        const sg = ctx.createRadialGradient(sx,sy,0,sx,sy,220);
        sg.addColorStop(0, 'rgba(255,240,200,0.9)');
        sg.addColorStop(0.5, 'rgba(255,230,170,0.2)');
        sg.addColorStop(1, 'rgba(255,230,170,0)');
        ctx.fillStyle = sg; ctx.fillRect(0,0,w,h);
        ctx.fillStyle = '#fff8d9';
        ctx.beginPath(); ctx.arc(sx,sy,36,0,Math.PI*2); ctx.fill();

        // clouds (back)
        for (const c of clouds){
          c.x += c.v*dt;
          if (c.x - 160*c.s > w) c.x = -160*c.s;
          drawCloud(ctx, c.x, c.y, c.s);
        }

        // planes
        for (const p of planes){
          const mouseInfluence = mouse.state.inside ? 1 : 0;
          let targetVy = Math.sin(t*0.5 + p.x*0.01)*18;
          if (mouseInfluence){
            const mx = mouse.state.x * w, my = mouse.state.y * h;
            targetVy += (my - p.y) * 0.4;
          }
          p.vy += (targetVy - p.vy) * Math.min(1, dt*2);
          p.x += p.vx*dt; p.y += p.vy*dt;
          p.tilt = Math.atan2(p.vy, p.vx);
          if (p.x - p.size > w) { p.x = -p.size; p.y = 40 + Math.random()*(h-80); p.trail = []; }
          if (p.y < 20) p.y = 20;
          if (p.y > h-20) p.y = h-20;

          p.trail.push({x:p.x, y:p.y});
          if (p.trail.length > 30) p.trail.shift();

          // trail
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i=0;i<p.trail.length;i++){
            const pt = p.trail[i];
            const a = i / p.trail.length;
            ctx.globalAlpha = a*0.6;
            if (i===0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;

          // plane
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.tilt);
          drawPlane(ctx, p.size, p.hue, p.sat);
          ctx.restore();
        }
      });

      function drawCloud(ctx, x, y, s){
        ctx.save();
        ctx.translate(x,y);
        ctx.scale(s,s);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(-30, 0, 28, 0, Math.PI*2);
        ctx.arc(0, -14, 34, 0, Math.PI*2);
        ctx.arc(30, -4, 28, 0, Math.PI*2);
        ctx.arc(18, 14, 22, 0, Math.PI*2);
        ctx.arc(-18, 14, 24, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(120,160,200,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 22, 60, 8, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      function drawPlane(ctx, size, hue, sat){
        const col = sat ? `hsl(${hue},${sat}%,55%)` : '#fff';
        const shadow = sat ? `hsl(${hue},${sat}%,40%)` : '#c8d4dc';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size*0.8, -size*0.5);
        ctx.lineTo(-size*0.3, 0);
        ctx.lineTo(-size*0.8, size*0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#22384a';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.moveTo(-size*0.3, 0);
        ctx.lineTo(-size*0.8, size*0.5);
        ctx.lineTo(size*0.4, 0);
        ctx.closePath();
        ctx.fill();
      }

      return { stop(){ m.stop(); mouse.dispose(); } };
    }
  };
})();
