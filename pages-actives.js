/* Pages désactivées depuis le tableau de bord : on les retire du menu et des liens, et la page elle-même s'efface. */
(function () {
  fetch("/content/site.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    var bq = d && d.boutique;
    if (bq && bq.actif) {
      var addTab = function () {
        var nav = document.querySelector(".bar nav");
        if (!nav || nav.querySelector("a.nav-boutique")) return;
        var a = document.createElement("a");
        a.className = "nav-home nav-boutique"; a.href = "/boutique.html"; a.textContent = "Boutique";
        if (/\/boutique(\.html)?$/.test(location.pathname)) a.setAttribute("aria-current", "page");
        var dds = nav.querySelectorAll("details.dd"), ref = null;
        dds.forEach(function (x) { var s = x.querySelector("summary"); if (s && /magazine/i.test(s.textContent)) ref = x; });
        if (ref && ref.nextSibling) nav.insertBefore(a, ref.nextSibling); else nav.appendChild(a);
      };
      addTab();
      document.addEventListener("DOMContentLoaded", addTab);
    }
    var off = (d && d.pages_desactivees) || [];
    if (!off.length) return;
    function which(href) {
      try {
        var u = new URL(href, location.origin);
        if (u.origin !== location.origin) return null;
        var p = u.pathname.replace(/\/$/, "");
        for (var i = 0; i < off.length; i++) if (p === "/" + off[i] || p === "/" + off[i].replace(/\.html$/, "")) return off[i];
      } catch (e) {}
      return null;
    }
    if (which(location.href)) {
      document.title = "Page indisponible · Bondy TV Magazine";
      document.body.innerHTML = '<main style="max-width:640px;margin:18vh auto;padding:0 20px;font-family:Barlow,Arial,sans-serif;text-align:center"><h1 style="font-family:\'Barlow Condensed\',Arial,sans-serif;text-transform:uppercase;font-size:44px;margin:0 0 12px">Cette page n’est pas disponible</h1><p style="font-size:18px;color:#555a69">Elle reviendra bientôt.</p><p><a href="/" style="display:inline-block;margin-top:14px;background:#b8975a;color:#12141c;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:8px;text-transform:uppercase;letter-spacing:.06em">Retour à l’accueil</a></p></main>';
      return;
    }
    function hide() {
      document.querySelectorAll("a[href]").forEach(function (a) {
        if (a.dataset.pgoff) return;
        if (which(a.getAttribute("href"))) { a.dataset.pgoff = "1"; (a.closest("li") || a).style.display = "none"; }
      });
    }
    hide();
    var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(hide, 50); }).observe(document.body, { childList: true, subtree: true });
  }).catch(function () {});
})();
