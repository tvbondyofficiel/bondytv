// Outils communs au vote des élus (hors routes)
export const TTL = 60 * 60 * 24 * 365;
export function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, extra || {}),
  });
}

export async function sha(env, v) {
  const salt = env.VOTE_SALT || env.MOD_TOKEN || "bondytv";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "|" + v));
  return Array.from(new Uint8Array(buf)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normEmail(e) {
  e = String(e || "").trim().toLowerCase();
  let [u, d] = e.split("@");
  if (!u || !d) return "";
  u = u.split("+")[0];
  if (d === "gmail.com" || d === "googlemail.com") { u = u.replace(/\./g, ""); d = "gmail.com"; }
  return u + "@" + d;
}

export function normPhone(p) {
  let n = String(p || "").replace(/[^\d+]/g, "");
  if (n.startsWith("+33")) n = "0" + n.slice(3);
  else if (n.startsWith("0033")) n = "0" + n.slice(4);
  return n;
}

export async function elusConf(request, env) {
  const url = new URL("/content/site.json", request.url);
  const res = env.ASSETS ? await env.ASSETS.fetch(url) : await fetch(url);
  const d = await res.json();
  return d.elus || {};
}

export async function elusList(request, env) {
  const url = new URL("/content/site.json", request.url);
  const res = env.ASSETS ? await env.ASSETS.fetch(url) : await fetch(url);
  const d = await res.json();
  return (d.elus && d.elus.liste) || [];
}


// Résumé prêt à lire : une seule lecture par visite, au lieu d'une recherche par élu.
// agg = { id: { s: somme des notes, n: nombre d'avis } } ; pubc = { id: [ { h, text, ts } ] }
export async function getAgg(env) {
  let a = await env.VOTES.get("agg", "json");
  if (a) return a;
  a = {};
  let cursor;
  do {
    const r = await env.VOTES.list({ prefix: "s:", cursor });
    for (const k of r.keys) {
      const id = k.name.split(":")[1];
      const s = k.metadata && typeof k.metadata.s === "number" ? k.metadata.s : null;
      if (s === null) continue;
      a[id] = a[id] || { s: 0, n: 0 };
      a[id].s += s; a[id].n += 1;
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  await env.VOTES.put("agg", JSON.stringify(a));
  return a;
}

export async function getPubc(env) {
  let p = await env.VOTES.get("pubc", "json");
  if (p) return p;
  p = {};
  let cursor;
  do {
    const r = await env.VOTES.list({ prefix: "s:", cursor });
    for (const k of r.keys) {
      if (!(k.metadata && k.metadata.p)) continue;
      const rec = await env.VOTES.get(k.name, "json");
      if (!rec || !rec.texte_pub) continue;
      const [, id, h] = k.name.split(":");
      (p[id] = p[id] || []).push({ h, text: rec.texte_pub, ts: rec.ts });
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  await env.VOTES.put("pubc", JSON.stringify(p));
  return p;
}
