// Five elemental fragment shaders. Each declares its own main() in GLSL ES 1.0.
// Uniforms available: u_time, u_res, u_mouse (0..1), u_click (xy + age), u_prev (last mouse)

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const HEADER = `
precision highp float;
uniform float u_time;
uniform vec2  u_res;
uniform vec2  u_mouse;   // normalized 0..1
uniform vec3  u_click;   // xy normalized, z = seconds since click
uniform vec2  u_vel;     // mouse velocity

// ---- hash/noise utils ----
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2  hash22(vec2 p){
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453)*2.0-1.0;
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = dot(hash22(i+vec2(0,0)), f-vec2(0,0));
  float b = dot(hash22(i+vec2(1,0)), f-vec2(1,0));
  float c = dot(hash22(i+vec2(0,1)), f-vec2(0,1));
  float d = dot(hash22(i+vec2(1,1)), f-vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float s=0.0, a=0.5;
  for(int i=0;i<6;i++){ s += a*vnoise(p); p*=2.02; a*=0.5; }
  return s;
}
`;

// ---------- EARTH ----------
// Tectonic voronoi plates. Cursor warps plate boundaries; click = seismic wave.
const EARTH = HEADER + `
vec3 voronoi(vec2 x){
  vec2 n = floor(x), f = fract(x);
  float md = 8.0; vec2 mr; float md2 = 8.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g = vec2(float(i),float(j));
    vec2 o = 0.5 + 0.5*sin(u_time*0.12 + 6.2831*hash22(n+g));
    vec2 r = g + o - f;
    float d = dot(r,r);
    if(d<md){ md2=md; md=d; mr=r; } else if(d<md2){ md2=d; }
  }
  return vec3(sqrt(md), sqrt(md2)-sqrt(md), atan(mr.y,mr.x));
}
void main(){
  vec2 uv = gl_FragCoord.xy/u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy)/u_res.y;
  vec2 m = (u_mouse*u_res - 0.5*u_res)/u_res.y;

  // warp toward mouse (tectonic pull)
  vec2 d = p - m;
  float pull = exp(-dot(d,d)*2.5);
  p += normalize(d+1e-5) * pull * 0.12;

  // low-freq tectonic distortion
  vec2 q = p*2.2;
  q += 0.25*vec2(fbm(q+u_time*0.05), fbm(q-u_time*0.04));
  vec3 v = voronoi(q);

  // seismic ring
  vec2 cp = (u_click.xy*u_res - 0.5*u_res)/u_res.y;
  float r = length(p - cp);
  float wave = exp(-u_click.z*1.2) * exp(-pow((r - u_click.z*0.8)*6.0, 2.0));

  // strata coloring
  float edge = smoothstep(0.04, 0.0, v.y);           // plate boundary cracks
  float strat = fbm(q*3.0 + v.z);
  vec3 sand  = vec3(0.78,0.55,0.33);
  vec3 ochre = vec3(0.42,0.24,0.14);
  vec3 basalt= vec3(0.09,0.08,0.10);
  vec3 col = mix(basalt, ochre, smoothstep(0.1,0.7,v.x+0.3*strat));
  col = mix(col, sand, smoothstep(0.55,0.95,v.x+0.2*strat));

  // glowing magma in cracks
  vec3 magma = vec3(1.2,0.45,0.12);
  col = mix(col, magma*1.4, edge*(0.6 + 0.4*pull));
  col += magma * wave * 1.2;

  // vignette
  col *= 1.0 - 0.35*dot(p,p);
  gl_FragColor = vec4(col,1.0);
}
`;

// ---------- WIND ----------
// Streaming curl-noise flow. Cursor bends flow, clicks spawn gusts.
const WIND = HEADER + `
vec2 curl(vec2 p){
  float e = 0.01;
  float n1 = fbm(p+vec2(0.0,e));
  float n2 = fbm(p-vec2(0.0,e));
  float n3 = fbm(p+vec2(e,0.0));
  float n4 = fbm(p-vec2(e,0.0));
  return vec2(n1-n2, -(n3-n4))/(2.0*e);
}
void main(){
  vec2 uv = gl_FragCoord.xy/u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy)/u_res.y;
  vec2 m = (u_mouse*u_res - 0.5*u_res)/u_res.y;

  vec2 q = p*1.4 + vec2(u_time*0.08, 0.0);
  vec2 flow = curl(q);

  // cursor influence — swirl around mouse
  vec2 dm = p - m;
  float dd = dot(dm,dm);
  float infl = exp(-dd*3.0);
  vec2 swirl = vec2(-dm.y, dm.x) / (0.05 + dd);
  flow += swirl * infl * 0.4;
  flow += u_vel * infl * 2.5;

  // advect streak coordinate backwards through flow
  vec2 sp = p;
  float streak = 0.0;
  for(int i=0;i<6;i++){
    sp -= flow*0.035;
    streak += fbm(sp*3.5 + u_time*0.2) * (1.0 - float(i)/6.0);
  }
  streak /= 3.0;

  // gust from click
  vec2 cp = (u_click.xy*u_res - 0.5*u_res)/u_res.y;
  float gr = length(p - cp);
  float gust = exp(-u_click.z*0.9) * smoothstep(0.02, 0.0, abs(gr - u_click.z*0.9));

  // palette: cold sky
  vec3 deep = vec3(0.04,0.07,0.14);
  vec3 mid  = vec3(0.22,0.42,0.66);
  vec3 hi   = vec3(0.85,0.92,1.0);
  float t = smoothstep(-0.2, 0.7, streak);
  vec3 col = mix(deep, mid, t);
  col = mix(col, hi, smoothstep(0.55, 0.9, t));

  // silk lines
  float lines = sin(streak*22.0 + u_time*0.4);
  col += 0.08*vec3(0.8,0.9,1.0)*smoothstep(0.85,1.0,lines);

  col += vec3(0.9,0.95,1.0)*gust*0.9;
  col *= 1.0 - 0.3*dot(p,p);
  gl_FragColor = vec4(col,1.0);
}
`;

