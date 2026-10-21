// Liste publique des tribunes validées (lecture seule, en cache 60 secondes).
import { json } from "../_lib/tribune.js";

export async function onRequestGet({ env }) {
  if (!env.VOTES) return json({ tribunes: [] }, 200, { "Cache-Control": "public, max-age=60" });
  const list = (await env.VOTES.get("tpub", "json")) || [];
  return json({ tribunes: list.slice(0, 50) }, 200, { "Cache-Control": "public, max-age=60" });
}
