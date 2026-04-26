/* global React, ReactDOM */
const { useState, useEffect, useRef, useCallback } = React;

const MODULE_ORDER = ["warp","aquarium","planes","lava","neon","clock","pipes"];

function pad(n){ return n < 10 ? "0"+n : ""+n; }
function nowStr(){
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const EGG_MESSAGES = [
  "you have 1 new memo",
  "hello from 1994",
  "is this thing on?",
  "→ press any key ←",
  "the pipes are listening",
  "keep staring. we dare you.",
  "do clocks dream?",
  "warp factor 9, Mr. Sulu",
];

function App(){
  const [selected, setSelected] = useState(() => localStorage.getItem("ss.selected") || "warp");
  const [density, setDensity] = useState(() => +(localStorage.getItem("ss.density") || 0.5));
  const [showClock, setShowClock] = useState(() => localStorage.getItem("ss.clock") === "1");
  const [sound, setSound] = useState(() => localStorage.getItem("ss.sound") === "1");
  const [eggs, setEggs] = useState(() => (localStorage.getItem("ss.eggs") ?? "1") === "1");
  const [idleSec, setIdleSec] = useState(8);
  const [countdown, setCountdown] = useState(null);
  const [time, setTime] = useState(nowStr());
  const previewRef = useRef(null);
  const previewInstance = useRef(null);
  const fsRef = useRef(null);
  const fsInstance = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const audioRef = useRef(null);

  // persist
  useEffect(() => { localStorage.setItem("ss.selected", selected); }, [selected]);
  useEffect(() => { localStorage.setItem("ss.density", String(density)); }, [density]);
  useEffect(() => { localStorage.setItem("ss.clock", showClock ? "1":"0"); }, [showClock]);
  useEffect(() => { localStorage.setItem("ss.sound", sound ? "1":"0"); }, [sound]);
  useEffect(() => { localStorage.setItem("ss.eggs", eggs ? "1":"0"); }, [eggs]);

  // clock tick
  useEffect(() => {
    const id = setInterval(() => setTime(nowStr()), 1000);
    return () => clearInterval(id);
  }, []);

  // mount preview
  useEffect(() => {
    if (previewInstance.current){ previewInstance.current.stop(); previewInstance.current = null; }
    const mod = window.Screensavers.modules[selected];
    if (mod && previewRef.current){
      previewInstance.current = mod.start(previewRef.current, { density });
    }
    return () => {
      if (previewInstance.current){ previewInstance.current.stop(); previewInstance.current = null; }
    };
  }, [selected, density]);

  // fullscreen mount
  useEffect(() => {
    const fsScene = document.getElementById("fs-scene");
    const fsEl = document.getElementById("fs");
    if (fullscreen){
      fsEl.classList.add("on");
      const mod = window.Screensavers.modules[selected];
      fsInstance.current = mod.start(fsScene, { density });
      if (sound && audioRef.current){ try { audioRef.current.currentTime = 0; audioRef.current.play().catch(()=>{}); } catch(e){} }
    } else {
      fsEl.classList.remove("on");
      if (fsInstance.current){ fsInstance.current.stop(); fsInstance.current = null; }
      // clear eggs
      document.querySelectorAll(".egg").forEach(e => e.remove());
      if (audioRef.current){ try { audioRef.current.pause(); } catch(e){} }
    }
  }, [fullscreen, selected, density, sound]);

  // fs clock
  useEffect(() => {
    const el = document.getElementById("fs-clock");
    if (!el) return;
    el.textContent = showClock && fullscreen ? time : "";
  }, [time, showClock, fullscreen]);

  // easter eggs
  useEffect(() => {
    if (!fullscreen || !eggs) return;
    const id = setInterval(() => {
      if (Math.random() < 0.5) return;
      const el = document.createElement("div");
      el.className = "egg";
      el.textContent = EGG_MESSAGES[Math.floor(Math.random()*EGG_MESSAGES.length)];
      el.style.left = (10 + Math.random()*70) + "vw";
      el.style.top = (15 + Math.random()*60) + "vh";
      document.getElementById("fs").appendChild(el);
      setTimeout(() => el.remove(), 4200);
    }, 6000);
    return () => clearInterval(id);
  }, [fullscreen, eggs]);

  // idle auto-start & exit-on-move
  useEffect(() => {
    let last = Date.now();
    let timer = null;
    const tick = () => {
      if (fullscreen) { setCountdown(null); return; }
      const left = Math.max(0, Math.ceil((idleSec*1000 - (Date.now()-last))/1000));
      setCountdown(left);
      if (left === 0){ setFullscreen(true); }
    };
    const onActivity = () => {
      last = Date.now();
      if (fullscreen){
        // small delay so we don't exit on the activating click
        setFullscreen(false);
      }
    };
    timer = setInterval(tick, 250);
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("mousedown", onActivity);
    window.addEventListener("touchstart", onActivity);
    return () => {
      clearInterval(timer);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [fullscreen, idleSec]);

  const test = () => { setFullscreen(true); };

  return (
    <div className="cp-wrap">
      <div className="cp">
        <div className="cp-title">
          <span className="dot" />
          <span className="t">Screensavers — Control Panel</span>
          <span className="sp" />
          <span className="meta">v1.0 · {time}</span>
        </div>
        <div className="cp-body">
          {/* left: module list */}
          <div className="cp-col">
            <div className="cp-label">Modules <span className="hint">({MODULE_ORDER.length} installed)</span></div>
            <ul className="mod-list">
              {MODULE_ORDER.map(key => {
                const m = window.Screensavers.modules[key];
                return (
                  <li key={key} className={selected===key?"active":""} onClick={() => setSelected(key)}>
                    <span className="swatch" style={{ background: m.swatch }} />
                    <span>{m.title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* middle: preview */}
          <div className="cp-col">
            <div className="cp-label">Preview <span className="hint">click Test for full screen</span></div>
            <div className="preview-wrap">
              <div className="preview" ref={previewRef}>
                <div className="scanlines" />
                <div className="vignette" />
              </div>
              <div className="preview-meta">
                <div>
                  <div className="title">{window.Screensavers.modules[selected].title}</div>
                  <div className="desc">{window.Screensavers.modules[selected].tagline}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  {countdown !== null && !fullscreen && (
                    <div style={{fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase", opacity:0.7}}>
                      idle in {countdown}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* right: settings */}
          <div className="cp-col">
            <div className="cp-label">Settings</div>

            <div className="setting">
              <div className="row">
                <span>Density</span>
                <span style={{opacity:0.6}}>{Math.round(density*100)}%</span>
              </div>
              <input className="slider" type="range" min="0" max="1" step="0.05"
                     value={density} onChange={e=>setDensity(+e.target.value)} />
            </div>

            <div className="setting">
              <div className="row">
                <span>Idle activation</span>
                <span style={{opacity:0.6}}>{idleSec}s</span>
              </div>
              <input className="slider" type="range" min="3" max="30" step="1"
                     value={idleSec} onChange={e=>setIdleSec(+e.target.value)} />
            </div>

            <div className="setting" style={{display:"flex", flexDirection:"column", gap:6}}>
              <label className="toggle"><input type="checkbox" checked={showClock} onChange={e=>setShowClock(e.target.checked)} /> Show clock overlay</label>
              <label className="toggle"><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)} /> Ambient hum</label>
              <label className="toggle"><input type="checkbox" checked={eggs} onChange={e=>setEggs(e.target.checked)} /> Random easter eggs</label>
            </div>

            <div className="btn-row">
              <button className="btn primary" onClick={test}>Test</button>
              <button className="btn" onClick={() => {
                const el = document.documentElement;
                if (document.fullscreenElement) document.exitFullscreen();
                else el.requestFullscreen?.();
              }}>Fullscreen</button>
            </div>
          </div>
        </div>
        <div className="cp-status">
          <span><span className="blink">●</span> Ready · selected: {window.Screensavers.modules[selected].title}</span>
          <span>move mouse during playback to exit</span>
        </div>
      </div>

      {/* ambient hum — simple oscillator via WebAudio, only plays when sound is on and fullscreen */}
      <AmbientHum on={sound && fullscreen} />
    </div>
  );
}

function AmbientHum({ on }){
  const ctxRef = useRef(null);
  useEffect(() => {
    if (!on){
      if (ctxRef.current){ try { ctxRef.current.close(); } catch(e){} ctxRef.current = null; }
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 80;
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 120;
      const g = ctx.createGain(); g.gain.value = 0.04;
      const filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 300;
      o1.connect(filt); o2.connect(filt); filt.connect(g); g.connect(ctx.destination);
      o1.start(); o2.start();
      ctxRef.current = ctx;
    } catch(e){}
    return () => {
      if (ctxRef.current){ try { ctxRef.current.close(); } catch(e){} ctxRef.current = null; }
    };
  }, [on]);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
