export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // ─── Tambahan ini saja yang baru ─────────────────────────────────────────
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const path = url.pathname.replace("/api/membership", "");
  const search = url.search;
  const targetUrl = `https://v5.jkt48connect.com/api/membership${path}${search}`;

  const proxyReq = new Request(targetUrl, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
    },
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });

  const response = await fetch(proxyReq);
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    },
  });
}
