// Envoi d'e-mails via Brevo (offre gratuite). Secrets à ajouter dans Cloudflare Pages :
//   BREVO_API_KEY  = clé API Brevo      EMAIL_FROM = adresse expéditeur validée dans Brevo
//   EMAIL_FROM_NAME (facultatif) = nom affiché, par défaut « Bondy TV »
export function mailOK(env) { return !!(env.BREVO_API_KEY && env.EMAIL_FROM); }

export async function sendMail(env, { to, name, subject, text }) {
  if (!mailOK(env)) return false;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME || "Bondy TV" }, to: [{ email: to, name: name || to }], subject, textContent: text }),
    });
    return r.ok;
  } catch (e) { return false; }
}
