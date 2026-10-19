import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({ user_data: z.record(z.string()).optional() }).default({});

export async function POST(request: Request) {
  const apiKey = process.env.BOLNA_API_KEY;
  const agentId = process.env.BOLNA_AGENT_ID;
  if (!apiKey || !agentId) {
    return NextResponse.json({ error: { code: "voice_not_configured", message: "Voice is not configured. You can still ask Scribble by typing.", retryable: false } }, { status: 503 });
  }
  let body: { user_data?: Record<string, string> } = {};
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Invalid voice session request.", retryable: false } }, { status: 400 });
    body = parsed.data;
  } catch {
    body = {};
  }
  try {
    const response = await fetch("https://api.bolna.ai/web-call/freeswitch-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: agentId, user_data: body.user_data ?? {} }),
      cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: { code: "voice_unavailable", message: "The voice provider could not create a session.", retryable: true } }, { status: 502 });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: { code: "voice_unavailable", message: "The voice service could not be reached. Please try again.", retryable: true } }, { status: 502 });
  }
}
