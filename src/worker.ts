export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

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

    // ── BetterStack proxy ──────────────────────────────────────────────────────
    if (url.pathname.startsWith("/api/betterstack")) {
      const path = url.pathname.replace("/api/betterstack", "");
      const targetUrl = `https://uptime.betterstack.com/api/v2${path}${url.search}`;
      try {
        const response = await fetch(targetUrl, {
          headers: { Authorization: `Bearer PD9NoNnChnSrnNyjhew1DuJh` },
        });
        const data = await response.text();
        return new Response(data, {
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

    // ── Membership proxy ───────────────────────────────────────────────────────
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

    return env.ASSETS.fetch(request);
  },
};
