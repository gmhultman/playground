// Neon Drizzle — tiny animated cyberpunk alley in the rain
(function(){
  const S = window.Screensavers;
  S.modules.neon = {
    title: "Neon Drizzle",
    tagline: "A quiet cyberpunk alley under falling rain.",
    swatch: "linear-gradient(135deg,#0a0a1a,#ff2e88 60%,#00e5ff 95%)",
    start(container, opts){
      opts = opts || {};
      const density = opts.density ?? 0.5;
      const mouse = S.trackMouse(container);
      let W=0, H=0;
      let drops = [], signs = [], puddles = [];

      const seed = (w,h) => {
        drops = []; signs = []; puddles = [];
        const Nd = Math.floor(80 + density*260);
        for (let i=0;i<Nd;i++){
          drops.push({
            x: Math.random()*w, y: Math.random()*h,
            v: 400 + Math.random()*500,
            len: 8 + Math.random()*18,
          });
        }
        const texts = ["雨","未来","NOIR","夜","東京","OPEN 24H","電","NEO","お茶","ラメン"];
        const hues = [320, 190, 45, 280, 140];
        for (let i=0;i<6;i++){
          signs.push({
            x: 20 + Math.random()*(w-120),
            y: 40 + Math.random()*(h*0.6),
            text: texts[Math.floor(Math.random()*texts.length)],
            hue: hues[Math.floor(Math.random()*hues.length)],
            flicker: Math.random()*Math.PI*2,
            size: 20 + Math.random()*28,
          });
        }
        for (let i=0;i<12;i++){
          puddles.push({ x: Math.random()*w, y: h*0.82 + Math.random()*(h*0.15), r: 20 + Math.random()*40 });
        }
      };

      const m = S.mountCanvas(container, (ctx, w, h, dt, t) => {
        if (w!==W || h!==H) { W=w; H=h; seed(w,h); }

        // sky
        const g = ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0, '#0a0a1a');
        g.addColorStop(0.7, '#1a0a2a');
        g.addColorStop(1, '#05050a');
        ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

        // distant skyline
        ctx.fillStyle = '#0e0a1a';
        const sky1 = h*0.55;
        ctx.beginPath();
        ctx.moveTo(0, sky1);
        for (let x=0;x<=w;x+=12){
          const bh = 30 + ((Math.sin(x*0.07)+1)*0.5) * 70 + ((x*17)%40);
          ctx.lineTo(x, sky1 - bh);
          ctx.lineTo(x+12, sky1 - bh);
        }
        ctx.lineTo(w, sky1); ctx.closePath();
        ctx.fill();
        // windows
        for (let x=0;x<w;x+=6){
          for (let y=sky1-100;y<sky1-5;y+=8){
            if (((x*13+y*7)%29) < 4){
              ctx.fillStyle = `rgba(255,${180 + (x%40)}, ${120 + (y%60)}, 0.6)`;
              ctx.fillRect(x,y,3,3);
            }
          }
        }

        // closer silhouette
        ctx.fillStyle = '#050308';
        const sky2 = h*0.78;
        ctx.beginPath();
        ctx.moveTo(0, sky2);
        for (let x=0;x<=w;x+=20){
          const bh = 60 + ((Math.cos(x*0.03+1.3)+1)*0.5) * 90;
          ctx.lineTo(x, sky2 - bh);
          ctx.lineTo(x+20, sky2 - bh);
        }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

        // signs
        for (const s of signs){
          s.flicker += dt*4;
          const flick = 0.85 + Math.sin(s.flicker*7)*0.05 + (Math.random()<0.02 ? -0.4 : 0);
          ctx.save();
          ctx.font = `bold ${s.size}px ui-monospace, monospace`;
          ctx.textBaseline = 'top';
          ctx.shadowColor = `hsl(${s.hue},100%,60%)`;
          ctx.shadowBlur = 22 * flick;
          ctx.fillStyle = `hsl(${s.hue},100%,${60*flick}%)`;
          ctx.fillText(s.text, s.x, s.y);
          ctx.shadowBlur = 6;
          ctx.fillStyle = `hsl(${s.hue},100%,${90*flick}%)`;
          ctx.fillText(s.text, s.x, s.y);
          ctx.restore();
        }

        // wet street reflection band
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const s of signs){
          const rg = ctx.createRadialGradient(s.x+s.size, h*0.9, 0, s.x+s.size, h*0.9, 180);
          rg.addColorStop(0, `hsla(${s.hue},100%,60%,0.25)`);
          rg.addColorStop(1, `hsla(${s.hue},100%,60%,0)`);
          ctx.fillStyle = rg;
          ctx.fillRect(s.x-100, h*0.78, 380, h*0.25);
        }
        ctx.restore();

        // puddles
        ctx.strokeStyle = 'rgba(200,220,255,0.15)';
        ctx.lineWidth = 1;
        for (const p of puddles){
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r, p.r*0.25, 0, 0, Math.PI*2);
          ctx.stroke();
        }

        // rain
        ctx.strokeStyle = 'rgba(180,210,255,0.5)';
        ctx.lineWidth = 1;
        const wind = mouse.state.inside ? (mouse.state.x - 0.5)*2 : 0.3;
        for (const d of drops){
          d.y += d.v*dt;
          d.x += wind*60*dt;
          if (d.y > h) { d.y = -10; d.x = Math.random()*w; }
          if (d.x > w) d.x -= w; if (d.x < 0) d.x += w;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - wind*d.len, d.y - d.len);
          ctx.stroke();
        }

        // subtle fog
        ctx.fillStyle = 'rgba(40,20,60,0.08)';
        ctx.fillRect(0, h*0.6, w, h*0.4);
      });

      return { stop(){ m.stop(); mouse.dispose(); } };
    }
  };
})();
