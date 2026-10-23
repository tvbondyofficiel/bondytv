// Paroles validées par Bondy TV (messages des formulaires), publiques : nom affiché + texte relu.
// Jamais de téléphone ni d'adresse.
import { json } from "../_lib/tribune.js";

export async function onRequestGet({ env }) {
  const h = { "Cache-Control": "public, max-age=60" };
  if (!env.VOTES) return json({ items: [] }, 200, h);
  const l = (await env.VOTES.get("mpub", "json")) || [];
  return json({ items: l.slice(0, 60) }, 200, h);
}
