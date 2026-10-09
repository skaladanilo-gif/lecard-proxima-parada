/* LeCard · Sua próxima parada — quiz do ponto de ônibus
   Rotas: abertura (/ ou index.html), quiz.html?etapa=1..3, resultado.html
   Estado só na URL: etapa, humor, momento, desejo (+ totem=1 no modo painel). Nada é salvo.
   Motion: fumaça dourada entre telas (smoke.js), gênio animado, cartão 3D, linha do ônibus,
   letreiro de destino e QR materializando. Tudo desligado com "reduzir movimento". */
(function () {
  "use strict";

  var CFG = window.LECARD_CONFIG || {};
  var SMOKE = window.LecardSmoke || null;
  var qs = new URLSearchParams(location.search);
  var screen = document.getElementById("screen");
  var bubble = document.getElementById("bubble");
  var stepLabel = document.getElementById("stepLabel");
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ícones (traço 2px, desenhados para este projeto) ---------- */
  var I = {
    cansado: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/><path d="M15 4h4l-4 4h4"/>',
    disposto: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    fome: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z"/><path d="M8 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M16 8c0-1.5 1-1.5 1-3"/>',
    pausa: '<path d="M4 13h16M6 13v6M18 13v6M5 9.5h14"/><path d="M7 9.5V6.5M17 9.5V6.5"/>',
    pratico: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M12 2.5v3.5M18.5 6.5l1.5-1.5"/>',
    novo: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    cafe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.2 1 1.3 1 2.5M12 3.5c0 1.2 1 1.3 1 2.5"/>',
    restaurante: '<circle cx="12" cy="12" r="6.5"/><path d="M3 3.5v5a2 2 0 0 0 2 2v10M5 3.5v4M21 3.5c-1.6 0-2.5 1.8-2.5 4.5v3h2.5v9.5"/>',
    lanche: '<path d="M4 10a8 5 0 0 1 16 0H4Z"/><path d="M3.5 13.5h17M4.5 17h15a2 2 0 0 1-2 2.5h-11a2 2 0 0 1-2-2.5Z"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/>',
    restart: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    bus: '<path d="M6 15V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v8"/><path d="M5 15h14v2.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5V15Z"/><path d="M8 19v1.5M16 19v1.5M6 10h12"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || "ico") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + I[name] + "</svg>";
  }

  /* ---------- conteúdo ---------- */
  var QUESTIONS = [
    { key: "humor", stop: "Sentimento", title: "Como você está se sentindo hoje?",
      genie: "",
      short: { cansado: "Cansado", disposto: "Disposto", fome: "Com fome" },
      choices: [
        ["cansado", "Estou cansado", ""],
        ["disposto", "Estou disposto", ""],
        ["fome", "Estou com fome", ""]
      ] },
    { key: "momento", stop: "Ritmo", title: "O que seu dia está pedindo?",
      genie: "",
      short: { pausa: "Pausa", pratico: "Prático", novo: "Novidade" },
      choices: [
        ["pausa", "Uma pausa para mim", ""],
        ["pratico", "Algo prático", ""],
        ["novo", "Sair do automático", ""]
      ] },
    { key: "desejo", stop: "Desejo", title: "O que faria esse momento melhor?",
      genie: "",
      short: { cafe: "Café", restaurante: "Refeição", lanche: "Lanche" },
      choices: [
        ["cafe", "Um café com algo gostoso", ""],
        ["restaurante", "Uma boa refeição", ""],
        ["lanche", "Um lanche", ""]
      ] }
  ];

  /* gênio: uma pose por tela (abertura, cada pergunta e cada resultado) */
  var GENIE = {
    inicio: { src: "genio.webp", w: 760, h: 1883, alt: "Gênio da LeCard segurando um cartão LeCard" },
    1: { src: "genio-oferece.webp", w: 658, h: 1700, alt: "Gênio da LeCard com a mão no peito, oferecendo ajuda" },
    2: { src: "genio-pensa.webp", w: 624, h: 1700, alt: "Gênio da LeCard pensativo, com a mão no queixo" },
    3: { src: "genio-abraco.webp", w: 1047, h: 1700, alt: "Gênio da LeCard de braços abertos", wide: true },
    cafe: { src: "genio-cafe.webp", w: 677, h: 1700, alt: "Gênio da LeCard segurando uma xícara de café" },
    restaurante: { src: "genio-prato.webp", w: 819, h: 1700, alt: "Gênio da LeCard oferecendo um prato feito", wide: true },
    lanche: { src: "genio-lanche.webp", w: 803, h: 1700, alt: "Gênio da LeCard oferecendo um sanduíche", wide: true }
  };
  function setGenie(key) {
    var g = GENIE[key] || GENIE.inicio;
    var img = document.querySelector(".genie"), rig = document.querySelector(".genie-rig"), shine = document.querySelector(".genie-shine");
    if (!img || !rig) return;
    img.src = g.src; img.width = g.w; img.height = g.h; img.alt = g.alt;
    rig.style.aspectRatio = g.w + " / " + g.h;
    rig.classList.toggle("is-wide", !!g.wide);
    if (shine) { shine.style.webkitMaskImage = shine.style.maskImage = 'url("' + g.src + '")'; }
  }

  var PLACE = {
    cafe: { article: "uma cafeteria", sign: "Cafeteria", mapLabel: "cafés" },
    restaurante: { article: "um restaurante", sign: "Restaurante", mapLabel: "restaurantes e refeições" },
    lanche: { article: "uma lanchonete", sign: "Lanchonete", mapLabel: "lanches" }
  };

  var MOOD = {
    cansado: "Depois de um dia cansativo, vale encontrar um momento para você.",
    disposto: "Com essa energia, a próxima parada pode virar parte do passeio.",
    fome: "A fome já deu o recado, e ela merece uma boa resposta."
  };

  var RHYTHM = {
    pausa: {
      cafe: "Escolha um lugar para sentar e aproveitar sem pressa.",
      restaurante: "Escolha uma mesa sem pressa e faça da refeição uma pausa de verdade.",
      lanche: "Peça algo gostoso, sente um pouco e deixe o relógio esperar."
    },
    pratico: {
      cafe: "Um café no caminho resolve: rápido, gostoso e sem desvio.",
      restaurante: "Procure uma refeição perto do ponto para comer bem e seguir o dia.",
      lanche: "Um lanche rápido perto daqui, e você segue seu caminho."
    },
    novo: {
      cafe: "Que tal uma cafeteria onde você nunca entrou? O mapa mostra opções por perto.",
      restaurante: "Experimente um restaurante fora da rotina. O mapa mostra opções por perto.",
      lanche: "Troque o lanche de sempre por um lugar novo. O mapa mostra opções por perto."
    }
  };

  /* ---------- rota ---------- */
  function answer(key) {
    var v = qs.get(key);
    var q = QUESTIONS.filter(function (q) { return q.key === key; })[0];
    return q && q.choices.some(function (c) { return c[0] === v; }) ? v : null;
  }
  function stageParam() {
    var n = parseInt(qs.get("etapa"), 10);
    return n >= 1 && n <= 3 ? n : null;
  }
  function firstMissing() {
    for (var i = 0; i < QUESTIONS.length; i++) if (!answer(QUESTIONS[i].key)) return i + 1;
    return 0;
  }

  var totem = qs.get("totem") === "1" || CFG.TOTEM_MODE === true;

  function link(page, params) {
    var p = new URLSearchParams();
    QUESTIONS.forEach(function (q) { var v = params && params[q.key] !== undefined ? params[q.key] : answer(q.key); if (v) p.set(q.key, v); });
    if (params && params.etapa) p.set("etapa", params.etapa);
    if (totem) p.set("totem", "1");
    var s = p.toString();
    return page + (s ? "?" + s : "");
  }
  function startLink() { return totem ? "./?totem=1" : "./"; }

  function decide() {
    var r = window.__ROUTE__ || "inicio";
    var st = stageParam();
    if (r === "quiz") return { view: "pergunta", stage: st || (firstMissing() || 1) };
    if (r === "resultado") return { view: "resultado" };
    // Abertura com etapa na URL: respeita o estado em vez de voltar ao início.
    if (st) return { view: "pergunta", stage: st };
    return { view: "inicio" };
  }

  /* ---------- navegação com fumaça ---------- */
  function go(url) {
    if (SMOKE && !reduce) SMOKE.go(url); else location.href = url;
  }
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.getAttribute("href").charAt(0) === "#") return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    e.preventDefault();
    go(u.toString());
  });

  /* ---------- telas ---------- */
  function setChrome(view, label, genieLine) {
    document.body.className = "view-" + view + (totem ? " is-totem" : "") + (holding ? " is-holding" : "");
    stepLabel.textContent = label || "";
    bubble.textContent = genieLine || "";
    bubble.hidden = !genieLine;
  }

  function words(text) {
    return text.split(" ").map(function (w, i) { return '<span class="w" style="--d:' + i + '">' + w + "</span>"; }).join(" ");
  }

  function renderStart() {
    setChrome("inicio", "", "");
    setGenie("inicio");
    document.title = "LeCard · Sua próxima parada";
    screen.innerHTML =
      '<h1 class="headline">' + words("Enquanto o ônibus não vem, descubra sua próxima parada.").replace(/ (<span class="w"[^>]*>parada\.<\/span>)$/, "&nbsp;$1") + "</h1>" +
      '<div class="start-actions">' +
        '<a class="btn btn-primary btn-xl btn-magic" href="' + link("quiz.html", { etapa: "1", humor: "", momento: "", desejo: "" }) + '"><span>Clique para iniciar o quiz</span>' + icon("arrowR") + "</a>" +
        '<p class="start-meta"><span>3 perguntas</span><span>sem cadastro</span></p>' +
      "</div>";
  }

  /* Linha do ônibus: cada parada respondida mostra a resposta; o ônibus anda até a parada atual. */
  function routeLine(current, label) {
    // current: 0..3 (3 = Sua parada). Valores preenchidos para as paradas anteriores.
    var stops = QUESTIONS.map(function (q, i) {
      var v = answer(q.key);
      return { name: q.stop, val: i < current && v ? q.short[v] : "" };
    });
    var dest = answer("desejo");
    stops.push({ name: "Sua parada", val: current === 3 && dest ? PLACE[dest].sign : "" });
    var from = current === 0 ? -0.35 : current - 1;
    var html = stops.map(function (s, i) {
      var state = i < current ? "done" : i === current ? "current" : "next";
      if (i === 3) state += " dest";
      var fresh = i === current - 1 || (i === 3 && current === 3) ? " fresh" : "";
      return '<li class="' + state + fresh + '" style="--i:' + i + '"' + (i === current ? ' aria-current="step"' : "") + ">" +
        '<span class="dot" aria-hidden="true"></span>' +
        '<span class="stop-text"><span class="stop-name">' + s.name + "</span>" +
        (s.val ? '<span class="stop-val"><span class="sr-only">: </span>' + s.val + "</span>" : "") + "</span></li>";
    }).join("");
    return '<div class="route-wrap" style="--from:' + from + ";--to:" + current + '" data-to="' + current + '">' +
      '<span class="route-track" aria-hidden="true"><span class="route-fill"></span></span>' +
      '<span class="route-bus" aria-hidden="true">' + icon("bus") + "</span>" +
      '<ol class="route" aria-label="' + label + '">' + html + "</ol></div>";
  }

  function renderQuestion(stage) {
    var q = QUESTIONS[stage - 1];
    var current = answer(q.key);
    setChrome("pergunta", "Pergunta " + stage + " de 3", "");
    setGenie(stage);
    document.title = "Pergunta " + stage + " de 3 · LeCard";
    var back = stage === 1 ? startLink() : link("quiz.html", { etapa: String(stage - 1) });
    screen.innerHTML =
      routeLine(stage - 1, "Pergunta " + stage + " de 3") +
      '<h1 class="q-title" id="qTitle">' + words(q.title) + "</h1>" +
      '<div class="choices" role="group" aria-labelledby="qTitle">' +
      q.choices.map(function (c, i) {
        var sel = current === c[0];
        return '<button type="button" class="choice' + (sel ? " is-selected" : "") + '" style="--k:' + i + '" data-value="' + c[0] + '" aria-pressed="' + sel + '">' +
          '<span class="choice-ico">' + icon(c[0]) + "</span>" +
          '<span class="choice-text"><strong>' + c[1] + "</strong></span>" +
          '<span class="choice-key" aria-hidden="true">' + (sel ? icon("check") : i + 1) + "</span>" +
          "</button>";
      }).join("") +
      "</div>" +
      '<nav class="q-nav" aria-label="Navegação do quiz">' +
        '<a class="btn btn-quiet" href="' + back + '" aria-label="' + (stage === 1 ? "Voltar à abertura" : "Voltar à pergunta anterior") + '">' + icon("arrowL") + "Voltar</a>" +
        (stage > 1 ? '<a class="btn btn-quiet" href="' + startLink() + '">' + icon("restart") + "Recomeçar</a>" : "") +
      "</nav>";

    Array.prototype.forEach.call(screen.querySelectorAll(".choice"), function (b) {
      b.addEventListener("click", function () { choose(stage, b.getAttribute("data-value")); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 3) choose(stage, q.choices[n - 1][0]);
    });
  }

  var picking = false;
  function choose(stage, value) {
    if (picking) return;
    picking = true;
    var q = QUESTIONS[stage - 1];
    var params = {}; params[q.key] = value;
    var next = stage < 3 ? link("quiz.html", Object.assign(params, { etapa: String(stage + 1) })) : link("resultado.html", params);
    Array.prototype.forEach.call(screen.querySelectorAll(".choice"), function (b) {
      var me = b.getAttribute("data-value") === value;
      b.classList.toggle("is-picked", me);
      b.classList.toggle("is-dismissed", !me);
      b.setAttribute("aria-pressed", String(me));
      if (me) b.querySelector(".choice-key").innerHTML = icon("check");
    });
    // a parada atual recebe a resposta e o ônibus segue viagem
    var cur = screen.querySelector(".route li.current .stop-text");
    if (cur && !cur.querySelector(".stop-val")) cur.insertAdjacentHTML("beforeend", '<span class="stop-val fresh-now"><span class="sr-only">: </span>' + q.short[value] + "</span>");
    var wrap = screen.querySelector(".route-wrap");
    if (wrap) { wrap.classList.add("is-leaving"); wrap.style.setProperty("--to", String(stage - 1 + 0.45)); }
    setTimeout(function () { go(next); }, reduce ? 0 : 420);
  }

  function mapUrl(desejo, humor, momento, forTotem) {
    var raw = CFG.MAP_URL || "";
    try {
      var u = new URL(raw, location.href);
      u.searchParams.set("categoria", desejo);
      u.searchParams.set("humor", humor);
      u.searchParams.set("momento", momento);
      if (forTotem) u.searchParams.set("totem", "1");
      return u.toString();
    } catch (e) { return null; }
  }

  function renderResultMissing() {
    var m = firstMissing();
    setChrome("pergunta", "Quase lá", "");
    setGenie(m);
    document.title = "Falta uma resposta · LeCard";
    screen.innerHTML =
      routeLine(m - 1, "Falta a pergunta " + m) +
      '<h1 class="q-title">Falta uma resposta.</h1>' +
      '<div class="start-actions"><a class="btn btn-primary btn-xl" href="' + link("quiz.html", { etapa: String(m) }) + '">Responder a pergunta ' + m + icon("arrowR") + "</a>" +
      '<a class="btn btn-quiet" href="' + startLink() + '">' + icon("restart") + "Começar de novo</a></div>";
  }

  function renderResult() {
    var humor = answer("humor"), momento = answer("momento"), desejo = answer("desejo");
    if (!humor || !momento || !desejo) { renderResultMissing(); return; }
    var place = PLACE[desejo];
    var qrUrl = mapUrl(desejo, humor, momento, false);
    var openUrl = mapUrl(desejo, humor, momento, totem);
    setChrome("resultado", "Sua próxima parada", "");
    setGenie(desejo);
    document.title = "Sua próxima parada: " + place.article + " · LeCard";

    screen.innerHTML =
      routeLine(3, "Respostas: " + QUESTIONS.map(function (q) { return q.stop + " " + q.short[answer(q.key)]; }).join(", ")) +
      '<h1 class="sign" aria-label="Sua próxima parada: ' + place.article + '.">' +
        '<span class="sign-label" aria-hidden="true">Sua próxima parada:</span>' +
        '<span class="sign-dest" id="signDest" aria-hidden="true">' + place.article + ".</span>" +
      "</h1>" +
      '<p class="tagline">O gênio sugere. Você escolhe.</p>' +
      '<div class="result-grid">' +
        '<section class="takeaway" aria-labelledby="takeTitle">' +
          '<svg class="pass-chip" viewBox="0 0 64 48" aria-hidden="true"><rect x="1" y="1" width="62" height="46" rx="9" fill="#F3CF63" stroke="#B88A00" stroke-width="2"/><path d="M1 16h18M1 32h18M45 16h18M45 32h18M19 1v46M45 1v46M19 24h26" stroke="#B88A00" stroke-width="2" fill="none"/></svg>' +
          '<div class="qr" id="qr" role="img" aria-label="QR code que abre o mapa de ' + place.mapLabel + ' perto do Ponto UFES"><span class="qr-scan" aria-hidden="true"></span></div>' +
          '<div class="takeaway-text">' +
            '<h2 id="takeTitle">Leve sua escolha com você.</h2>' +
            "<p>Aponte a câmera e abra o mapa.</p>" +
          "</div>" +
        "</section>" +
        '<div class="result-actions">' +
          (openUrl ? '<a class="btn btn-primary btn-xl" href="' + openUrl + '">' + icon("map") + "Abrir meu mapa</a>" : "") +
          '<a class="btn btn-ghost" href="' + startLink() + '">' + icon("restart") + "Começar de novo</a>" +
          '<a class="btn btn-quiet" href="' + link("quiz.html", { etapa: "3" }) + '" aria-label="Voltar à pergunta anterior">' + icon("arrowL") + "Voltar</a>" +
        "</div>" +
      "</div>" +
      '<p class="fine">Locais reais. Aceitação a confirmar.</p>';

    drawQR(qrUrl);
  }

  function drawQR(url) {
    var box = document.getElementById("qr");
    if (!box) return;
    if (!url) { box.insertAdjacentHTML("beforeend", '<p class="qr-fallback">QR indisponível: configure MAP_URL em config.js.</p>'); return; }
    function paint() {
      if (typeof window.qrcode !== "function") { box.insertAdjacentHTML("beforeend", '<p class="qr-fallback">Use o botão “Abrir meu mapa”.</p>'); return; }
      var qr = window.qrcode(0, "M");
      qr.addData(url);
      qr.make();
      var n = qr.getModuleCount(), q = 4, size = n + q * 2, d = "";
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += "M" + (c + q) + " " + (r + q) + "h1v1h-1z";
      box.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 ' + size + " " + size + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#121214"/></svg>');
      box.setAttribute("data-url", url);
    }
    if (typeof window.qrcode === "function") paint();
    else window.addEventListener("load", paint);
  }

  /* ---------- letreiro: as letras giram até formar o destino ---------- */
  function flap(el) {
    if (!el || reduce) return Promise.resolve();
    var text = el.textContent, pool = "abcdefghijklmnopqrstuvwxyzáéçõ";
    el.innerHTML = text.split("").map(function (ch) {
      return ch === " " ? '<span class="ch sp">&nbsp;</span>' : '<span class="ch">' + ch + "</span>";
    }).join("");
    var chars = Array.prototype.slice.call(el.querySelectorAll(".ch:not(.sp)"));
    chars.forEach(function (c) { c.style.width = c.getBoundingClientRect().width + "px"; c.dataset.f = c.textContent; c.classList.add("spin"); });
    return new Promise(function (resolve) {
      var t0 = performance.now();
      function tick(now) {
        var t = now - t0, left = 0;
        chars.forEach(function (c, i) {
          var settle = 260 + i * 55;
          if (t >= settle) { if (c.classList.contains("spin")) { c.textContent = c.dataset.f; c.classList.remove("spin"); c.classList.add("land"); } }
          else { left++; if ((t / 45 | 0) !== (c._k | 0)) { c._k = t / 45 | 0; c.textContent = pool.charAt((Math.random() * pool.length) | 0); } }
        });
        if (left) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- cartão 3D: inclina com o mouse; no toque/totem, balança sozinho ---------- */
  function setupCard() {
    var card = document.querySelector(".lecard-card");
    var mist = document.getElementById("cardMist");
    if (SMOKE && mist) SMOKE.ambient(mist, { x0: 0.38, x1: 0.98, alpha: 0.5, rate: 150, max: 24 });
    if (!card || reduce) return;
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var lastMove = -1e9, tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    if (fine) {
      window.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        lastMove = performance.now();
      }, { passive: true });
    }
    function frame(now) {
      if (now - lastMove > 2600) { // movimento próprio, lento
        tx = Math.sin(now / 2300) * 0.75;
        ty = Math.cos(now / 3100) * 0.45;
      }
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      card.style.setProperty("--ry", (cx * 9).toFixed(2) + "deg");
      card.style.setProperty("--rx", (-cy * 7).toFixed(2) + "deg");
      raf = requestAnimationFrame(frame);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; } else if (!raf) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }

  /* ---------- modo totem: volta ao início após inatividade ---------- */
  function setupTotem(view) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-keep-mode]"), function (a) { if (totem) a.setAttribute("href", startLink()); });
    if (!totem || view === "inicio") return;
    var idleAfter = Math.max(20, Number(CFG.IDLE_SECONDS) || 75) * 1000;
    var warnFor = 15;
    var overlay = document.getElementById("idle"), count = document.getElementById("idleCount"), stay = document.getElementById("idleStay");
    var timer, tick, left;
    function reset() {
      clearTimeout(timer); clearInterval(tick);
      if (!overlay.hidden) { overlay.hidden = true; }
      timer = setTimeout(warn, idleAfter);
    }
    function warn() {
      left = warnFor; count.textContent = left; overlay.hidden = false; stay.focus();
      tick = setInterval(function () {
        left -= 1; count.textContent = left;
        if (left <= 0) { clearInterval(tick); go(startLink()); }
      }, 1000);
    }
    ["pointerdown", "keydown", "touchstart", "wheel"].forEach(function (ev) { window.addEventListener(ev, function () { if (overlay.hidden) reset(); }, { passive: true }); });
    stay.addEventListener("click", reset);
    reset();
  }

  /* ---------- sequência de entrada ---------- */
  function playEntrance(view) {
    // ônibus anda até a parada atual
    var wrap = screen.querySelector(".route-wrap");
    if (wrap) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add("is-moving"); }); });
    }
    if (view === "resultado") {
      var qr = document.getElementById("qr");
      if (qr && !reduce) qr.classList.add("qr-wait");
      setTimeout(function () {
        flap(document.getElementById("signDest")).then(function () {
          if (qr) { qr.classList.remove("qr-wait"); qr.classList.add("qr-in"); }
        });
      }, reduce ? 0 : 450);
    }
  }

  /* ---------- início ---------- */
  var holding = root.classList.contains("smoke-enter") && !reduce;
  var d = decide();
  if (d.view === "pergunta") renderQuestion(d.stage);
  else if (d.view === "resultado") renderResult();
  else renderStart();
  setupTotem(d.view);
  setupCard();
  document.body.classList.remove("is-loading");

  function release() {
    holding = false;
    document.body.classList.remove("is-holding");
    playEntrance(d.view);
  }
  if (holding && SMOKE) SMOKE.reveal().then(release);
  else { root.classList.remove("smoke-enter"); release(); }

  if (d.view !== "inicio" && document.referrer && document.referrer.indexOf(location.host) !== -1) {
    // navegação interna: leva o foco ao conteúdo novo para leitores de tela
    var h = screen.querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  // Ponto de teste/integração: estado atual do quiz (somente leitura).
  window.LECARD_QUIZ = { view: d.view, stage: d.stage || null, answers: { humor: answer("humor"), momento: answer("momento"), desejo: answer("desejo") }, base: window.__SITE_BASE__ };
})();
