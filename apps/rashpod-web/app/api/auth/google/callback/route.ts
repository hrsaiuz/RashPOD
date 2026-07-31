import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const TOKEN_COOKIE = "rashpod_jwt";
const STATE_COOKIE = "rashpod_google_state";
const NEXT_COOKIE = "rashpod_google_next";
const MAX_AGE = 60 * 60 * 24 * 7;

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

function loginError(req: NextRequest, code: string) {
  return clearOAuthCookies(NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(code)}`, req.url)));
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  const next = req.cookies.get(NEXT_COOKIE)?.value || "/account";

  if (!clientId || !clientSecret || !code || !state || state !== expectedState) {
    return loginError(req, "google_signin_failed");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${req.nextUrl.origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return loginError(req, "google_signin_failed");
    const tokenBody = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenBody.id_token) return loginError(req, "google_signin_failed");

    const apiResponse = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: tokenBody.id_token }),
    });
    if (!apiResponse.ok) return loginError(req, "google_account_unavailable");
    const { accessToken } = (await apiResponse.json()) as { accessToken?: string };
    if (!accessToken) return loginError(req, "google_signin_failed");

    const response = clearOAuthCookies(NextResponse.redirect(new URL(next, req.url)));
    response.cookies.set(TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
      ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
    });
    return response;
  } catch {
    return loginError(req, "google_signin_failed");
  }
}
