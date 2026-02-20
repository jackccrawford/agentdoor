import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";

const PORT = process.env.PORT || 3847;
const API_KEY = process.env.AGENTDOOR_API_KEY;
const LISTINGS_FILE = "/root/Dev/ShipAgents/AGENTDOOR/listings.jsonl";

// Rate limiting: 10 requests per minute per IP
const rateMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now - entry.start > RATE_WINDOW) rateMap.delete(ip);
  }
}, 300000);

const PROMPT_PREFIX = `Given this webpage content, return ONLY valid JSON with these fields (omit any you can't determine):

{
  "serviceName": "lowercase-hyphenated-name",
  "pitch": "3-4 sentences for a robots.txt comment block. What it does, how to connect programmatically, and one honest limitation. No marketing. Plain text.",
  "description": "One sentence describing what the service does",
  "endpoint": "The API endpoint URL if found",
  "protocol": "REST or MCP or GraphQL or gRPC or WebSocket",
  "capabilities": "comma-separated list of key operations",
  "pricingModel": "per-request or subscription or tiered or free or contact",
  "price": "numeric price per unit if applicable",
  "authMethod": "API key or OAuth2 or Bearer token or x402 or none",
  "authUrl": "URL where users sign up or get credentials",
  "docsUrl": "Documentation URL",
  "statusUrl": "Status page URL",
  "contactUrl": "Contact or support URL"
}

Only return JSON. No markdown fences, no explanation.

---

Analyze this webpage:

`;

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AgentDoor/1.0 (https://agentdoor.ai; service analyzer)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html) {
  const metas = [];
  const metaPattern = /<meta[^>]*>/gi;
  let match;
  while ((match = metaPattern.exec(html)) !== null) metas.push(match[0]);

  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  const jsonLd = jsonLdMatch ? jsonLdMatch[1].trim() : "";

  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 6000) text = text.slice(0, 6000) + "...";

  let content = "";
  if (metas.length) content += "Meta tags:\n" + metas.join("\n") + "\n\n";
  if (jsonLd) content += "JSON-LD:\n" + jsonLd + "\n\n";
  content += "Page text:\n" + text;
  return content;
}

function analyzeWithClaude(pageContent) {
  const prompt = PROMPT_PREFIX + pageContent;
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", ["-p", "--model", "claude-haiku-4-5-20251001"], {
      cwd: "/root/Dev/ShipAgents/AGENTDOOR",
      env: { ...process.env, TERM: "dumb" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (chunk) => { stdout += chunk; });
    proc.stderr.on("data", (chunk) => { stderr += chunk; });
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${stderr.slice(0, 200)}`));
      try {
        const cleaned = stdout.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        resolve(JSON.parse(cleaned));
      } catch (err) {
        reject(new Error(`Failed to parse JSON: ${stdout.slice(0, 200)}`));
      }
    });
    proc.on("error", reject);
    const timeout = setTimeout(() => { proc.kill(); reject(new Error("claude timed out after 30s")); }, 30000);
    proc.on("close", () => clearTimeout(timeout));
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

// --- Listings file (JSONL) ---

function registerListing(listing) {
  const line = JSON.stringify({ ...listing, _ts: new Date().toISOString() }) + "\n";
  fs.appendFileSync(LISTINGS_FILE, line);
  console.log(`[register] ${listing.serviceName || "unknown"}`);
}

function getListingCount() {
  return getAllListings().length;
}

function getAllListings() {
  try {
    const data = fs.readFileSync(LISTINGS_FILE, "utf8");
    const lines = data.trim().split("\n").filter(Boolean);
    // Deduplicate by serviceName, keeping latest entry
    const map = new Map();
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        map.set(entry.serviceName, entry);
      } catch {}
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

// Seed file if it doesn't exist
if (!fs.existsSync(LISTINGS_FILE)) {
  fs.writeFileSync(LISTINGS_FILE, "");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-AgentDoor-Key",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-AgentDoor-Key",
    });
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { status: "ok", service: "agentdoor-analyze" });
  }

  if (req.method === "GET" && req.url === "/stats") {
    return sendJson(res, 200, { count: getListingCount() });
  }

  if (req.method === "GET" && req.url.startsWith("/directory")) {
    const params = new URL(req.url, "http://localhost").searchParams;
    let listings = getAllListings();

    const q = params.get("q")?.toLowerCase();
    const protocol = params.get("protocol")?.toLowerCase();
    const pricing = params.get("pricing")?.toLowerCase();

    if (q) {
      listings = listings.filter(l =>
        (l.serviceName || "").toLowerCase().includes(q) ||
        (l.description || "").toLowerCase().includes(q) ||
        (l.capabilities || "").toLowerCase().includes(q)
      );
    }
    if (protocol) {
      listings = listings.filter(l => (l.protocol || "").toLowerCase() === protocol);
    }
    if (pricing) {
      listings = listings.filter(l => (l.pricingModel || "").toLowerCase() === pricing);
    }

    // Sort alphabetically by serviceName
    listings.sort((a, b) => (a.serviceName || "").localeCompare(b.serviceName || ""));

    return sendJson(res, 200, { count: listings.length, listings });
  }

  if (req.method === "POST" && req.url === "/register") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const listing = JSON.parse(body);
      if (!listing.serviceName) return sendJson(res, 400, { error: "serviceName required" });
      registerListing(listing);
      return sendJson(res, 200, { ok: true });
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON" });
    }
  }

  if (req.method !== "POST" || req.url !== "/analyze") {
    return sendJson(res, 404, { error: "Not found" });
  }

  if (API_KEY && req.headers["x-agentdoor-key"] !== API_KEY) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    return sendJson(res, 429, { error: "Rate limit exceeded. Try again in a minute." });
  }

  let body = "";
  for await (const chunk of req) body += chunk;

  let url;
  try { url = JSON.parse(body).url; } catch { return sendJson(res, 400, { error: "Invalid JSON" }); }
  if (!url || typeof url !== "string") return sendJson(res, 400, { error: "URL is required" });
  if (!url.startsWith("http")) url = `https://${url}`;
  try { new URL(url); } catch { return sendJson(res, 400, { error: "Invalid URL" }); }

  try {
    const origin = new URL(url).origin;
    const robotsUrl = `${origin}/robots.txt`;

    // Fetch page and existing robots.txt in parallel
    console.log(`[analyze] Fetching ${url} + ${robotsUrl}`);
    const [html, existingRobots] = await Promise.all([
      fetchPage(url),
      fetch(robotsUrl, {
        headers: { "User-Agent": "AgentDoor/1.0 (https://agentdoor.ai; service analyzer)" },
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      })
        .then(r => r.ok ? r.text() : null)
        .catch(() => null),
    ]);

    console.log(`[analyze] Extracting content (${html.length} bytes)`);
    const content = stripHtml(html);
    console.log(`[analyze] Sending to claude -p`);
    const result = await analyzeWithClaude(content);
    console.log(`[analyze] Done:`, result.serviceName || "unknown");

    // Include existing robots.txt if found
    if (existingRobots) {
      result.existingRobotsTxt = existingRobots.trim();
    }

    return sendJson(res, 200, result);
  } catch (err) {
    console.error(`[analyze] Error:`, err.message);
    return sendJson(res, 502, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[agentdoor-analyze] Listening on port ${PORT}`);
  console.log(`[agentdoor-analyze] Listings: ${LISTINGS_FILE} (${getListingCount()} entries)`);
});
