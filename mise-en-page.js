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
    var root = document.querySelector(".wrap"); if (!root) return;
    function ok(el) { return !(/^(SCRIPT|STYLE|NAV|LINK|BR|HR|NOSCRIPT|OPTION|SVG|PATH)$/i.test(el.tagName) || el.classList.contains("sr-only") || el.hidden || el.classList.contains("mp-add")); }
    function t(el, P) {
      if (el.dataset.bloc || !ok(el)) return;
      if (el.parentElement.matches("#top>.head")) P = "top";
      var base = (P || "wrap") + ">" + (el.id || (el.tagName.toLowerCase() + (el.classList[0] ? "." + el.classList[0] : ""))), k = base, n = 1;
      while (document.querySelector('[data-bloc="' + k + '"]')) { n++; k = base + "~" + n; }
      el.dataset.bloc = k;
    }
    function walk(el, depth) {
      if (depth >= 3 || /\b(bar|pied)\b/.test(el.className + " " + el.id)) return;
      [].forEach.call(el.children, function (c) { t(c, el.dataset.bloc && el.id ? el.id : el.dataset.bloc); if (c.dataset.bloc && c.children.length <= 14) walk(c, depth + 1); });
    }
    [].forEach.call(root.children, function (e) { t(e); });
    [].forEach.call(root.children, function (e) { if (e.dataset.bloc) walk(e, 1); });
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
    st.textContent = "html:not(.mp-col) [data-bloc]{cursor:grab}html.mp-col,html.mp-col *{cursor:crosshair!important}html.mp-col body *:hover{outline:2px solid #b8975a!important;outline-offset:-2px}[data-bloc]{}html:not(.mp-col) [data-bloc]:hover{outline:2px dashed #b8975a!important;outline-offset:-2px}[data-bloc].mp-sel{outline:3px solid #d3141f!important;outline-offset:-3px}.mp-guide{position:fixed;top:0;bottom:0;width:0;border-left:1px dashed #d3141f;z-index:99999;pointer-events:none}.pubpop{display:none!important}.bt-fab,.pdf-coin{pointer-events:none!important;opacity:.35}*{animation:none!important}";
    document.head.appendChild(st);
    var sel = null, drag = null, tap = null, guide = document.createElement("div"); guide.className = "mp-guide"; guide.style.display = "none"; document.body.appendChild(guide);
    function cur(k) { return Object.assign({}, API.get(k)); }
    function label(el) { var t = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 44); return t || el.dataset.bloc || ("<" + el.tagName.toLowerCase() + ">"); }
    function ckey(el) { var ps = []; while (el && el !== document.body && el !== document.documentElement) { if (el.id) { ps.unshift("#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id)); return "css:" + ps.join(">"); } var i = 1, s2 = el; while ((s2 = s2.previousElementSibling)) i++; ps.unshift(el.tagName.toLowerCase() + ":nth-child(" + i + ")"); el = el.parentElement; } return "css:body>" + ps.join(">"); }
    function select(el, key) { if (sel) sel.classList.remove("mp-sel"); sel = el; if (el) { el.classList.add("mp-sel"); el.__mk = key || el.dataset.bloc; } API.selected(el ? el.__mk : null, el ? label(el) : ""); }
    window.mpReselect = function () { if (sel && !document.body.contains(sel)) { var n = sel.__mk ? document.querySelector(qsel(sel.__mk)) : null; if (n) n.__mk = sel.__mk; sel = n; } if (sel) sel.classList.add("mp-sel"); };
    window.mpSelect = function (k) { var n = document.querySelector('[data-bloc="' + k + '"]'); if (n) select(n); };
    window.mpSelectParent = function (any) { if (!sel) return; if (any || !sel.dataset.bloc) { var p = sel.parentElement; if (p && p !== document.body && p !== document.documentElement) select(p, ckey(p)); } else if (sel.parentElement) { var q = sel.parentElement.closest("[data-bloc]"); if (q) select(q); } };
    document.addEventListener("click", function (e) { if (e.target.closest("[data-bloc]") || e.target.closest("a,button,summary")) e.preventDefault(); }, true);
    document.addEventListener("pointerdown", function (e) {
      var tl = API.tool ? API.tool() : "select";
      if (tl !== "select") {
        var t = e.target; if (!t || !t.tagName || t === document.documentElement || t === document.body || t.classList.contains("mp-guide")) return;
        e.preventDefault(); e.stopPropagation(); var k = ckey(t); select(t, k);
        if (tl === "pip") API.pick(k, window.mpComputed(k)); else if (tl === "touch") API.touch(k, window.mpComputed(k), e.clientX, e.clientY, label(t), t.closest("[data-bloc]") ? t.closest("[data-bloc]").dataset.bloc : null); else API.paint(k, tl);
        return;
      }
      var el = e.target.closest("[data-bloc]"); if (!el) return;
      e.preventDefault(); select(el); var o = cur(el.dataset.bloc); drag = { el: el, x: e.clientX, y: e.clientY, dx: o.dx || 0, dy: o.dy || 0 }; tap = { t: e.target, x: e.clientX, y: e.clientY, b: el.dataset.bloc };
    }, true);
    document.addEventListener("mouseover", function (e) { var c = (API.tool ? API.tool() : "select") !== "select"; document.documentElement.classList.toggle("mp-col", c); }, true);
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
    document.addEventListener("pointerup", function (e) { if (tap && Math.abs(e.clientX - tap.x) < 4 && Math.abs(e.clientY - tap.y) < 4 && tap.t && tap.t.tagName && API.touch) { var tk = ckey(tap.t); API.touch(tk, window.mpComputed(tk), tap.x, tap.y, label(tap.t), tap.b); } tap = null; drag = null; guide.style.display = "none"; }, true);
    document.addEventListener("keydown", function (e) {
      if (!sel) return; var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
      e.preventDefault(); var k = sel.dataset.bloc, o = cur(k), n = e.shiftKey ? 10 : 1; o.dx = (o.dx || 0) + d[0] * n; o.dy = (o.dy || 0) + d[1] * n; API.set(k, o);
    }, true);
  }

  /* ---- Blocs ajoutés depuis l'éditeur visuel ---- */
  var COUL = { noir: "#12141c", or: "#b8975a", vert: "#006233", rouge: "#d3141f" };
  var acss = document.createElement("style");
  acss.textContent = ".mp-add{margin:28px auto;max-width:100%;grid-column:1/-1}.mp-add-titre,.mp-add-bouton,.mp-add-separateur{text-align:center}.mp-add-texte{text-align:left;max-width:70ch}.mp-add-image{text-align:center}.mp-add h2{font-family:var(--display,inherit);text-transform:uppercase;letter-spacing:.02em;line-height:1.05;margin:0;text-align:inherit}.mp-add-texte p{margin:0 0 14px;line-height:1.6;font-size:18px}.mp-add-texte ul{margin:0 0 14px;padding-left:22px}.mp-add-texte .note{border-left:3px solid #d3141f;padding-left:12px;color:#555a69}.mp-add img{display:inline-block;max-width:100%;height:auto;border-radius:8px}.mp-add figcaption{font-size:14px;color:#555a69;margin-top:6px}.mp-add figure{margin:0}.mp-add .mp-btn{display:inline-block;padding:14px 26px;border-radius:8px;text-decoration:none;font:700 15px/1 var(--display,inherit);text-transform:uppercase;letter-spacing:.1em}.mp-add .mp-sep hr{border:0;border-top:1px solid rgba(18,20,28,.25);margin:0;position:relative;top:50%}.mp-add.mp-off{opacity:.35}";
  document.head.appendChild(acss);
  function e2(x) { return String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function inl(x) { return e2(x).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function sf(u) { u = String(u || "").trim(); return /^(https?:|mailto:|tel:|#|\/)/i.test(u) ? u : "#"; }
  function mdA(t) {
    return String(t || "").replace(/\r/g, "").split(/\n{2,}/).map(function (b) {
      b = b.trim(); if (!b) return ""; var L = b.split("\n");
      if (L.every(function (l) { return /^- /.test(l); })) return "<ul>" + L.map(function (l) { return "<li>" + inl(l.slice(2)) + "</li>"; }).join("") + "</ul>";
      if (/^> /.test(b)) return '<p class="note">' + inl(b.slice(2)) + "</p>";
      return "<p>" + L.map(inl).join("<br>") + "</p>";
    }).join("");
  }
  function buildAdd(a) {
    var el = document.createElement("div"), ty = a.type || "texte";
    el.id = "ajout-" + a.id; el.dataset.bloc = "ajout-" + a.id; el.dataset.apres = a.apres || "";
    el.className = "mp-add mp-add-" + ty + (a.cache ? " mp-off" : "");
    var c = COUL[a.couleur] || COUL.noir;
    if (ty === "titre") el.innerHTML = '<h2 style="font-size:' + ({ petit: 26, moyen: 38, grand: 56 }[a.taille] || 38) + "px;color:" + c + '">' + inl(a.texte || "Titre") + "</h2>";
    else if (ty === "texte") el.innerHTML = mdA(a.texte);
    else if (ty === "image") el.innerHTML = a.image ? '<figure><img src="' + e2(a.image) + '" alt="' + e2(a.alt || "") + '" style="width:' + ({ petite: 40, moyenne: 70, grande: 100 }[a.largeur] || 70) + '%">' + (a.legende ? "<figcaption>" + inl(a.legende) + "</figcaption>" : "") + "</figure>" : '<p style="color:#888">Image à choisir</p>';
    else if (ty === "bouton") { var bg = COUL[a.couleur] || COUL.or; el.innerHTML = '<a class="mp-btn" href="' + e2(sf(a.lien)) + '"' + (/^https?:/i.test(a.lien || "") ? ' target="_blank" rel="noopener"' : "") + ' style="background:' + bg + ";color:" + (a.couleur === "noir" || a.couleur === "vert" || a.couleur === "rouge" ? "#fff" : "#12141c") + '">' + e2(a.texte || "Bouton") + "</a>"; }
    else if (ty === "separateur") el.innerHTML = '<div class="mp-sep" style="height:' + (Number(a.hauteur) || 40) + 'px">' + (a.ligne ? "<hr>" : "") + "</div>";
    return el;
  }
  var addTimer = 0, addForce = false;
  function renderAdds(list, edit) {
    [].forEach.call(document.querySelectorAll(".mp-add"), function (e) { e.remove(); });
    var pend = (list || []).filter(function (a) { return edit || !a.cache; });
    function put() {
      var left = [];
      pend.forEach(function (a) {
        if (document.getElementById("ajout-" + a.id)) return;
        var an = a.apres ? document.querySelector('[data-bloc="' + String(a.apres).replace(/"/g, "") + '"]') : null, el;
        if (an && an.parentNode) { el = buildAdd(a); var at = an; while (at.nextElementSibling && at.nextElementSibling.classList.contains("mp-add") && at.nextElementSibling.dataset.apres === (a.apres || "")) at = at.nextElementSibling; at.parentNode.insertBefore(el, at.nextSibling); }
        else if (!a.apres || addForce) { el = buildAdd(a); var pied = document.getElementById("pied"), root = document.querySelector(".wrap"); if (pied && pied.parentNode) pied.parentNode.insertBefore(el, pied); else if (root) root.appendChild(el); else left.push(a); }
        else left.push(a);
      });
      return left;
    }
    var left = put();
    if (left.length) { clearTimeout(addTimer); addTimer = setTimeout(function () { addForce = true; pend = left; put(); if (window.mpReselect) window.mpReselect(); }, 2500); }
    if (window.mpReselect) window.mpReselect();
  }
  window.mpAjouts = function (l) { addForce = false; renderAdds(l, true); };
  window.mpTopKeyOld = function (k) { var el = document.querySelector('[data-bloc="' + k + '"]'); while (el && el.parentElement && !el.parentElement.classList.contains("wrap")) el = el.parentElement; return el && el.dataset.bloc && !el.classList.contains("mp-add") ? el.dataset.bloc : (el ? el.dataset.bloc : null); };
  window.mpTopKey = function (k) { var el = document.querySelector('[data-bloc="' + k + '"]'); return el ? el.dataset.bloc : null; };
  window.mpTopListOld = function () { var r = []; [].forEach.call((document.querySelector(".wrap") || { children: [] }).children, function (e) { if (e.dataset && e.dataset.bloc && !e.classList.contains("mp-add")) { var t = (e.innerText || "").trim().replace(/\s+/g, " ").slice(0, 40); r.push({ key: e.dataset.bloc, label: t || e.dataset.bloc }); } }); return r; };

  function urlOf(v) { var m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(v || ""); return m ? m[1] : ""; }
  window.mpImgInfo = function (k) {
    var el = document.querySelector('[data-bloc="' + k + '"]'), root = document.querySelector(".wrap");
    while (el && el !== root) {
      if (el.dataset && el.dataset.bloc && !el.classList.contains("mp-add")) {
        var st = el.style, v;
        if ((v = st.getPropertyValue("--bgi")) && urlOf(v)) return { key: el.dataset.bloc, kind: "bgi", url: urlOf(v) };
        if ((v = st.getPropertyValue("--p")) && urlOf(v)) return { key: el.dataset.bloc, kind: "p", url: urlOf(v) };
        if (urlOf(st.backgroundImage)) return { key: el.dataset.bloc, kind: "bg", url: urlOf(st.backgroundImage) };
        var im = el.tagName === "IMG" ? el : el.querySelector("img");
        if (im && im.getAttribute("src") && !/^data:/.test(im.getAttribute("src"))) return { key: el.dataset.bloc, kind: "img", url: im.getAttribute("src") };
      }
      el = el.parentElement;
    }
    return null;
  };
  function applyImgs(map) {
    Object.keys(map || {}).forEach(function (k) {
      var el = document.querySelector('[data-bloc="' + k + '"]'), u = map[k]; if (!el || !u) return; var st = el.style;
      if (urlOf(st.getPropertyValue("--bgi"))) st.setProperty("--bgi", 'url("' + u + '")');
      else if (urlOf(st.getPropertyValue("--p"))) st.setProperty("--p", 'url("' + u + '")');
      else if (urlOf(st.backgroundImage)) st.backgroundImage = 'url("' + u + '")';
      else { var im = el.tagName === "IMG" ? el : el.querySelector("img"); if (im && im.getAttribute("src") !== u) { im.setAttribute("src", u); im.removeAttribute("srcset"); } }
    });
  }

  /* ---- Couleurs : palette du site et couleurs par bloc ---- */
  function esx(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function h2rgb(h) { h = String(h).replace("#", ""); if (h.length === 3) h = h.replace(/(.)/g, "$1$1"); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function recolor(map) {
    var pairs = Object.keys(map || {}).filter(function (k) { return map[k] && /^#[0-9a-f]{6}$/i.test(map[k]) && map[k].toLowerCase() !== k.toLowerCase(); });
    function rep(t) {
      pairs.forEach(function (o) {
        var n = map[o], a = h2rgb(o), b = h2rgb(n);
        t = t.replace(new RegExp(esx(o) + "(?![0-9a-f])", "gi"), n);
        t = t.replace(new RegExp("rgba?\\(\\s*" + a[0] + "\\s*,\\s*" + a[1] + "\\s*,\\s*" + a[2] + "\\b", "gi"), function (m) { return m.replace(/\(\s*\d+\s*,\s*\d+\s*,\s*\d+/, "(" + b[0] + "," + b[1] + "," + b[2]); });
      });
      return t;
    }
    [].forEach.call(document.querySelectorAll("style"), function (st) {
      if (/^(mp-|)visuel$|^mp-blocs$/.test(st.id) || st === acss) return;
      if (st.__o == null) st.__o = st.textContent;
      var n = pairs.length ? rep(st.__o) : st.__o; if (n !== st.textContent) st.textContent = n;
    });
    if (pairs.length) [].forEach.call(document.querySelectorAll("[style]"), function (el) {
      var cur = el.getAttribute("style"); if (!/#|rgb/i.test(cur)) return;
      var n = rep(cur); if (n !== cur) el.setAttribute("style", n);
    });
  }
  window.mpRecolor = recolor;
  function qsel(k) { return String(k).indexOf("css:") === 0 ? k.slice(4) : '[data-bloc="' + String(k).replace(/"/g, "") + '"]'; }
  function applyB(B) {
    var st = document.getElementById("mp-blocs");
    if (!st) { st = document.createElement("style"); st.id = "mp-blocs"; document.head.appendChild(st); }
    var out = "";
    Object.keys(B || {}).forEach(function (k) {
      var o = B[k], q = qsel(k), p = "";
      if (o.fond) out += q + "{background-color:" + o.fond + "!important;background-image:none!important}";
      if (o.texte) out += q + "," + q + " *{color:" + o.texte + "!important}";
      if (o.bord) out += q + "{border:2px solid " + o.bord + "!important}";
    });
    st.textContent = out;
  }
  window.mpBlocs = applyB;
  function applyT(T) {
    Object.keys(T || {}).forEach(function (k) {
      var el; try { el = document.querySelector(qsel(k)); } catch (x) {} if (!el) return;
      var v = String(T[k]); if (el.__tv === v) return;
      if (el.__ot === undefined) el.__ot = el.innerHTML;
      el.innerHTML = v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>"); el.__tv = v;
    });
  }
  window.mpTextes = applyT;
  window.mpTextOf = function (k) {
    if (page() === "article.html") return null;
    var el; try { el = document.querySelector(qsel(k)); } catch (x) {} if (!el || el.closest(".bar nav,.mp-add,script,style")) return null;
    if (el.querySelector("a,button,img,input,svg,select,textarea,video,iframe,picture,canvas,summary,details")) return null;
    var c = el.cloneNode(true); [].forEach.call(c.querySelectorAll("br"), function (b) { b.replaceWith("\n"); });
    var t = c.textContent.replace(/[ \t]+\n/g, "\n").trim(); return t && t.length < 800 ? t : null;
  };
  window.mpComputed = function (k) {
    var el; try { el = document.querySelector(qsel(k)); } catch (x) {} if (!el) return {};
    var cs = getComputedStyle(el);
    function hx(c) { var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/.exec(c || ""); if (!m || (m[4] != null && Number(m[4]) === 0)) return ""; return "#" + [m[1], m[2], m[3]].map(function (v) { return ("0" + Number(v).toString(16)).slice(-2); }).join(""); }
    return { fond: hx(cs.backgroundColor), texte: hx(cs.color), bord: hx(cs.borderTopColor) };
  };
  try { var lc = JSON.parse(localStorage.getItem("mpcol") || "null"); if (lc && !/[?&]mpedit=1/.test(location.search)) recolor(lc); } catch (e) {}
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
    renderAdds(API ? API.ajouts(page()) : (M.ajouts || {})[page()], !!API);
    tag(); var IM = function () { return API ? API.imgs(page()) : (M.images || {})[page()]; }; applyImgs(IM()); window.mpImgs = function () { applyImgs(IM()); };
    if (API) { editor(API); var tt2; new MutationObserver(function () { clearTimeout(tt2); tt2 = setTimeout(function () { tag(); applyV(API.all(page())); applyImgs(IM()); recolor(API.couleurs()); applyT(API.textes(page())); }, 60); }).observe(document.body, { childList: true, subtree: true }); }
    else { var tt3; new MutationObserver(function () { clearTimeout(tt3); tt3 = setTimeout(function () { tag(); applyV((M.visuel || {})[page()]); applyImgs(IM()); recolor(M.couleurs); applyT((M.textes || {})[page()]); }, 60); }).observe(document.body, { childList: true, subtree: true }); }
    recolor(API ? API.couleurs() : M.couleurs); applyT(API ? API.textes(page()) : (M.textes || {})[page()]); applyB(API ? API.cb(page()) : (M.couleurs_blocs || {})[page()]);
    if (!API) { try { localStorage.setItem("mpcol", JSON.stringify(M.couleurs || {})); } catch (e) {} }
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

(function () {
  window.mpTopList = function () {
    var r = []; [].forEach.call(document.querySelectorAll("[data-bloc]"), function (e) {
      if (e.classList.contains("mp-add") || r.length >= 90) return;
      var d = 0, x = e; while (x.parentElement && x.parentElement !== document.querySelector(".wrap")) { x = x.parentElement; if (x.dataset && x.dataset.bloc) d++; }
      var t = (e.innerText || "").trim().replace(/\s+/g, " ").slice(0, 34);
      r.push({ key: e.dataset.bloc, label: new Array(d + 1).join("– ") + (t || e.dataset.bloc) });
    }); return r;
  };
})();
