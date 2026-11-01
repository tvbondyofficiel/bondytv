// Page privée de Mohammed : créer les comptes des élus, relire et valider les tribunes.
// Protégée par MOD_TOKEN (le même mot de passe que la modération).
import { sendMail, mailOK } from "../_lib/mail.js";
import { json, clean, cleanLine, normTel, slug, newCode, codeHash, modAllowed, listPrefix, rebuildPub, sameOrigin, recountPending, pendingCount } from "../_lib/tribune.js";

const MSG_RUBRIQUES = { "Logement": "logement", "L'essentiel": "essentiel", "Un témoignage": "temoignage" };

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  const url = new URL(request.url);
  // Compteur public : seulement un nombre (aucune donnée personnelle), pour la pastille rouge du tableau de bord.
  if (url.searchParams.get("n") === "1") return json({ n: await pendingCount(env) }, 200, { "Cache-Control": "public, max-age=120" });
  if (!modAllowed(request, env)) return json({ error: "refuse" }, 401);
  const pc = url.searchParams.get("piece"), im = url.searchParams.get("img");
  if (im) {
    if (!/^tt:[a-z0-9-]+:\d+-[a-f0-9]{6}$/.test(im)) return json({ error: "cle" }, 400);
    const t = await env.VOTES.get(im, "json");
    const data = t && t.image ? await env.VOTES.get("ti:" + im.slice(3), "arrayBuffer") : null;
    if (!data) return json({ error: "introuvable" }, 404);
    return new Response(data, { status: 200, headers: { "Content-Type": t.image, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Content-Disposition": "inline" } });
  }
  if (pc) {
    if (!/^(hd|tm):\d+-[a-f0-9]{6}$/.test(pc)) return json({ error: "cle" }, 400);
    const d = await env.VOTES.get(pc, "json");
    const justif = url.searchParams.get("f") === "justif" && pc.startsWith("hd:");
    const meta = justif ? (d && d.justif) : (d && d.piece);
    const data = meta ? await env.VOTES.get((pc.startsWith("tm:") ? "tf:" : justif ? "hg:" : "hf:") + pc.slice(3), "arrayBuffer") : null;
    if (!data) return json({ error: "introuvable" }, 404);
    return new Response(data, { status: 200, headers: { "Content-Type": meta.type, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Content-Disposition": "inline" } });
  }
  const comptes = (await listPrefix(env, "ta:")).map((a) => ({ id: a.id, nom: a.nom, fonction: a.fonction, groupe: a.groupe, actif: a.actif, created: a.created, role: a.role || "elu", tel: a.tel || "", structure: a.structure || "" }));
  const demandes = (await listPrefix(env, "hd:")).sort((a, b) => b.ts - a.ts);
  const tribunes = (await listPrefix(env, "tt:")).sort((a, b) => b.ts - a.ts);
  const messages = (await listPrefix(env, "tm:")).sort((a, b) => b.ts - a.ts);
  return json({ comptes, tribunes, demandes, messages });
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
    const role = d.profil === "association" || d.profil === "commerce" || d.profil === "elu" || d.profil === "videgrenier" ? d.profil : "habitant";
    const fonction = role === "association" ? "Association" : role === "commerce" ? "Commerce" : role === "elu" ? (cleanLine(d.structure, 100) || "Élu") : "Habitant de Bondy";
    const structure = role === "habitant" || role === "elu" || role === "videgrenier" ? "" : cleanLine(d.structure, 100);
    await env.VOTES.put("ta:" + id, JSON.stringify({ id, nom, fonction, groupe: "", role, structure, tel: d.tel, email: d.email || "", actif: true, created: Date.now(), ch: await codeHash(env, id, code) }));
    d.statut = "accepte"; d.compte = id;
    await env.VOTES.delete("hf:" + cle.slice(3)); delete d.piece;
    await env.VOTES.delete("hg:" + cle.slice(3)); delete d.justif;
    await env.VOTES.put(cle, JSON.stringify(d));
    const esp = role === "association" ? "l'espace associations" : role === "commerce" ? "l'espace commerçants" : role === "videgrenier" ? "Mon vide-grenier" : role === "elu" ? "l'espace des élus" : "l'espace habitants";
    const page = role === "elu" ? "/elu.html" : "/habitant.html";
    const origin = new URL(request.url).origin;
    const message = "Bonjour " + nom + ", voici votre accès à " + esp + " de Bondy TV Magazine.\nAdresse : " + origin + page + "\nIdentifiant : " + id + "\nCode : " + code + "\nGardez ce code pour vous. Vous écrivez votre texte, nous le relisons, puis il est publié.";
    let mail = false;
    if (d.email && mailOK(env)) mail = await sendMail(env, { to: d.email, name: nom, subject: "Votre accès Bondy TV Magazine", text: message });
    await recountPending(env);
    return json({ ok: true, id, code, nom, tel: d.tel, email: d.email || "", role, structure, message, mail });
  }
  if (a === "refuser_demande" || a === "supprimer_demande") {
    const cle = String(b.cle || "");
    if (!cle.startsWith("hd:")) return json({ error: "cle" }, 400);
    await env.VOTES.delete("hf:" + cle.slice(3));
    await env.VOTES.delete("hg:" + cle.slice(3));
    if (a === "supprimer_demande") await env.VOTES.delete(cle);
    else { const d = await env.VOTES.get(cle, "json"); if (!d) return json({ error: "introuvable" }, 404); d.statut = "refuse"; delete d.piece; delete d.justif; await env.VOTES.put(cle, JSON.stringify(d)); }
    await recountPending(env);
    return json({ ok: true });
  }
  if (a === "supprimer_message") {
    const cle = String(b.cle || "");
    if (!/^tm:\d+-[a-f0-9]{6}$/.test(cle)) return json({ error: "cle" }, 400);
    await env.VOTES.delete("tf:" + cle.slice(3));
    await env.VOTES.delete(cle);
    return json({ ok: true });
  }
  if (a === "publier_message" || a === "retirer_message") {
    const cle = String(b.cle || "");
    if (!/^tm:\d+-[a-f0-9]{6}$/.test(cle)) return json({ error: "cle" }, 400);
    const m = await env.VOTES.get(cle, "json");
    if (!m) return json({ error: "introuvable" }, 404);
    if (a === "publier_message") {
      if (!MSG_RUBRIQUES[m.type]) return json({ error: "type" }, 400);
      const texte = clean(b.texte, 3000), nom = cleanLine(b.nom, 80);
      if (texte.length < 5) return json({ error: "texte" }, 400);
      m.statut = "publie"; m.texte_pub = texte; m.nom_pub = nom; m.pub_ts = Date.now();
    } else { m.statut = "retire"; }
    await env.VOTES.put(cle, JSON.stringify(m));
    const pub = (await listPrefix(env, "tm:")).filter((x) => x.statut === "publie" && MSG_RUBRIQUES[x.type])
      .sort((x, y) => (y.pub_ts || y.ts) - (x.pub_ts || x.ts))
      .map((x) => ({ rubrique: MSG_RUBRIQUES[x.type], nom: x.nom_pub || "", texte: x.texte_pub || "", ts: x.pub_ts || x.ts }));
    await env.VOTES.put("mpub", JSON.stringify(pub));
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
  if (a === "supprimer_compte") {
    const id = String(b.id || "");
    if (!/^[a-z0-9-]{1,80}$/.test(id)) return json({ error: "id" }, 400);
    if (!(await env.VOTES.get("ta:" + id))) return json({ error: "introuvable" }, 404);
    await env.VOTES.delete("ta:" + id);
    for (const t of await listPrefix(env, "tt:" + id + ":")) {
      const k = t && t.cle; if (!k) continue;
      await env.VOTES.delete(k); await env.VOTES.delete("ti:" + k.slice(3));
    }
    await rebuildPub(env);
    return json({ ok: true });
  }
  if (a === "supprimer_tribune") {
    const cle = String(b.cle || "");
    if (!cle.startsWith("tt:")) return json({ error: "cle" }, 400);
    await env.VOTES.delete(cle); await env.VOTES.delete("ti:" + cle.slice(3));
    await rebuildPub(env);
    return json({ ok: true });
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
