// Image d'une annonce d'association ou de commerce : servie au public SEULEMENT si l'annonce est publiée.
import { json } from "../_lib/tribune.js";

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  const k = new URL(request.url).searchParams.get("k") || "";
  if (!/^tt:[a-z0-9-]+:\d+-[a-f0-9]{6}$/.test(k)) return json({ error: "cle" }, 400);
  const t = await env.VOTES.get(k, "json");
  if (!t || t.statut !== "publie" || !t.image) return json({ error: "introuvable" }, 404);
  const data = await env.VOTES.get("ti:" + k.slice(3), "arrayBuffer");
  if (!data) return json({ error: "introuvable" }, 404);
  return new Response(data, { status: 200, headers: { "Content-Type": t.image, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'", "Cache-Control": "public, max-age=300" } });
}

export async function onRequest() {
  return json({ error: "methode_non_autorisee" }, 405);
}
