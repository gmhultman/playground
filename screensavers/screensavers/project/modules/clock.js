// Tick Tock — analog clock with eyes and personality
(function(){
  const S = window.Screensavers;
  S.modules.clock = {
    title: "Tick Tock",
    tagline: "A cheerful clock whose eyes follow your cursor.",
    swatch: "linear-gradient(135deg,#f2e7d5,#d94b2a 60%,#1b1a17 95%)",
    start(container, opts){
      opts = opts || {};
      const mouse = S.trackMouse(container);
      let W=0, H=0;
      let blinkT = 0, nextBlink = 3 + Math.random()*4;
      let bounce = 0;

      const m = S.mountCanvas(container, (ctx, w, h, dt, t) => {
        W=w; H=h;
        // warm paper bg
        ctx.fillStyle = '#f2e7d5';
        ctx.fillRect(0,0,w,h);
        // subtle speckle
        ctx.fillStyle = 'rgba(120,80,40,0.04)';
        for (let i=0;i<40;i++){
          const x = (Math.sin(i*12.9+t*0.01)+1)*0.5*w;
          const y = (Math.cos(i*7.1+t*0.01)+1)*0.5*h;
          ctx.fillRect(x,y,2,2);
        }

        const cx = w/2, cy = h/2 + Math.sin(t*1.2)*4;
        bounce = Math.sin(t*1.2)*3;
        const R = Math.min(w,h)*0.35;

        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + R + 16, R*0.9, R*0.12, 0, 0, Math.PI*2);
        ctx.fill();

        // face
        ctx.fillStyle = '#fffaf0';
        ctx.strokeStyle = '#1b1a17';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill(); ctx.stroke();

        // rim
        ctx.fillStyle = '#d94b2a';
        for (let i=0;i<12;i++){
          const a = i/12 * Math.PI*2 - Math.PI/2;
          const x1 = cx + Math.cos(a)*(R-14);
          const y1 = cy + Math.sin(a)*(R-14);
          ctx.save();
          ctx.translate(x1,y1);
          ctx.rotate(a);
          ctx.fillRect(-3, -12, 6, 18);
          ctx.restore();
        }
        // minor ticks
        ctx.fillStyle = '#1b1a17';
        for (let i=0;i<60;i++){
          if (i%5===0) continue;
          const a = i/60 * Math.PI*2 - Math.PI/2;
          const x1 = cx + Math.cos(a)*(R-8);
          const y1 = cy + Math.sin(a)*(R-8);
          ctx.beginPath(); ctx.arc(x1,y1,1.2,0,Math.PI*2); ctx.fill();
        }

        // eyes — follow mouse
        const eyeY = cy - R*0.25;
        const eyeDX = R*0.22;
        blinkT += dt;
        let blink = 1;
        if (blinkT > nextBlink){
          const bp = blinkT - nextBlink;
          if (bp < 0.18) blink = 1 - (bp/0.18);
          else if (bp < 0.36) blink = (bp-0.18)/0.18;
          else { blinkT = 0; nextBlink = 2 + Math.random()*4; }
        }
        const tx = mouse.state.inside ? mouse.state.x*w : cx + Math.sin(t*0.4)*R*0.4;
        const ty = mouse.state.inside ? mouse.state.y*h : cy + Math.cos(t*0.5)*R*0.2;
        for (const sign of [-1, 1]){
          const ex = cx + sign*eyeDX;
          const ey = eyeY;
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#1b1a17';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(ex, ey, R*0.1, R*0.14*blink, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          if (blink > 0.15){
            const dx = tx - ex, dy = ty - ey;
            const d = Math.hypot(dx,dy) || 1;
            const px = ex + (dx/d) * Math.min(R*0.05, d*0.1);
            const py = ey + (dy/d) * Math.min(R*0.06, d*0.1);
            ctx.fillStyle = '#1b1a17';
            ctx.beginPath(); ctx.arc(px, py, R*0.04, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(px - R*0.012, py - R*0.012, R*0.012, 0, Math.PI*2); ctx.fill();
          }
        }

        // cheeks
        ctx.fillStyle = 'rgba(217,75,42,0.35)';
        ctx.beginPath(); ctx.arc(cx - R*0.35, cy + R*0.02, R*0.08, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + R*0.35, cy + R*0.02, R*0.08, 0, Math.PI*2); ctx.fill();

        // smile
        ctx.strokeStyle = '#1b1a17';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy + R*0.15, R*0.22, 0.15*Math.PI, 0.85*Math.PI);
        ctx.stroke();

        // hands — use real time
        const now = new Date();
        const ms = now.getMilliseconds()/1000;
        const s = now.getSeconds() + ms;
        const mn = now.getMinutes() + s/60;
        const hr = (now.getHours()%12) + mn/60;

        drawHand(ctx, cx, cy, hr/12*Math.PI*2, R*0.5, 6, '#1b1a17');
        drawHand(ctx, cx, cy, mn/60*Math.PI*2, R*0.75, 4, '#1b1a17');
        drawHand(ctx, cx, cy, s/60*Math.PI*2, R*0.85, 2, '#d94b2a');

        ctx.fillStyle = '#1b1a17';
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();

        // feet (two little circles) — bounce
        ctx.fillStyle = '#1b1a17';
        ctx.beginPath(); ctx.arc(cx - R*0.35, cy + R + 22 + bounce, 7, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + R*0.35, cy + R + 22 - bounce, 7, 0, Math.PI*2); ctx.fill();
      });

      function drawHand(ctx, cx, cy, angle, len, width, color){
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle - Math.PI/2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-len*0.1, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
        ctx.restore();
      }

      return { stop(){ m.stop(); mouse.dispose(); } };
    }
  };
})();