// ---------- FIRE ----------
// Domain-warped flame that leans toward cursor. Clicks spawn embers.
const FIRE = HEADER + `
void main(){
  vec2 uv = gl_FragCoord.xy/u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy)/u_res.y;
  vec2 m = (u_mouse*u_res - 0.5*u_res)/u_res.y;

  // flow upward, leaning toward mouse horizontally
  vec2 lean = normalize(vec2(m.x - p.x, 1.0)) ;
  vec2 q = p*2.2;
  q -= lean*u_time*0.7;

  // domain warp
  vec2 w = vec2(fbm(q+u_time*0.4), fbm(q*1.3 - u_time*0.3));
  float n = fbm(q + 1.8*w);

  // mouse pulls heat
  float pull = exp(-dot(p-m, p-m)*3.0);
  n += pull*0.35;

  // vertical falloff -> flame shape
  float yMask = smoothstep(0.9, -0.5, p.y) * smoothstep(-1.1, -0.6, p.y + n*0.4);
  float heat = pow(clamp(n*yMask + 0.25, 0.0, 1.0), 1.4);
  heat += pull*0.2;

  // click embers
  vec2 cp = (u_click.xy*u_res - 0.5*u_res)/u_res.y;
  float cd = length(p - cp);
  float burst = exp(-u_click.z*1.8) * exp(-pow(cd*5.0 - u_click.z*3.0,2.0)*2.0);
  heat += burst*1.2;

  // ember sparks
  float sp = 0.0;
  for(int i=0;i<3;i++){
    float fi = float(i);
    vec2 g = q*5.0 + vec2(0.0, u_time*(1.5+fi));
    vec2 gi = floor(g); vec2 gf = fract(g);
    float h = hash21(gi+fi);
    float s = smoothstep(0.08, 0.0, length(gf-0.5)) * step(0.985, h);
    sp += s;
  }

  // palette blackbody
  vec3 col = vec3(0.0);
  col += vec3(0.9,0.15,0.05) * smoothstep(0.05, 0.4, heat);
  col += vec3(1.4,0.55,0.08) * smoothstep(0.3,  0.75, heat);
  col += vec3(1.8,1.4, 0.55) * smoothstep(0.7,  1.0, heat);
  col += vec3(1.6,1.1,0.6) * sp;

  // dark backdrop w/ subtle smoke
  float smoke = fbm(p*1.3 + vec2(0.0, u_time*0.1));
  vec3 bg = mix(vec3(0.04,0.02,0.03), vec3(0.09,0.05,0.06), smoke);
  col = bg + col;

  col *= 1.0 - 0.3*dot(p*vec2(1.0,0.7), p*vec2(1.0,0.7));
  gl_FragColor = vec4(col,1.0);
}
`;

