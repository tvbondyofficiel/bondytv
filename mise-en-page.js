/* Mise en page réglée depuis le tableau de bord (content/site.json > mise_en_page). */
(function () {
  var POS = { gauche: 1, centre: 1, droite: 1 };
  var css = document.createElement("style");
  css.textContent =
    "body.mp-mag-centre .pdf-coin{left:50%!important;right:auto!important;transform:translateX(-50%)}" +
    "body.mp-mag-droite .pdf-coin{left:auto!important;right:14px!important}" +
    "body.mp-qst-gauche .bt-fab{right:auto!important;left:max(16px,env(safe-area-inset-left,0px))}" +
    "body.mp-qst-centre .bt-fab{right:auto!important;left:50%!important;transform:translateX(-50%)}" +
    "body.mp-stack .pdf-coin{bottom:76px!important}" +
    "body.mp-al-centre h1,body.mp-al-centre h2,body.mp-al-centre .intro,body.mp-al-centre .lede,body.mp-al-centre .fbtn,body.mp-al-centre .found-all,body.mp-al-centre .share-site{text-align:center}" +
    "body.mp-lg-etroit .wrap{max-width:860px}body.mp-lg-large .wrap{max-width:1360px}" +
    "body.mp-es-aere .wrap>section,body.mp-es-aere .wrap>h2{margin-top:56px!important}body.mp-es-compact .wrap>section,body.mp-es-compact .wrap>h2{margin-top:18px!important}";
  document.head.appendChild(css);
  function page() { var p = location.pathname.replace(/^\//, "").replace(/\/$/, ""); p = p || "index.html"; return p.indexOf(".") < 0 ? p + ".html" : p; }

  var DEV = { pc: "(min-width:1101px)", tablette: "(min-width:621px) and (max-width:1100px)", mobile: "(max-width:620px)" };
  function tag() {
    var root = document.querySelector(".wrap"); if (!root) return; var seen = {};
    function t(el, P) {
      if (el.dataset.bloc) return;
      if (/^(SCRIPT|STYLE|NAV|LINK)$/.test(el.tagName) || el.classList.contains("sr-only") || el.hidden) return;
      var par = P || el.parentElement.id || el.parentElement.dataset.bloc || "wrap";
      var k = par + ">" + (el.id || (el.tagName.toLowerCase() + (el.classList[0] ? "." + el.classList[0] : "")));
      seen[k] = (seen[k] || 0) + 1; if (seen[k] > 1) k += "~" + seen[k];
      el.dataset.bloc = k;
    }
    [].forEach.call(root.children, function (e) { t(e); });
    var head = root.querySelector("#top>.head"); if (head) [].forEach.call(head.children, function (e) { t(e, "top"); });
  }
  function applyV(V) {
    var st = document.getElementById("mp-visuel");
    if (!st) { st = document.createElement("style"); st.id = "mp-visuel"; document.head.appendChild(st); }
    var out = "";
    Object.keys(DEV).forEach(function (d) {
      var B = (V && V[d]) || {}, r = "";
      Object.keys(B).forEach(function (k) {
        var o = B[k], p = "";
        if (o.align) p += "text-align:" + o.align + "!important;justify-content:" + ({ left: "flex-start", center: "center", right: "flex-end" }[o.align] || "flex-start") + "!important;";
        ["mt", "mb", "ml", "mr"].forEach(function (m, i) { if (typeof o[m] === "number") p += "margin-" + ["top", "bottom", "left", "right"][i] + ":" + o[m] + "px!important;"; });
        if (o.dx || o.dy) p += "transform:translate(" + (o.dx || 0) + "px," + (o.dy || 0) + "px)!important;";
        if (p) r += '[data-bloc="' + k.replace(/"/g, "") + '"]{' + p + "}";
      });
      if (r) out += "@media " + DEV[d] + "{" + r + "}";
    });
    st.textContent = out;
  }
  window.mpApply = applyV; window.mpTag = tag;
  window.mpCenter = function (k, dx0) {
    var el = document.querySelector('[data-bloc="' + k + '"]'), w = document.querySelector(".wrap"); if (!el || !w) return dx0 || 0;
    var a = el.getBoundingClientRect(), b = w.getBoundingClientRect();
    return Math.round((dx0 || 0) + (b.left + b.width / 2) - (a.left + a.width / 2));
  };
  function editor(API) {
    var st = document.createElement("style");
    st.textContent = "[data-bloc]{cursor:grab}[data-bloc]:hover{outline:2px dashed #b8975a!important;outline-offset:-2px}[data-bloc].mp-sel{outline:3px solid #d3141f!important;outline-offset:-3px}.mp-guide{position:fixed;top:0;bottom:0;width:0;border-left:1px dashed #d3141f;z-index:99999;pointer-events:none}.pubpop{display:none!important}.bt-fab,.pdf-coin{pointer-events:none!important;opacity:.35}*{animation:none!important}";
    document.head.appendChild(st);
    var sel = null, drag = null, guide = document.createElement("div"); guide.className = "mp-guide"; guide.style.display = "none"; document.body.appendChild(guide);
    function cur(k) { return Object.assign({}, API.get(k)); }
    function label(el) { var t = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 44); return t || el.dataset.bloc; }
    function select(el) { if (sel) sel.classList.remove("mp-sel"); sel = el; if (el) el.classList.add("mp-sel"); API.selected(el ? el.dataset.bloc : null, el ? label(el) : ""); }
    window.mpSelectParent = function () { if (sel && sel.parentElement) { var p = sel.parentElement.closest("[data-bloc]"); if (p) select(p); } };
    document.addEventListener("click", function (e) { if (e.target.closest("[data-bloc]") || e.target.closest("a,button,summary")) e.preventDefault(); }, true);
    document.addEventListener("pointerdown", function (e) {
      var el = e.target.closest("[data-bloc]"); if (!el) return;
      e.preventDefault(); select(el); var o = cur(el.dataset.bloc); drag = { el: el, x: e.clientX, y: e.clientY, dx: o.dx || 0, dy: o.dy || 0 };
    }, true);
    document.addEventListener("pointermove", function (e) {
      if (!drag) return; var k = drag.el.dataset.bloc, o = cur(k);
      var dx = drag.dx + e.clientX - drag.x, dy = drag.dy + e.clientY - drag.y, g = null;
      if (!e.altKey) {
        var w = document.querySelector(".wrap").getBoundingClientRect(), r = drag.el.getBoundingClientRect(), sh = dx - (o.dx || 0);
        var L = r.left + sh, C = L + r.width / 2, R = L + r.width;
        [[C, w.left + w.width / 2], [L, w.left], [R, w.right]].some(function (c) { if (Math.abs(c[0] - c[1]) < 7) { dx += c[1] - c[0]; g = c[1]; return true; } });
      }
      guide.style.display = g == null ? "none" : "block"; if (g != null) guide.style.left = g + "px";
      o.dx = Math.round(dx); o.dy = Math.round(dy); API.set(k, o);
    }, true);
    document.addEventListener("pointerup", function () { drag = null; guide.style.display = "none"; }, true);
    document.addEventListener("keydown", function (e) {
      if (!sel) return; var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
      e.preventDefault(); var k = sel.dataset.bloc, o = cur(k), n = e.shiftKey ? 10 : 1; o.dx = (o.dx || 0) + d[0] * n; o.dy = (o.dy || 0) + d[1] * n; API.set(k, o);
    }, true);
  }
  function go(d) {
    var M = (d && d.mise_en_page) || {}, b = document.body, c = b.classList;
    var mag = POS[M.bouton_magazine] ? M.bouton_magazine : "gauche", qst = POS[M.bouton_question] ? M.bouton_question : "droite";
    if (mag !== "gauche") c.add("mp-mag-" + mag);
    if (qst !== "droite") c.add("mp-qst-" + qst);
    if (mag === qst || mag === "centre" || qst === "centre") c.add("mp-stack");
    if (M.menu_ordre && M.menu_ordre.length) {
      var nav = document.querySelector(".bar nav");
      if (nav) {
        var kids = [].slice.call(nav.children), lab = function (e) { var sm = e.querySelector && e.querySelector("summary"); return (sm || e).textContent.trim(); };
        var want = M.menu_ordre.map(function (l) { return kids.filter(function (e) { return lab(e) === l; })[0]; }).filter(Boolean);
        kids.forEach(function (e) { if (want.indexOf(e) < 0) want.push(e); });
        want.forEach(function (e) { nav.appendChild(e); });
      }
    }
    var P = (M.pages || {})[page()] || {};
    if (P.alignement === "centre") c.add("mp-al-centre");
    if (P.largeur === "etroit" || P.largeur === "large") c.add("mp-lg-" + P.largeur);
    if (P.espace === "aere" || P.espace === "compact") c.add("mp-es-" + P.espace);
    var API = null; try { if (/[?&]mpedit=1/.test(location.search) && window.parent !== window && window.parent.__mpEdit) API = window.parent.__mpEdit; } catch (e) {}
    tag(); applyV(API ? API.all(page()) : (M.visuel || {})[page()]);
    if (API) { editor(API); var tt2; new MutationObserver(function () { clearTimeout(tt2); tt2 = setTimeout(function () { tag(); applyV(API.all(page())); }, 60); }).observe(document.body, { childList: true, subtree: true }); }
    else { var tt3; new MutationObserver(function () { clearTimeout(tt3); tt3 = setTimeout(function () { tag(); applyV((M.visuel || {})[page()]); }, 60); }).observe(document.body, { childList: true, subtree: true }); }
    var ordre = P.blocs_ordre || [], caches = P.blocs_caches || [];
    function blocs() {
      var ids = {}; ordre.concat(caches).forEach(function (i) { ids[i] = 1; });
      caches.forEach(function (i) { var e = document.getElementById(i); if (e) e.style.display = "none"; });
      var els = ordre.map(function (i) { return document.getElementById(i); }).filter(Boolean);
      if (els.length < 2) return;
      var slots = els.slice().sort(function (a, z) { return a.compareDocumentPosition(z) & 4 ? -1 : 1; });
      var marks = slots.map(function (e) { var m = document.createComment(""); e.parentNode.insertBefore(m, e); return m; });
      els.forEach(function (e, i) { marks[i].parentNode.insertBefore(e, marks[i]); });
      marks.forEach(function (m) { m.remove(); });
    }
    blocs();
    var tm; if (ordre.length || caches.length) new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(function () { caches.forEach(function (i) { var e = document.getElementById(i); if (e && e.style.display !== "none") e.style.display = "none"; }); }, 50); }).observe(document.body, { childList: true, subtree: true });
  }
  function start() { fetch("/content/site.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(go).catch(function () {}); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
