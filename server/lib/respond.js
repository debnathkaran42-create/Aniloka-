/* =========================================================
   ANILOKA — RESPONSE HELPERS
   ========================================================= */

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function ok(res, data = {}) { sendJSON(res, 200, { ok: true, ...data }); }
function created(res, data = {}) { sendJSON(res, 201, { ok: true, ...data }); }
function fail(res, statusCode, message, details) {
  sendJSON(res, statusCode, { ok: false, error: message, details: details || undefined });
}

/** Reads and parses a JSON request body with a size limit (default 15MB, generous enough for base64 images). */
function readJSONBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new ApiError(413, "Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(new ApiError(400, "Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

module.exports = { ApiError, ok, created, fail, sendJSON, readJSONBody };
