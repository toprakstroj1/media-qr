import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Get id from path or query
  const url = new URL(req.url);
  let id = url.searchParams.get("id");

  // Also support /api/media/:id via path
  if (!id) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    id = pathParts[pathParts.length - 1];
  }

  if (!id || id === "media") {
    return new Response(JSON.stringify({ error: "Missing media id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const store = getStore({ name: "media-uploads", consistency: "strong" });
    const blob = await store.get(id, { type: "stream" });
    const metadata = await store.getMetadata(id);

    if (!blob) {
      return new Response("Media not found", { status: 404, headers: corsHeaders });
    }

    const contentType = metadata?.metadata?.contentType || "application/octet-stream";

    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("Media fetch error:", err);
    return new Response("Error fetching media", { status: 500, headers: corsHeaders });
  }
};

export const config = {
  path: "/api/media/*",
};
