// Plumber's Dream — pipes drawing themselves across the screen
(function(){
  const S = window.Screensavers;
  S.modules.pipes = {
    title: "Plumber's Dream",
    tagline: "Pipes lay themselves across the screen, forever.",
    swatch: "linear-gradient(135deg,#0a1a2a,#2a9d8f 60%,#f4a261 95%)",
    start(container, opts){
      opts = opts || {};
      const density = opts.density ?? 0.5;
      let W=0, H=0;
      const CELL = 28;
      let cols=0, rows=0;
      let grid; // 0 = empty
      let workers = [];
      let fadeT = 0;

      const DIRS = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      const COLORS = ['#2a9d8f','#e76f51','#f4a261','#e9c46a','#8ecae6','#d6bcfa','#fb7185'];

      function reset(w,h){
        cols = Math.floor(w/CELL);
        rows = Math.floor(h/CELL);
        grid = new Uint8Array(cols*rows);
        workers = [];
        const N = Math.floor(2 + density*4);
        for (let i=0;i<N;i++) spawnWorker();
      }

      function spawnWorker(){
        const x = Math.floor(Math.random()*cols);
        const y = Math.floor(Math.random()*rows);
        const d = DIRS[Math.floor(Math.random()*4)];
        workers.push({
          x, y, d,
          color: COLORS[Math.floor(Math.random()*COLORS.length)],
          trail: [{x,y,from:null,to:d}],
          speed: 8 + Math.random()*6, // cells per second
          sub: 0,
          alive: true,
        });
      }

      const m = S.mountCanvas(container, (ctx, w, h, dt, t) => {
        if (w !== W || h !== H) { W=w; H=h; reset(w,h); ctx.fillStyle = '#0a1a2a'; ctx.fillRect(0,0,w,h); }

        // slow fade so old pipes dim
        ctx.fillStyle = 'rgba(10,26,42,0.008)';
        ctx.fillRect(0,0,w,h);

        fadeT += dt;
        // advance workers
        for (const wkr of workers){
          if (!wkr.alive) continue;
          wkr.sub += dt * wkr.speed;
          while (wkr.sub >= 1 && wkr.alive){
            wkr.sub -= 1;
            // chance to turn
            if (Math.random() < 0.35){
              const choices = DIRS.filter(d => !(d.dx === -wkr.d.dx && d.dy === -wkr.d.dy));
              wkr.d = choices[Math.floor(Math.random()*choices.length)];
            }
            const nx = wkr.x + wkr.d.dx;
            const ny = wkr.y + wkr.d.dy;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || grid[ny*cols+nx]){
              // stop, try turns
              let found = false;
              for (const d of DIRS){
                const tx = wkr.x + d.dx, ty = wkr.y + d.dy;
                if (tx>=0 && tx<cols && ty>=0 && ty<rows && !grid[ty*cols+tx]){
                  wkr.d = d; found = true; break;
                }
              }
              if (!found){
                wkr.alive = false;
              }
              continue;
            }
            const from = { dx: -wkr.d.dx, dy: -wkr.d.dy };
            wkr.x = nx; wkr.y = ny;
            grid[ny*cols+nx] = 1;
            wkr.trail.push({ x: nx, y: ny, from, to: wkr.d });
            drawSegment(ctx, wkr, wkr.trail[wkr.trail.length-1]);
          }
          // reached full board? reset
          let used = 0;
          for (let i=0;i<grid.length;i++) used += grid[i];
          if (used > cols*rows*0.9){
            // soft reset
            ctx.fillStyle = 'rgba(10,26,42,0.12)';
            ctx.fillRect(0,0,w,h);
            grid.fill(0);
            workers = [];
            const N = Math.floor(2 + density*4);
            for (let i=0;i<N;i++) spawnWorker();
          }
        }
        // respawn dead workers occasionally
        for (let i=workers.length-1;i>=0;i--){
          if (!workers[i].alive){
            workers.splice(i,1);
            spawnWorker();
          }
        }
      });

      function drawSegment(ctx, wkr, seg){
        const cx = seg.x*CELL + CELL/2;
        const cy = seg.y*CELL + CELL/2;
        const r = CELL*0.28;

        // segment: pipe between 'from' and 'to' sides of this cell
        // draw shaded pipe body
        ctx.save();
        ctx.lineCap = 'butt';
        const colors = shadePipe(wkr.color);

        // check if it's an elbow
        const isElbow = seg.from && seg.to && (seg.from.dx !== -seg.to.dx || seg.from.dy !== -seg.to.dy);

        if (isElbow){
          // arc from center towards from and to
          const ang1 = Math.atan2(seg.from.dy, seg.from.dx);
          const ang2 = Math.atan2(seg.to.dy, seg.to.dx);
          // elbow center at corner of cell in the direction away from both
          const ex = cx + (seg.from.dx + seg.to.dx)*CELL/2;
          const ey = cy + (seg.from.dy + seg.to.dy)*CELL/2;
          const radius = CELL/2;
          for (let pass=0; pass<2; pass++){
            ctx.strokeStyle = pass===0 ? colors.dark : colors.light;
            ctx.lineWidth = pass===0 ? r*2.0 : r*1.2;
            ctx.beginPath();
            // Draw quarter circle
            const startAng = Math.atan2(cy + seg.from.dy*CELL/2 - ey, cx + seg.from.dx*CELL/2 - ex);
            const endAng = Math.atan2(cy + seg.to.dy*CELL/2 - ey, cx + seg.to.dx*CELL/2 - ex);
            ctx.arc(ex, ey, radius, startAng, endAng, shortestDir(startAng,endAng));
            ctx.stroke();
          }
        } else {
          // straight pipe
          const fx = seg.from ? cx + seg.from.dx*CELL/2 : cx;
          const fy = seg.from ? cy + seg.from.dy*CELL/2 : cy;
          const tx = cx + seg.to.dx*CELL/2;
          const ty = cy + seg.to.dy*CELL/2;
          ctx.strokeStyle = colors.dark;
          ctx.lineWidth = r*2.0;
          ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(tx,ty); ctx.stroke();
          ctx.strokeStyle = colors.light;
          ctx.lineWidth = r*1.2;
          ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(tx,ty); ctx.stroke();
          // highlight
          ctx.strokeStyle = colors.shine;
          ctx.lineWidth = r*0.3;
          ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(tx,ty); ctx.stroke();
        }

        // joint ball
        ctx.fillStyle = colors.dark;
        ctx.beginPath(); ctx.arc(cx, cy, r*1.05, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = colors.light;
        ctx.beginPath(); ctx.arc(cx, cy, r*0.75, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = colors.shine;
        ctx.beginPath(); ctx.arc(cx - r*0.2, cy - r*0.2, r*0.25, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      function shortestDir(a,b){
        let d = b - a;
        while (d > Math.PI) d -= Math.PI*2;
        while (d < -Math.PI) d += Math.PI*2;
        return d < 0;
      }

      function shadePipe(hex){
        const c = hexToRgb(hex);
        return {
          dark: `rgb(${Math.floor(c.r*0.55)},${Math.floor(c.g*0.55)},${Math.floor(c.b*0.55)})`,
          light: hex,
          shine: `rgb(${Math.min(255,c.r+80)},${Math.min(255,c.g+80)},${Math.min(255,c.b+80)})`,
        };
      }
      function hexToRgb(h){
        const x = h.replace('#','');
        return { r: parseInt(x.slice(0,2),16), g: parseInt(x.slice(2,4),16), b: parseInt(x.slice(4,6),16) };
      }

      return { stop(){ m.stop(); } };
    }
  };
})();
