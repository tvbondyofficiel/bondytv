// Page « Témoigner ou proposer » : message avec pièce jointe facultative (photo ou PDF).
// Les messages et fichiers sont lus seulement par Mohammed (page de modération), jamais publics.
import { contientInjure } from "../_lib/insultes.js";
import { json, clean, cleanLine, normTel, validLink, sameOrigin, limit } from "../_lib/tribune.js";

const MAX_PIECE = 8 * 1024 * 1024;
const MAX_AUDIO = 4 * 1024 * 1024;
const TYPES = ["Un témoignage", "Une vidéo", "Mon point de vue (vidéo d'1 min 10 maximum)", "Une photo", "Une idée de sujet", "Logement", "Ce qui doit changer à Bondy", "L'essentiel", "Invité du podcast", "Idée de t-shirt (boutique)"];

function typeReel(u8) {
  if (u8.length > 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) return "application/pdf";
  if (u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return "image/jpeg";
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return "image/png";
  if (u8.length > 4 && u8[0] === 0x1a && u8[1] === 0x45 && u8[2] === 0xdf && u8[3] === 0xa3) return "audio/webm";
  if (u8.length > 4 && u8[0] === 0x4f && u8[1] === 0x67 && u8[2] === 0x67 && u8[3] === 0x53) return "audio/ogg";
  if (u8.length > 12 && u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) return "audio/mp4";
  if (u8.length > 3 && ((u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) || (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0))) return "audio/mpeg";
  if (u8.length > 12 && u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46 && u8[8] === 0x57 && u8[9] === 0x41 && u8[10] === 0x56 && u8[11] === 0x45) return "audio/wav";
  return "";
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  let f;
  try { f = await request.formData(); } catch (e) { return json({ error: "requete" }, 400); }
  if (f.get("botcheck")) return json({ ok: true });
  if (!(await limit(env, request, "message", 8, 3600))) return json({ error: "trop_de_tentatives" }, 429);
  const nom = cleanLine(f.get("nom"), 80), tel = normTel(f.get("telephone")), adresse = cleanLine(f.get("adresse"), 120);
  const fileA = f.get("piece");
  const aAudio = !!(fileA && typeof fileA !== "string" && fileA.size && /^audio\//.test(fileA.type || ""));
  const message = clean(f.get("message"), 5000) || (aAudio ? "Témoignage audio" : ""), lien = validLink(f.get("lien"));
  const type = TYPES.indexOf(String(f.get("type"))) >= 0 ? String(f.get("type")) : "Un témoignage";
  if (nom.length < 3 || nom.indexOf(" ") < 0) return json({ error: "nom" }, 400);
  if (!tel) return json({ error: "tel" }, 400);
  if (adresse.length < 5) return json({ error: "adresse" }, 400);
  if (message.length < 5) return json({ error: "message" }, 400);
  if (contientInjure(message)) return json({ error: "injure" }, 400);
  if (lien === null) return json({ error: "lien" }, 400);
  if (!f.get("accord")) return json({ error: "accord" }, 400);
  const ts = Date.now();
  const suf = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((x) => x.toString(16).padStart(2, "0")).join("");
  const id = ts + "-" + suf;
  let page = "";
  try { page = new URL(request.headers.get("Referer") || "").pathname.replace(/\.html$/, "").replace(/^\//, ""); } catch (e) {}
  if (["logement", "essentiel", "temoigner", "ecrire"].indexOf(page) < 0) page = "";
  if (page === "ecrire") page = "temoigner";
  const rec = { nom, tel, adresse, type, message, lien: lien || "", ts, page };
  const file = f.get("piece");
  if (file && typeof file !== "string" && file.size) {
    if (file.size > MAX_PIECE || (aAudio && file.size > MAX_AUDIO)) return json({ error: "piece_taille" }, 413);
    const buf = await file.arrayBuffer();
    const t = typeReel(new Uint8Array(buf));
    if (!t) return json({ error: "piece_type" }, 415);
    if (t.indexOf("audio/") === 0 && file.size > MAX_AUDIO) return json({ error: "piece_taille" }, 413);
    if (t.indexOf("audio/") === 0 && env.AI) {
      // Transcription automatique (si disponible) : un audio avec injure ou menace est refusé.
      try {
        const out = await env.AI.run("@cf/openai/whisper", { audio: Array.from(new Uint8Array(buf)) });
        const txt = String((out && out.text) || "");
        if (contientInjure(txt)) return json({ error: "injure" }, 400);
        if (txt) rec.transcription = txt.slice(0, 3000);
      } catch (e) {}
    }
    await env.VOTES.put("tf:" + id, buf);
    rec.piece = { type: t, taille: file.size };
  }
  await env.VOTES.put("tm:" + id, JSON.stringify(rec));
  return json({ ok: true });
}
