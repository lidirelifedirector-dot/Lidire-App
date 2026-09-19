export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Rotas da API
    if (url.pathname.startsWith("/api/")) {
      return api(request, env, url);
    }

    // Arquivos da interface
    return env.ASSETS.fetch(request);
  }
};

async function api(request, env, url) {
  // Verificação do Worker
  if (request.method === "GET" && url.pathname === "/api/health") {
    return Response.json({
      ok: true,
      app: "LiDire MVP 1.0",
      database: !!env.DB
    });
  }

  // Perfil — versão inicial
  if (request.method === "GET" && url.pathname === "/api/profile") {
    if (!env.DB) {
      return Response.json({
        user: null,
        note: "Configure a conexão com o banco D1."
      });
    }

    const user = await env.DB
      .prepare(
        "SELECT id, name, email, age, phone FROM users ORDER BY created_at LIMIT 1"
      )
      .first();

    return Response.json({ user });
  }

  // Endpoint ainda não implementado
  return Response.json(
    {
      error: "Endpoint não implementado nesta etapa.",
      path: url.pathname
    },
    { status: 404 }
  );
}
