import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function POST(req: NextRequest) {
  try {
    const { email, displayName } = (await req.json()) as { email: string; displayName?: string };
    const res = await fetch(`${API_URL}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: body?.message || "Failed to send code" }, { status: res.status });
    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send code" }, { status: 500 });
  }
}
