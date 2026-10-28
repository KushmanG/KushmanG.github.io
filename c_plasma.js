/*
  c_plasma.js · the page background (fixed behind everything)
  A real 2D Yukawa crystal, simulated live. Same physics as my Python engine, shrunk to ~150 particles.

  1. Reduced units: lengths in the Wigner-Seitz radius a, energies in Q²/(4πε₀a).
     Pair potential U(r) = exp(-κr) / r, temperature kT = 1/Γ.
  2. Γ = 800 sits way above melting (Γ_m ≈ 180 at κ = 1), so it's a solid: the "freeze" state.
     No chaos, just a lattice breathing a tiny bit.
  3. It starts ON the perfect triangular lattice, so even frame one is calm (no melting-in from a random start).
  4. Cursor = a weak extra charge. It dents the crystal, the Langevin friction heals it back.
     Disturbed particles glow orange (local kinetic energy above thermal), calm ones stay blue.
     Set INTERACTIVE = false if it ever feels like too much.
  5. Integrator: BAOAB Langevin, same splitting as the Python engine.
*/

(function () {

  // ---------- knobs ----------
  const GAMMA = 800;             // coupling. above ~180 = crystal. higher = stiller
  const KAPPA = 1.0;             // screening
  const INTERACTIVE = true;      // cursor dents the crystal
  const STEPS_PER_FRAME = 2;     // sim speed. 1 = slow-mo
  const DT = 0.03;               // time step (reduced units)
  const FRICTION = 1.0;          // Langevin damping = how fast dents heal
  const PROBE_CHARGE = 1.2;      // cursor strength
  const SPACING_PX = [60, 92];   // on-screen lattice spacing, [min, max] in px

  const D = Math.sqrt(2 * Math.PI / Math.sqrt(3));   // lattice constant in units of a (≈ 1.905), from density n = 1/(π a²)
  const ROW = D * Math.sqrt(3) / 2;                  // vertical gap between lattice rows

  const canvas = document.getElementById("plasma");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W, H, N, Lx, Ly, scale, ox, oy;
  let x, y, vx, vy, fx, fy, heat;
  const bonds = [];                         // flat list: i, dx, dy for every bonded pair (dx, dy = minimum image)
  const probe = { x: 0, y: 0, on: false };
  let running = true;

  function gauss() {
    // Box-Muller, ez stuff
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /*
    Box setup:
    1. Pick an on-screen spacing, then an EVEN number of rows (a triangular lattice only wraps periodically with even rows).
    2. Columns chosen so the box matches the screen's aspect ratio as closely as possible.
    3. scale = px per unit a, "cover" style: the box always covers the screen, a few px cropped at the edges at most.
  */
  function setup() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const spacing = Math.min(SPACING_PX[1], Math.max(SPACING_PX[0], W / 16));
    const ny = Math.max(4, 2 * Math.round(H / (spacing * Math.sqrt(3) / 2) / 2));
    Ly = ny * ROW;
    const nx = Math.max(4, Math.round(W / (H / Ly) / D));
    Lx = nx * D;
    N = nx * ny;
    scale = Math.max(W / Lx, H / Ly);
    ox = (W - Lx * scale) / 2;
    oy = (H - Ly * scale) / 2;

    x = new Float64Array(N); y = new Float64Array(N);
    vx = new Float64Array(N); vy = new Float64Array(N);
    fx = new Float64Array(N); fy = new Float64Array(N);
    heat = new Float64Array(N).fill(1);

    const v0 = Math.sqrt(1 / GAMMA);       // thermal speed per velocity component
    let k = 0;
    for (let row = 0; row < ny; row++) {
      for (let col = 0; col < nx; col++) {
        x[k] = ((col + 0.5 + 0.5 * (row % 2)) * D) % Lx;   // odd rows shifted by half a spacing → triangular lattice
        y[k] = (row + 0.5) * ROW;
        vx[k] = gauss() * v0; vy[k] = gauss() * v0;
        k++;
      }
    }
    removeDrift();
    computeForces();
  }

  function removeDrift() {
    // kill the centre-of-mass velocity so the whole crystal doesn't slowly wander off (standard MD hygiene)
    let mx = 0, my = 0;
    for (let i = 0; i < N; i++) { mx += vx[i]; my += vy[i]; }
    mx /= N; my /= N;
    for (let i = 0; i < N; i++) { vx[i] -= mx; vy[i] -= my; }
  }

  /*
    Forces:
    1. Yukawa pair force |F| = exp(-κr)(1 + κr) / r², along r̂. Plain O(N²) loop, cz N ~ 150 and a cell list would be overkill lol.
    2. Cutoff at 6a: by then exp(-r)/r ≈ 0.0004, basically nothing.
    3. Pairs closer than 1.3 lattice spacings get stored as bonds (that's the faint triangle mesh).
    4. Cursor probe: same Yukawa shape with its own charge, only when INTERACTIVE.
  */
  function computeForces() {
    fx.fill(0); fy.fill(0);
    bonds.length = 0;
    const rc = Math.min(6, Lx / 2, Ly / 2), rc2 = rc * rc;
    const bond2 = (1.3 * D) * (1.3 * D);
    const hx = Lx / 2, hy = Ly / 2;

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        if (dx > hx) dx -= Lx; else if (dx < -hx) dx += Lx;       // minimum image
        if (dy > hy) dy -= Ly; else if (dy < -hy) dy += Ly;
        const r2 = dx * dx + dy * dy;
        if (r2 > rc2) continue;
        const r = Math.sqrt(Math.max(r2, 0.09));                    // soft floor, a bad frame can't explode
        const f = Math.exp(-KAPPA * r) * (1 + KAPPA * r) / (r * r * r);   // |F| / r, so f * dx is the x-component
        fx[i] += f * dx; fy[i] += f * dy;
        fx[j] -= f * dx; fy[j] -= f * dy;
        if (r2 < bond2) bonds.push(i, dx, dy);
      }
    }

    if (INTERACTIVE && probe.on) {
      const px = (probe.x - ox) / scale, py = (probe.y - oy) / scale;
      for (let i = 0; i < N; i++) {
        let dx = x[i] - px, dy = y[i] - py;
        if (dx > hx) dx -= Lx; else if (dx < -hx) dx += Lx;
        if (dy > hy) dy -= Ly; else if (dy < -hy) dy += Ly;
        const r2 = dx * dx + dy * dy;
        if (r2 > 16) continue;
        const r = Math.sqrt(Math.max(r2, 0.36));
        const f = PROBE_CHARGE * Math.exp(-r) * (1 + r) / (r * r * r);
        fx[i] += f * dx; fy[i] += f * dy;
      }
    }
  }

  /*
    BAOAB Langevin step (B = half kick, A = half drift, O = thermostat):
    1. B: v += F dt/2
    2. A: x += v dt/2
    3. O: v = c1 v + c2 ξ,   c1 = exp(-γ dt),  c2 = sqrt((1 - c1²) kT)
    4. A: x += v dt/2, wrap into the box
    5. new forces, then B again
  */
  function step() {
    const c1 = Math.exp(-FRICTION * DT);
    const c2 = Math.sqrt((1 - c1 * c1) / GAMMA);
    const h = DT / 2;
    for (let i = 0; i < N; i++) {
      vx[i] += fx[i] * h; vy[i] += fy[i] * h;                                // B
      x[i] += vx[i] * h;  y[i] += vy[i] * h;                                 // A
      vx[i] = c1 * vx[i] + c2 * gauss(); vy[i] = c1 * vy[i] + c2 * gauss();  // O
      x[i] += vx[i] * h;  y[i] += vy[i] * h;                                 // A
      x[i] = ((x[i] % Lx) + Lx) % Lx; y[i] = ((y[i] % Ly) + Ly) % Ly;
    }
    removeDrift();
    computeForces();
    for (let i = 0; i < N; i++) { vx[i] += fx[i] * h; vy[i] += fy[i] * h; }  // B
  }

  function updateHeat() {
    // smoothed kinetic energy per particle in units of kT (≈ 1 when calm). EMA so thermal noise doesn't flicker
    for (let i = 0; i < N; i++) {
      const ke = 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]) * GAMMA;
      heat[i] = 0.93 * heat[i] + 0.07 * ke;
    }
  }

  /*
    Drawing:
    1. Bonds: ONE faint path for the whole mesh (cheap, and constant alpha = no shimmer).
    2. Particles: calm = soft blue on the white page, disturbed = orange. "hot" = how far the smoothed kinetic energy is above thermal.
  */
  const CALM = [128, 156, 200];      // soft blue on white
  const HOT = [214, 100, 42];
  function draw() {
    ctx.fillStyle = "#ffffff";                                    // white page
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    for (let k = 0; k < bonds.length; k += 3) {
      const i = bonds[k];
      const x0 = x[i] * scale + ox, y0 = y[i] * scale + oy;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 - bonds[k + 1] * scale, y0 - bonds[k + 2] * scale);   // draw to j's nearest image so edges look continuous
    }
    ctx.strokeStyle = "rgba(27,35,48,0.075)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const rad = Math.max(2, Math.min(3, scale * 0.055));
    for (let i = 0; i < N; i++) {
      const px = x[i] * scale + ox, py = y[i] * scale + oy;
      if (px < -12 || px > W + 12 || py < -12 || py > H + 12) continue;
      const hot = Math.min(1, Math.max(0, (heat[i] - 2.5) / 10));
      const R = Math.round(CALM[0] + (HOT[0] - CALM[0]) * hot);
      const G = Math.round(CALM[1] + (HOT[1] - CALM[1]) * hot);
      const B = Math.round(CALM[2] + (HOT[2] - CALM[2]) * hot);
      ctx.fillStyle = "rgba(" + R + "," + G + "," + B + "," + (0.06 + 0.2 * hot).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(px, py, rad * (3 + 1.5 * hot), 0, 2 * Math.PI); ctx.fill();    // glow
      ctx.fillStyle = "rgb(" + R + "," + G + "," + B + ")";
      ctx.beginPath(); ctx.arc(px, py, rad * (1 + 0.35 * hot), 0, 2 * Math.PI); ctx.fill();   // particle
    }
  }

  function frame() {
    if (running) {
      for (let s = 0; s < STEPS_PER_FRAME; s++) step();
      updateHeat();
      draw();
    }
    requestAnimationFrame(frame);
  }

  // ---------- cursor / touch ----------
  if (INTERACTIVE && !reduceMotion) {
    const aim = function (e) {
      const rect = canvas.getBoundingClientRect();
      probe.x = e.clientX - rect.left; probe.y = e.clientY - rect.top; probe.on = true;
    };
    const release = function () { probe.on = false; };
    // listen on the whole page now, the crystal sits behind every section
    window.addEventListener("pointermove", aim, { passive: true });
    window.addEventListener("pointerdown", aim, { passive: true });
    document.documentElement.addEventListener("mouseleave", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") release(); });
    window.addEventListener("scroll", function () { if (!probe.on) return; release(); }, { passive: true });   // no ghost dents while scrolling
  }

  // ---------- caption stays truthful to the knobs ----------
  const caption = document.getElementById("heroCaption");
  if (caption) {
    const canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    caption.textContent = "2D Yukawa crystal · Γ = " + GAMMA + " · κ = " + KAPPA.toFixed(1) + " · simulated live" +
      (INTERACTIVE && canHover && !reduceMotion ? " · hover to poke it" : "");
  }

  // ---------- pause when the tab is hidden, no point burning battery ----------
  document.addEventListener("visibilitychange", function () { running = !document.hidden; });

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (canvas.clientWidth === W && Math.abs(canvas.clientHeight - H) < 160) return;   // phone URL bar show/hide → ignore, don't reset the lattice
      setup(); draw();
    }, 200);
  });

  setup();
  if (reduceMotion) { draw(); return; }               // reduced motion → one still frame of the crystal
  for (let s = 0; s < 60; s++) step();                // short warm-up so the thermal breathing is already on
  updateHeat(); draw();
  requestAnimationFrame(frame);

})();

/*
  Learning Notes:
  1. Yukawa = Coulomb repulsion screened by the surrounding plasma: U(r) = Q² exp(-r/λ_D) / (4πε₀ r).
     In units of a, κ = a/λ_D. Big κ = short-ranged, soft crystal. Small κ = long-ranged, stiff crystal.
  2. Γ = Q² / (4πε₀ a kT) = potential energy / thermal energy. In 2D the crystal melts around
     Γ_m(κ) ≈ 131 / (1 - 0.388κ² + 0.138κ³ - 0.0138κ⁴) (Hartmann et al. 2005) → ≈ 178 at κ = 1.
  3. Lattice constant from density: a triangular lattice puts one particle in an area (√3/2) d².
     Wigner-Seitz says that area is π a², so d = sqrt(2π/√3) a ≈ 1.905 a. That's D above.
  4. BAOAB is a splitting of Langevin dynamics. Its configurational sampling is very accurate for its cost,
     which is why both this toy and the real engine use it.
*/

// Program Completed
