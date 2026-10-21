// Page privée de Mohammed : créer les comptes des élus, relire et valider les tribunes.
// Protégée par MOD_TOKEN (le même mot de passe que la modération).
import { json, clean, cleanLine, slug, newCode, codeHash, modAllowed, listPrefix, rebuildPub, sameOrigin } from "../_lib/tribune.js";

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!modAllowed(request, env)) return json({ error: "refuse" }, 401);
  const comptes = (await listPrefix(env, "ta:")).map((a) => ({ id: a.id, nom: a.nom, fonction: a.fonction, groupe: a.groupe, actif: a.actif, created: a.created }));
  const tribunes = (await listPrefix(env, "tt:")).sort((a, b) => b.ts - a.ts);
  return json({ comptes, tribunes });
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
