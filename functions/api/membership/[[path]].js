export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Ambil path setelah /api/membership/
  const path = url.pathname.replace("/api/membership", "");
  const search = url.search; // preserve ?apikey=xxx
  
  const targetUrl = `https://v5.jkt48connect.com/api/membership${path}${search}`;
  
  // Forward request ke API worker
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
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
