import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const store = getStore({ name: "media-history", consistency: "strong" });

  if (req.method === "GET") {
    try {
      const text = await store.get("items", { type: "text" });
      const items = text ? JSON.parse(text) : [];
      return new Response(JSON.stringify(items), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  if (req.method === "POST") {
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const authHeader = req.headers.get("Authorization") || "";
    const providedPassword = authHeader.replace("Bearer ", "").trim();

    if (providedPassword !== adminPassword) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    try {
      const payload = await req.json();

      if (!payload || !payload.url || !payload.filename) {
        return new Response(JSON.stringify({ error: "Missing history payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const currentText = await store.get("items", { type: "text" });
      let items = [];

      if (currentText) {
        try {
          items = JSON.parse(currentText);
        } catch {
          items = [];
        }
      }

      const record = {
        id: payload.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        url: payload.url,
        qr: payload.qr || "",
        filename: payload.filename,
        type: payload.type || "unknown",
        size: payload.size || 0,
        uploadedAt: payload.uploadedAt || new Date().toISOString(),
      };

      items.unshift(record);
      const trimmed = items.slice(0, 200);

      await store.set("items", JSON.stringify(trimmed));

      return new Response(JSON.stringify({ success: true, count: trimmed.length }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      console.error("History save error:", err);
      return new Response(JSON.stringify({ error: "History save failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
};

export const config = {
  path: "/api/history",
};
