// Espace des élus : comptes sur invitation, code d'accès personnel, tribunes validées avant publication.
// Utilise le même stockage KV (variable VOTES) que le vote. Aucune nouvelle configuration.
// Clés : ta:<id> compte · ts:<jeton> session · tt:<id>:<horodatage> tribune · tpub liste publiée · tr:<...> limites
import { json, sha } from "./vote.js";

export { json, sha };
export const SESSION_TTL = 60 * 60 * 24 * 7;
export const MAX_TITRE = 120, MAX_TEXTE = 5000, PAR_MOIS = 4, PAR_MOIS_HAB = 2;
export const ANNONCES_PAR_MOIS = 1;
export const PAR_MOIS_ASSO = 2, PAR_MOIS_COMMERCE = 1, MAX_IMAGE = 3 * 1024 * 1024;
export function estPro(role) { return role === "association" || role === "commerce"; }
export function parMois(role) { return role === "habitant" ? PAR_MOIS_HAB : role === "association" ? PAR_MOIS_ASSO : role === "commerce" ? PAR_MOIS_COMMERCE : PAR_MOIS; }
// Vrai type d'un fichier d'après ses premiers octets (jamais d'après le nom envoyé)
export function typeFichier(u8, avecPdf) {
  if (avecPdf && u8.length > 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) return "application/pdf";
  if (u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return "image/jpeg";
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return "image/png";
  return "";
}
// Numéro de téléphone : on garde les chiffres (et + au début). Retourne "" si invalide.
export function normTel(t) {
  let x = String(t || "").replace(/[^\d+]/g, "");
  if (x.startsWith("00")) x = "+" + x.slice(2);
  if (!x.startsWith("+") && /^0\d{9}$/.test(x)) x = "+33" + x.slice(1);
  const d = x.replace(/\D/g, "");
  if (d.length < 9 || d.length > 15) return "";
  return "+" + d;
}
// « Karim Benali » → « Karim B. »
export function abrege(nom) {
  const p = String(nom || "").trim().split(/\s+/);
  if (p.length < 2) return p[0] || "";
  return p[0] + " " + p[p.length - 1].charAt(0).toUpperCase() + ".";
}

export function clean(t, n) {
  return String(t == null ? "" : t).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, n);
}
export function cleanLine(t, n) { return clean(t, n).replace(/\s+/g, " "); }

export function same(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function slug(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans 0 O 1 I L
export function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(10));
  let c = "";
  for (let i = 0; i < 10; i++) c += ALPHA[b[i] % ALPHA.length];
  return c.slice(0, 5) + "-" + c.slice(5);
}
export function normCode(c) { return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}
export async function codeHash(env, id, code) { return sha(env, "tcode:" + id + ":" + normCode(code)); }

export function modAllowed(request, env) {
  const h = request.headers.get("Authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  return !!env.MOD_TOKEN && same(t, env.MOD_TOKEN);
}

export function cookieToken(request) {
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)bt_elu=([a-f0-9]{48})/);
  return m ? m[1] : "";
}
export function setCookie(token, maxAge) {
  return "bt_elu=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}

export async function session(request, env) {
  const t = cookieToken(request);
  if (!t) return null;
  const id = await env.VOTES.get("ts:" + t);
  if (!id) return null;
  const acc = await env.VOTES.get("ta:" + id, "json");
  if (!acc || !acc.actif) return null;
  return acc;
}

export function sameOrigin(request) {
  const o = request.headers.get("Origin");
  if (!o) return true;
  try { return new URL(o).host === new URL(request.url).host; } catch (e) { return false; }
}

export async function limit(env, request, name, max, ttl) {
  const ip = request.headers.get("CF-Connecting-IP") || "?";
  const k = "tr:" + name + ":" + (await sha(env, "ip:" + ip)) + ":" + Math.floor(Date.now() / (ttl * 1000));
  const used = parseInt((await env.VOTES.get(k)) || "0", 10);
  if (used >= max) return false;
  await env.VOTES.put(k, String(used + 1), { expirationTtl: Math.max(60, ttl * 2) });
  return true;
}

export async function listPrefix(env, prefix) {
  const out = [];
  let cursor;
  do {
    const r = await env.VOTES.list({ prefix, cursor });
    const recs = await Promise.all(r.keys.map(async (k) => { const v = await env.VOTES.get(k.name, "json"); return v ? Object.assign({ cle: k.name }, v) : null; }));
    recs.forEach((x) => x && out.push(x));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}

export async function rebuildPub(env) {
  const all = (await listPrefix(env, "tt:")).filter((t) => t.statut === "publie");
  all.sort((a, b) => (b.pub_ts || b.ts) - (a.pub_ts || a.ts));
  const R = (t) => t.role || "elu";
  const elus = all.filter((t) => R(t) === "elu").map((t) => ({ nom: t.nom, fonction: t.fonction, groupe: t.groupe || "", titre: t.titre, texte: t.texte, lien: t.lien || "", ts: t.pub_ts || t.ts }));
  const habs = all.filter((t) => R(t) === "habitant" && t.type !== "annonce").map((t) => ({ nom: abrege(t.nom), titre: t.titre, texte: t.texte, ts: t.pub_ts || t.ts }));
  const ann = all.filter((t) => R(t) === "habitant" && t.type === "annonce").map((t) => ({ nom: abrege(t.nom), titre: t.titre, texte: t.texte, ts: t.pub_ts || t.ts }));
  const pro = (role) => all.filter((t) => R(t) === role).map((t) => ({ nom: t.structure || t.nom, titre: t.titre, texte: t.texte, lien: t.lien || "", image: t.image ? "/api/affiche?k=" + encodeURIComponent(t.cle) : "", ts: t.pub_ts || t.ts }));
  await env.VOTES.put("tpub", JSON.stringify(elus));
  await env.VOTES.put("hpub", JSON.stringify(habs));
  await env.VOTES.put("apub", JSON.stringify(ann));
  await env.VOTES.put("xpub", JSON.stringify(pro("association")));
  await env.VOTES.put("cpub", JSON.stringify(pro("commerce")));
  return elus;
}

export function validLink(u) {
  u = String(u || "").trim();
  if (!u) return "";
  return /^https:\/\/[^\s]{4,300}$/i.test(u) ? u : null;
}
