// Espace de l'élu : connexion par code, voir ses tribunes, en envoyer une.
import { json, sha, clean, cleanLine, MAX_TITRE, MAX_TEXTE, PAR_MOIS, codeHash, same, newToken, setCookie, session, cookieToken, sameOrigin, limit, listPrefix, validLink, SESSION_TTL } from "../_lib/tribune.js";

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  const acc = await session(request, env);
  if (!acc) return json({ connecte: false });
  const mes = (await listPrefix(env, "tt:" + acc.id + ":")).sort((a, b) => b.ts - a.ts)
    .map((t) => ({ titre: t.titre, texte: t.texte, lien: t.lien, statut: t.statut, motif: t.motif || "", ts: t.ts }));
  return json({ connecte: true, nom: acc.nom, fonction: acc.fonction, groupe: acc.groupe, tribunes: mes, max_titre: MAX_TITRE, max_texte: MAX_TEXTE, par_mois: PAR_MOIS });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "requete" }, 400); }

  if (b.action === "connexion") {
    if (!(await limit(env, request, "login", 10, 3600))) return json({ error: "trop_de_tentatives" }, 429);
    const id = String(b.id || "").toLowerCase().trim();
    const acc = id ? await env.VOTES.get("ta:" + id, "json") : null;
    // même durée de calcul que le compte existe ou non
    const h = await codeHash(env, id || "-", b.code);
    const lock = id ? parseInt((await env.VOTES.get("tl:" + id)) || "0", 10) : 0;
    if (lock >= 5) return json({ error: "verrouille" }, 429);
    if (!acc || !acc.actif || !same(acc.ch, h)) {
      if (acc) await env.VOTES.put("tl:" + id, String(lock + 1), { expirationTtl: 900 });
      return json({ error: "identifiants" }, 401);
    }
    await env.VOTES.delete("tl:" + id);
    const token = newToken();
    await env.VOTES.put("ts:" + token, acc.id, { expirationTtl: SESSION_TTL });
    return json({ ok: true }, 200, { "Set-Cookie": setCookie(token, SESSION_TTL) });
  }

  if (b.action === "deconnexion") {
    const t = cookieToken(request);
    if (t) await env.VOTES.delete("ts:" + t);
    return json({ ok: true }, 200, { "Set-Cookie": setCookie("", 0) });
  }

  const acc = await session(request, env);
  if (!acc) return json({ error: "non_connecte" }, 401);

  if (b.action === "envoyer") {
    if (!(await limit(env, request, "send", 20, 3600))) return json({ error: "trop_de_tentatives" }, 429);
    const titre = cleanLine(b.titre, MAX_TITRE), texte = clean(b.texte, MAX_TEXTE);
    const lien = validLink(b.lien);
    if (titre.length < 3) return json({ error: "titre" }, 400);
    if (texte.length < 20 && !lien) return json({ error: "texte" }, 400);
    if (lien === null) return json({ error: "lien" }, 400);
    if (!b.accord) return json({ error: "accord" }, 400);
    const debut = new Date(); debut.setUTCDate(1); debut.setUTCHours(0, 0, 0, 0);
    const ceMois = (await listPrefix(env, "tt:" + acc.id + ":")).filter((t) => t.ts >= debut.getTime() && t.statut !== "retire").length;
    if (ceMois >= PAR_MOIS) return json({ error: "quota", par_mois: PAR_MOIS }, 429);
    const ts = Date.now();
    const suf = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((x) => x.toString(16).padStart(2, "0")).join("");
    await env.VOTES.put("tt:" + acc.id + ":" + ts + "-" + suf, JSON.stringify({ nom: acc.nom, fonction: acc.fonction, groupe: acc.groupe, titre, texte, lien, statut: "attente", ts }));
    return json({ ok: true });
  }
  return json({ error: "action" }, 400);
}
