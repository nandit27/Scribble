import { NextResponse } from "next/server";

async function forward(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!baseUrl) return NextResponse.json({ error: "Tutor service is not configured." }, { status: 503 });
  const { path } = await params;
  const target = `${baseUrl}/api/v1/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  try {
    const response = await fetch(target, {
      method: request.method,
      headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" },
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ error: "Cannot reach the tutor service. Start the API and check NEXT_PUBLIC_API_URL." }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
