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

export async function elusList(request, env) {
  const url = new URL("/content/site.json", request.url);
  const res = env.ASSETS ? await env.ASSETS.fetch(url) : await fetch(url);
  const d = await res.json();
  return (d.elus && d.elus.liste) || [];
}

