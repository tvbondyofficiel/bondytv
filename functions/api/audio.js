// Lecture publique d'un témoignage audio : seulement s'il a été publié par Mohammed.
import { json } from "../_lib/tribune.js";

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^\d+-[a-f0-9]{6}$/.test(id)) return json({ error: "cle" }, 400);
  const m = await env.VOTES.get("tm:" + id, "json");
  if (!m || m.statut !== "publie" || !m.piece || !/^audio\//.test(m.piece.type || "")) return json({ error: "introuvable" }, 404);
  const buf = await env.VOTES.get("tf:" + id, "arrayBuffer");
  if (!buf) return json({ error: "introuvable" }, 404);
  const h = { "Content-Type": m.piece.type, "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600" };
  const total = buf.byteLength, r = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("Range") || "");
  if (r && (r[1] !== "" || r[2] !== "")) {
    let a = r[1] === "" ? Math.max(0, total - parseInt(r[2], 10)) : parseInt(r[1], 10);
    let z = r[1] === "" || r[2] === "" ? total - 1 : Math.min(parseInt(r[2], 10), total - 1);
    if (a >= total || a > z) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + total } });
    return new Response(buf.slice(a, z + 1), { status: 206, headers: Object.assign({ "Content-Range": "bytes " + a + "-" + z + "/" + total, "Content-Length": String(z - a + 1) }, h) });
  }
  return new Response(buf, { status: 200, headers: Object.assign({ "Content-Length": String(total) }, h) });
}