// ---------- LIGHTNING ----------
// Iterated fractal strike reaching toward cursor. Click = full flash.
const LIGHTNING = HEADER + `
float sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p-a, ba = b-a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*h);
}
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy)/u_res.y;
  vec2 m = (u_mouse*u_res - 0.5*u_res)/u_res.y;

  // base: ionized sky
  float ion = fbm(p*2.0 + vec2(0.0, u_time*0.1));
  vec3 sky = mix(vec3(0.02,0.03,0.08), vec3(0.08,0.07,0.18), ion);
  vec3 col = sky;

  // build a jagged polyline from top to mouse
  vec2 start = vec2(0.0, 0.9);
  vec2 end   = m;
  float t = floor(u_time*8.0);  // re-seeded ~8Hz
  float minD = 1e3;
  vec2 prev = start;
  for(int i=1;i<=14;i++){
    float fi = float(i)/14.0;
    vec2 base = mix(start, end, fi);
    vec2 perp = normalize(vec2(-(end.y-start.y), end.x-start.x));
    float jitter = (hash11(float(i)+t) - 0.5) * 0.25 * sin(fi*3.14);
    vec2 pt = base + perp*jitter + vec2(0.0, (hash11(float(i)+t+99.)-0.5)*0.04);
    float d = sdSeg(p, prev, pt);
    minD = min(minD, d);
    prev = pt;
  }
  // also a branch
  vec2 bStart = mix(start, end, 0.55);
  vec2 bEnd   = bStart + vec2((hash11(t+7.0)-0.5)*0.6, -0.4);
  vec2 bp = bStart;
  for(int i=1;i<=6;i++){
    float fi = float(i)/6.0;
    vec2 base = mix(bStart, bEnd, fi);
    float j = (hash11(float(i)+t+3.0)-0.5)*0.18*sin(fi*3.14);
    vec2 pt = base + vec2(j, 0.0);
    float d = sdSeg(p, bp, pt);
    minD = min(minD, d);
    bp = pt;
  }

  float core = smoothstep(0.006, 0.0, minD);
  float glow = smoothstep(0.18, 0.0, minD);
  glow *= glow;

  vec3 boltCol = vec3(0.75,0.85,1.3);
  col += boltCol * glow * 0.9;
  col += vec3(1.4,1.5,1.8) * core;

  // click flash
  float flash = exp(-u_click.z*5.0);
  col += vec3(0.9,0.95,1.2) * flash * 0.6;

  // mouse halo
  float halo = exp(-dot(p-m,p-m)*12.0);
  col += vec3(0.4,0.6,1.0) * halo * 0.35;

  // rain streaks
  vec2 rp = p*vec2(20.0, 40.0) + vec2(0.0, u_time*8.0);
  float rain = smoothstep(0.95, 1.0, hash21(floor(rp)));
  col += vec3(0.5,0.6,0.9) * rain * 0.12;

  col *= 1.0 - 0.3*dot(p,p);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- WATER ----------
// Rippling caustics. Cursor drags a wavefront, clicks drop ripples.
const WATER = HEADER + `
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy)/u_res.y;
  vec2 m = (u_mouse*u_res - 0.5*u_res)/u_res.y;

  // distance field of ripples from mouse
  float d = length(p - m);
  float ripple = sin(d*28.0 - u_time*3.0) * exp(-d*2.0);

  // ambient wave field
  float w = 0.0;
  for(int i=0;i<4;i++){
    float fi = float(i);
    vec2 dir = vec2(cos(fi*1.7), sin(fi*1.3));
    w += sin(dot(p, dir)*(6.0+fi*2.0) + u_time*(0.8+fi*0.3));
  }
  w /= 4.0;

  // click drop
  vec2 cp = (u_click.xy*u_res - 0.5*u_res)/u_res.y;
  float cd = length(p - cp);
  float drop = sin(cd*30.0 - u_click.z*9.0) * exp(-u_click.z*1.4) * smoothstep(0.9, 0.0, cd - u_click.z*0.7);

  float h = w*0.4 + ripple*0.9 + drop*1.2;

  // derive normal by offsetting sample
  float e = 0.004;
  float hx = sin(length(p+vec2(e,0)-m)*28.0 - u_time*3.0) * exp(-length(p+vec2(e,0)-m)*2.0) * 0.9 + drop;
  float hy = sin(length(p+vec2(0,e)-m)*28.0 - u_time*3.0) * exp(-length(p+vec2(0,e)-m)*2.0) * 0.9 + drop;
  vec2 n = vec2(h-hx, h-hy)/e;

  // caustic via refracted lookup into fbm
  vec2 refr = p + n*0.02;
  float c = fbm(refr*5.0 + u_time*0.2);
  float caust = pow(smoothstep(0.4, 0.9, c + h*0.3), 2.0);

  // palette: abyss -> teal -> foam
  vec3 abyss = vec3(0.01,0.04,0.08);
  vec3 teal  = vec3(0.05,0.35,0.45);
  vec3 cyan  = vec3(0.4,0.85,0.95);
  vec3 col = mix(abyss, teal, smoothstep(-0.6, 0.6, h+c*0.5));
  col += cyan * caust * 0.9;

  // specular-ish highlight toward cursor
  float spec = pow(max(0.0, dot(normalize(vec3(n,1.0)), normalize(vec3(m-p, 0.6)))), 18.0);
  col += vec3(1.0) * spec * 0.35;

  col *= 1.0 - 0.3*dot(p,p);
  gl_FragColor = vec4(col,1.0);
}
`;

window.SHADERS = {
  VERT,
  earth:     { name: 'Earth',     frag: EARTH,     hint: 'Drag to pull tectonic plates • Click for a seismic wave' },
  wind:      { name: 'Wind',      frag: WIND,      hint: 'Move to steer the flow • Click to release a gust' },
  fire:      { name: 'Fire',      frag: FIRE,      hint: 'Move to lean the flame • Click to ignite embers' },
  lightning: { name: 'Lightning', frag: LIGHTNING, hint: 'Move to aim • Click to strike' },
  water:     { name: 'Water',     frag: WATER,     hint: 'Move to ripple • Click to drop' },
};
