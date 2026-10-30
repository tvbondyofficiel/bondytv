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
  function go(d) {
    var M = (d && d.mise_en_page) || {}, b = document.body, c = b.classList;
    var mag = POS[M.bouton_magazine] ? M.bouton_magazine : "gauche", qst = POS[M.bouton_question] ? M.bouton_question : "droite";
    if (mag !== "gauche") c.add("mp-mag-" + mag);
    if (qst !== "droite") c.add("mp-qst-" + qst);
    if (mag === qst || mag === "centre" || qst === "centre") c.add("mp-stack");
    var P = (M.pages || {})[page()] || {};
    if (P.alignement === "centre") c.add("mp-al-centre");
    if (P.largeur === "etroit" || P.largeur === "large") c.add("mp-lg-" + P.largeur);
    if (P.espace === "aere" || P.espace === "compact") c.add("mp-es-" + P.espace);
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
