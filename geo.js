/* Viajes · geografía: de unas coordenadas a «país y ciudad», todo con los datos de la propia app (sin servicios externos).
   La ubicación NO se guarda ni se envía: solo se usa para decidir qué país y ciudad marcar. */
(function (root) {
  "use strict";
  var R = Math.PI / 180;
  /* misma proyección que usa el mapa (Natural Earth I), con la escala y el desplazamiento guardados en paises.json */
  function proyectar(lat, lon, pr) {
    var l = lon * R, f = lat * R, f2 = f * f, f4 = f2 * f2;
    var X = l * (0.8707 - 0.131979 * f2 + f4 * (-0.013791 + f4 * (0.003971 * f2 - 0.001529 * f4)));
    var Y = f * (1.007226 + f2 * (0.015085 + f4 * (-0.044475 + 0.028874 * f2 - 0.005916 * f4)));
    return [pr.tx + pr.s * X, pr.ty - pr.s * Y];
  }
  function km(la1, lo1, la2, lo2) {
    var dLa = (la2 - la1) * R, dLo = (lo2 - lo1) * R, a = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(la1 * R) * Math.cos(la2 * R) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  /* las n ciudades más cercanas: [{c: fila de ciudades.json, d: km}] */
  function cercanas(lat, lon, ciu, n) {
    var best = [];
    for (var i = 0; i < ciu.length; i++) {
      var c = ciu[i], d = km(lat, lon, c[6], c[7]);
      if (best.length < n || d < best[best.length - 1].d) { best.push({ c: c, d: d }); best.sort(function (a, b) { return a.d - b.d; }); if (best.length > n) best.pop(); }
    }
    return best;
  }
  function anillos(d) {   // «M1,2L3,4…Z» → lista de anillos [[x,y,x,y…], …]
    var out = [], cur = null, nums = d.match(/[MLZ]|-?\d+(?:\.\d+)?/g) || [], i = 0;
    while (i < nums.length) {
      var t = nums[i];
      if (t === "M") { cur = []; out.push(cur); i++; }
      else if (t === "L") i++;
      else if (t === "Z") i++;
      else { if (cur) { cur.push(parseFloat(nums[i]), parseFloat(nums[i + 1])); } i += 2; }
    }
    return out;
  }
  function dentro(x, y, rings) {   // regla par-impar: sirve para países con huecos y con islas
    var ins = false;
    rings.forEach(function (r) {
      for (var i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
        var xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
      }
    });
    return ins;
  }
  /* de las ciudades cercanas elige la del país: la más cercana, o una mayor que esté a pocos km (así «San Diego» gana a «National City») */
  function ciudadDe(near, a) {
    var m = near.filter(function (n) { return n.c[1] === a; }); if (!m.length) return null;
    var min = m[0].d; if (min > 45 && !(m[0].c[4] > 1e6 && min < 70)) return null;
    var cand = m.filter(function (n) { return n.d <= min + 15 && n.d <= 70; }).sort(function (x, y) { return y.c[4] - x.c[4]; });
    return cand[0] || null;
  }
  var api = { ciudadDe: ciudadDe, proyectar: proyectar, km: km, cercanas: cercanas, anillos: anillos, dentro: dentro };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.VGeo = api;
})(typeof window !== "undefined" ? window : this);
