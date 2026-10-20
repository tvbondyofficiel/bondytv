export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const target = new URL("https://github.com/login/oauth/authorize");
  target.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  target.searchParams.set("redirect_uri", url.origin + "/api/callback");
  target.searchParams.set("scope", "repo,user");
  target.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Set-Cookie": "oauth_state=" + state + "; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Lax",
    },
  });
}
