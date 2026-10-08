/* LeCard · fumaça dourada do gênio
   - LecardSmoke.cover()  → fumaça sobe e cobre a tela (antes de trocar de página)
   - LecardSmoke.reveal() → a fumaça se dissipa para cima revelando a página nova
   - LecardSmoke.ambient(canvas) → névoa leve contínua (cartão do gênio)
   - LecardSmoke.go(url)  → cobre, marca a próxima página para revelar e navega
   Respeita "reduzir movimento": sem fumaça, navegação imediata. */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FLAG = "lecard-smoke";
  var VEIL_TOP = "#FFD34F", VEIL_MID = "#FFBC00", VEIL_BOTTOM = "#F2A900";

  /* ---------- sprites procedurais (gerados uma vez) ---------- */
  var sprites = null;
  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  /* Puff "couve-flor": vários lóbulos feitos de dezenas de bolinhas suaves, sombreado de cima (claro)
     para baixo (escuro) para dar volume, e pequenos furos para parecer fumaça e não bolha. */
  function makePuff(size, top, bottom) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var x = c.getContext("2d");
    var lobes = 6 + ((Math.random() * 4) | 0);
    for (var l = 0; l < lobes; l++) {
      var ang = Math.random() * Math.PI * 2, dist = size * rand(0.04, 0.2);
      var lx = size / 2 + Math.cos(ang) * dist, ly = size / 2 + Math.sin(ang) * dist * 0.8;
      var lr = size * rand(0.11, 0.2);
      for (var k = 0; k < 26; k++) {
        var px = lx + gauss() * lr * 0.9, py = ly + gauss() * lr * 0.9;
        var r = lr * rand(0.35, 0.8);
        var g = x.createRadialGradient(px, py, 0, px, py, r);
        var a = rand(0.035, 0.085);
        g.addColorStop(0, "rgba(0,0,0," + a + ")");
        g.addColorStop(0.6, "rgba(0,0,0," + (a * 0.5) + ")");
        g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
      }
    }
    // fiapos: pequenos furos
    x.globalCompositeOperation = "destination-out";
    for (var h = 0; h < 40; h++) {
      var hx = rand(0, size), hy = rand(0, size), hr = size * rand(0.01, 0.035);
      var hg = x.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hg.addColorStop(0, "rgba(0,0,0,.35)"); hg.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = hg; x.beginPath(); x.arc(hx, hy, hr, 0, Math.PI * 2); x.fill();
    }
    // borda suave
    x.globalCompositeOperation = "destination-in";
    var m = x.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
    m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = m; x.fillRect(0, 0, size, size);
    // cor com volume
    x.globalCompositeOperation = "source-in";
    var cg = x.createLinearGradient(0, size * 0.2, 0, size * 0.85);
    cg.addColorStop(0, top); cg.addColorStop(1, bottom);
    x.fillStyle = cg; x.fillRect(0, 0, size, size);
    return c;
  }
  function getSprites() {
    if (sprites) return sprites;
    sprites = { gold: [], cream: [], deep: [] };
    for (var i = 0; i < 6; i++) {
      sprites.gold.push(makePuff(256, "#FFE27A", "#F2AA00"));
      sprites.cream.push(makePuff(256, "#FFFCEF", "#FFD34F"));
      sprites.deep.push(makePuff(256, "#FFC72C", "#D99200"));
    }
    return sprites;
  }

  /* ---------- camada de tela cheia ---------- */
  var fx = null, ctx = null, W = 0, H = 0, DPR = 1;
  function ensureFx() {
    if (fx) return;
    fx = document.getElementById("smokeFx");
    if (!fx) { fx = document.createElement("canvas"); fx.id = "smokeFx"; document.body.appendChild(fx); }
    fx.setAttribute("aria-hidden", "true");
    ctx = fx.getContext("2d");
    sizeFx();
    window.addEventListener("resize", sizeFx);
  }
  function sizeFx() {
    W = window.innerWidth; H = window.innerHeight;
    // fumaça é macia: resolução reduzida em telas grandes mantém a fluidez no painel
    DPR = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.2e6 / Math.max(1, W * H)));
    fx.width = Math.round(W * DPR); fx.height = Math.round(H * DPR);
    fx.style.width = W + "px"; fx.style.height = H + "px";
  }
  function veilGradient(y0, y1) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, VEIL_TOP); g.addColorStop(0.55, VEIL_MID); g.addColorStop(1, VEIL_BOTTOM);
    return g;
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function Particle(x, y, s, kind, life, vy) {
    var set = getSprites()[kind];
    this.img = set[(Math.random() * set.length) | 0];
    this.x = x; this.y = y; this.s = s; this.kind = kind;
    this.vx = rand(-0.03, 0.03); this.vy = vy;
    this.rot = rand(0, Math.PI * 2); this.vr = rand(-0.0006, 0.0006);
    this.life = 0; this.max = life; this.seed = rand(0, 1000);
    this.grow = rand(0.00025, 0.0006);
    this.a = rand(0.75, 1);
  }
  Particle.prototype.step = function (dt, t) {
    this.life += dt;
    this.vx += Math.sin(this.y * 0.006 + t * 0.0017 + this.seed) * 0.0009 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vy *= 0.9995;
    this.rot += this.vr * dt;
    this.s *= 1 + this.grow * dt;
  };
  Particle.prototype.alpha = function () {
    var k = this.life / this.max;
    var fin = Math.min(1, k * 6), fout = k > 0.55 ? Math.max(0, 1 - (k - 0.55) / 0.45) : 1;
    return this.a * fin * fout;
  };
  function drawP(c, p, al) {
    c.save();
    c.globalAlpha = al;
    c.translate(p.x, p.y); c.rotate(p.rot);
    c.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s);
    c.restore();
  }

  function Spark(x, y) {
    this.x = x; this.y = y; this.vx = rand(-0.05, 0.05); this.vy = rand(-0.5, -0.18);
    this.life = 0; this.max = rand(500, 1100); this.r = rand(1.2, 3.2); this.tw = rand(0, 6);
  }
  function drawSpark(c, s) {
    var k = s.life / s.max, al = Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.sin(s.tw + s.life * 0.02));
    if (al <= 0) return;
    c.save(); c.globalAlpha = al; c.translate(s.x, s.y);
    c.fillStyle = "#FFFFFF";
    var r = s.r;
    c.beginPath();
    c.moveTo(0, -r * 2.4); c.quadraticCurveTo(0, 0, r * 2.4, 0); c.quadraticCurveTo(0, 0, 0, r * 2.4);
    c.quadraticCurveTo(0, 0, -r * 2.4, 0); c.quadraticCurveTo(0, 0, 0, -r * 2.4);
    c.fill(); c.restore();
  }

  /* ---------- cobrir / revelar ---------- */
  var running = null;
  function stopRun() { if (running) { cancelAnimationFrame(running); running = null; } }

  function cover(duration) {
    duration = duration || 780;
    return new Promise(function (resolve) {
      if (reduce) { resolve(); return; }
      ensureFx(); stopRun();
      fx.className = "is-active";
      var parts = [], sparks = [], t0 = performance.now(), last = t0, edge = Math.max(90, H * 0.16), done = false;
      var base = Math.max(W, H);
      function frame(now) {
        var dt = Math.min(40, now - last); last = now;
        var p = Math.min(1, (now - t0) / duration), e = ease(p);
        var front = (H + edge) * (1 - e) - edge * 0.4; // topo da parede de fumaça
        // emite na frente da parede
        if (p < 0.98 && parts.length < 130) {
          var n = Math.max(2, Math.round(W / 180));
          for (var i = 0; i < n; i++) {
            var kind = Math.random() < 0.55 ? "gold" : (Math.random() < 0.6 ? "cream" : "deep");
            parts.push(new Particle(rand(-0.05, 1.05) * W, front + rand(-edge * 0.3, edge * 0.6), base * rand(0.16, 0.34), kind, rand(700, 1100), rand(-0.55, -0.25)));
          }
          if (Math.random() < 0.9) for (var k = 0; k < 3; k++) sparks.push(new Spark(rand(0, W), front + rand(0, edge)));
        }
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);
        // parede sólida abaixo da frente
        var top = front + edge * 0.15, solid = top + edge * 0.55;
        if (top < H) {
          ctx.fillStyle = veilGradient(0, H);
          ctx.fillRect(0, Math.max(-10, solid), W, H - solid + 10);
          if (solid > 0) {
            var fg = ctx.createLinearGradient(0, top, 0, solid);
            fg.addColorStop(0, "rgba(255,200,40,0)"); fg.addColorStop(1, "rgba(255,192,10,1)");
            ctx.fillStyle = fg; ctx.fillRect(0, top, W, solid - top);
          }
        }
        for (var j = parts.length - 1; j >= 0; j--) {
          var q = parts[j]; q.step(dt, now);
          if (q.life >= q.max) { parts.splice(j, 1); continue; }
          drawP(ctx, q, q.alpha());
        }
        for (var s = sparks.length - 1; s >= 0; s--) {
          var sp = sparks[s]; sp.life += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
          if (sp.life >= sp.max) { sparks.splice(s, 1); continue; }
          drawSpark(ctx, sp);
        }
        if (p >= 1 && !done) {
          done = true;
          ctx.fillStyle = veilGradient(0, H); ctx.fillRect(0, 0, W, H);
          document.documentElement.classList.add("smoke-covered");
          running = null;
          resolve();
          return;
        }
        running = requestAnimationFrame(frame);
      }
      running = requestAnimationFrame(frame);
    });
  }

  function reveal(duration) {
    var root = document.documentElement;
    if (!root.classList.contains("smoke-enter")) return Promise.resolve();
    if (reduce) { root.classList.remove("smoke-enter"); return Promise.resolve(); }
    duration = duration || 1050;
    return new Promise(function (resolve) {
      ensureFx(); stopRun();
      fx.className = "is-active";
      var parts = [], sparks = [], t0 = performance.now(), last = t0, edge = Math.max(110, H * 0.2);
      var base = Math.max(W, H), released = false;
      // pinta o véu no canvas e libera o véu do CSS no mesmo quadro
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = veilGradient(0, H); ctx.fillRect(0, 0, W, H);
      requestAnimationFrame(function () { root.classList.remove("smoke-enter"); root.classList.add("smoke-revealing"); });
      // nuvem inicial espalhada
      for (var i = 0; i < Math.min(40, Math.round(W / 70) + 10); i++) {
        parts.push(new Particle(rand(0, W), rand(H * 0.1, H * 1.05), base * rand(0.18, 0.36), Math.random() < 0.6 ? "gold" : "cream", rand(800, 1400), rand(-0.9, -0.4)));
      }
      function frame(now) {
        var dt = Math.min(40, now - last); last = now;
        var p = Math.min(1, (now - t0) / duration), e = easeOut(p);
        var bottom = H * (1 - e) * 1.05 - edge * e; // base do véu subindo
        if (p < 0.8 && parts.length < 140) {
          var n = Math.max(2, Math.round(W / 200));
          for (var k = 0; k < n; k++) parts.push(new Particle(rand(-0.05, 1.05) * W, bottom + rand(-edge * 0.5, edge * 0.2), base * rand(0.14, 0.3), Math.random() < 0.5 ? "gold" : "cream", rand(700, 1100), rand(-1.0, -0.5)));
          for (var z = 0; z < 2; z++) sparks.push(new Spark(rand(0, W), bottom + rand(-edge, 0)));
        }
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);
        var vb = bottom - edge * 0.55, vf = bottom - edge * 0.05;
        if (vb > 0) { ctx.fillStyle = veilGradient(0, H); ctx.fillRect(0, 0, W, vb); }
        if (vf > 0) {
          var rg = ctx.createLinearGradient(0, Math.max(0, vb), 0, vf);
          rg.addColorStop(0, "rgba(255,190,10,1)"); rg.addColorStop(1, "rgba(255,200,40,0)");
          ctx.fillStyle = rg; ctx.fillRect(0, Math.max(0, vb), W, vf - Math.max(0, vb));
        }
        for (var j = parts.length - 1; j >= 0; j--) {
          var q = parts[j]; q.step(dt, now);
          if (q.life >= q.max || q.y < -q.s) { parts.splice(j, 1); continue; }
          drawP(ctx, q, q.alpha());
        }
        for (var s = sparks.length - 1; s >= 0; s--) {
          var sp = sparks[s]; sp.life += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
          if (sp.life >= sp.max) { sparks.splice(s, 1); continue; }
          drawSpark(ctx, sp);
        }
        if (!released && p > 0.35) { released = true; root.classList.remove("smoke-revealing"); resolve(); }
        if (p >= 1 && !parts.length && !sparks.length) {
          ctx.clearRect(0, 0, W, H); fx.className = ""; running = null;
          if (!released) { root.classList.remove("smoke-revealing"); resolve(); }
          return;
        }
        running = requestAnimationFrame(frame);
      }
      running = requestAnimationFrame(frame);
    });
  }

  var navigating = false;
  function go(url) {
    if (navigating) return;
    navigating = true;
    if (reduce) { location.href = url; return; }
    try { sessionStorage.setItem(FLAG, "1"); } catch (e) { /* sem armazenamento: só não revela */ }
    var t = setTimeout(function () { location.href = url; }, 1400); // garantia
    cover().then(function () { clearTimeout(t); location.href = url; });
  }

  // Voltar pelo histórico (bfcache): limpa a cobertura
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      navigating = false; stopRun();
      document.documentElement.classList.remove("smoke-covered", "smoke-enter", "smoke-revealing");
      if (fx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, fx.width, fx.height); fx.className = ""; }
    }
  });

  /* ---------- névoa ambiente (cartão do gênio) ---------- */
  function ambient(canvas, opts) {
    if (reduce || !canvas) return { stop: function () {} };
    opts = opts || {};
    var c = canvas.getContext("2d"), parts = [], w = 0, h = 0, dpr = 1, raf = null, last = performance.now(), acc = 0;
    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = 1;
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    }
    size();
    var ro = window.ResizeObserver ? new ResizeObserver(size) : null;
    if (ro) ro.observe(canvas); else window.addEventListener("resize", size);
    var rate = opts.rate || 120; // ms entre emissões
    var skip = false;
    function frame(now) {
      skip = !skip; if (skip) { raf = requestAnimationFrame(frame); return; } // ~30 fps basta para névoa
      var dt = Math.min(80, now - last); last = now; acc += dt;
      while (acc > rate) {
        acc -= rate;
        if (parts.length < (opts.max || 28)) {
          var x = w * rand(opts.x0 || 0.35, opts.x1 || 0.95);
          parts.push(new Particle(x, h * rand(0.82, 1.05), Math.max(w, h) * rand(0.18, 0.32), Math.random() < 0.7 ? "cream" : "gold", rand(2600, 4200), rand(-0.05, -0.025)));
        }
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      for (var j = parts.length - 1; j >= 0; j--) {
        var q = parts[j]; q.step(dt, now);
        if (q.life >= q.max) { parts.splice(j, 1); continue; }
        drawP(c, q, q.alpha() * (opts.alpha || 0.42));
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
    return { stop: stop };
  }

  window.LecardSmoke = { cover: cover, reveal: reveal, go: go, ambient: ambient, reduced: reduce };
})();
