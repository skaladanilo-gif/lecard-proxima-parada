/* LeCard · Mapa da próxima parada
   Parâmetros de URL: categoria (cafe|restaurante|lanche|padaria|todos), humor, momento, local (ex.: node/123), confirmados=1, totem=1.
   Nenhum dado pessoal é lido ou gravado. */
(function () {
  "use strict";

  var CFG = window.LECARD_MAP_CONFIG || {};
  var qs = new URLSearchParams(location.search);
  var $ = function (id) { return document.getElementById(id); };

  var CATS = {
    todos: { label: "Todos", one: "Local" },
    cafe: { label: "Cafés", one: "Café" },
    restaurante: { label: "Refeições", one: "Refeição" },
    lanche: { label: "Lanches", one: "Lanche" },
    padaria: { label: "Padarias", one: "Padaria" }
  };
  var ORDER = ["todos", "cafe", "restaurante", "lanche", "padaria"];
  var ALIAS = { cafes: "cafe", "café": "cafe", "cafés": "cafe", cafeteria: "cafe", restaurantes: "restaurante", refeicao: "restaurante", refeicoes: "restaurante", "refeição": "restaurante", "refeições": "restaurante", lanches: "lanche", lanchonete: "lanche", padarias: "padaria", all: "todos", tudo: "todos" };
  var QUIZ_PLACE = { cafe: "uma cafeteria", restaurante: "um restaurante", lanche: "uma lanchonete" };
  var MOOD = { cansado: "Estou cansado", disposto: "Estou disposto", fome: "Estou com fome" };
  var RHYTHM = { pausa: "Uma pausa para mim", pratico: "Algo prático", novo: "Sair do automático" };
  var BENEFIT = { refeicao: "Refeição", alimentacao: "Alimentação" };

  var ICON = {
    cafe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.2 1 1.3 1 2.5M12 3.5c0 1.2 1 1.3 1 2.5"/>',
    restaurante: '<circle cx="12" cy="12" r="6.5"/><path d="M3 3.5v5a2 2 0 0 0 2 2v10M5 3.5v4M21 3.5c-1.6 0-2.5 1.8-2.5 4.5v3h2.5v9.5"/>',
    lanche: '<path d="M4 10a8 5 0 0 1 16 0H4Z"/><path d="M3.5 13.5h17M4.5 17h15a2 2 0 0 1-2 2.5h-11a2 2 0 0 1-2-2.5Z"/>',
    padaria: '<path d="M5 14c-1.5-1.5-1.5-5 2-6.5 1.5-2.5 8.5-2.5 10 0 3.5 1.5 3.5 5 2 6.5l-1 5H6l-1-5Z"/><path d="M9.5 9.5l1 4M14.5 9.5l-1 4"/>',
    todos: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    bus: '<path d="M6 15V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v8"/><path d="M5 15h14v2.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5V15Z"/><path d="M8 19v1.5M16 19v1.5M6 10h12"/>'
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || "ico") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON[name] + "</svg>";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- estado ---------- */
  var catParam = (qs.get("categoria") || "todos").toLowerCase();
  catParam = ALIAS[catParam] || catParam;
  var state = {
    cat: CATS[catParam] ? catParam : "todos",
    onlyConfirmed: qs.get("confirmados") === "1",
    selected: qs.get("local") || null,
    humor: MOOD[qs.get("humor")] ? qs.get("humor") : null,
    momento: RHYTHM[qs.get("momento")] ? qs.get("momento") : null,
    fromQuiz: !!(qs.get("categoria") && QUIZ_PLACE[catParam])
  };
  var totem = qs.get("totem") === "1";
  var data = null, center = null, radius = 4000, places = [];
  var map = null, markers = {}, centerMarker = null, circle = null;

  /* ---------- utilidades ---------- */
  function haversine(a, b) {
    var R = 6371008.8, toR = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDist(m) {
    if (m < 1000) return (Math.round(m / 10) * 10) + " m";
    return (m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + " km";
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var p = String(iso).slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
  }
  var DAYS = { Mo: "seg", Tu: "ter", We: "qua", Th: "qui", Fr: "sex", Sa: "sáb", Su: "dom", PH: "feriados" };
  function fmtHours(oh) {
    if (!oh) return null;
    var s = oh.trim();
    if (s === "24/7") return "Todos os dias, 24 horas";
    if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(s)) s = "Todos os dias " + s;
    s = s.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, function (d) { return DAYS[d]; });
    s = s.replace(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g, "$1–$2").replace(/([a-zá]{3})-([a-zá]{3})/g, "$1 a $2");
    s = s.replace(/\s*;\s*/g, " · ").replace(/,\s*/g, ", ").replace(/\boff\b/g, "fechado");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  var CUISINE = { burger: "hambúrguer", pizza: "pizza", italian: "italiana", italian_pizza: "pizza italiana", pasta: "massas", grill: "grelhados", seafood: "frutos do mar", frutos_do_mar: "frutos do mar", coffee_shop: "cafeteria", breakfast: "café da manhã", lebanese: "libanesa", arab: "árabe", turkish: "turca", mediterranean: "mediterrânea", regional: "regional", gaucho: "churrasco", diner: "lanchonete", doces_e_salgados: "doces e salgados" };
  function fmtCuisine(c) {
    if (!c) return null;
    var seen = {}, out = [];
    c.split(";").forEach(function (k) { var v = CUISINE[k.trim().toLowerCase()]; if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out.length ? out.join(", ") : null;
  }
  function routeLinks(p) {
    var dest = p.lat + "," + p.lon;
    return {
      google: "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest) + "&travelmode=walking",
      osm: "https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=" + encodeURIComponent(center.lat + "," + center.lon + ";" + dest) + "#map=16/" + p.lat + "/" + p.lon
    };
  }
  function syncUrl() {
    var p = new URLSearchParams(location.search);
    if (state.cat && state.cat !== "todos") p.set("categoria", state.cat); else p.delete("categoria");
    if (state.onlyConfirmed) p.set("confirmados", "1"); else p.delete("confirmados");
    if (state.selected) p.set("local", state.selected); else p.delete("local");
    var s = p.toString();
    try { history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash); } catch (e) { /* sem histórico: segue sem atualizar a URL */ }
  }
  function quizUrl() {
    try {
      var u = new URL(CFG.QUIZ_URL || "", location.href);
      if (totem) u.searchParams.set("totem", "1");
      return u.toString();
    } catch (e) { return null; }
  }

  /* ---------- dados ---------- */
  function load() {
    setStatus("Carregando locais…", "loading");
    $("lista").hidden = false;
    var url = CFG.PLACES_URL || "places.json";
    return fetch(url, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (json) {
        if (!json || !Array.isArray(json.places) || !json.center) throw new Error("formato inesperado");
        data = json; center = json.center; radius = Number(json.radiusM) || 4000;
        places = json.places.map(function (p) {
          var copy = Object.assign({}, p);
          copy.lecard = Object.assign({ confirmed: false, benefits: [], source: null, verifiedAt: null }, p.lecard || {});
          copy.distanceM = haversine(center, p);
          return copy;
        }).filter(function (p) { return isFinite(p.distanceM) && p.distanceM <= radius && CATS[p.category]; })
          .sort(function (a, b) { return a.distanceM - b.distanceM; });
        return mergeNetwork();
      })
      .then(function () {
        buildFilters(); buildSuggest();
        try { initMap(); } catch (e) { console.error("[mapa] falha ao iniciar o mapa:", e); map = null; showMapAlert("O mapa não pôde ser exibido. A lista de locais continua disponível."); }
        render(true);
        if (state.selected) {
          var p = byId(state.selected);
          if (p) select(p.id, { fromUrl: true }); else { state.selected = null; syncUrl(); }
        }
      })
      .catch(function (err) {
        console.error("[mapa] falha ao carregar locais:", err);
        $("lista").hidden = true;
        setStatus("", "error");
        var box = $("empty");
        box.hidden = false;
        box.innerHTML = '<p class="empty-title">Não foi possível carregar os locais.</p>' +
          "<p>Confira a conexão com a internet e tente de novo. Se o problema continuar, o arquivo de locais pode não ter sido publicado junto com o mapa.</p>" +
          '<button type="button" class="btn btn-dark btn-sm" id="retry">Tentar de novo</button>';
        $("retry").addEventListener("click", function () { box.hidden = true; load(); });
      });
  }

  /* Integração futura: base oficial da LeCard.
     Formato esperado em LECARD_NETWORK_URL:
     { "source": "LeCard — rede credenciada", "verifiedAt": "AAAA-MM-DD",
       "establishments": [ { "osm": "node/123", "accepted": true, "benefits": ["refeicao"], "verifiedAt": "AAAA-MM-DD" } ] } */
  function mergeNetwork() {
    if (!CFG.LECARD_NETWORK_URL) return Promise.resolve();
    return fetch(CFG.LECARD_NETWORK_URL, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (net) {
        var idx = {};
        (net.establishments || []).forEach(function (e) { if (e && e.osm) idx[e.osm] = e; });
        places.forEach(function (p) {
          var e = idx[p.id];
          if (e && e.accepted === true && Array.isArray(e.benefits) && e.benefits.length) {
            p.lecard = { confirmed: true, benefits: e.benefits.slice(), source: net.source || "LeCard", verifiedAt: e.verifiedAt || net.verifiedAt || null };
          }
        });
        if (data) data.lecardNetwork = { connected: true, source: net.source || "LeCard", verifiedAt: net.verifiedAt || null };
      })
      .catch(function (err) {
        console.warn("[mapa] base de aceitação indisponível; seguindo sem confirmação:", err);
      });
  }

  function byId(id) { for (var i = 0; i < places.length; i++) if (places[i].id === id) return places[i]; return null; }
  function visible() {
    return places.filter(function (p) {
      return (state.cat === "todos" || p.category === state.cat) && (!state.onlyConfirmed || p.lecard.confirmed);
    });
  }
  function countFor(cat) {
    return places.filter(function (p) { return (cat === "todos" || p.category === cat) && (!state.onlyConfirmed || p.lecard.confirmed); }).length;
  }

  /* ---------- interface ---------- */
  function setStatus(text, kind) {
    var el = $("status");
    el.textContent = text;
    el.className = "status" + (kind ? " is-" + kind : "");
    el.hidden = !text;
  }

  function buildFilters() {
    var box = $("filters");
    box.innerHTML = ORDER.map(function (c) {
      return '<button type="button" class="filter" data-cat="' + c + '" aria-pressed="' + (state.cat === c) + '">' +
        (c === "todos" ? "" : '<span class="filter-ico">' + svg(c) + "</span>") +
        '<span class="filter-label">' + CATS[c].label + '</span><span class="filter-count" data-count="' + c + '"></span></button>';
    }).join("");
    box.addEventListener("click", function (e) {
      var b = e.target.closest(".filter");
      if (!b) return;
      setCategory(b.getAttribute("data-cat"));
    });
    var tg = $("onlyConfirmed");
    tg.checked = state.onlyConfirmed;
    tg.addEventListener("change", function () {
      state.onlyConfirmed = tg.checked;
      closeDetail(true);
      render(true); syncUrl();
    });
  }

  function setCategory(cat) {
    state.cat = CATS[cat] ? cat : "todos";
    closeDetail(true);
    render(true); syncUrl();
  }

  function buildSuggest() {
    var box = $("suggest");
    if (!state.fromQuiz) { box.hidden = true; return; }
    var said = [state.humor && MOOD[state.humor], state.momento && RHYTHM[state.momento]].filter(Boolean);
    var q = quizUrl();
    box.innerHTML =
      '<p class="suggest-kicker">O gênio sugeriu</p>' +
      '<p class="suggest-main">' + QUIZ_PLACE[catParam].charAt(0).toUpperCase() + QUIZ_PLACE[catParam].slice(1) + '. <span>Você escolhe qual.</span></p>' +
      (said.length ? '<p class="suggest-said">' + said.map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("") + "</p>" : "") +
      (catParam === "cafe" ? '<button type="button" class="link-btn" data-goto="padaria">Padarias também servem café: ver padarias</button>' : "") +
      (q ? '<a class="link-btn" href="' + esc(q) + '">Refazer o quiz</a>' : "");
    box.hidden = false;
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-goto]");
      if (b) setCategory(b.getAttribute("data-goto"));
    });
  }

  function statusChip(p) {
    if (p.lecard.confirmed) {
      var b = p.lecard.benefits.map(function (x) { return BENEFIT[x] || x; }).join(" e ");
      return '<span class="acc acc-ok">Aceita LeCard ' + esc(b) + "</span>";
    }
    return '<span class="acc">Aceitação a confirmar</span>';
  }

  function render(fit) {
    ORDER.forEach(function (c) {
      var el = document.querySelector('[data-count="' + c + '"]');
      if (el) el.textContent = countFor(c);
      var b = document.querySelector('.filter[data-cat="' + c + '"]');
      if (b) b.setAttribute("aria-pressed", String(state.cat === c));
    });
    var list = visible();
    var ul = $("lista"), empty = $("empty");

    if (!list.length) {
      ul.innerHTML = ""; ul.hidden = true;
      empty.hidden = false;
      if (state.onlyConfirmed) {
        empty.innerHTML =
          '<p class="empty-title">Nenhum local com aceitação confirmada por enquanto.</p>' +
          "<p>Os locais deste mapa são reais, mas a rede credenciada oficial da LeCard ainda não foi integrada. Por isso, nenhum deles aparece como confirmado.</p>" +
          '<div class="empty-actions"><button type="button" class="btn btn-dark btn-sm" id="showAll">Mostrar locais reais</button>' +
          '<a class="btn btn-quiet btn-sm" href="https://lecard.com.br/usuarios" target="_blank" rel="noopener">Canais oficiais da LeCard' + svg("ext") + "</a></div>";
        $("showAll").addEventListener("click", function () { $("onlyConfirmed").checked = false; state.onlyConfirmed = false; render(true); syncUrl(); });
      } else {
        empty.innerHTML = '<p class="empty-title">Nenhum local nesta categoria dentro de 4 km.</p><p>Experimente outra categoria ou veja todos os locais.</p>' +
          '<div class="empty-actions"><button type="button" class="btn btn-dark btn-sm" id="showAll">Ver todos</button></div>';
        $("showAll").addEventListener("click", function () { setCategory("todos"); });
      }
      setStatus("0 locais", "");
    } else {
      empty.hidden = true;
      ul.hidden = !!state.selected;
      setStatus(list.length + (list.length === 1 ? " local" : " locais") + " · até 4 km em linha reta", "");
      ul.innerHTML = list.map(function (p) {
        return '<li><button type="button" class="item' + (state.selected === p.id ? " is-active" : "") + '" data-id="' + esc(p.id) + '">' +
          '<span class="item-pin pin-' + p.category + '">' + svg(p.category) + "</span>" +
          '<span class="item-body"><span class="item-name">' + esc(p.name) + "</span>" +
          '<span class="item-meta"><span>' + CATS[p.category].one + "</span><span>" + fmtDist(p.distanceM) + "</span></span>" +
          (p.address ? '<span class="item-addr">' + esc(p.address) + "</span>" : "") +
          "</span>" + statusChip(p) + "</button></li>";
      }).join("");
    }
    if (map) drawMarkers(list, fit);
  }

  function detailHtml(p) {
    var r = routeLinks(p), hours = fmtHours(p.openingHours), cuisine = fmtCuisine(p.cuisine);
    var rows = [];
    rows.push(["Distância", fmtDist(p.distanceM) + " do Ponto UFES, em linha reta"]);
    rows.push(["Endereço", p.address ? esc(p.address) : '<span class="muted">Não informado na fonte</span>']);
    if (hours) rows.push(["Horário", esc(hours) + '<span class="row-note">Informado no OpenStreetMap; pode estar desatualizado.</span>']);
    if (cuisine) rows.push(["Cozinha", esc(cuisine)]);
    if (p.phone) rows.push(["Telefone", '<a href="tel:' + esc(p.phone.replace(/[^\d+]/g, "")) + '">' + esc(p.phone) + "</a>"]);
    if (p.website) rows.push(["Site", '<a href="' + esc(p.website) + '" target="_blank" rel="noopener">' + esc(p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) + "</a>"]);
    var acc = p.lecard.confirmed
      ? '<div class="acc-box is-ok"><strong>Aceita LeCard ' + esc(p.lecard.benefits.map(function (x) { return BENEFIT[x] || x; }).join(" e ")) + ".</strong> Fonte: " + esc(p.lecard.source || "LeCard") + (p.lecard.verifiedAt ? ", verificado em " + fmtDate(p.lecard.verifiedAt) : "") + ".</div>"
      : '<div class="acc-box"><strong>Aceitação a confirmar.</strong> Este local é real, mas ainda não sabemos se aceita o cartão LeCard nem qual benefício. Confirme no estabelecimento antes de pagar.</div>';
    return '<button type="button" class="btn btn-quiet btn-sm back" id="backToList">' + svg("arrowL") + "Voltar à lista</button>" +
      '<p class="detail-cat"><span class="item-pin pin-' + p.category + '">' + svg(p.category) + "</span>" + CATS[p.category].one + "</p>" +
      '<h2 class="detail-name" id="detailName">' + esc(p.name) + "</h2>" +
      acc +
      '<dl class="facts">' + rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("") + "</dl>" +
      '<div class="detail-actions">' +
        '<a class="btn btn-primary" href="' + r.google + '" target="_blank" rel="noopener">' + svg("route") + "Abrir rota</a>" +
        '<a class="btn btn-ghost btn-sm" href="' + r.osm + '" target="_blank" rel="noopener">Rota a pé desde o ponto (OpenStreetMap)</a>' +
      "</div>" +
      '<p class="detail-source">Fonte: <a href="' + esc(p.osm.url) + '" target="_blank" rel="noopener">OpenStreetMap ' + esc(p.id) + "</a> · conferido em " + fmtDate((data.dataset || {}).verifiedAt) + ". “Abrir rota” usa o Google Maps a partir da sua localização.</p>";
  }

  function select(id, opts) {
    opts = opts || {};
    var p = byId(id);
    if (!p) return;
    state.selected = id;
    var d = $("detail");
    d.innerHTML = detailHtml(p);
    d.hidden = false;
    $("lista").hidden = true;
    $("empty").hidden = true;
    $("status").hidden = true;
    $("backToList").addEventListener("click", function () { closeDetail(false); });
    Object.keys(markers).forEach(function (k) { markers[k].getElement && markers[k].getElement() && markers[k].getElement().classList.toggle("is-selected", k === id); });
    if (map && markers[id]) {
      var z = Math.max(map.getZoom(), 16);
      if (opts.fromMap) map.panTo([p.lat, p.lon], { animate: !reduceMotion() });
      else map.setView([p.lat, p.lon], z, { animate: !reduceMotion() });
      markers[id].setZIndexOffset(1000);
    }
    syncUrl();
    if (!opts.fromUrl) {
      d.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 899px)").matches && opts.fromMap) d.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      if (window.matchMedia("(min-width: 900px)").matches) d.scrollIntoView({ block: "nearest" });
    }
  }

  function closeDetail(silent) {
    var prev = state.selected;
    state.selected = null;
    $("detail").hidden = true;
    $("detail").innerHTML = "";
    Object.keys(markers).forEach(function (k) { var el = markers[k].getElement && markers[k].getElement(); if (el) el.classList.remove("is-selected"); markers[k].setZIndexOffset(0); });
    if (!silent) {
      render(false); syncUrl();
      var btn = prev && document.querySelector('.item[data-id="' + prev.replace(/"/g, "") + '"]');
      if (btn) btn.focus();
    }
  }

  function reduceMotion() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

  /* ---------- mapa ---------- */
  function initMap() {
    if (map) return;
    if (typeof window.L === "undefined") {
      showMapAlert("O mapa não pôde ser carregado. A lista de locais continua disponível.");
      $("map").classList.add("is-off");
      return;
    }
    map = L.map("map", { zoomControl: true, scrollWheelZoom: true, attributionControl: true }).setView([center.lat, center.lon], 13);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    var tiles = L.tileLayer(CFG.TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: CFG.TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores do OpenStreetMap</a>'
    }).addTo(map);
    map.attributionControl.addAttribution('Locais: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap (ODbL)</a>');
    var ok = 0, bad = 0;
    tiles.on("tileload", function () { ok++; if (ok > 0) hideMapAlert(); });
    tiles.on("tileerror", function () { bad++; if (bad >= 4 && ok === 0) showMapAlert("O mapa de fundo não carregou. Os pinos e a lista continuam funcionando."); });

    circle = L.circle([center.lat, center.lon], { radius: radius, color: "#121214", weight: 2, opacity: .7, dashArray: "6 8", fillColor: "#FFBC00", fillOpacity: .07, interactive: false }).addTo(map);
    centerMarker = L.marker([center.lat, center.lon], {
      icon: L.divIcon({ className: "stop-marker", html: '<span class="stop-pin">' + svg("bus") + '</span><span class="stop-label">Ponto UFES</span>', iconSize: [44, 44], iconAnchor: [22, 22] }),
      keyboard: true, title: "Ponto UFES (ponto de partida)", zIndexOffset: 2000, alt: "Ponto UFES"
    }).addTo(map);
    centerMarker.bindPopup('<strong>Ponto UFES</strong><br>Av. Fernando Ferrari · Goiabeiras<br><a href="' + center.osm.url + '" target="_blank" rel="noopener">Ver na fonte</a>');

    map.fitBounds(circle.getBounds(), { padding: [12, 12] });
    $("fitRadius").addEventListener("click", function () { map.fitBounds(circle.getBounds(), { padding: [12, 12], animate: !reduceMotion() }); });
    $("centerStop").addEventListener("click", function () { map.setView([center.lat, center.lon], 16, { animate: !reduceMotion() }); });
    window.addEventListener("resize", function () { map.invalidateSize(); });
  }

  function drawMarkers(list, fit) {
    Object.keys(markers).forEach(function (k) { map.removeLayer(markers[k]); });
    markers = {};
    list.forEach(function (p) {
      var m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: "pin-marker", html: '<span class="pin pin-' + p.category + (state.selected === p.id ? " is-selected" : "") + '">' + svg(p.category) + "</span>", iconSize: [36, 44], iconAnchor: [18, 42] }),
        title: p.name + " · " + CATS[p.category].one + " · " + fmtDist(p.distanceM),
        alt: p.name, keyboard: true, riseOnHover: true
      });
      m.on("click", function () { select(p.id, { fromMap: true }); });
      m.addTo(map);
      markers[p.id] = m;
    });
    if (fit && !state.selected) {
      if (state.cat === "todos" || !list.length) map.fitBounds(circle.getBounds(), { padding: [12, 12], animate: false });
      else {
        var b = L.latLngBounds(list.map(function (p) { return [p.lat, p.lon]; }));
        b.extend([center.lat, center.lon]);
        map.fitBounds(b, { padding: [48, 48], maxZoom: 16, animate: false });
      }
    }
  }

  function showMapAlert(t) { var a = $("mapAlert"); a.textContent = t; a.hidden = false; }
  function hideMapAlert() { $("mapAlert").hidden = true; }

  /* ---------- lista: clique ---------- */
  $("lista").addEventListener("click", function (e) {
    var b = e.target.closest(".item");
    if (b) select(b.getAttribute("data-id"), {});
  });

  /* ---------- link para o quiz e modo totem ---------- */
  (function () {
    var q = quizUrl(), a = $("quizLink");
    if (q) { a.href = q; a.textContent = state.fromQuiz ? (totem ? "Voltar ao quiz" : "Refazer o quiz") : "Fazer o quiz"; }
    else a.hidden = true;
    if (!totem) return;
    document.body.classList.add("is-totem");
    var idleAfter = Math.max(20, Number(CFG.IDLE_SECONDS) || 90) * 1000, timer, tick, left;
    var overlay = $("idle"), count = $("idleCount"), stay = $("idleStay");
    function reset() { clearTimeout(timer); clearInterval(tick); overlay.hidden = true; timer = setTimeout(warn, idleAfter); }
    function warn() {
      left = 15; count.textContent = left; overlay.hidden = false; stay.focus();
      tick = setInterval(function () { left--; count.textContent = left; if (left <= 0) { clearInterval(tick); if (q) { if (SMOKE) SMOKE.go(q); else location.href = q; } } }, 1000);
    }
    ["pointerdown", "keydown", "touchstart", "wheel"].forEach(function (ev) { window.addEventListener(ev, function () { if (overlay.hidden) reset(); }, { passive: true }); });
    stay.addEventListener("click", reset);
    reset();
  })();

  /* ---------- transição de fumaça ---------- */
  var SMOKE = window.LecardSmoke;
  if (SMOKE && document.documentElement.classList.contains("smoke-enter")) SMOKE.reveal();
  else document.documentElement.classList.remove("smoke-enter");
  $("quizLink").addEventListener("click", function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !SMOKE) return;
    e.preventDefault(); SMOKE.go(this.href);
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("#suggest a.link-btn");
    if (!a || !SMOKE || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); SMOKE.go(a.href);
  });

  load();

  // Ponto de teste/integração (somente leitura)
  window.LECARD_MAP = { state: state, get places() { return places; }, get visible() { return visible(); } };
})();
