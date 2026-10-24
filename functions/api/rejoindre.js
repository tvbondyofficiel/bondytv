// « Rejoindre la communauté » : ajoute l'adresse e-mail à la liste Brevo.
// Secrets à ajouter dans Cloudflare Pages (Paramètres > Variables) :
//   BREVO_API_KEY  = clé API Brevo (déjà utilisée pour les e-mails)
//   BREVO_LIST_ID  = numéro de la liste Brevo (un nombre, ex. 3)
// Si l'un des deux manque, la page utilise l'envoi par e-mail habituel (rien n'est perdu).
import { json, cleanLine, sameOrigin, limit } from "../_lib/tribune.js";

export async function onRequestPost({ request, env }) {
  if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  let f;
  try { f = await request.formData(); } catch (e) { return json({ error: "requete" }, 400); }
  if (f.get("botcheck")) return json({ ok: true });
  if (!(await limit(env, request, "rejoindre", 10, 3600))) return json({ error: "trop_de_tentatives" }, 429);
  const email = cleanLine(f.get("email"), 120).toLowerCase();
  const prenom = cleanLine(f.get("prenom"), 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "email" }, 400);
  if (prenom.length < 2) return json({ error: "prenom" }, 400);
  if (!f.get("accord")) return json({ error: "accord" }, 400);
  try {
    const r = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email, attributes: { PRENOM: prenom }, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true }),
    });
    if (r.ok || r.status === 204) return json({ ok: true });
    return json({ error: "brevo" }, 502);
  } catch (e) { return json({ error: "brevo" }, 502); }
}
