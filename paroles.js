(function () {
  var s = document.currentScript, type = s && s.getAttribute("data-type");
  var box = document.getElementById("paroles-pub");
  if (!box || !type) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var st = document.createElement("style");
  st.textContent = ".pp-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:24px 0;align-items:start}"
    + ".pp-c{position:relative;background:#f3ead6;border-left:5px solid #1f5a3a;border-radius:3px;padding:20px 22px 16px;box-shadow:0 6px 16px rgba(18,20,28,.06)}"
    + ".pp-c::before{content:'\\201C';position:absolute;right:16px;top:-2px;font:700 90px/1 Georgia,serif;color:#b8975a;opacity:.45;pointer-events:none}"
    + ".pp-c h3{margin:0 40px 10px 0;font:700 21px/1.1 var(--display,inherit);text-transform:uppercase}"
    + ".pp-t{font:400 16px/1.5 Georgia,'Iowan Old Style','Times New Roman',serif;color:#12141c;max-height:11.5em;overflow:hidden;position:relative}"
    + ".pp-c.open .pp-t{max-height:none}"
    + ".pp-c:not(.open) .pp-t.cut::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3em;background:linear-gradient(rgba(243,234,214,0),#f3ead6)}"
    + ".pp-t p{margin:0 0 8px;max-width:none}"
    + ".pp-more{display:none;margin-top:8px;background:none;border:0;padding:0;font:700 12px/1 var(--display,inherit);text-transform:uppercase;letter-spacing:.12em;color:#12141c;border-bottom:2px solid #d4202a;cursor:pointer}"
    + ".pp-c.canopen .pp-more{display:inline-block}"
    + ".pp-by{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid rgba(18,20,28,.16)}"
    + ".pp-by b{font:700 13px/1.2 var(--display,inherit);text-transform:uppercase;letter-spacing:.12em;color:#1f5a3a}"
    + ".pp-by time{font-size:12.5px;opacity:.7}"
    + "@media(max-width:700px){.pp-list{grid-template-columns:minmax(0,1fr)}}";
  document.head.appendChild(st);
  function get(u, k) { return fetch(u).then(function (r) { return r.json(); }).then(function (d) { return d[k] || []; }).catch(function () { return []; }); }
  Promise.all([get("/api/paroles", "items"), get("/content/site.json", "paroles")]).then(function (r) {
    var L = r[0].concat(r[1]).filter(function (x) { return x.rubrique === type; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!L.length) return;
    box.innerHTML = '<div class="pp-list">' + L.map(function (x) {
      var dt = new Date(x.ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      var paras = String(x.texte || "").split(/\n\s*\n/).map(function (t) { return '<p>' + esc(t.trim()).replace(/\n/g, "<br>") + '</p>'; }).join("");
      return '<article class="pp-c">' + (x.titre ? '<h3>' + esc(x.titre) + '</h3>' : '') + '<div class="pp-t">' + paras + '</div><button type="button" class="pp-more">Lire la suite</button><div class="pp-by">' + (x.nom ? '<b>' + esc(x.nom) + '</b>' : '') + '<time>' + esc(dt) + '</time></div></article>';
    }).join("") + '</div>';
    box.querySelectorAll(".pp-c").forEach(function (c) {
      var t = c.querySelector(".pp-t");
      if (t.scrollHeight > t.clientHeight + 4) { c.classList.add("canopen"); t.classList.add("cut"); }
      c.querySelector(".pp-more").addEventListener("click", function () {
        var o = c.classList.toggle("open"); this.textContent = o ? "Réduire" : "Lire la suite";
      });
    });
  }).catch(function () {});
})();
