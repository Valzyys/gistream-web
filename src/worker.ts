// ── Helpers: mask sensitive BetterStack fields ────────────────────────────────

function maskBetterstackResponse(json: any): any {
  if (json?.data && !Array.isArray(json.data)) {
    return { ...json, data: maskItem(json.data) };
  }
  if (json?.data && Array.isArray(json.data)) {
    return { ...json, data: json.data.map(maskItem) };
  }
  return json;
}

function maskItem(item: any): any {
  if (!item?.attributes) return item;
  const attrs = { ...item.attributes };

  delete attrs.url;
  delete attrs.auth_username;
  delete attrs.auth_password;
  delete attrs.request_headers;
  delete attrs.environment_variables;
  delete attrs.request_body;
  delete attrs.proxy_host;
  delete attrs.proxy_port;
  delete attrs.playwright_script;
  delete attrs.required_keyword;
  delete attrs.policy_id;
  delete attrs.expiration_policy_id;
  delete attrs.monitor_group_id;

  return { ...item, attributes: attrs };
}

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

// ── Main worker ───────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" },
      });
    }

    // ── BetterStack v3 proxy (incidents) ─────────────────────────────────────
    // Harus dicek SEBELUM /api/betterstack agar tidak tertimpa
    if (url.pathname.startsWith("/api/betterstack/v3")) {
      const path = url.pathname.replace("/api/betterstack/v3", "");
      const targetUrl = `https://uptime.betterstack.com/api/v3${path}${url.search}`;

      try {
        const response = await fetch(targetUrl, {
          headers: { Authorization: `Bearer ${env.BETTERSTACK_TOKEN}` },
        });

        const text = await response.text();
        let sanitized = text;

        try {
          const json = JSON.parse(text);
          sanitized = JSON.stringify(maskBetterstackResponse(json));
        } catch {
          // bukan JSON, kirim apa adanya
        }

        return new Response(sanitized, {
          status: response.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ status: false, error: err.message }),
          {
            status: 502,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          }
        );
      }
    }

    // ── BetterStack v2 proxy (monitors, SLA, response-times) ─────────────────
    if (url.pathname.startsWith("/api/betterstack")) {
      const path = url.pathname.replace("/api/betterstack", "");
      const targetUrl = `https://uptime.betterstack.com/api/v2${path}${url.search}`;

      try {
        const response = await fetch(targetUrl, {
          headers: { Authorization: `Bearer ${env.BETTERSTACK_TOKEN}` },
        });

        const text = await response.text();
        let sanitized = text;

        try {
          const json = JSON.parse(text);
          sanitized = JSON.stringify(maskBetterstackResponse(json));
        } catch {
          // bukan JSON, kirim apa adanya
        }

        return new Response(sanitized, {
          status: response.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ status: false, error: err.message }),
          {
            status: 502,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          }
        );
      }
    }

    // ── Membership proxy ──────────────────────────────────────────────────────
    if (url.pathname.startsWith("/api/membership")) {
      const path = url.pathname.replace("/api/membership", "");
      const targetUrl = `https://v5.jkt48connect.com/api/membership${path}${url.search}`;

      try {
        const proxyReq = new Request(targetUrl, {
          method: request.method,
          headers: { "Content-Type": "application/json" },
          body: ["GET", "HEAD"].includes(request.method)
            ? undefined
            : request.body,
        });
        const response = await fetch(proxyReq);
        const data = await response.json();

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ status: false, error: err.message }),
          {
            status: 502,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
