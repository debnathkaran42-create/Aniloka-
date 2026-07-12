/* =========================================================
   ANILOKA — IMAGE UPLOAD (base64 -> disk)
   -----------------------------------------------------------
   The admin panel sends images as base64 data URLs in JSON
   (simpler than multipart/form-data parsing without a
   dependency). This decodes and writes them to server/uploads/
   and returns a public path the frontend can use directly.
   This IS AniLoka's own storage system — real files, on your
   own disk, no third-party storage service involved.
   ========================================================= */
const fs = require("node:fs");
const path = require("node:path");
const { randomId } = require("./crypto");
const { ApiError } = require("./respond");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per image

const EXT_BY_MIME = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif",
};

/**
 * dataUrl: "data:image/jpeg;base64,....."
 * subdir: e.g. "covers", "banners", or "pages/<mangaId>/<chapterId>"
 * Returns the public path e.g. "/uploads/covers/xyz.jpg"
 */
function saveBase64Image(dataUrl, subdir) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new ApiError(400, "Expected a base64 image data URL.");
  }
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new ApiError(400, "Malformed image data URL.");
  const mime = match[1];
  const ext = EXT_BY_MIME[mime] || "jpg";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_IMAGE_BYTES) throw new ApiError(413, "Image too large (max 8MB).");

  const dir = path.join(UPLOAD_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${randomId()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`.replace(/\\/g, "/");
}

/** Deletes a previously-saved public path (e.g. "/uploads/covers/xyz.jpg"), ignoring missing files. */
function deleteUploadedFile(publicPath) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, publicPath.replace("/uploads/", ""));
  fs.rm(filePath, { force: true }, () => {});
}

module.exports = { saveBase64Image, deleteUploadedFile, UPLOAD_ROOT };
