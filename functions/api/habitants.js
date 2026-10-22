// Parole aux habitants : liste publique des textes validés + demande d'accès
// (nom, téléphone, adresse et copie de pièce d'identité obligatoires).
// La pièce d'identité n'est jamais publique : elle est lue seulement par Mohammed (modération)
// et supprimée dès que la demande est acceptée, refusée ou supprimée.
import { json, cleanLine, normTel, sameOrigin, limit } from "../_lib/tribune.js";

const MAX_PIECE = 5 * 1024 * 1024;

function typeReel(u8) {
  if (u8.length > 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) return "application/pdf";
  if (u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return "image/jpeg";
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return "image/png";
  return "";
}

export async function onRequestGet({ env }) {
  if (!env.VOTES) return json({ textes: [], annonces: [] }, 200, { "Cache-Control": "public, max-age=60" });
  const list = (await env.VOTES.get("hpub", "json")) || [];
  const annonces = (await env.VOTES.get("apub", "json")) || [];
  return json({ textes: list.slice(0, 50), annonces: annonces.slice(0, 50) }, 200, { "Cache-Control": "public, max-age=60" });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  let f;
  try { f = await request.formData(); } catch (e) { return json({ error: "requete" }, 400); }
  if (f.get("botcheck")) return json({ ok: true }); // robot : on fait semblant
  if (!(await limit(env, request, "demande", 5, 3600))) return json({ error: "trop_de_tentatives" }, 429);
  const nom = cleanLine(f.get("nom"), 80), tel = normTel(f.get("tel")), adresse = cleanLine(f.get("adresse"), 120);
  if (nom.length < 3 || nom.indexOf(" ") < 0) return json({ error: "nom" }, 400);
  if (!tel) return json({ error: "tel" }, 400);
  if (adresse.length < 5) return json({ error: "adresse" }, 400);
  const file = f.get("piece");
  if (!file || typeof file === "string" || !file.size) return json({ error: "piece" }, 400);
  if (file.size > MAX_PIECE) return json({ error: "piece_taille" }, 413);
  const buf = await file.arrayBuffer();
  const type = typeReel(new Uint8Array(buf));
  if (!type) return json({ error: "piece_type" }, 415);
  const ts = Date.now();
  const suf = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((x) => x.toString(16).padStart(2, "0")).join("");
  const id = ts + "-" + suf;
  await env.VOTES.put("hf:" + id, buf);
  await env.VOTES.put("hd:" + id, JSON.stringify({ nom, tel, adresse, statut: "attente", ts, piece: { type, taille: file.size } }));
  return json({ ok: true });
}
