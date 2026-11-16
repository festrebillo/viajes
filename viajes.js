/* Viajes · mapa del mundo, países visitados, ciudades y lista de deseos. Sin fotos. Los datos van a tu hoja «Fergard · Viajes». */
(function () {
  "use strict";
  var CFG = window.FG_CFG || {}, VERSION = "0.1.0", TOTAL = 195, DB_KEY = "viajes_db";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS = (function () { try { localStorage.setItem("_t", "1"); localStorage.removeItem("_t"); return localStorage; } catch (e) { var m = {}; return { getItem: function (k) { return m[k] || null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } }; } })();
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  /* ---------- datos locales y nube ---------- */
  function vacia() { return { v: 1, paises: {}, ciudades: {}, ajustes: {}, pend: {}, sync: { ult: 0 } }; }
  function cargar() { var d; try { d = JSON.parse(LS.getItem(DB_KEY)); } catch (e) { d = null; } if (!d || typeof d !== "object") d = vacia(); var b = vacia(); Object.keys(b).forEach(function (k) { if (d[k] === undefined) d[k] = b[k]; }); return d; }
  var db = cargar(), P = [], PA = {}, CIU = null, CIU_P = null;
  var S = { modo: "mundo", pais: null, tab: "vis", q: "", qc: "", snap: "med", cargando: false, sync: "" };
  function save() { try { LS.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
  function touch(t, id, o) { if (o) o.upd = Date.now(); db.pend[t + ":" + id] = Date.now(); save(); schedSync(); }
  function quitar(t, id) { var m = t === "pais" ? db.paises : db.ciudades; delete m[id]; db.pend[t + ":" + id] = Date.now(); save(); schedSync(); }
  function cfg() { return window.FergardAcceso ? FergardAcceso.config() : { token: null, url: null }; }
  function post(url, body) { return fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function docsPend() {
    return Object.keys(db.pend).map(function (k) {
      var i = k.indexOf(":"), t = k.slice(0, i), id = k.slice(i + 1), d = t === "pais" ? db.paises[id] : t === "ciudad" ? db.ciudades[id] : t === "ajustes" ? db.ajustes : null;
      return { t: t, id: id, upd: (d && d.upd) || db.pend[k], del: !d, d: d || {} };
    });
  }
  function aplicar(docs) {
    var n = 0;
    (docs || []).forEach(function (r) {
      var m = r.t === "pais" ? db.paises : r.t === "ciudad" ? db.ciudades : null; if (!m) return;
      var l = m[r.id]; if (l && (l.upd || 0) >= r.upd) return; if (db.pend[r.t + ":" + r.id] && !l && !r.del) { /* borrado local pendiente */ return; }
      if (r.del) delete m[r.id]; else { r.d.upd = r.upd; m[r.id] = r.d; } n++;
    });
    return n;
  }
  var syncing = false, syncT = null;
  function schedSync() { clearTimeout(syncT); syncT = setTimeout(function () { sync(false); }, 1200); }
  function sync(manual) {
    var c = cfg(); if (!c.token || !c.url) return Promise.resolve();
    if (syncing) return Promise.resolve(); syncing = true;
    var env = docsPend(), claves = Object.keys(db.pend), t0 = Date.now();
    return post(c.url, { op: "viajes_sync", app: "viajes", token: c.token, since: db.sync.ult || 0, docs: env }).then(function (r) {
      if (!r || !r.ok) { S.sync = r && r.error === "operacion_desconocida" ? "El script no tiene la versión con Viajes (actualízalo)" : "Pendiente (" + ((r && r.error) || "error") + ")"; if (manual) toast(S.sync); return; }
      claves.forEach(function (k) { if (db.pend[k] <= t0) delete db.pend[k]; });
      var n = aplicar(r.docs); db.sync.ult = r.ahora || t0; db.sync.ok = Date.now(); if (r.url) db.sync.url = r.url; save();
      S.sync = "Al día"; if (manual) toast("Sincronizado"); if (n) { pintarMapa(); render(); }
    }).catch(function () { S.sync = "Sin conexión · se subirá después"; if (manual) toast("Sin conexión"); }).then(function () { syncing = false; pintarEstado(); });
  }
  window.addEventListener("online", function () { sync(false); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) sync(false); });

  function toast(t) { var e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("on"); }, 2600); }
  function flag(i) { return i && i.length === 2 ? String.fromCodePoint(0x1F1E6 + i.charCodeAt(0) - 65, 0x1F1E6 + i.charCodeAt(1) - 65) : "🌐"; }
  function ico(n) { var p = { glob: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>' }; return '<svg viewBox="0 0 24 24">' + (p[n] || "") + "</svg>"; }

  /* ---------- cálculos ---------- */
  function estadoP(a) { var d = db.paises[a]; return d ? d.e : ""; }
  function estadoC(id) { var d = db.ciudades[id]; return d ? d.e : ""; }
  function cls(e) { return e === "visitado" ? "v" : e === "deseo" ? "d" : ""; }
  function stats() {
    var vis = 0, terr = 0, cont = {}, ciu = 0, des = 0;
    Object.keys(db.paises).forEach(function (a) { var d = db.paises[a], p = PA[a]; if (!p) return; if (d.e === "visitado") { if (p.t) vis++; else terr++; if (p.k !== "Otros") cont[p.k] = 1; } else if (d.e === "deseo") des++; });
    Object.keys(db.ciudades).forEach(function (k) { var d = db.ciudades[k]; if (d.e === "visitado") ciu++; else if (d.e === "deseo") des++; });
    var pc = vis / TOTAL * 100;
    return { vis: vis, terr: terr, cont: Object.keys(cont).length, ciu: ciu, des: des, pc: pc, pcTxt: pc && pc < 10 ? (Math.round(pc * 10) / 10).toString().replace(".", ",") : String(Math.round(pc)) };
  }

  /* ---------- mapa ---------- */
  var VB = { x: 0, y: 0, w: 1000, h: 520 }, anim = null, svgEl = null, selA = null;
  function dims() { var m = $("#mapa"); return { cw: m.clientWidth || 400, ch: m.clientHeight || 800 }; }
  function aplicarVB() {
    svgEl.setAttribute("viewBox", VB.x.toFixed(2) + " " + VB.y.toFixed(2) + " " + VB.w.toFixed(2) + " " + VB.h.toFixed(2));
    var k0 = VB.w / dims().cw; svgEl.querySelectorAll("circle.m").forEach(function (c) { c.setAttribute("r", 3.2 * k0); }); svgEl.classList.toggle("zoom", VB.w < 260);
    var g = $("#cs", svgEl); if (g) { var d = dims(), k = VB.w / d.cw; $$("circle", g).forEach(function (c) { c.setAttribute("r", (c.getAttribute("data-big") === "1" ? 7 : 5) * k); }); $$("text", g).forEach(function (t) { t.setAttribute("font-size", 11 * k); t.setAttribute("dy", -9 * k); t.setAttribute("stroke-width", 3.5 * k); }); }
  }
  function vbMundo() { var d = dims(), w = 1000, h = w * d.ch / d.cw; if (h < 520) { h = 520; w = h * d.cw / d.ch; } return { x: 500 - w / 2, y: 260 - (h > 520 ? .30 : .5) * h, w: w, h: h }; }
  function vbPais(p) {
    var d = dims(), bw = Math.max(p.b[2] - p.b[0], 14), bh = Math.max(p.b[3] - p.b[1], 10), s = Math.min(d.cw * .86 / bw, d.ch * .40 / bh), w = d.cw / s, h = d.ch / s;
    var cx = (p.b[0] + p.b[2]) / 2, cy = (p.b[1] + p.b[3]) / 2; return { x: cx - w / 2, y: cy - .26 * h, w: w, h: h };
  }
  function irA(t, ms) {
    cancelAnimationFrame(anim); var a = { x: VB.x, y: VB.y, w: VB.w, h: VB.h }, t0 = performance.now();
    (function paso(ts) { var k = Math.min(1, (ts - t0) / ms), e = 1 - Math.pow(1 - k, 3); VB.x = a.x + (t.x - a.x) * e; VB.y = a.y + (t.y - a.y) * e; VB.w = a.w + (t.w - a.w) * e; VB.h = a.h + (t.h - a.h) * e; aplicarVB(); if (k < 1) anim = requestAnimationFrame(paso); })(t0);
  }
  function limitar() {
    var d = dims(), minW = 18, mx = vbMundo().w * 1.15; if (VB.w < minW) { VB.w = minW; } if (VB.w > mx) VB.w = mx; VB.h = VB.w * d.ch / d.cw;
    var cx = Math.max(-40, Math.min(1040, VB.x + VB.w / 2)), cy = Math.max(-40, Math.min(560, VB.y + VB.h / 2)); VB.x = cx - VB.w / 2; VB.y = cy - VB.h / 2;
  }
  function zoomEn(px, py, f) {   // f > 1 acerca; el punto (px,py) en pantalla se queda quieto
    var d = dims(), ux = VB.x + px / d.cw * VB.w, uy = VB.y + py / d.ch * VB.h, nw = VB.w / f; VB.w = nw; VB.h = nw * d.ch / d.cw; limitar();
    var nw2 = VB.w; VB.x = ux - px / d.cw * nw2; VB.y = uy - py / d.ch * VB.h; limitar(); aplicarVB();
  }
  function construirMapa() {
    var h = '<svg id="svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">';
    P.forEach(function (p) { h += '<path class="c" data-a="' + p.a + '" d="' + p.d + '"/>'; });
    P.forEach(function (p) { if (p.b[2] - p.b[0] < 7 && p.b[3] - p.b[1] < 7) h += '<circle class="m" data-a="' + p.a + '" cx="' + p.c[0] + '" cy="' + p.c[1] + '" r="2.6"/>'; });
    h += "</svg>"; $("#mapa").innerHTML = h; svgEl = $("#svg");
    VB = vbMundo(); aplicarVB(); pintarMapa(); gestos();
  }
  function pintarMapa() {
    if (!svgEl) return;
    $$("[data-a]", svgEl).forEach(function (el) { var a = el.getAttribute("data-a"), e = cls(estadoP(a)); el.setAttribute("class", (el.tagName === "circle" ? "m " : "c ") + e + (a === selA ? " sel" : "")); });
    var g = $("#cs", svgEl); if (g) g.remove(); if (S.modo === "pais" && CIU_P) dibujarCiudades();
  }
  function dibujarCiudades() {
    var a = S.pais, lista = CIU_P[a] || [], h = '<g id="cs">';
    lista.slice(0, 80).forEach(function (c, i) {
      var id = a + "|" + c[0], e = cls(estadoC(id));
      h += '<circle class="ci ' + e + '" data-ci="' + esc(id) + '" data-big="' + (i < 5 ? 1 : 0) + '" cx="' + c[2] + '" cy="' + c[3] + '" r="3"/>';
      if (e || i < 6) h += '<text class="ct" text-anchor="middle" x="' + c[2] + '" y="' + c[3] + '" font-size="5">' + esc(c[0]) + "</text>";
    });
    Object.keys(db.ciudades).forEach(function (k) { var d = db.ciudades[k]; if (d.c === a && d.cx && !lista.some(function (c) { return a + "|" + c[0] === k; })) h += '<circle class="ci ' + cls(d.e) + '" data-ci="' + esc(k) + '" cx="' + d.cx + '" cy="' + d.cy + '" r="3"/>'; });
    h += "</g>"; svgEl.insertAdjacentHTML("beforeend", h); aplicarVB();
  }
  function gestos() {
    var m = $("#mapa"), ptr = {}, n = function () { return Object.keys(ptr).length; };
    m.addEventListener("pointerdown", function (e) { try { m.setPointerCapture(e.pointerId); } catch (x) {} ptr[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: Date.now() }; cancelAnimationFrame(anim); });
    m.addEventListener("pointermove", function (e) {
      var p = ptr[e.pointerId]; if (!p) return; var d = dims(), ids = Object.keys(ptr);
      if (ids.length === 1) { VB.x -= (e.clientX - p.x) * VB.w / d.cw; VB.y -= (e.clientY - p.y) * VB.h / d.ch; limitar(); aplicarVB(); }
      else if (ids.length === 2) { var o = ptr[ids[0] === String(e.pointerId) ? ids[1] : ids[0]], a0 = Math.hypot(p.x - o.x, p.y - o.y), a1 = Math.hypot(e.clientX - o.x, e.clientY - o.y); if (a0 > 5 && a1 > 5) zoomEn((e.clientX + o.x) / 2, (e.clientY + o.y) / 2, a1 / a0); }
      p.x = e.clientX; p.y = e.clientY;
    });
    function fin(e) {
      var p = ptr[e.pointerId]; if (!p) return; var solo = n() === 1; delete ptr[e.pointerId];
      if (solo && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && Date.now() - p.t < 600) {
        var el = document.elementFromPoint(e.clientX, e.clientY), ci = el && el.closest && el.closest("[data-ci]"), pa = el && el.closest && el.closest("[data-a]");
        if (ci) tocarCiudad(ci.getAttribute("data-ci")); else if (pa) abrirPais(pa.getAttribute("data-a"));
      }
    }
    m.addEventListener("pointerup", fin); m.addEventListener("pointercancel", function (e) { delete ptr[e.pointerId]; });
    m.addEventListener("wheel", function (e) { e.preventDefault(); zoomEn(e.clientX, e.clientY, e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
    window.addEventListener("resize", function () { if (S.modo === "mundo") { VB = vbMundo(); aplicarVB(); } posHoja(true); });
  }

  /* ---------- hoja deslizable ---------- */
  function alturas() { var H = $("#hoja").offsetHeight; return { max: 0, med: H - Math.round(innerHeight * .52), peek: H - 168 }; }
  function posHoja(inmediato) { var h = $("#hoja"), a = alturas(); if (inmediato) h.classList.add("drag"); h.style.transform = "translateY(" + a[S.snap] + "px)"; if (inmediato) requestAnimationFrame(function () { h.classList.remove("drag"); }); }
  function asa() {
    var h = $("#hoja"), a = null, y0 = 0, t0 = 0, mov = 0, base = 0;
    h.addEventListener("pointerdown", function (e) { if (!e.target.closest(".asa, .stats, .cab") || e.target.closest("button,input,textarea")) return; a = alturas(); base = a[S.snap]; y0 = e.clientY; t0 = Date.now(); mov = 0; h.classList.add("drag"); try { h.setPointerCapture(e.pointerId); } catch (x) {} });
    h.addEventListener("pointermove", function (e) { if (a === null) return; mov = e.clientY - y0; h.style.transform = "translateY(" + Math.max(0, Math.min(a.peek, base + mov)) + "px)"; });
    function soltar(e) {
      if (a === null) return; h.classList.remove("drag"); var cur = Math.max(0, Math.min(a.peek, base + mov)), v = mov / Math.max(1, Date.now() - t0);
      if (Math.abs(mov) < 6) S.snap = S.snap === "peek" ? "med" : S.snap === "med" ? "max" : "med";
      else { var tgt = cur + v * 120, best = "med", d = 1e9; ["max", "med", "peek"].forEach(function (k) { if (Math.abs(a[k] - tgt) < d) { d = Math.abs(a[k] - tgt); best = k; } }); S.snap = best; }
      a = null; posHoja();
    }
    h.addEventListener("pointerup", soltar); h.addEventListener("pointercancel", soltar);
  }

  /* ---------- pantallas de la hoja ---------- */
  function pinta(arr, tipo) {
    return arr.map(function (x) {
      return '<div class="fila" data-a="' + (x.k === 1 ? "ciudad" : "abrir") + '" data-id="' + esc(x.id) + '"><span class="fl">' + flag(x.i) + '</span><div class="grow"><div class="n">' + esc(x.n) + (x.e ? '<span class="est ' + cls(x.e) + '">' + (x.e === "visitado" ? "Visitado" : "Quiero ir") + "</span>" : "") + '</div><div class="s">' + esc(x.s) + "</div></div></div>";
    }).join("");
  }
  function lista(estado) {
    var o = [];
    Object.keys(db.paises).forEach(function (a) { var d = db.paises[a], p = PA[a]; if (p && d.e === estado) o.push({ id: a, i: p.i, n: p.n, e: "", s: p.k + (d.y ? " · " + d.y : "") + (p.t ? "" : " · territorio"), y: d.y || 0, k: 0 }); });
    Object.keys(db.ciudades).forEach(function (k) { var d = db.ciudades[k]; if (d.e === estado) { var p = PA[d.c]; o.push({ id: k, i: p ? p.i : "", n: d.n, e: "", s: (d.pn || (p && p.n) || "") + (d.y ? " · " + d.y : ""), y: d.y || 0, k: 1 }); } });
    o.sort(function (a, b) { return (b.y - a.y) || (a.k - b.k) || a.n.localeCompare(b.n, "es"); }); return o;
  }
  function vistaMundo() {
    var st = stats(), C = 2 * Math.PI * 40, off = C * (1 - Math.min(1, st.pc / 100)), h = "";
    h += '<div class="asa"><i></i></div><div class="cuerpo" id="cuerpo">';
    h += '<div class="stats"><div class="anillo"><svg width="92" height="92" viewBox="0 0 92 92"><circle cx="46" cy="46" r="40" fill="none" stroke="#E3EEEF" stroke-width="10"/><circle cx="46" cy="46" r="40" fill="none" stroke="#0E7C86" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b>' + st.pcTxt + ' %</b></div>' +
      '<div class="kv"><div>Países<b>' + st.vis + '<span style="font-size:13px;color:var(--mut)"> / ' + TOTAL + '</span></b></div><div>Continentes<b>' + st.cont + ' / 6</b></div><div>Ciudades<b>' + st.ciu + '</b></div><div>Por visitar<b>' + st.des + "</b></div></div></div>";
    h += '<div class="buscar">' + ico("search") + '<input id="bq" placeholder="Buscar país o ciudad" value="' + esc(S.q) + '" autocomplete="off" autocapitalize="off"></div>';
    if (S.q.trim().length >= 2) h += resultados();
    else {
      h += '<div class="seg"><button class="' + (S.tab === "vis" ? "on" : "") + '" data-a="tab" data-v="vis">Visitados</button><button class="' + (S.tab === "des" ? "on" : "") + '" data-a="tab" data-v="des">Por visitar</button><button class="' + (S.tab === "anios" ? "on" : "") + '" data-a="tab" data-v="anios">Años</button></div>';
      if (S.tab === "anios") h += vistaAnios();
      else {
        var L = lista(S.tab === "vis" ? "visitado" : "deseo");
        h += L.length ? pinta(L) : '<div class="vacio"><b>' + (S.tab === "vis" ? "Aún no has marcado países" : "Tu lista está vacía") + "</b>" + (S.tab === "vis" ? "Toca un país en el mapa o búscalo arriba para marcarlo como visitado." : "Marca países o ciudades con «Quiero ir» para armar tu lista de deseos.") + "</div>";
      }
    }
    return h + "</div>";
  }
  function resultados() {
    var q = norm(S.q), ps = P.filter(function (p) { return norm(p.n).indexOf(q) >= 0; }).slice(0, 8), h = '<div class="sec">Países</div>';
    h += ps.length ? ps.map(function (p) { return '<div class="fila" data-a="abrir" data-id="' + p.a + '"><span class="fl">' + flag(p.i) + '</span><div class="grow"><div class="n">' + esc(p.n) + (estadoP(p.a) ? '<span class="est ' + cls(estadoP(p.a)) + '">' + (estadoP(p.a) === "visitado" ? "Visitado" : "Quiero ir") + "</span>" : "") + '</div><div class="s">' + esc(p.k) + "</div></div></div>"; }).join("") : '<div class="vacio" style="padding:10px">Sin países con ese nombre</div>';
    if (!CIU) { cargarCiudades().then(function () { if (S.q.trim().length >= 2) render(true); }); h += '<div class="sec">Ciudades</div><div class="vacio" style="padding:10px">Cargando ciudades…</div>'; return h; }
    var cs = CIU.filter(function (c) { return norm(c[0]).indexOf(q) >= 0; }).slice(0, 12);
    h += '<div class="sec">Ciudades</div>' + (cs.length ? cs.map(function (c) { var p = PA[c[1]], id = c[1] + "|" + c[0]; return '<div class="fila" data-a="ciudad" data-id="' + esc(id) + '"><span class="fl">' + flag(p ? p.i : "") + '</span><div class="grow"><div class="n">' + esc(c[0]) + (estadoC(id) ? '<span class="est ' + cls(estadoC(id)) + '">' + (estadoC(id) === "visitado" ? "Visitado" : "Quiero ir") + "</span>" : "") + '</div><div class="s">' + esc(p ? p.n : "") + (c[5] ? " · " + esc(c[5]) : "") + "</div></div></div>"; }).join("") : '<div class="vacio" style="padding:10px">Sin ciudades con ese nombre</div>');
    return h;
  }
  function vistaAnios() {
    var por = {}; Object.keys(db.paises).forEach(function (a) { var d = db.paises[a]; if (d.e === "visitado" && d.y) por[d.y] = (por[d.y] || 0) + 1; });
    var ys = Object.keys(por).map(Number).sort(function (a, b) { return a - b; });
    if (!ys.length) return '<div class="vacio"><b>Sin años todavía</b>Al marcar un país como visitado puedes poner el año del viaje y aquí verás cuántos países visitaste cada año.</div>';
    var y0 = Math.max(ys[0], ys[ys.length - 1] - 9), mx = Math.max.apply(null, ys.map(function (y) { return por[y] || 0; })), h = '<div class="sec">Países visitados por año</div><div class="barras">';
    for (var y = y0; y <= ys[ys.length - 1]; y++) h += '<div style="height:' + Math.max(4, Math.round((por[y] || 0) / mx * 100)) + 'px;' + (por[y] ? "" : "background:#DDE9EA") + '">' + (por[y] ? "<em>" + por[y] + "</em>" : "") + "<small>" + String(y).slice(2) + "</small></div>";
    return h + "</div>";
  }
  function vistaPais() {
    var p = PA[S.pais], d = db.paises[p.a] || {}, e = d.e || "", h = '<div class="asa"><i></i></div><div class="cuerpo" id="cuerpo"><div class="cab"><button class="atras" data-a="mundo" aria-label="Volver al mundo">‹</button><span class="fl">' + flag(p.i) + '</span><div><h2>' + esc(p.n) + '</h2><div class="k">' + esc(p.k) + (p.t ? "" : " · territorio") + "</div></div></div>";
    h += '<div class="seg"><button class="' + (e === "visitado" ? "on" : "") + '" data-a="est" data-v="visitado">Visitado</button><button class="' + (e === "deseo" ? "on" : "") + '" data-a="est" data-v="deseo">Quiero ir</button><button class="' + (!e ? "on" : "") + '" data-a="est" data-v="">Sin marcar</button></div>';
    if (e) h += '<label class="lbl">' + (e === "visitado" ? "Año del viaje (opcional)" : "Año que planeas (opcional)") + '</label><input data-f="anio" inputmode="numeric" maxlength="4" placeholder="2025" value="' + (d.y || "") + '"><label class="lbl">Nota (opcional)</label><textarea data-f="nota" rows="2" placeholder="Qué hiciste, con quién, qué recomiendas…">' + esc(d.nota || "") + "</textarea>";
    h += '<div class="sec">Ciudades de ' + esc(p.n) + "</div>";
    h += '<div class="buscar">' + ico("search") + '<input id="cq" placeholder="Buscar ciudad" value="' + esc(S.qc) + '" autocomplete="off" autocapitalize="off"></div>';
    if (!CIU_P) h += '<div class="vacio" style="padding:14px">Cargando ciudades…</div>';
    else {
      var q = norm(S.qc), L = (CIU_P[p.a] || []).filter(function (c) { return !q || norm(c[0]).indexOf(q) >= 0; }), ya = {};
      var marcadas = Object.keys(db.ciudades).filter(function (k) { return db.ciudades[k].c === p.a; }).map(function (k) { return { id: k, n: db.ciudades[k].n, e: db.ciudades[k].e, r: "" }; });
      var filas = [];
      marcadas.forEach(function (m) { if (!q || norm(m.n).indexOf(q) >= 0) { ya[m.id] = 1; filas.push(m); } });
      L.slice(0, q ? 40 : 30).forEach(function (c) { var id = p.a + "|" + c[0]; if (!ya[id]) filas.push({ id: id, n: c[0], e: estadoC(id), r: c[5] }); });
      h += filas.length ? filas.map(function (c) { return '<div class="fila" data-a="ciudad" data-id="' + esc(c.id) + '"><div class="grow"><div class="n">' + esc(c.n) + '</div><div class="s">' + esc(c.r || "") + '</div></div><div class="acc"><button class="ib ' + (c.e === "visitado" ? "v" : "") + '" data-a="cv" data-id="' + esc(c.id) + '" aria-label="Visitada">✓</button><button class="ib ' + (c.e === "deseo" ? "d" : "") + '" data-a="cd" data-id="' + esc(c.id) + '" aria-label="Quiero ir">★</button></div></div>'; }).join("") : '<div class="vacio" style="padding:14px">No hay ciudades con ese nombre.</div>';
      h += '<label class="lbl">¿No aparece? Añade otra ciudad</label><div style="display:flex;gap:8px"><input id="nc" placeholder="Nombre de la ciudad" maxlength="60"><button class="btn" data-a="addc" style="flex:none;padding:0 18px">' + ico("plus") + "</button></div>";
    }
    return h + "</div>";
  }
  var vistaAct = "";
  function render(conservar) {
    var h = $("#hoja"), y = conservar && $("#cuerpo") ? $("#cuerpo").scrollTop : 0, foco = document.activeElement && document.activeElement.id, pos = foco ? document.activeElement.selectionStart : 0;
    if (S.cargando) { h.innerHTML = '<div class="asa"><i></i></div><div class="cuerpo"><div class="vacio"><b>Cargando tus viajes…</b>Se están bajando de tu hoja de cálculo.</div></div>'; return; }
    h.innerHTML = S.modo === "pais" ? vistaPais() : vistaMundo(); var c = $("#cuerpo"); if (c) c.scrollTop = y;
    if (foco && $("#" + foco)) { var el = $("#" + foco); el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) {} }
    pintarEstado(); posHoja();
  }
  function pintarEstado() {
    var n = Object.keys(db.pend).length, e = $("#nube"); if (!e) return;
    if (!cfg().token) { e.textContent = ""; return; }
    e.className = "nube" + (n ? " p" : ""); e.textContent = n ? "⏳ " + n + " por subir" : db.sync.ok ? "☁ Al día" : "";
  }

  /* ---------- acciones ---------- */
  function cargarCiudades() {
    if (CIU) return Promise.resolve();
    return fetch("data/ciudades.json").then(function (r) { return r.json(); }).then(function (d) { CIU = d; CIU_P = {}; d.forEach(function (c) { (CIU_P[c[1]] = CIU_P[c[1]] || []).push(c); }); }).catch(function () { CIU = []; CIU_P = {}; toast("Las ciudades necesitan internet la primera vez"); });
  }
  var DET = {};
  function cargarDetalle(a) {   // el contorno fino del país se pide solo al abrirlo (el mapa del mundo usa uno ligero)
    if (DET[a]) return Promise.resolve();
    return fetch("data/p/" + a + ".json").then(function (r) { return r.json(); }).then(function (d) { DET[a] = 1; var el = svgEl && svgEl.querySelector('path.c[data-a="' + a + '"]'); if (el && d.d) el.setAttribute("d", d.d); }).catch(function () {});
  }
  function abrirPais(a) {
    var p = PA[a]; if (!p) return; cargarDetalle(a); S.modo = "pais"; S.pais = a; S.qc = ""; S.snap = "med"; selA = a; irA(vbPais(p), 600); pintarMapa(); render();
    cargarCiudades().then(function () { if (S.modo === "pais" && S.pais === a) { render(true); pintarMapa(); } });
  }
  function volverMundo() { S.modo = "mundo"; S.pais = null; selA = null; irA(vbMundo(), 600); pintarMapa(); render(); }
  function setPais(a, e) {
    var p = PA[a], d = db.paises[a];
    if (!e) { if (d) quitar("pais", a); }
    else { if (!d) d = db.paises[a] = { a: a, n: p.n, e: e }; d.e = e; d.n = p.n; touch("pais", a, d); }
    pintarMapa(); render(true);
  }
  function setCiudad(id, e, extra) {
    var par = id.split("|"), a = par[0], nombre = par.slice(1).join("|"), d = db.ciudades[id];
    if (!e) { if (d) quitar("ciudad", id); }
    else {
      if (!d) { d = db.ciudades[id] = { id: id, c: a, pn: PA[a] ? PA[a].n : "", n: nombre, e: e }; var c = CIU && (CIU_P[a] || []).filter(function (x) { return x[0] === nombre; })[0]; if (c) { d.cx = c[2]; d.cy = c[3]; } }
      d.e = e; if (extra) { if (extra.y !== undefined) d.y = extra.y; if (extra.nota !== undefined) d.nota = extra.nota; } touch("ciudad", id, d);
      if (e === "visitado" && estadoP(a) !== "visitado" && PA[a]) setPais(a, "visitado");   // marcar una ciudad visitada marca también su país
    }
    pintarMapa(); render(true);
  }
  function tocarCiudad(id) {
    var par = id.split("|"), d = db.ciudades[id] || { e: "", y: "", nota: "" }, nombre = par.slice(1).join("|");
    var m = $("#modal"); m.hidden = false;
    m.innerHTML = '<div class="caja"><h3>' + esc(nombre) + '</h3><div class="seg"><button class="' + (d.e === "visitado" ? "on" : "") + '" data-a="mest" data-v="visitado">Visitada</button><button class="' + (d.e === "deseo" ? "on" : "") + '" data-a="mest" data-v="deseo">Quiero ir</button><button class="' + (!d.e ? "on" : "") + '" data-a="mest" data-v="">Sin marcar</button></div><label class="lbl">Año (opcional)</label><input id="my" inputmode="numeric" maxlength="4" placeholder="2025" value="' + (d.y || "") + '"><label class="lbl">Nota (opcional)</label><textarea id="mn" rows="2" placeholder="Qué hiciste, qué recomiendas…">' + esc(d.nota || "") + '</textarea><button class="btn full" data-a="mok" data-id="' + esc(id) + '">Guardar</button><button class="btn sec full" data-a="mcerrar">Cancelar</button></div>';
    m.dataset.est = d.e || ""; m.onclick = function (e) { if (e.target === m) m.hidden = true; };
  }
  function ajustes() {
    var m = $("#modal"); m.hidden = false; var url = db.sync.url;
    m.innerHTML = '<div class="caja"><h3>Ajustes</h3><label class="lbl">Acceso</label><div id="acc"></div><label class="lbl">Sincronización</label><div style="font-size:14px;color:var(--mut);line-height:1.5">' + esc(!cfg().token ? "Sin vincular" : S.sync || (db.sync.ok ? "Al día" : "Lista para sincronizar")) + " · pendientes: " + Object.keys(db.pend).length + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sec" data-a="sync">Sincronizar</button>' + (url ? '<a class="btn sec" target="_blank" rel="noopener" href="' + esc(url) + '" style="text-decoration:none">Abrir mi hoja de Viajes</a>' : "") + '</div><label class="lbl">Espacio en este dispositivo</label><div style="font-size:14px;color:var(--mut);line-height:1.5">No se guardan fotos. Solo una copia pequeña de tus lugares y la cáscara de la app. <b id="uso">calculando…</b></div><button class="btn sec" data-a="liberar" style="margin-top:8px">Liberar espacio</button><div style="font-size:12.5px;color:var(--mut);margin-top:18px;text-align:center">Viajes v' + VERSION + " · mapa y ciudades de Natural Earth (dominio público)</div><button class=\"btn sec full\" data-a=\"mcerrar\">Cerrar</button></div>";
    m.onclick = function (e) { if (e.target === m) m.hidden = true; }; if (window.FergardAcceso) FergardAcceso.panel($("#acc"));
    var f = function (b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1) + " MB"; };
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) { var u = $("#uso"); if (u) u.textContent = "≈ " + f(e.usage || 0); });
  }
  var A = {
    abrir: function (el) { abrirPais(el.dataset.id); },
    mundo: function () { volverMundo(); },
    tab: function (el) { S.tab = el.dataset.v; render(true); },
    est: function (el) { setPais(S.pais, el.dataset.v); },
    ciudad: function (el) { var id = el.dataset.id, par = id.split("|"); if (S.modo !== "pais" || S.pais !== par[0]) { /* desde la búsqueda */ } tocarCiudad(id); },
    cv: function (el) { var id = el.dataset.id; setCiudad(id, estadoC(id) === "visitado" ? "" : "visitado"); },
    cd: function (el) { var id = el.dataset.id; setCiudad(id, estadoC(id) === "deseo" ? "" : "deseo"); },
    addc: function () { var n = ($("#nc").value || "").trim(); if (!n) { toast("Escribe el nombre de la ciudad"); return; } var id = S.pais + "|" + n; if (db.ciudades[id]) { toast("Esa ciudad ya está en tu lista"); return; } setCiudad(id, "visitado"); toast("Ciudad añadida como visitada"); },
    mest: function (el) { $("#modal").dataset.est = el.dataset.v; $$("#modal .seg button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === el.dataset.v); }); },
    mok: function (el) { var m = $("#modal"), y = ($("#my").value || "").replace(/\D/g, "").slice(0, 4); setCiudad(el.dataset.id, m.dataset.est, { y: y ? +y : "", nota: ($("#mn").value || "").trim() }); m.hidden = true; if (S.modo === "mundo") render(true); },
    mcerrar: function () { $("#modal").hidden = true; },
    sync: function () { sync(true).then(function () { ajustes(); }); },
    liberar: function () {
      if (Object.keys(db.pend).length) { toast("Hay datos sin subir: espera a que se sincronicen"); return; }
      if (!cfg().token || !db.sync.ok) { toast("Todavía no se ha sincronizado: no se puede liberar"); return; }
      LS.removeItem(DB_KEY); db = cargar(); $("#modal").hidden = true; S.cargando = true; render(); sync(true).then(function () { S.cargando = false; pintarMapa(); render(); });
    }
  };
  document.addEventListener("click", function (e) { var el = e.target.closest("[data-a]"); if (!el || el.closest("#mapa")) return; var f = A[el.dataset.a]; if (!f) return; e.preventDefault(); e.stopPropagation(); f(el); });
  document.addEventListener("input", function (e) {
    var t = e.target; if (t.id === "bq") { S.q = t.value; clearTimeout(S.tq); S.tq = setTimeout(function () { render(true); }, 140); if (S.q.length >= 1 && !CIU) cargarCiudades(); }
    if (t.id === "cq") { S.qc = t.value; clearTimeout(S.tq); S.tq = setTimeout(function () { render(true); }, 140); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target, f = t.dataset && t.dataset.f; if (!f || !S.pais) return; var d = db.paises[S.pais]; if (!d) return;
    if (f === "anio") { var y = t.value.replace(/\D/g, "").slice(0, 4); d.y = y ? +y : ""; touch("pais", S.pais, d); render(true); } else if (f === "nota") { d.nota = t.value.trim(); touch("pais", S.pais, d); }
  });
  $("#bt-aj").onclick = function () { ajustes(); };
  $("#bt-mundo").onclick = function () { if (S.modo === "pais") volverMundo(); else irA(vbMundo(), 500); };

  /* ---------- arranque ---------- */
  function boot() {
    fetch("data/paises.json").then(function (r) { return r.json(); }).then(function (d) {
      P = d.paises; P.forEach(function (p) { PA[p.a] = p; });
      var vacio = !db.sync.ult && !Object.keys(db.paises).length && !Object.keys(db.ciudades).length; if (vacio && cfg().token) S.cargando = true;
      construirMapa(); asa(); render();
      window.VJ_DEBUG = { db: function () { return db; }, P: P, S: S, VB: function () { return VB; }, abrirPais: abrirPais, stats: stats };
      sync(false).then(function () { if (S.cargando) { S.cargando = false; pintarMapa(); render(); } });
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
    }).catch(function () { $("#hoja").innerHTML = '<div class="cuerpo"><div class="vacio"><b>No se pudo cargar el mapa</b>Abre la app con internet una vez.</div></div>'; });
  }
  FergardAcceso.iniciar({
    app: "viajes", nombre: "Viajes", clientId: CFG.CLIENT_ID, onListo: boot,
    tema: { bg: "#CFE8EC", fg: "#0C3640", mut: "#4A7380", acento: "#0A5F68", btnBg: "#0E7C86", btnFg: "#FFFFFF", font: "ui-rounded,'SF Pro Rounded',-apple-system,system-ui,sans-serif" },
    marca: '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#0E7C86" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>'
  });
})();
