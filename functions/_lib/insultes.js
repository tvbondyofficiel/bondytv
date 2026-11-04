// Liste simple de mots injurieux et de menaces (sans accents, en minuscules).
// Sert à bloquer les messages audio et texte. Mohammed écoute et relit de toute façon avant toute publication.
const MOTS = ["abruti", "batard", "bicot", "bite", "bougnoule", "branleur", "connard", "connasse", "couille", "cretin", "creve", "creves", "debile", "encule", "enculer", "fdp", "ferme ta gueule", "fils de pute", "gouine", "grognasse", "je te retrouve", "je vais le tuer", "je vais les tuer", "je vais te buter", "je vais te casser", "je vais te frapper", "je vais te retrouver", "je vais te tuer", "je vais vous buter", "je vais vous frapper", "je vais vous tuer", "merde", "mort a", "negre", "negro", "nique", "nique ta mere", "ntm", "on va te tuer", "on va vous casser", "on va vous tuer", "ordure", "pd", "pede", "petasse", "pourriture", "putain", "pute", "racaille", "raton", "sale arabe", "sale blanc", "sale juif", "sale noir", "sale race", "salope", "sous-merde", "ta gueule", "tapette", "tarlouze", "tg", "trou du cul", "trouduc", "tu vas payer", "va te faire foutre", "vermine", "vous allez payer", "youpin"];
function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim(); }
export function contientInjure(texte) {
  const t = " " + norm(texte) + " ";
  return MOTS.some((m) => t.indexOf(" " + m + " ") >= 0 || t.indexOf(" " + m + "s ") >= 0);
}
