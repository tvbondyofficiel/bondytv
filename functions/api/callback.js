export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers.get("Cookie") || "";
  const saved = (cookie.match(/oauth_state=([^;]+)/) || [])[1];
  if (!code || !state || state !== saved) {
    return new Response("Connexion refusée. Fermez cette fenêtre et recommencez.", { status: 400 });
  }
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "bondytv-admin" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: url.origin + "/api/callback",
    }),
  });
  const data = await r.json();
  const ok = !!data.access_token;
  const payload = ok ? { token: data.access_token, provider: "github" } : { error: data.error || "erreur" };
  const msg = "authorization:github:" + (ok ? "success" : "error") + ":" + JSON.stringify(payload);
  const html = "<!doctype html><html><body><script>(function(){" +
    "var msg=" + JSON.stringify(msg).replace(/</g, "\\u003c") + ";" +
    "function receive(e){window.opener.postMessage(msg,e.origin);window.removeEventListener('message',receive);}" +
    "window.addEventListener('message',receive);" +
    "window.opener.postMessage('authorizing:github','*');" +
    "})();</script></body></html>";
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": "oauth_state=; HttpOnly; Secure; Path=/; Max-Age=0",
    },
  });
}
