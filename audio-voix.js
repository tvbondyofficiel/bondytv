/* Enregistrer sa voix ou une courte vidéo sur le formulaire (témoignage). Le fichier est mis dans le champ « fichier ».
   Si une injure ou une menace est entendue pendant l'enregistrement, il est bloqué. */
(function () {
  var inp = document.getElementById("f-piece");
  if (!inp || !window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  var form = inp.form, msg = document.getElementById("f-msg");
  var MOTS = ["abruti", "batard", "bicot", "bite", "bougnoule", "branleur", "connard", "connasse", "couille", "cretin", "creve", "creves", "debile", "encule", "enculer", "fdp", "ferme ta gueule", "fils de pute", "gouine", "grognasse", "je te retrouve", "je vais le tuer", "je vais les tuer", "je vais te buter", "je vais te casser", "je vais te frapper", "je vais te retrouver", "je vais te tuer", "je vais vous buter", "je vais vous frapper", "je vais vous tuer", "merde", "mort a", "negre", "negro", "nique", "nique ta mere", "ntm", "on va te tuer", "on va vous casser", "on va vous tuer", "ordure", "pd", "pede", "petasse", "pourriture", "putain", "pute", "racaille", "raton", "sale arabe", "sale blanc", "sale juif", "sale noir", "sale race", "salope", "sous-merde", "ta gueule", "tapette", "tarlouze", "tg", "trou du cul", "trouduc", "tu vas payer", "va te faire foutre", "vermine", "vous allez payer", "youpin"];
  function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim(); }
  function injure(t) { var x = " " + norm(t) + " "; return MOTS.some(function (m) { return x.indexOf(" " + m + " ") >= 0 || x.indexOf(" " + m + "s ") >= 0; }); }
  var st = document.createElement("style");
  st.textContent = ".vx{border:2px dashed rgba(18,20,28,.25);padding:12px;background:#fbf8f1}.vx-rules{margin:0 0 10px;font-size:14px;line-height:1.4}.vx-rules b{color:#006233}"
    + ".vx-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.vx button{min-height:52px;padding:0 18px;border:0;cursor:pointer;font:700 16px/1 inherit;letter-spacing:.06em;text-transform:uppercase;background:#d3141f;color:#fff}"
    + ".vx button.vx-vid{background:#006233}.vx button.vx-stop{background:#12141c}.vx button.vx-again{background:#fff;color:#12141c;border:2px solid rgba(18,20,28,.25)}.vx-t{font-weight:700}"
    + ".vx audio{display:block;width:100%;margin-top:10px}.vx video{display:block;width:100%;max-height:340px;margin-top:10px;background:#12141c}.vx-msg{margin:8px 0 0;font-weight:700}.vx-msg.err{color:#d3141f}.vx-msg.ok{color:#006233}";
  document.head.appendChild(st);
  var box = document.createElement("div");
  box.className = "fld vx";
  box.innerHTML = '<label>Ou dites-le avec votre voix, ou en vidéo <span class="opt">(2 minutes au maximum)</span></label>'
    + '<p class="vx-rules"><b>Parlez calmement.</b> Pas de menaces, pas d’insultes, pas d’injures, pas de propos qui blessent. Si vous avez quelque chose à dire, dites-le avec calme. Nous écoutons chaque message avant de le publier. Un message avec une injure est bloqué tout de suite.</p>'
    + '<div class="vx-row"><button type="button" class="vx-rec">● Enregistrer ma voix</button><button type="button" class="vx-vid">▶ Enregistrer une vidéo</button><button type="button" class="vx-stop" hidden>■ Arrêter</button><span class="vx-t"></span></div>'
    + '<video class="vx-live" muted playsinline hidden></video><audio controls hidden></audio><video class="vx-play" controls playsinline hidden></video><div class="vx-row" style="margin-top:8px"><button type="button" class="vx-again" hidden>Recommencer</button></div><p class="vx-msg" role="status"></p>';
  var host = inp.closest(".fld") || inp.parentNode;
  host.parentNode.insertBefore(box, host.nextSibling);
  inp.setAttribute("accept", inp.getAttribute("accept") + ",audio/*,video/*,.mp3,.m4a,.wav,.webm,.ogg,.mp4,.mov");
  var Q = function (c) { return box.querySelector(c); };
  var rec = Q(".vx-rec"), vid = Q(".vx-vid"), stop = Q(".vx-stop"), again = Q(".vx-again"), T = Q(".vx-t"), M = Q(".vx-msg"), A = Q("audio"), LIVE = Q(".vx-live"), PLAY = Q(".vx-play");
  var mr, chunks, stream, tm, t0, sr, bad, msgReq, isVideo;
  function say(t, c) { M.textContent = t || ""; M.className = "vx-msg" + (c ? " " + c : ""); }
  function reset() { A.hidden = true; A.removeAttribute("src"); PLAY.hidden = true; PLAY.removeAttribute("src"); LIVE.hidden = true; LIVE.srcObject = null; again.hidden = true; rec.hidden = false; vid.hidden = false; stop.hidden = true; T.textContent = ""; try { var dt = new DataTransfer(); inp.files = dt.files; } catch (e) {} if (msg && msgReq) { msg.required = true; msgReq = false; } }
  function fin() { clearInterval(tm); try { sr && sr.stop(); } catch (e) {} try { stream && stream.getTracks().forEach(function (x) { x.stop(); }); } catch (e) {} LIVE.hidden = true; LIVE.srcObject = null; }
  function start(video) {
    say(""); bad = false; isVideo = video;
    navigator.mediaDevices.getUserMedia(video ? { audio: true, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } } : { audio: true }).then(function (s) {
      stream = s; chunks = [];
      try { mr = new MediaRecorder(s, video ? { videoBitsPerSecond: 400000, audioBitsPerSecond: 32000 } : undefined); } catch (e) { try { mr = new MediaRecorder(s); } catch (e2) { say("Votre téléphone ne peut pas enregistrer ici. Utilisez « Choisir un fichier ».", "err"); fin(); return; } }
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        fin(); rec.hidden = false; vid.hidden = false; stop.hidden = true; T.textContent = "";
        if (bad) { reset(); say("Votre message contient un mot injurieux ou une menace. Il est bloqué. Recommencez calmement, sans insulte.", "err"); return; }
        var type = mr.mimeType || (chunks[0] && chunks[0].type) || (isVideo ? "video/webm" : "audio/webm");
        if (isVideo && type.indexOf("video/") !== 0) type = "video/" + type.split("/")[1];
        var ext = /mp4|aac/.test(type) ? (isVideo ? "mp4" : "m4a") : /ogg/.test(type) ? "ogg" : "webm";
        var blob = new Blob(chunks, { type: type }), file = new File([blob], (isVideo ? "video." : "voix.") + ext, { type: type });
        if (file.size > 8 * 1024 * 1024) { reset(); say("L’enregistrement est trop lourd. Faites plus court (2 minutes au maximum).", "err"); return; }
        try { var dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; } catch (e) { say("Impossible de joindre l’enregistrement. Utilisez « Choisir un fichier ».", "err"); return; }
        if (msg && msg.required) { msg.required = false; msgReq = true; }
        var u = URL.createObjectURL(blob);
        if (isVideo) { PLAY.src = u; PLAY.hidden = false; } else { A.src = u; A.hidden = false; }
        again.hidden = false; rec.hidden = true; vid.hidden = true;
        say("Votre " + (isVideo ? "vidéo" : "voix") + " est enregistrée. Regardez-la, puis cliquez sur Envoyer en bas du formulaire.", "ok");
      };
      mr.start(); t0 = Date.now(); rec.hidden = true; vid.hidden = true; stop.hidden = false; again.hidden = true; A.hidden = true; PLAY.hidden = true;
      if (video) { LIVE.srcObject = s; LIVE.hidden = false; LIVE.play().catch(function () {}); }
      tm = setInterval(function () { var sec = Math.floor((Date.now() - t0) / 1000); T.textContent = "● " + Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); if (sec >= 120) stop.onclick(); }, 250);
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) { try { sr = new SR(); sr.lang = "fr-FR"; sr.continuous = true; sr.interimResults = true;
        sr.onresult = function (ev) { var all = ""; for (var i = 0; i < ev.results.length; i++) all += " " + ev.results[i][0].transcript; if (!bad && injure(all)) { bad = true; try { mr.state !== "inactive" && mr.stop(); } catch (e) {} } };
        sr.onend = function () { if (mr && mr.state === "recording" && !bad) { try { sr.start(); } catch (e) {} } };
        sr.start(); } catch (e) { sr = null; } }
    }).catch(function () { say(video ? "La caméra ou le micro n’est pas autorisé. Autorisez-les dans votre téléphone, ou utilisez « Choisir un fichier »." : "Le micro n’est pas autorisé. Autorisez-le dans votre téléphone, ou utilisez « Choisir un fichier ».", "err"); });
  }
  rec.onclick = function () { start(false); };
  vid.onclick = function () { start(true); };
  stop.onclick = function () { try { mr && mr.state !== "inactive" && mr.stop(); } catch (e) {} };
  again.onclick = function () { reset(); say(""); };
  if (form) form.addEventListener("reset", function () { reset(); say(""); });
})();
