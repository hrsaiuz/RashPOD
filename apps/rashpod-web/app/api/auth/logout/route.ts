import { NextResponse } from "next/server";

const TOKEN_COOKIE = "rashpod_jwt";
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  });
  return res;
}
