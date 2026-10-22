// Page privée de Mohammed : créer les comptes des élus, relire et valider les tribunes.
// Protégée par MOD_TOKEN (le même mot de passe que la modération).
import { json, clean, cleanLine, normTel, slug, newCode, codeHash, modAllowed, listPrefix, rebuildPub, sameOrigin } from "../_lib/tribune.js";

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!modAllowed(request, env)) return json({ error: "refuse" }, 401);
  const url = new URL(request.url), pc = url.searchParams.get("piece");
  if (pc) {
    if (!/^hd:\d+-[a-f0-9]{6}$/.test(pc)) return json({ error: "cle" }, 400);
    const d = await env.VOTES.get(pc, "json");
    const data = d && d.piece ? await env.VOTES.get("hf:" + pc.slice(3), "arrayBuffer") : null;
    if (!data) return json({ error: "introuvable" }, 404);
    return new Response(data, { status: 200, headers: { "Content-Type": d.piece.type, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Content-Disposition": "inline" } });
  }
  const comptes = (await listPrefix(env, "ta:")).map((a) => ({ id: a.id, nom: a.nom, fonction: a.fonction, groupe: a.groupe, actif: a.actif, created: a.created, role: a.role || "elu", tel: a.tel || "" }));
  const demandes = (await listPrefix(env, "hd:")).sort((a, b) => b.ts - a.ts);
  const tribunes = (await listPrefix(env, "tt:")).sort((a, b) => b.ts - a.ts);
  return json({ comptes, tribunes, demandes });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!modAllowed(request, env)) return json({ error: "refuse" }, 401);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "requete" }, 400); }
  const a = b.action;

  if (a === "creer") {
    const nom = cleanLine(b.nom, 80), fonction = cleanLine(b.fonction, 120), groupe = cleanLine(b.groupe, 80);
    if (nom.length < 3) return json({ error: "nom" }, 400);
    let id = slug(nom);
    if (!id) return json({ error: "nom" }, 400);
    if (await env.VOTES.get("ta:" + id)) return json({ error: "existe" }, 409);
    const code = newCode();
    await env.VOTES.put("ta:" + id, JSON.stringify({ id, nom, fonction, groupe, actif: true, created: Date.now(), ch: await codeHash(env, id, code) }));
    return json({ ok: true, id, code });
  }
  if (a === "accepter") {
    const cle = String(b.cle || "");
    if (!cle.startsWith("hd:")) return json({ error: "cle" }, 400);
    const d = await env.VOTES.get(cle, "json");
    if (!d) return json({ error: "introuvable" }, 404);
    const nom = cleanLine(d.nom, 80);
    let id = slug(nom) || "habitant", n = 1;
    while (await env.VOTES.get("ta:" + id)) { n++; id = (slug(nom) || "habitant") + "-" + n; }
    const code = newCode();
    await env.VOTES.put("ta:" + id, JSON.stringify({ id, nom, fonction: "Habitant de Bondy", groupe: "", role: "habitant", tel: d.tel, actif: true, created: Date.now(), ch: await codeHash(env, id, code) }));
    d.statut = "accepte"; d.compte = id;
    await env.VOTES.delete("hf:" + cle.slice(3)); delete d.piece;
    await env.VOTES.put(cle, JSON.stringify(d));
    return json({ ok: true, id, code, nom, tel: d.tel });
  }
  if (a === "refuser_demande" || a === "supprimer_demande") {
    const cle = String(b.cle || "");
    if (!cle.startsWith("hd:")) return json({ error: "cle" }, 400);
    await env.VOTES.delete("hf:" + cle.slice(3));
    if (a === "supprimer_demande") await env.VOTES.delete(cle);
    else { const d = await env.VOTES.get(cle, "json"); if (!d) return json({ error: "introuvable" }, 404); d.statut = "refuse"; delete d.piece; await env.VOTES.put(cle, JSON.stringify(d)); }
    return json({ ok: true });
  }
  if (a === "nouveau_code" || a === "desactiver" || a === "activer") {
    const id = String(b.id || "");
    const acc = await env.VOTES.get("ta:" + id, "json");
    if (!acc) return json({ error: "introuvable" }, 404);
    let code = null;
    if (a === "nouveau_code") { code = newCode(); acc.ch = await codeHash(env, id, code); acc.actif = true; }
    if (a === "desactiver") acc.actif = false;
    if (a === "activer") acc.actif = true;
    await env.VOTES.put("ta:" + id, JSON.stringify(acc));
    return json({ ok: true, code });
  }
  if (a === "publier" || a === "refuser" || a === "retirer") {
    const cle = String(b.cle || "");
    if (!cle.startsWith("tt:")) return json({ error: "cle" }, 400);
    const t = await env.VOTES.get(cle, "json");
    if (!t) return json({ error: "introuvable" }, 404);
    if (a === "publier") {
      t.statut = "publie"; t.pub_ts = Date.now(); delete t.motif;
      if (typeof b.texte === "string" && b.texte.trim()) t.texte = clean(b.texte, 5000);
    } else if (a === "refuser") { t.statut = "refuse"; t.motif = cleanLine(b.motif, 300); }
    else { t.statut = "retire"; }
    await env.VOTES.put(cle, JSON.stringify(t));
    await rebuildPub(env);
    return json({ ok: true });
  }
  return json({ error: "action" }, 400);
}
