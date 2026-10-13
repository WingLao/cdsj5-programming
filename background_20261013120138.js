/* 大氣流場背景：像天氣圖一樣的風、等壓線與雲。
 * 一個緩慢演變的「氣壓場」（noise）決定一切：
 *   - 風沿等壓線吹（地轉風：速度 = 氣壓場的旋度），疊加一股西風帶，所以會出現
 *     蜿蜒的急流和繞著高、低壓中心打轉的氣旋；
 *   - 幼細的等壓線及 H／L 標記畫出氣壓場本身；
 *   - 低解析度的雲層貼圖放大後成為柔和的雲帶，低壓附近雲較多。
 * 三層畫布：雲（極小、由 CSS 放大）、等壓線、風（p5 主畫布，以淡出方式留下短尾）。
 * 單一 p5 instance；頁面隱藏或系統要求減少動態時停在一幀靜態流線圖。 */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { mode: 'flow', strength: 55 };
  const CELL = 44;                 // 氣壓場格距（px）
  const LEVELS = [0.32, 0.38, 0.44, 0.5, 0.56, 0.62, 0.68];
  let current = null;

  const host = () => document.getElementById('background');
  const animating = () => state.mode === 'flow' && !motion.matches && !document.hidden;
  const layer = () => {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    return c;
  };

  function build(target) {
    const handle = { p: null, ready: false, dead: false, extras: [] };
    handle.p = new p5(p => {
      let mobile = false, time = 40, frame = 0, density = 1;
      let cols = 0, rows = 0, pressure, windU, windV;
      let count = 0, px, py, age, life;
      let cloudCanvas, cloudCtx, cloudImage, isoCanvas, isoCtx;
      const SCALE = 0.0026, DRIFT = 10, JET = 0.85, SWIRL = 520;

      const measure = () => {
        mobile = innerWidth <= 640;
        return [innerWidth, innerHeight + (mobile ? 120 : 0)];
      };
      const field = (x, y) => p.noise((x - time * DRIFT) * SCALE, y * SCALE * 1.25, time * 0.02);
      const seed = i => {
        px[i] = Math.random() * p.width; py[i] = Math.random() * p.height;
        age[i] = 0; life[i] = 2.5 + Math.random() * 5;
      };
      const layout = () => {
        density = Math.min(devicePixelRatio || 1, 1.5);
        cols = Math.ceil(p.width / CELL) + 4; rows = Math.ceil(p.height / CELL) + 4;
        pressure = new Float32Array(cols * rows); windU = new Float32Array(cols * rows); windV = new Float32Array(cols * rows);
        count = Math.min(mobile ? 260 : 720, Math.round(p.width * p.height / (mobile ? 1500 : 1900)));
        px = new Float32Array(count); py = new Float32Array(count); age = new Float32Array(count); life = new Float32Array(count);
        for (let i = 0; i < count; i++) { seed(i); age[i] = Math.random() * life[i]; }
        const cw = mobile ? 56 : 104, ch = Math.max(24, Math.round(cw * p.height / p.width));
        cloudCanvas.width = cw; cloudCanvas.height = ch;
        cloudImage = cloudCtx.createImageData(cw, ch);
        isoCanvas.width = Math.round(p.width * density); isoCanvas.height = Math.round(p.height * density);
        p.clear();
      };

      // 氣壓場及由它導出的風（格點在畫布外多留一圈，方便取差分及插值）。
      const updateField = () => {
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) pressure[j * cols + i] = field((i - 1) * CELL, (j - 1) * CELL);
        for (let j = 1; j < rows - 1; j++) for (let i = 1; i < cols - 1; i++) {
          const k = j * cols + i;
          windU[k] = JET + SWIRL * (pressure[k + cols] - pressure[k - cols]) / (2 * CELL);
          windV[k] = -SWIRL * (pressure[k + 1] - pressure[k - 1]) / (2 * CELL);
        }
      };
      const drawIsobars = () => {
        const ctx = isoCtx;
        ctx.setTransform(density, 0, 0, density, 0, 0);
        ctx.clearRect(0, 0, p.width, p.height);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(236,244,248,0.2)';
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
          const k = j * cols + i, a = pressure[k], b = pressure[k + 1], c = pressure[k + cols + 1], d = pressure[k + cols];
          const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
          const x = (i - 1) * CELL, y = (j - 1) * CELL;
          for (const level of LEVELS) {
            if (level < lo || level > hi) continue;
            // Marching squares：找出等值線穿過的邊，逐段連線。
            let n = 0;
            const cut = (va, vb, xa, ya, xb, yb) => {
              if ((va < level) === (vb < level)) return;
              const f = (level - va) / (vb - va), cx = xa + (xb - xa) * f, cy = ya + (yb - ya) * f;
              if (n++ % 2) ctx.lineTo(cx, cy); else ctx.moveTo(cx, cy);
            };
            cut(a, b, x, y, x + CELL, y);
            cut(b, c, x + CELL, y, x + CELL, y + CELL);
            cut(d, c, x, y + CELL, x + CELL, y + CELL);
            cut(a, d, x, y, x, y + CELL);
          }
        }
        ctx.stroke();
        // 高、低壓中心。
        ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(240,247,250,0.34)';
        for (let j = 2; j < rows - 2; j++) for (let i = 2; i < cols - 2; i++) {
          const k = j * cols + i, v = pressure[k];
          if (v < 0.64 && v > 0.36) continue;
          let peak = true;
          for (let dj = -2; dj <= 2 && peak; dj++) for (let di = -2; di <= 2; di++) {
            const o = pressure[k + dj * cols + di];
            if ((di || dj) && (v >= 0.64 ? o >= v : o <= v)) { peak = false; break; }
          }
          if (peak) ctx.fillText(v >= 0.64 ? 'H' : 'L', (i - 1) * CELL, (j - 1) * CELL);
        }
      };
      const drawClouds = () => {
        const w = cloudCanvas.width, h = cloudCanvas.height, data = cloudImage.data, sx = p.width / w, sy = p.height / h;
        for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k += 4) {
          const wx = x * sx, wy = y * sy;
          const wisp = p.noise((wx - time * DRIFT * 2.4) * 0.0036 + 50, wy * 0.0075, time * 0.045);
          let c = wisp + (0.5 - field(wx, wy)) * 0.55;   // 低壓區雲量較多
          c = Math.max(0, Math.min(1, (c - 0.47) / 0.24));
          data[k] = 238; data[k + 1] = 245; data[k + 2] = 249; data[k + 3] = c * c * (3 - 2 * c) * 120;
        }
        cloudCtx.putImageData(cloudImage, 0, 0);
      };

      // 風：每點沿風場前進，畫一小段；按風速分三組筆觸，強風較亮。
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      const advect = (dt, speed) => {
        paths[0] = new Path2D(); paths[1] = new Path2D(); paths[2] = new Path2D();
        for (let i = 0; i < count; i++) {
          const gx = px[i] / CELL + 1, gy = py[i] / CELL + 1, ci = gx | 0, cj = gy | 0, fx = gx - ci, fy = gy - cj, k = cj * cols + ci;
          const u = (windU[k] * (1 - fx) + windU[k + 1] * fx) * (1 - fy) + (windU[k + cols] * (1 - fx) + windU[k + cols + 1] * fx) * fy;
          const v = (windV[k] * (1 - fx) + windV[k + 1] * fx) * (1 - fy) + (windV[k + cols] * (1 - fx) + windV[k + cols + 1] * fx) * fy;
          const nx = px[i] + u * speed * dt, ny = py[i] + v * speed * dt, mag = u * u + v * v;
          const path = paths[mag > 1.7 ? 2 : mag > 0.6 ? 1 : 0];
          path.moveTo(px[i], py[i]); path.lineTo(nx, ny);
          px[i] = nx; py[i] = ny; age[i] += dt;
          if (age[i] > life[i] || nx < -CELL || nx > p.width + CELL || ny < -CELL || ny > p.height + CELL) seed(i);
        }
      };
      const stroke = (ctx, boost) => {
        ctx.lineCap = 'round';
        const look = [[0.2, 0.9], [0.32, 1.1], [0.46, 1.3]];
        for (let g = 0; g < 3; g++) {
          ctx.strokeStyle = `rgba(240,247,250,${Math.min(1, look[g][0] * boost)})`;
          ctx.lineWidth = look[g][1];
          ctx.stroke(paths[g]);
        }
      };

      const sync = () => {
        if (animating()) p.loop();
        else { p.noLoop(); p.redraw(); }
      };
      handle.sync = sync;

      p.setup = () => {
        if (handle.dead) { p.noCanvas(); p.noLoop(); setTimeout(() => p.remove()); return; }
        const [w, h] = measure();
        cloudCanvas = layer(); isoCanvas = layer();
        cloudCtx = cloudCanvas.getContext('2d'); isoCtx = isoCanvas.getContext('2d');
        target.append(cloudCanvas, isoCanvas);
        handle.extras = [cloudCanvas, isoCanvas];
        const main = p.createCanvas(w, h);
        main.elt.style.position = 'absolute';
        p.pixelDensity(Math.min(devicePixelRatio || 1, 1.5));
        p.frameRate(mobile ? 24 : 30);
        p.noiseDetail(2, 0.3);
        p.noiseSeed(41);
        layout();
        handle.ready = true;
        sync();
      };

      p.draw = () => {
        const ctx = p.drawingContext, live = p.isLooping();
        if (!live) {
          // 靜態：畫出一幅流線圖後停住。
          updateField(); drawIsobars(); drawClouds();
          p.clear();
          for (let s = 0; s < 46; s++) { advect(1 / 30, 70); stroke(ctx, 0.3); }
          return;
        }
        const dt = Math.min(p.deltaTime, 80) / 1000;
        time += dt;
        if (frame % 3 === 0) { updateField(); drawIsobars(); }
        if (frame % 6 === 0) drawClouds();
        frame++;
        // 以「擦淡」代替清除，風留下短尾而畫布保持透明。
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, 0, p.width, p.height);
        ctx.globalCompositeOperation = 'source-over';
        advect(dt, 78);
        stroke(ctx, 1);
      };

      p.windowResized = () => {
        if (!handle.ready) return;
        const [w, h] = measure();
        // 忽略手機瀏覽器工具列造成的小幅高度變化。
        if (w === p.width && h <= p.height && p.height - h < 200) return;
        p.frameRate(mobile ? 24 : 30);
        p.resizeCanvas(w, h);
        layout();
        frame = 0;
        if (!p.isLooping()) p.redraw();
      };
    }, target);
    return handle;
  }

  function destroy() {
    if (!current) return;
    current.dead = true;
    for (const c of current.extras) c.remove();
    if (current.ready) current.p.remove();
    current = null;
  }
  function refresh() {
    if (current && current.ready) current.sync();
  }

  window.makeCompetitionBackground = (mode = 'flow', strength = 55) => {
    const el = host();
    if (!el) return;
    state.mode = ['flow', 'still', 'none'].includes(mode) ? mode : 'flow';
    state.strength = Math.max(0, Math.min(100, Number(strength) || 0));
    el.dataset.mode = state.mode;
    el.style.opacity = state.strength / 100;
    if (state.mode === 'none' || state.strength === 0) { destroy(); return; }
    if (typeof p5 === 'undefined') { el.classList.add('is-fallback'); return; }
    if (!current) current = build(el);
    refresh();
  };

  // 只註冊一次：暫停或恢復現有的 sketch。
  document.addEventListener('visibilitychange', refresh);
  motion.addEventListener?.('change', refresh);
})();
