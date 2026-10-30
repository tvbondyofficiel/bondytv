// Envoi d'e-mails via Brevo (offre gratuite). Secrets à ajouter dans Cloudflare Pages :
//   BREVO_API_KEY  = clé API Brevo      EMAIL_FROM = adresse expéditeur validée dans Brevo
//   EMAIL_FROM_NAME (facultatif) = nom affiché, par défaut « Bondy TV »
export function mailOK(env) { return !!(env.BREVO_API_KEY && env.EMAIL_FROM); }

export async function sendMail(env, { to, name, subject, text, html }) {
  if (!mailOK(env)) { console.error("Mail non envoyé : BREVO_API_KEY ou EMAIL_FROM manquant dans Cloudflare"); return false; }
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME || "Bondy TV" }, to: [{ email: to, name: name || to }], subject, textContent: text, ...(html ? { htmlContent: html } : {}) }),
    });
    if (!r.ok) {
      let d = ""; try { d = (await r.text()).slice(0, 300); } catch (e) {}
      console.error("Brevo mail refusé", r.status, d);
      try { if (env.VOTES) await env.VOTES.put("dernier_mail_erreur", JSON.stringify({ quand: new Date().toISOString(), statut: r.status, detail: d }), { expirationTtl: 604800 }); } catch (e) {}
    }
    return r.ok;
  } catch (e) { console.error("Brevo mail erreur réseau", String(e)); return false; }
}
