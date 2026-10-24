// « Rejoindre la communauté » : ajoute l'adresse e-mail à la liste Brevo.
// Secrets à ajouter dans Cloudflare Pages (Paramètres > Variables) :
//   BREVO_API_KEY  = clé API Brevo (déjà utilisée pour les e-mails)
//   BREVO_LIST_ID  = numéro de la liste Brevo (un nombre, ex. 3)
// Si l'un des deux manque, la page utilise l'envoi par e-mail habituel (rien n'est perdu).
import { json, cleanLine, sameOrigin, limit } from "../_lib/tribune.js";
import { sendMail } from "../_lib/mail.js";

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Mail de bienvenue : mise en page simple et compatible avec tous les logiciels de messagerie.
const bienvenue = (prenom) => `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f5f2ec">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-top:6px solid #b8975a;font-family:Georgia,'Times New Roman',serif;color:#12141c">
<tr><td style="background:#006233;height:4px;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td align="center" style="padding:28px 24px 8px"><img src="https://www.bondytv.com/images/logo.png" width="110" alt="Bondy TV Magazine" style="display:block;border:0"></td></tr>
<tr><td style="padding:12px 32px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b8975a;font-weight:bold" align="center">Vivre ensemble, mieux</td></tr>
<tr><td style="padding:8px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.15;font-weight:bold;text-transform:uppercase;color:#12141c" align="center">Bienvenue, ${esc(prenom)}&nbsp;!</td></tr>
<tr><td style="padding:18px 32px 0;font-size:17px;line-height:1.6">Merci : votre inscription est bien enregistrée. Vous faites maintenant partie de la communauté <b>Bondy TV Magazine</b>, le magazine des Bondynois.</td></tr>
<tr><td style="padding:14px 32px 0;font-size:17px;line-height:1.6">Ici, la parole est à vous. Vous recevrez le magazine et les nouveautés de Bondy TV : l'actualité de la ville, les histoires des habitants, les vidéos et le podcast.</td></tr>
<tr><td align="center" style="padding:26px 32px 8px"><a href="https://www.bondytv.com" style="display:inline-block;background:#b8975a;color:#12141c;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;padding:14px 26px;border-radius:6px">Découvrir le magazine</a></td></tr>
<tr><td align="center" style="padding:6px 32px 0"><a href="https://www.bondytv.com/ecrire.html" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#006233">Un témoignage, une idée ? Écrivez-nous</a></td></tr>
<tr><td style="padding:28px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b6f7a;border-top:1px solid #eee7d8;margin-top:20px" align="center">À très bientôt, l'équipe de Bondy TV Magazine.<br>Pour nous écrire ou vous désinscrire à tout moment : <a href="mailto:tvbondy@gmail.com" style="color:#6b6f7a">tvbondy@gmail.com</a></td></tr>
</table></td></tr></table></body></html>`;

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
    if (r.ok || r.status === 204) {
      // Mot de bienvenue pour la personne, et alerte pour Bondy TV (sans bloquer l'inscription si l'envoi échoue).
      await sendMail(env, { to: email, name: prenom, subject: "Bienvenue dans la communauté Bondy TV", html: bienvenue(prenom),
        text: "Bonjour " + prenom + ",\n\nMerci, votre inscription est bien enregistrée : vous faites maintenant partie de la communauté Bondy TV Magazine, le magazine des Bondynois.\n\nVivre ensemble, mieux : ici, la parole est à vous. Vous recevrez le magazine et les nouveautés de Bondy TV.\n\nPour nous écrire ou vous désinscrire à tout moment : tvbondy@gmail.com\n\nÀ très bientôt,\nL'équipe de Bondy TV Magazine\nhttps://www.bondytv.com" });
      await sendMail(env, { to: "tvbondy@gmail.com", name: "Bondy TV", subject: "Nouvelle inscription : " + prenom,
        text: "Une nouvelle personne a rejoint la communauté Bondy TV.\n\nPrénom : " + prenom + "\nE-mail : " + email + "\n\nElle est déjà ajoutée à la liste « Communauté Bondy TV » dans Brevo." });
      return json({ ok: true });
    }
    return json({ error: "brevo" }, 502);
  } catch (e) { return json({ error: "brevo" }, 502); }
}
