import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.BOLNA_API_KEY;
  const agentId = process.env.BOLNA_AGENT_ID;
  if (!apiKey || !agentId) {
    return NextResponse.json({ code: "voice_not_configured", message: "Voice is not configured. You can still ask Scribble by typing." }, { status: 503 });
  }
  let requestBody: { user_data?: Record<string, string> } = {};
  try { requestBody = await request.json(); } catch { /* user data is optional */ }
  try {
    const response = await fetch("https://api.bolna.ai/web-call/freeswitch-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: agentId, user_data: requestBody.user_data ?? {} }),
      cache: "no-store"
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ code: "voice_unavailable", message: "The voice service could not be reached. Please try again." }, { status: 502 });
  }
}
