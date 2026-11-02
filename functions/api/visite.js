// Compteur de visiteurs, anonyme : aucun cookie, aucune adresse IP, aucun identifiant.
// Le navigateur envoie UN signal par jour (pas par page). On additionne par jour dans le stockage « VOTES ».
//   POST /api/visite    : ajoute 1 visiteur pour aujourd'hui
//   GET  /api/visite    : renvoie les 30 derniers jours { jours: [{ d: "2026-11-02", n: 12 }, ...] }
import { json } from "../_lib/vote.js";

const jour = (dec) => {
  const t = new Date(Date.now() - (dec || 0) * 86400000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(t); // AAAA-MM-JJ
};

export async function onRequestPost({ request, env }) {
  try {
    const ua = request.headers.get("User-Agent") || "";
    if (!env.VOTES || !ua || /bot|crawl|spider|slurp|preview|monitor|curl|python|headless/i.test(ua)) return json({ ok: false }, 200);
    const k = "vis:" + jour(0);
    const n = Number(await env.VOTES.get(k)) || 0;
    await env.VOTES.put(k, String(n + 1), { expirationTtl: 60 * 60 * 24 * 120 });
    return json({ ok: true }, 200);
  } catch (e) { return json({ ok: false }, 200); }
}

export async function onRequestGet({ env }) {
  if (!env.VOTES) return json({ jours: [] }, 200);
  const ds = Array.from({ length: 30 }, (_, i) => jour(29 - i));
  const vals = await Promise.all(ds.map((d) => env.VOTES.get("vis:" + d).catch(() => null)));
  return json({ jours: ds.map((d, i) => ({ d, n: Number(vals[i]) || 0 })) }, 200, { "Cache-Control": "public, max-age=300" });
}
