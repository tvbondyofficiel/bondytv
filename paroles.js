(function () {
  var s = document.currentScript, type = s && s.getAttribute("data-type");
  var box = document.getElementById("paroles-pub");
  if (!box || !type) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var st = document.createElement("style");
  st.textContent = ".pp-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:24px 0;align-items:start}"
    + ".pp-c{position:relative;background:#f3ead6;border-left:5px solid #1f5a3a;border-radius:3px;padding:20px 22px 16px;box-shadow:0 6px 16px rgba(18,20,28,.06)}"
    + ".pp-c::before{content:'\\201C';position:absolute;right:16px;top:-2px;font:700 90px/1 Georgia,serif;color:#b8975a;opacity:.45;pointer-events:none}"
    + ".pp-c h3{margin:0 34px 10px 0;font:700 17px/1.1 var(--display,inherit);text-transform:uppercase}"
    + ".pp-t{font:400 15px/1.5 Georgia,'Iowan Old Style','Times New Roman',serif;color:#12141c;max-height:11.5em;overflow:hidden;position:relative}"
    + ".pp-c.open .pp-t{max-height:none}"
    + ".pp-c:not(.open) .pp-t.cut::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3em;background:linear-gradient(rgba(243,234,214,0),#f3ead6)}"
    + ".pp-t p{margin:0 0 8px;max-width:none}"
    + ".pp-more{display:none;margin-top:8px;background:none;border:0;padding:0;font:700 12px/1 var(--display,inherit);text-transform:uppercase;letter-spacing:.12em;color:#12141c;border-bottom:2px solid #d4202a;cursor:pointer}"
    + ".pp-c.canopen .pp-more{display:inline-block}"
    + ".pp-au{display:block;width:100%;margin:4px 0 6px}.pp-vf{display:block;width:100%;max-height:420px;margin:4px 0 8px;background:#12141c}.pp-v{position:relative;aspect-ratio:16/9;margin:4px 0 8px;background:#12141c}.pp-v iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.pp-lk{display:inline-block;margin:4px 0 8px;padding:12px 16px;background:#006233;color:#fff;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:.06em}"
    + ".pp-by{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid rgba(18,20,28,.16)}"
    + ".pp-by b{font:700 13px/1.2 var(--display,inherit);text-transform:uppercase;letter-spacing:.12em;color:#1f5a3a}"
    + ".pp-by time{font-size:12.5px;opacity:.7}"
    + "@media(max-width:1100px){.pp-list{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.pp-list{grid-template-columns:minmax(0,1fr)}}";
  document.head.appendChild(st);
  function vid(u) {
    if (!u) return "";
    var m = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i.exec(u);
    if (m) return '<div class="pp-v"><iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + '" title="Vidéo" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
    return '<a class="pp-lk" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">\u25b6 Voir la vidéo</a>';
  }
  function get(u, k) { return fetch(u).then(function (r) { return r.json(); }).then(function (d) { return d[k] || []; }).catch(function () { return []; }); }
  Promise.all([get("/api/paroles", "items"), get("/content/site.json", "paroles")]).then(function (r) {
    var L = r[0].concat(r[1]).filter(function (x) { return type === "ecoute" ? !!x.ecoute : x.rubrique === type; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!L.length) return;
    box.innerHTML = '<div class="pp-list">' + L.map(function (x) {
      var dt = new Date(x.ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      var paras = String(x.texte || "").split(/\n\s*\n/).map(function (t) { return '<p>' + esc(t.trim()).replace(/\n/g, "<br>") + '</p>'; }).join("");
      return '<article class="pp-c">' + (x.titre ? '<h3>' + esc(x.titre) + '</h3>' : '') + vid(x.video) + (x.vfile ? '<video class="pp-vf" controls preload="none" playsinline src="/api/audio?id=' + encodeURIComponent(x.vfile) + '"></video>' : '') + (x.audio ? '<audio class="pp-au" controls preload="none" src="/api/audio?id=' + encodeURIComponent(x.audio) + '"></audio>' : '') + (x.texte && x.texte !== 'Témoignage audio' && x.texte !== 'Témoignage vidéo' ? '<div class="pp-t">' + paras + '</div>' : '') + '<button type="button" class="pp-more">Lire la suite</button><div class="pp-by">' + (x.nom ? '<b>' + esc(x.nom) + '</b>' : '') + '</div></article>';
    }).join("") + '</div>';
    box.querySelectorAll(".pp-c").forEach(function (c) {
      var t = c.querySelector(".pp-t"); if (!t) return;
      if (t.scrollHeight > t.clientHeight + 4) { c.classList.add("canopen"); t.classList.add("cut"); }
      c.querySelector(".pp-more").addEventListener("click", function () {
        var o = c.classList.toggle("open"); this.textContent = o ? "Réduire" : "Lire la suite";
      });
    });
  }).catch(function () {});
})();
