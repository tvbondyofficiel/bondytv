// T-shirt à personnaliser : le client envoie son texte + l'image du t-shirt tel qu'il l'a vu.
// L'e-mail part vers l'adresse de contact du site (content/site.json > proposer.email) avec l'image en pièce jointe.
// Le paiement reste sur PayPal : la référence TP-… est dans le nom de l'article PayPal.
import { json, cleanLine, sameOrigin, limit } from "../_lib/tribune.js";
import { sendMail, mailOK } from "../_lib/mail.js";

const POLICES = { condense: "Condensée (Barlow Condensed)", ronde: "Ronde (Barlow)", classique: "Classique (Georgia)", machine: "Machine (Courier)" };
const COUL = /^#[0-9a-fA-F]{6}$/;
const MAX_IMG = 1500 * 1024;

function b64(u8) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  if (!mailOK(env)) return json({ error: "mail" }, 503);
  let f;
  try { f = await request.formData(); } catch (e) { return json({ error: "requete" }, 400); }
  if (f.get("botcheck")) return json({ ok: true, ref: "TP-0" });
  if (!(await limit(env, request, "perso", 6, 3600))) return json({ error: "trop_de_tentatives" }, 429);
  let site;
  try { const r = await env.ASSETS.fetch(new Request(new URL("/content/site.json", request.url))); site = await r.json(); } catch (e) { return json({ error: "site" }, 500); }
  const b = site.boutique || {};
  const art = (b.articles || []).find((x) => x.id === String(f.get("article")) && x.perso && !x.cache);
  if (!art) return json({ error: "article" }, 400);
  const to = (site.proposer && site.proposer.email) || "";
  if (!to) return json({ error: "mail" }, 503);
  const taille = String(f.get("taille") || "");
  if ((art.tailles || []).length && (art.tailles || []).indexOf(taille) < 0) return json({ error: "taille" }, 400);
  const qte = Math.max(1, Math.min(10, parseInt(f.get("quantite") || "1", 10) || 1));
  let lignes = [];
  try { lignes = JSON.parse(String(f.get("lignes") || "[]")); } catch (e) {}
  lignes = (Array.isArray(lignes) ? lignes : []).slice(0, 3).map((l) => cleanLine(l, 24)).filter(Boolean);
  if (!lignes.length) return json({ error: "texte" }, 400);
  const police = POLICES[String(f.get("police"))] ? String(f.get("police")) : "condense";
  const ct = String(f.get("couleur_tshirt")), cx = String(f.get("couleur_texte"));
  if (!COUL.test(ct) || !COUL.test(cx)) return json({ error: "couleur" }, 400);
  const nom = cleanLine(f.get("nom"), 80), email = cleanLine(f.get("email"), 120), tel = cleanLine(f.get("telephone"), 30);
  if (nom.length < 3) return json({ error: "nom" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "email" }, 400);
  const img = f.get("image");
  if (!img || typeof img === "string" || !img.size || img.size > MAX_IMG) return json({ error: "image" }, 400);
  const u8 = new Uint8Array(await img.arrayBuffer());
  if (!(u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47)) return json({ error: "image" }, 400);
  const d = new Date(), pad = (n) => String(n).padStart(2, "0");
  const suf = Array.from(crypto.getRandomValues(new Uint8Array(2))).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  const ref = "TP-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + suf;
  const total = (Number(art.prix || 0) * qte).toFixed(2).replace(".", ",");
  const text = [
    "COMMANDE T-SHIRT PERSONNALISÉ " + ref,
    "(le client est maintenant envoyé vers PayPal : cherche " + ref + " dans ses paiements PayPal avant d'imprimer)",
    "",
    "Article : " + art.nom + " — taille " + (taille || "-") + " — quantité " + qte,
    "Prix des articles : " + total + " € (+ livraison)",
    "",
    "TEXTE (une ligne par ligne) :",
    lignes.join("\n"),
    "",
    "Police : " + POLICES[police],
    "Couleur du t-shirt : " + ct,
    "Couleur du texte : " + cx,
    "",
    "Client : " + nom,
    "E-mail : " + email,
    "Téléphone : " + (tel || "non donné"),
    "",
    "L'image jointe montre le t-shirt tel que le client l'a vu.",
  ].join("\n");
  const ok = await sendMail(env, { to, name: "Bondy TV", subject: "T-shirt perso " + ref + " – " + lignes.join(" / "), text, attachments: [{ name: ref + ".png", content: b64(u8) }], replyTo: { email, name: nom } });
  if (!ok) return json({ error: "mail" }, 503);
  return json({ ok: true, ref });
}
