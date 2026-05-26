interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
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

    // Proxy /api/membership/* ke v5.jkt48connect.com
    if (url.pathname.startsWith("/api/membership")) {
      const path = url.pathname.replace("/api/membership", "");
      const targetUrl = `https://v5.jkt48connect.com/api/membership${path}${url.search}`;

      try {
        const proxyReq = new Request(targetUrl, {
          method: request.method,
          headers: { "Content-Type": "application/json" },
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
      } catch (err: any) {
        return new Response(JSON.stringify({ status: false, error: err.message }), {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    // Semua request lain → serve static assets (SPA)
    return env.ASSETS.fetch(request);
  },
};
