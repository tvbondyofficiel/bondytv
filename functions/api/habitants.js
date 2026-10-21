// Parole aux habitants : liste publique des textes validés + demande d'accès (téléphone obligatoire).
import { json, cleanLine, normTel, sameOrigin, limit } from "../_lib/tribune.js";

export async function onRequestGet({ env }) {
  if (!env.VOTES) return json({ textes: [] }, 200, { "Cache-Control": "public, max-age=60" });
  const list = (await env.VOTES.get("hpub", "json")) || [];
  return json({ textes: list.slice(0, 50) }, 200, { "Cache-Control": "public, max-age=60" });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "requete" }, 400); }
  if (b.botcheck) return json({ ok: true }); // robot : on fait semblant
  if (!(await limit(env, request, "demande", 5, 3600))) return json({ error: "trop_de_tentatives" }, 429);
  const nom = cleanLine(b.nom, 80), tel = normTel(b.tel), quartier = cleanLine(b.quartier, 80);
  if (nom.length < 3 || nom.indexOf(" ") < 0) return json({ error: "nom" }, 400);
  if (!tel) return json({ error: "tel" }, 400);
  const ts = Date.now();
  const suf = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((x) => x.toString(16).padStart(2, "0")).join("");
  await env.VOTES.put("hd:" + ts + "-" + suf, JSON.stringify({ nom, tel, quartier, statut: "attente", ts }));
  return json({ ok: true });
}
