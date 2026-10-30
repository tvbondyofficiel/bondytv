// Téléchargement d'un livre avec compteur (stockage KV « VOTES », déjà utilisé par le site).
//   /api/telecharger?id=...            : compte le téléchargement puis envoie vers le fichier
//   /api/telecharger?compte=1&id=...   : renvoie seulement le nombre de téléchargements
import { json, limit } from "../_lib/tribune.js";

async function livre(request, env, id) {
  try {
    const r = await env.ASSETS.fetch(new URL("/content/site.json", request.url));
    const d = await r.json();
    return (d.livres || []).find((x) => x && x.id === id && x.fichier) || null;
  } catch (e) { return null; }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").slice(0, 80);
  if (!/^[a-z0-9-]+$/.test(id)) return json({ error: "id" }, 400);
  const b = await livre(request, env, id);
  if (!b) return json({ error: "introuvable" }, 404);
  const key = "livre:" + id;
  const total = async () => (env.VOTES ? Number(await env.VOTES.get(key)) || 0 : 0);
  if (url.searchParams.get("compte")) return json({ total: await total() }, 200);
  // Compte un téléchargement (3 par heure et par personne au maximum), puis envoie le fichier.
  try {
    if (env.VOTES && (await limit(env, request, "livre-" + id, 3, 3600))) {
      await env.VOTES.put(key, String((await total()) + 1));
    }
  } catch (e) { /* le téléchargement passe quand même */ }
  const f = String(b.fichier);
  if (!/^\/[A-Za-z0-9._\/-]+$/.test(f) || f.includes("..")) return json({ error: "fichier" }, 400);
  return new Response(null, { status: 302, headers: { Location: f, "Cache-Control": "no-store" } });
}
