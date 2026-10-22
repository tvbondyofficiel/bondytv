// Espace de l'élu : connexion par code, voir ses tribunes, en envoyer une.
import { json, sha, clean, cleanLine, MAX_TITRE, MAX_TEXTE, MAX_IMAGE, estPro, normTel, typeFichier, parMois, ANNONCES_PAR_MOIS, codeHash, same, newToken, setCookie, session, cookieToken, sameOrigin, limit, listPrefix, validLink, SESSION_TTL } from "../_lib/tribune.js";

export async function onRequestGet({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  const acc = await session(request, env);
  if (!acc) return json({ connecte: false });
  const mes = (await listPrefix(env, "tt:" + acc.id + ":")).sort((a, b) => b.ts - a.ts)
    .map((t) => ({ type: t.type || "texte", titre: t.titre, texte: t.texte, lien: t.lien, statut: t.statut, motif: t.motif || "", image: !!t.image, ts: t.ts }));
  return json({ connecte: true, role: acc.role || "elu", nom: acc.nom, structure: acc.structure || "", fonction: acc.fonction, groupe: acc.groupe, tribunes: mes, max_titre: MAX_TITRE, max_texte: MAX_TEXTE, par_mois: parMois(acc.role), annonces_par_mois: ANNONCES_PAR_MOIS });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "non_branche" }, 503);
  if (!sameOrigin(request)) return json({ error: "origine" }, 403);
  let b, img = null;
  try {
    if ((request.headers.get("Content-Type") || "").includes("multipart/form-data")) {
      const f = await request.formData();
      b = {};
      for (const [k, v] of f.entries()) if (typeof v === "string") b[k] = v;
      b.accord = b.accord === "1" || b.accord === "true";
      const im = f.get("image");
      if (im && typeof im !== "string" && im.size) img = im;
    } else b = await request.json();
  } catch (e) { return json({ error: "requete" }, 400); }

  if (b.action === "connexion") {
    if (!(await limit(env, request, "login", 10, 3600))) return json({ error: "trop_de_tentatives" }, 429);
    const id = String(b.id || "").toLowerCase().trim();
    const acc = id ? await env.VOTES.get("ta:" + id, "json") : null;
    // même durée de calcul que le compte existe ou non
    const h = await codeHash(env, id || "-", b.code);
    const lock = id ? parseInt((await env.VOTES.get("tl:" + id)) || "0", 10) : 0;
    if (lock >= 5) return json({ error: "verrouille" }, 429);
    if (!acc || !acc.actif || !same(acc.ch, h)) {
      if (acc) await env.VOTES.put("tl:" + id, String(lock + 1), { expirationTtl: 900 });
      return json({ error: "identifiants" }, 401);
    }
    await env.VOTES.delete("tl:" + id);
    const token = newToken();
    await env.VOTES.put("ts:" + token, acc.id, { expirationTtl: SESSION_TTL });
    return json({ ok: true }, 200, { "Set-Cookie": setCookie(token, SESSION_TTL) });
  }

  if (b.action === "deconnexion") {
    const t = cookieToken(request);
    if (t) await env.VOTES.delete("ts:" + t);
    return json({ ok: true }, 200, { "Set-Cookie": setCookie("", 0) });
  }

  const acc = await session(request, env);
  if (!acc) return json({ error: "non_connecte" }, 401);

  if (b.action === "envoyer") {
    if (!(await limit(env, request, "send", 20, 3600))) return json({ error: "trop_de_tentatives" }, 429);
    const titre = cleanLine(b.titre, MAX_TITRE), texte = clean(b.texte, MAX_TEXTE);
    const vg = acc.role === "videgrenier"; // compte vide-grenier : annonces uniquement
    const hab = acc.role === "habitant" || vg, pro = estPro(acc.role);
    const annonce = hab && (vg || b.type === "annonce");
    const lien = hab ? "" : validLink(b.lien);
    if (titre.length < 3) return json({ error: "titre" }, 400);
    if (texte.length < 20 && !lien) return json({ error: "texte" }, 400);
    if (lien === null) return json({ error: "lien" }, 400);
    if (!b.accord) return json({ error: "accord" }, 400);
    let imgBuf = null, imgType = "";
    if (img) {
      if (!pro && !vg) return json({ error: "image" }, 400);
      if (img.size > MAX_IMAGE) return json({ error: "image_taille" }, 413);
      imgBuf = await img.arrayBuffer();
      imgType = typeFichier(new Uint8Array(imgBuf), false);
      if (!imgType) return json({ error: "image_type" }, 415);
    }
    // Annonce vide-grenier : catégorie, téléphone et quartier (jamais l'adresse complète)
    let extra = {};
    if (vg) {
      const categorie = String(b.categorie || "");
      if (!["donner", "vendre", "cherche", "service"].includes(categorie)) return json({ error: "categorie" }, 400);
      const tel = normTel(b.tel);
      if (!tel) return json({ error: "tel" }, 400);
      const quartier = cleanLine(b.quartier, 60);
      if (quartier.length < 2) return json({ error: "quartier" }, 400);
      extra = { categorie, tel, quartier, prix: cleanLine(b.prix, 30) };
    }
    const debut = new Date(); debut.setUTCDate(1); debut.setUTCHours(0, 0, 0, 0);
    const duMois = (await listPrefix(env, "tt:" + acc.id + ":")).filter((t) => t.ts >= debut.getTime() && t.statut !== "retire" && t.statut !== "refuse"); // une annonce refusée ne compte pas dans la limite
    if (annonce) {
      if (duMois.filter((t) => t.type === "annonce").length >= ANNONCES_PAR_MOIS) return json({ error: "quota_annonce", par_mois: ANNONCES_PAR_MOIS }, 429);
    } else if (duMois.filter((t) => t.type !== "annonce").length >= parMois(acc.role)) return json({ error: "quota", par_mois: parMois(acc.role) }, 429);
    const ts = Date.now();
    const suf = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((x) => x.toString(16).padStart(2, "0")).join("");
    const cle = "tt:" + acc.id + ":" + ts + "-" + suf;
    await env.VOTES.put(cle, JSON.stringify({ role: vg ? "habitant" : (acc.role || "elu"), type: pro ? acc.role : annonce ? "annonce" : "texte", nom: acc.nom, structure: acc.structure || "", fonction: acc.fonction, groupe: acc.groupe, titre, texte, lien, image: imgType, statut: "attente", ts, ...extra }));
    if (imgBuf) await env.VOTES.put("ti:" + cle.slice(3), imgBuf);
    return json({ ok: true });
  }
  return json({ error: "action" }, 400);
}
