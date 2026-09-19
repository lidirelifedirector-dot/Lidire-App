
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return api(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};

async function api(request, env, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return Response.json({ok:true, app:"LiDire — Versão Comercial 1.0", database:!!env.DB});
  }

  // MVP starter endpoints. D1 binding is named DB in wrangler.toml.
  // Authentication and full CRUD are intentionally isolated here for the next implementation pass.
  if (request.method === "GET" && url.pathname === "/api/profile") {
    if (!env.DB) return Response.json({user:null, note:"Configure D1 binding DB."});
    const user = await env.DB.prepare("SELECT id, name, email, age, phone FROM users ORDER BY created_at LIMIT 1").first();
    return Response.json({user});
  }

  return Response.json({error:"Endpoint não implementado nesta etapa.", path:url.pathname}, {status:404});
}
