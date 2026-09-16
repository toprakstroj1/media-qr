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

  const url = new URL(req.url);
  let id = url.searchParams.get("id");

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
    const recordText = await store.get(id, { type: "text" });

    if (!recordText) {
      const legacyBlob = await store.get(id, { type: "stream" });
      if (!legacyBlob) {
        return new Response("Media not found", { status: 404, headers: corsHeaders });
      }

      const metadata = await store.getMetadata(id);
      const contentType = metadata?.metadata?.contentType || "application/octet-stream";
      return new Response(legacyBlob, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          ...corsHeaders,
        },
      });
    }

    const record = JSON.parse(recordText);
    const mediaUrl = record.mediaUrl;

    if (mediaUrl) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: mediaUrl,
          ...corsHeaders,
        },
      });
    }

    return new Response("Media not found", { status: 404, headers: corsHeaders });
  } catch (err) {
    console.error("Media fetch error:", err);
    return new Response("Error fetching media", { status: 500, headers: corsHeaders });
  }
};

export const config = {
  path: "/api/media/*",
};
