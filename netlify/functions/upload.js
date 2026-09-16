import { getStore } from "@netlify/blobs";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // Netlify function request limits are much lower than a 50MB upload
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

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Simple password check from env
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const authHeader = req.headers.get("Authorization") || "";
  const providedPassword = authHeader.replace("Bearer ", "").trim();

  if (providedPassword !== adminPassword) {
    return new Response(JSON.stringify({ error: "Unauthorized - wrong password" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "video/mp4", "video/webm", "video/ogg", "video/quicktime"
    ];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Unsupported file type. Use image or video." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Netlify function request limit is smaller than the app's earlier 50MB ceiling.
    if (file.size > MAX_UPLOAD_BYTES) {
      return new Response(JSON.stringify({
        error: `File too large for Netlify upload (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB). Use a smaller file or external storage.`
      }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const id = uuidv4();
    const store = getStore({ name: "media-uploads", consistency: "strong" });

    // Store the file
    await store.set(id, file, {
      metadata: {
        contentType: file.type,
        filename: file.name,
        size: String(file.size),
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://your-site.netlify.app";
    const mediaUrl = `${siteUrl}/m/${id}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(mediaUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new Response(
      JSON.stringify({
        success: true,
        id,
        url: mediaUrl,
        qr: qrDataUrl,
        filename: file.name,
        type: file.type,
        size: file.size,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ error: "Upload failed: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

export const config = {
  path: "/api/upload",
};
