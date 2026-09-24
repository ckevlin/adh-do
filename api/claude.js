// ADHDo's brain stem — deploy at adhdoapp.com/api/claude
//
// WHERE THIS FILE GOES in your website repo:
//   • plain / static / Vite site  →  /api/claude.js   (this exact path)
//   • Next.js (pages router)      →  /pages/api/claude.js
//   • Next.js (app router)        →  ask me for the route.js flavor
//
// THEN, in Vercel → your project → Settings → Environment Variables:
//   ANTHROPIC_API_KEY = sk-ant-...   (your key — it lives ONLY here)
//
// Push to git; Vercel deploys; done. Test from any terminal:
//   curl -X POST https://www.adhdoapp.com/api/claude \
//     -H 'content-type: application/json' \
//     -d '{"messages":[{"role":"user","content":"say hi"}]}'

const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6",   // the app's one and only model today
]);
const MAX_TOKENS_CEILING = 1000; // the wallet's seatbelt

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "POST only" } });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: { message: "server missing ANTHROPIC_API_KEY" } });
  }

  const b = req.body || {};
  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return res.status(400).json({ error: { message: "messages required" } });
  }

  // only forward the fields the app legitimately uses, clamped
  const body = {
    model: ALLOWED_MODELS.has(b.model) ? b.model : "claude-sonnet-4-6",
    max_tokens: Math.min(Number(b.max_tokens) || MAX_TOKENS_CEILING, MAX_TOKENS_CEILING),
    messages: b.messages,
  };
  if (typeof b.system === "string") body.system = b.system;
  if (Array.isArray(b.tools)) body.tools = b.tools;

  // the anonymous per-install id rides along in logs, so a single abusive
  // device can be identified and blocked later without tracking anyone
  const device = req.headers["x-adhdo-device"] || "unknown";
  console.log(`adhdo request device=${device} msgs=${body.messages.length}`);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: { message: "upstream unreachable" } });
  }
}
