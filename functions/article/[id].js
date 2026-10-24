// /article/<id> : sert la page article.html avec le titre, la description et l'image de l'article
// (pour les aperçus WhatsApp, Facebook, Google). Le contenu s'affiche ensuite côté navigateur.
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const id = decodeURIComponent(String(params.id || ""));
  let page = await env.ASSETS.fetch(new URL("/article.html", url));
  if (page.status >= 300 && page.status < 400 && page.headers.get("Location")) page = await env.ASSETS.fetch(new URL(page.headers.get("Location"), url));
  let art = null;
  try {
    const j = await (await env.ASSETS.fetch(new URL("/content/site.json", url))).json();
    art = (j.articles || []).find((a) => a.id === id && a.id !== "edito") || null;
  } catch (e) {}
  if (!art) return new Response(page.body, { status: 404, headers: page.headers });
  const title = String(art.titre || "") + " · Bondy TV Magazine";
  const descr = (String(art.chapo || art.texte_visible || "").replace(/\*\*|\[|\]\([^)]*\)/g, "").slice(0, 200));
  const link = "https://www.bondytv.com/article/" + encodeURIComponent(art.id);
  const img = art.image ? "https://www.bondytv.com" + art.image : "";
  const set = (attr) => ({ element(e) { e.setAttribute(attr[0], attr[1]); } });
  let rw = new HTMLRewriter()
    .on("title", { element(e) { e.setInnerContent(title, { html: false }); } })
    .on('meta[name="description"]', set(["content", descr]))
    .on('meta[property="og:title"]', set(["content", String(art.titre || "")]))
    .on('meta[property="og:description"]', set(["content", descr]))
    .on('meta[property="og:url"]', set(["content", link]))
    .on('link[rel="canonical"]', set(["href", link]));
  if (img) rw = rw.on('meta[property="og:image"]', set(["content", img]));
  const res = rw.transform(new Response(page.body, page));
  const h = new Headers(res.headers);
  h.set("Cache-Control", "public, max-age=300");
  return new Response(res.body, { status: 200, headers: h });
}
