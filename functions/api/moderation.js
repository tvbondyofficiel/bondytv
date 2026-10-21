// Page de modération : relire les commentaires, les publier ou les refuser, supprimer un vote, exporter.
// Protégée par le secret MOD_TOKEN (Cloudflare > Settings > Variables and secrets, type Secret).
import { TTL, json, sha, elusList, getAgg, getPubc } from "../_lib/vote.js";

function same(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function allowed(request, env) {
  const h = request.headers.get("Authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  return !!env.MOD_TOKEN && same(t, env.MOD_TOKEN);
}

async function allVotes(env) {
  const out = [];
  let cursor;
  do {
    const r = await env.VOTES.list({ prefix: "s:", cursor });
    const recs = await Promise.all(r.keys.map(async (k) => { const v = await env.VOTES.get(k.name, "json"); return v ? Object.assign({ cle: k.name }, v) : null; }));
    recs.forEach((x) => x && out.push(x));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out.sort((a, b) => b.ts - a.ts);
}

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!env.MOD_TOKEN) return json({ error: "pas_de_mot_de_passe" }, 503);
  if (!allowed(request, env)) return json({ error: "refuse" }, 401);
  const liste = await elusList(request, env);
  const noms = {}; liste.forEach((e) => (noms[e.id] = e.nom));
  const votes = (await allVotes(env)).map((v) => Object.assign(v, { elu: noms[v.id] || v.id }));
  if (new URL(request.url).searchParams.get("format") === "csv") {
    const esc = (x) => '"' + String(x == null ? "" : x).replace(/"/g, '""') + '"';
    const rows = [["date", "élu", "note", "nom", "e-mail", "téléphone", "commentaire", "statut"].map(esc).join(",")];
    votes.forEach((v) => rows.push([new Date(v.ts).toISOString(), v.elu, v.note, v.nom, v.email, v.telephone, v.commentaire, v.statut].map(esc).join(",")));
    return new Response("﻿" + rows.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="avis-elus.csv"', "Cache-Control": "no-store" } });
  }
  return json({ votes });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!allowed(request, env)) return json({ error: "refuse" }, 401);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "requete" }, 400); }
  const cle = String(b.cle || "");
  if (!cle.startsWith("s:")) return json({ error: "cle" }, 400);
  const rec = await env.VOTES.get(cle, "json");
  if (!rec) return json({ error: "introuvable" }, 404);
  const parts = cle.split(":"); // s:id:hash
  const id = parts[1], h = parts[2];
  const pubc = await getPubc(env);
  const drop = () => { pubc[id] = (pubc[id] || []).filter((x) => x.h !== h); };
  if (b.action === "publier") {
    if (!rec.commentaire) return json({ error: "pas_de_commentaire" }, 400);
    const texte = String(b.texte == null ? rec.commentaire : b.texte).trim().slice(0, 280);
    drop(); (pubc[id] = pubc[id] || []).push({ h, text: texte, ts: Date.now() });
    rec.statut = "publie"; rec.texte_pub = texte;
    await env.VOTES.put(cle, JSON.stringify(rec), { expirationTtl: TTL, metadata: { s: rec.note, p: 1 } });
  } else if (b.action === "refuser") {
    drop();
    rec.statut = "refuse"; delete rec.texte_pub;
    await env.VOTES.put(cle, JSON.stringify(rec), { expirationTtl: TTL, metadata: { s: rec.note } });
  } else if (b.action === "supprimer") {
    drop();
    await env.VOTES.delete(cle);
    const hTel = await sha(env, "tel:" + rec.telephone);
    await env.VOTES.delete("p:" + rec.id + ":" + hTel);
    const agg = await getAgg(env);
    if (agg[id]) { agg[id].s -= rec.note; agg[id].n = Math.max(0, agg[id].n - 1); await env.VOTES.put("agg", JSON.stringify(agg)); }
  } else return json({ error: "action" }, 400);
  await env.VOTES.put("pubc", JSON.stringify(pubc));
  return json({ ok: true });
}
