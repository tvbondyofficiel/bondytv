(function () {
  var s = document.currentScript, type = s && s.getAttribute("data-type");
  var box = document.getElementById("paroles-pub");
  if (!box || !type) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var st = document.createElement("style");
  st.textContent = ".pp-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin:22px 0}.pp-c{background:#f3ead6;border-left:5px solid #1f5a3a;padding:18px 20px;border-radius:2px}.pp-c p{margin:0;font-size:17px;line-height:1.55;white-space:pre-wrap}.pp-c b{display:block;margin-top:12px;font-family:var(--display,inherit);text-transform:uppercase;letter-spacing:.08em;font-size:14px;color:#1f5a3a}.pp-c time{display:block;font-size:13px;opacity:.7;margin-top:2px}";
  document.head.appendChild(st);
  fetch("/api/paroles").then(function (r) { return r.json(); }).then(function (d) {
    var L = (d.items || []).filter(function (x) { return x.rubrique === type; });
    if (!L.length) return;
    box.innerHTML = '<div class="pp-list">' + L.map(function (x) {
      var dt = new Date(x.ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      return '<article class="pp-c"><p>' + esc(x.texte) + '</p>' + (x.nom ? '<b>' + esc(x.nom) + '</b>' : '') + '<time>' + esc(dt) + '</time></article>';
    }).join("") + '</div>';
  }).catch(function () {});
})();
