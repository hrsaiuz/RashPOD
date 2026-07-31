import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "rashpod_jwt";
const MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token: string };
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  });
  return res;
}
