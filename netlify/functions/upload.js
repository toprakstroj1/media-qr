import { v2 as cloudinary } from "cloudinary";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const authHeader = req.headers.get("Authorization") || "";
  const providedPassword = authHeader.replace("Bearer ", "").trim();

  if (providedPassword !== adminPassword) {
    return new Response(JSON.stringify({ error: "Unauthorized - wrong password" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({
        error: "Cloudinary environment variables are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: "media-qr",
      },
      apiSecret
    );

    return new Response(
      JSON.stringify({
        success: true,
        cloudName,
        apiKey,
        timestamp,
        signature,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        folder: "media-qr",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("Cloudinary config error:", err);
    return new Response(JSON.stringify({ error: "Cloudinary config failed: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

export const config = {
  path: "/api/upload",
};
