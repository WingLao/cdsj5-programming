/* Adapted from Desktop/P5js/infinity_logo_code/sketch.js.
 * Same lemniscate and arc-length character spacing, but the loop is lifted into
 * 3D: one strand passes over the other, the whole figure rocks slowly, and each
 * character of the class name is projected, depth-sorted, scaled and shaded by distance. */
(() => {
  // 班名沿無限符號重複；字數取整數次重複，接口處不會把字切斷。
  const UNIT = 'CDSJ5 Programming · ';
  const ARC_STEP = 0.004, LIFT = 0.26, FOCAL = 3.2, RAIL = 16;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let logo = null, onScreen = true, sync = () => {};

  window.makeClassLogo = () => {
    const host = document.getElementById('class-logo');
    if (!host || logo || typeof p5 === 'undefined') return;
    logo = new p5(p => {
      // Unit lemniscate sampled once; z lifts one strand over the other at the crossing.
      const xs = [], ys = [], zs = [], acc = [];
      let total = 0, time = 0, offset = 0, scale = 50, count = 0, ready = false;
      let px, py, pk, pz, pa, order;
      const out = [0, 0, 0, 0];
      let cosY = 1, sinY = 0, cosX = 1, sinX = 0;

      const project = index => {
        const x = xs[index], y = ys[index], z = zs[index];
        const x1 = x * cosY + z * sinY, z1 = z * cosY - x * sinY;
        const y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
        const k = FOCAL / (FOCAL - z2);
        out[0] = p.width / 2 + x1 * k * scale;
        out[1] = p.height / 2 + y1 * k * scale;
        out[2] = k;
        out[3] = z2;
      };
      const indexAt = distance => {
        let lo = 0, hi = acc.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (acc[mid] < distance) lo = mid + 1; else hi = mid; }
        return lo;
      };
      const fit = () => {
        scale = Math.min(p.width * 0.44, p.height * 1.02);
        count = Math.max(1, Math.round(total * scale / (scale * 0.112 + 0.6) / UNIT.length)) * UNIT.length;
        px = new Float32Array(count); py = new Float32Array(count); pk = new Float32Array(count);
        pz = new Float32Array(count); pa = new Float32Array(count);
        order = Array.from({ length: count }, (_, i) => i);
      };

      p.setup = () => {
        p.createCanvas(host.clientWidth || 132, host.clientHeight || 68);
        p.pixelDensity(Math.min(devicePixelRatio || 1, 3));
        p.frameRate(20);
        p.textFont('Menlo, "SF Mono", Consolas, "Courier New", monospace');
        p.textStyle(p.BOLD);
        p.textAlign(p.CENTER, p.CENTER);
        for (let t = 0, i = 0; t <= p.TWO_PI; t += ARC_STEP, i++) {
          const s = Math.sin(t), d = 1 + s * s;
          xs.push(Math.cos(t) / d); ys.push(s * Math.cos(t) / d); zs.push(s * LIFT);
          if (i) total += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
          acc.push(total);
        }
        fit();
        ready = true;
        sync();
      };

      p.draw = () => {
        if (p.isLooping()) { const dt = Math.min(p.deltaTime, 100) / 1000; time += dt; offset = (offset + dt * 0.1) % total; }
        const angleY = motion.matches ? 0.3 : 0.3 * Math.sin(time * 0.5);
        const angleX = 0.4 + (motion.matches ? 0 : 0.08 * Math.sin(time * 0.33 + 1));
        cosY = Math.cos(angleY); sinY = Math.sin(angleY); cosX = Math.cos(angleX); sinX = Math.sin(angleX);
        p.clear();

        // Ribbon under the characters: thicker and warmer where it comes forward.
        p.noFill();
        project(0);
        for (let i = RAIL, x0 = out[0], y0 = out[1]; i < xs.length + RAIL; i += RAIL) {
          project(i % xs.length);
          const near = Math.max(0, Math.min(1, out[3] / 0.7 + 0.5));
          p.stroke(120 + 96 * near, 140 + 46 * near, 150 - 30 * near, 50 + 60 * near);
          p.strokeWeight(scale * (0.018 + 0.03 * near) * out[2]);
          p.line(x0, y0, out[0], out[1]);
          x0 = out[0]; y0 = out[1];
        }
        p.noStroke();

        const last = xs.length - 1;
        for (let i = 0; i < count; i++) {
          const index = indexAt((i / count * total + offset) % total);
          project(Math.min(index + 5, last));
          const ax = out[0], ay = out[1];
          project(index);
          px[i] = out[0]; py[i] = out[1]; pk[i] = out[2]; pz[i] = out[3];
          pa[i] = Math.atan2(ay - out[1], ax - out[0]);
        }
        order.sort((a, b) => pz[a] - pz[b]);

        const size = scale * 0.15;
        for (const i of order) {
          const depth = Math.max(0, Math.min(1, pz[i] / 0.7 + 0.5)); // 0 back, 1 front
          const glyph = UNIT[i % UNIT.length];
          const thick = size * 0.07 * (0.6 + depth);
          p.push();
          p.translate(px[i], py[i]);
          p.rotate(pa[i]);
          p.textSize(size * pk[i] * (0.9 + 0.24 * depth));
          // Extruded side, then the lit face.
          p.fill(50, 40, 28, 120 + 100 * depth);
          p.text(glyph, thick * 2, thick * 2);
          p.fill(122, 96, 54, 150 + 90 * depth);
          p.text(glyph, thick, thick);
          p.fill(186 + 69 * depth, 190 + 30 * depth, 178 - 50 * depth, 215 + 40 * depth);
          p.text(glyph, 0, 0);
          p.pop();
        }
        host.classList.add('logo-ready');
      };

      p.refit = () => {
        if (!ready) return;
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h || (w === p.width && h === p.height)) return;
        p.resizeCanvas(w, h);
        fit();
        if (!p.isLooping()) p.redraw();
      };
      sync = () => {
        if (!ready) return;
        if (!motion.matches && !document.hidden && onScreen) p.loop();
        else { p.noLoop(); p.redraw(); }
      };
    }, host);

    document.addEventListener('visibilitychange', () => sync());
    motion.addEventListener?.('change', () => sync());
    if ('ResizeObserver' in window) new ResizeObserver(() => logo.refit()).observe(host);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; sync(); }).observe(host);
  };
})();
