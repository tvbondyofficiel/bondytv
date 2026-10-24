(function () {
  var s = document.currentScript, type = s && s.getAttribute("data-type");
  var box = document.getElementById("paroles-pub");
  if (!box || !type) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var st = document.createElement("style");
  st.textContent = ".pp-list{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;margin:26px 0}"
    + ".pp-c{background:#fff;border:1px solid rgba(18,20,28,.12);border-top:6px solid #b8975a;border-radius:6px;box-shadow:0 8px 22px rgba(18,20,28,.07);padding:24px clamp(18px,4vw,44px) 22px}"
    + ".pp-c h3{margin:0 0 14px;padding-left:12px;border-left:4px solid #b8975a;font:700 clamp(26px,3.4vw,38px)/1.02 var(--display,inherit);text-transform:uppercase;text-wrap:balance}"
    + ".pp-t{font:400 17px/1.55 Georgia,'Iowan Old Style','Times New Roman',serif;color:#12141c;text-align:justify;hyphens:auto;-webkit-hyphens:auto}"
    + ".pp-t.two{column-count:2;column-gap:44px;column-rule:1px solid rgba(18,20,28,.14)}"
    + ".pp-t p{margin:0 0 10px;max-width:none}"
    + ".pp-t p:first-child::first-letter{float:left;font:700 3.6em/.82 var(--display,inherit);padding:4px 8px 0 0;color:#b8975a}"
    + ".pp-by{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid rgba(18,20,28,.14)}"
    + ".pp-by b{font:700 14px/1.2 var(--display,inherit);text-transform:uppercase;letter-spacing:.14em;color:#1f5a3a}"
    + ".pp-by time{font-size:13px;opacity:.7}"
    + "@media(max-width:860px){.pp-t.two{column-count:1;text-align:left}}";
  document.head.appendChild(st);
  function get(u, k) { return fetch(u).then(function (r) { return r.json(); }).then(function (d) { return d[k] || []; }).catch(function () { return []; }); }
  Promise.all([get("/api/paroles", "items"), get("/content/site.json", "paroles")]).then(function (r) {
    var L = r[0].concat(r[1]).filter(function (x) { return x.rubrique === type; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!L.length) return;
    box.innerHTML = '<div class="pp-list">' + L.map(function (x) {
      var dt = new Date(x.ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      var paras = String(x.texte || "").split(/\n\s*\n/).map(function (t) { return '<p>' + esc(t.trim()).replace(/\n/g, "<br>") + '</p>'; }).join("");
      return '<article class="pp-c">' + (x.titre ? '<h3>' + esc(x.titre) + '</h3>' : '') + '<div class="pp-t' + (String(x.texte || "").length > 480 ? ' two' : '') + '">' + paras + '</div><div class="pp-by">' + (x.nom ? '<b>' + esc(x.nom) + '</b>' : '') + '<time>' + esc(dt) + '</time></div></article>';
    }).join("") + '</div>';
  }).catch(function () {});
})();
