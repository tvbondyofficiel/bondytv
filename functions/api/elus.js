// Notes des élus par les habitants : 0 à 10, une seule fois par personne et par élu.
// Réglage à faire une fois dans Cloudflare : Pages > bondytv > Settings > Bindings > KV namespace, nom de variable : VOTES
// Secret à créer : MOD_TOKEN (mot de passe de la page de modération). Optionnel : VOTE_SALT.
// Données conservées 12 mois puis supprimées automatiquement.


import { TTL, json, sha, normEmail, normPhone, elusList, elusConf, getAgg, getPubc } from "../_lib/vote.js";

const MIN_AVIS = 5;          // la moyenne n'est affichée qu'à partir de 5 avis
const MAX_COMMENT = 280;
const RATE_PER_HOUR = 6;

function cleanText(t, n) {
  return String(t == null ? "" : t).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

export async function onRequestGet({ request, env, waitUntil }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  // cache de 60 secondes sur le serveur : des milliers de visites = quelques lectures seulement
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const ckey = new Request(new URL("/api/elus?c=1", request.url).toString());
  if (cache) { const hit = await cache.match(ckey); if (hit) return hit; }
  const liste = await elusList(request, env);
  const phrases = (await elusConf(request, env)).phrases_actives === true;
  const agg = await getAgg(env), pubc = phrases ? await getPubc(env) : {};
  const out = {};
  for (const e of liste) {
    const a = agg[e.id] || { s: 0, n: 0 };
    const c = (pubc[e.id] || []).slice().sort((x, y) => (y.ts || 0) - (x.ts || 0)).slice(0, 10).map((x) => ({ text: x.text, ts: x.ts }));
    out[e.id] = { n: a.n, moyenne: a.n >= MIN_AVIS ? Math.round((a.s / a.n) * 10) / 10 : null, min: MIN_AVIS, commentaires: c };
  }
  const res = json({ elus: out }, 200, { "Cache-Control": "public, max-age=60" });
  if (cache) { const put = cache.put(ckey, res.clone()); if (waitUntil) waitUntil(put); else await put; }
  return res;
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "requete" }, 400); }
  if (b.site) return json({ ok: true, resultats: [] }); // piège à robots : champ caché rempli
  const nom = cleanText(b.nom, 80), email = normEmail(b.email), tel = normPhone(b.telephone);
  if (nom.length < 3 || !/\s|-/.test(nom)) return json({ error: "nom" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json({ error: "email" }, 400);
  if (!/^(0[1-9]\d{8}|\+\d{8,14})$/.test(tel)) return json({ error: "telephone" }, 400);
  if (!b.consentement || !b.habitant || !b.charte) return json({ error: "consentement" }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "?";
  const hIp = await sha(env, "ip:" + ip);
  const hourKey = "r:" + hIp + ":" + Math.floor(Date.now() / 3600000);
  const used = parseInt((await env.VOTES.get(hourKey)) || "0", 10);
  if (used >= RATE_PER_HOUR) return json({ error: "trop_de_tentatives" }, 429);
  await env.VOTES.put(hourKey, String(used + 1), { expirationTtl: 7200 });

  const liste = await elusList(request, env);
  const phrases = (await elusConf(request, env)).phrases_actives === true;
  const valid = new Set(liste.map((e) => e.id));
  const hMail = await sha(env, "mail:" + email), hTel = await sha(env, "tel:" + tel);
  const resultats = [];
  let changed = false;
  const agg = await getAgg(env); // lu avant toute écriture pour ne pas compter deux fois
  const votes = Array.isArray(b.votes) ? b.votes.slice(0, 40) : [];
  for (const v of votes) {
    const id = String(v.id || "");
    const score = Number(v.note);
    if (!valid.has(id) || !Number.isInteger(score) || score < 0 || score > 10) { resultats.push({ id, statut: "invalide" }); continue; }
    const kMail = "s:" + id + ":" + hMail, kTel = "p:" + id + ":" + hTel;
    if ((await env.VOTES.get(kMail)) || (await env.VOTES.get(kTel))) { resultats.push({ id, statut: "deja_vote" }); continue; }
    const comment = phrases ? cleanText(v.commentaire, MAX_COMMENT) : "";
    if (phrases && comment.length < 10) { resultats.push({ id, statut: "motif_manquant" }); continue; }
    const rec = { id, note: score, commentaire: comment, nom, email, telephone: tel, ts: Date.now(), statut: comment ? "en_attente" : "sans_commentaire", ip: hIp };
    await env.VOTES.put(kMail, JSON.stringify(rec), { expirationTtl: TTL, metadata: { s: score } });
    await env.VOTES.put(kTel, "1", { expirationTtl: TTL });
    agg[id] = agg[id] || { s: 0, n: 0 }; agg[id].s += score; agg[id].n += 1; changed = true;
    resultats.push({ id, statut: "ok" });
  }
  if (changed) await env.VOTES.put("agg", JSON.stringify(agg));
  return json({ ok: true, resultats });
}
