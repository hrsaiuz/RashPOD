import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const TOKEN_COOKIE = "rashpod_jwt";
const MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = { ...body, role: body?.role ?? "CUSTOMER" };
    const apiRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!apiRes.ok) {
      const err = await apiRes.json().catch(() => ({}));
      return NextResponse.json({ error: err?.message || "Registration failed" }, { status: apiRes.status });
    }
    const { accessToken } = (await apiRes.json()) as { accessToken: string };
    const meRes = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const user = meRes.ok ? await meRes.json() : null;

    const res = NextResponse.json({ user });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 500 });
  }
}
