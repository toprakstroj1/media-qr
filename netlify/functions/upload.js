import { getStore } from "@netlify/blobs";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "node:stream";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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

  if (!cloudName || !apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({
        error: "Cloudinary environment variables are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
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

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: file.type.startsWith("video/") ? "video" : "image",
          folder: "media-qr",
          public_id: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });

    const id = uuidv4();
    const store = getStore({ name: "media-uploads", consistency: "strong" });
    const mediaUrl = uploadResult.secure_url || uploadResult.url;

    await store.set(id, JSON.stringify({
      id,
      mediaUrl,
      contentType: file.type,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      source: "cloudinary",
    }));

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://your-site.netlify.app";
    const qrUrl = `${siteUrl}/m/${id}`;

    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new Response(
      JSON.stringify({
        success: true,
        id,
        url: qrUrl,
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
