import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const TOKEN_COOKIE = "rashpod_jwt";
const MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;

export async function POST(req: NextRequest) {
  try {
    const { email, code } = (await req.json()) as { email: string; code: string };
    const verifyRes = await fetch(`${API_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!verifyRes.ok) {
      const body = await verifyRes.json().catch(() => ({}));
      return NextResponse.json({ error: body?.message || "Verification failed" }, { status: verifyRes.status });
    }
    const { accessToken } = (await verifyRes.json()) as { accessToken: string };
    const meRes = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const user = meRes.ok ? await meRes.json() : null;
    const res = NextResponse.json({ user, role: user?.role || "CUSTOMER" });
    res.cookies.set(TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    });
    return res;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 500 });
  }
}
