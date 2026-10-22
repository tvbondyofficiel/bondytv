// Vide-grenier : inscription automatique et code envoyé par e-mail (aucune intervention manuelle).
import { json, cleanLine, normTel, slug, newCode, codeHash, limit, sameOrigin } from "../_lib/tribune.js";
import { sha, normEmail } from "../_lib/vote.js";
import { sendMail, mailOK } from "../_lib/mail.js";

const VALIDE = 30 * 60 * 1000; // un code reçu par e-mail vaut 30 minutes
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function cleMail(env, email) { return "te:" + (await sha(env, "mail:" + normEmail(email))); }

// Génère un nouveau code pour le compte et l'envoie par e-mail.
async function envoyerCode(env, acc, request) {
  const code = newCode();
  acc.ch = await codeHash(env, acc.id, code);
  acc.cexp = Date.now() + VALIDE;
  await env.VOTES.put("ta:" + acc.id, JSON.stringify(acc));
  const origin = new URL(request.url).origin;
  return sendMail(env, {
    to: acc.email, name: acc.nom,
    subject: "Votre code Bondy TV : " + code,
    text: "Bonjour " + acc.nom + ",\n\nVotre code pour déposer votre annonce de vide-grenier :\n\n" + code + "\n\nIl est valable 30 minutes. Connectez-vous ici : " + origin + "/habitant.html?espace=videgrenier\n(entrez votre adresse e-mail et ce code)\n\nSi vous n'avez rien demandé, ignorez ce message.\n\nBondy TV Magazine",
  });
}

export async function onRequestGet({ env }) {
  return json({ auto: mailOK(env) }, 200, { "Cache-Control": "no-store" });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  if (!mailOK(env)) return json({ manuel: true });
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "requete" }, 400); }
  if (b.botcheck) return json({ ok: true });
  const email = cleanLine(b.email, 120).toLowerCase();
  if (!MAIL_RE.test(email)) return json({ error: "email" }, 400);
  if (!(await limit(env, request, "vg", 8, 3600))) return json({ error: "trop_de_tentatives" }, 429);
  const km = await cleMail(env, email);
  const existant = await env.VOTES.get(km);

  if (b.action === "code") {
    // même réponse que le compte existe ou non (on ne révèle rien)
    if (existant) {
      const acc = await env.VOTES.get("ta:" + existant, "json");
      const h = "tr:vgc:" + (await sha(env, "m:" + email)) + ":" + Math.floor(Date.now() / 3600000);
      const n = parseInt((await env.VOTES.get(h)) || "0", 10);
      if (acc && acc.actif && acc.role === "videgrenier" && n < 3) {
        await env.VOTES.put(h, String(n + 1), { expirationTtl: 7200 });
        await envoyerCode(env, acc, request);
      }
    }
    return json({ ok: true });
  }

  if (b.action === "inscription") {
    const nom = cleanLine(b.nom, 80), tel = normTel(b.tel);
    if (nom.length < 3 || nom.indexOf(" ") < 0) return json({ error: "nom" }, 400);
    if (!tel) return json({ error: "tel" }, 400);
    if (existant) { // déjà inscrit : on renvoie simplement un code
      const acc = await env.VOTES.get("ta:" + existant, "json");
      if (acc && acc.actif && acc.role === "videgrenier") await envoyerCode(env, acc, request);
      return json({ ok: true });
    }
    let id = slug(nom) || "habitant", n = 1;
    while (await env.VOTES.get("ta:" + id)) { n++; id = (slug(nom) || "habitant") + "-" + n; }
    const acc = { id, nom, fonction: "Habitant de Bondy", groupe: "", role: "videgrenier", structure: "", tel, email, actif: true, created: Date.now(), ch: "", cexp: 0 };
    await env.VOTES.put(km, id);
    const ok = await envoyerCode(env, acc, request);
    if (!ok) { await env.VOTES.delete(km); await env.VOTES.delete("ta:" + id); return json({ error: "envoi" }, 502); }
    return json({ ok: true });
  }
  return json({ error: "action" }, 400);
}

export async function onRequest() { return json({ error: "methode_non_autorisee" }, 405); }
