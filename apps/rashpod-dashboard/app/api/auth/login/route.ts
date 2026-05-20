import { NextRequest, NextResponse } from "next/server";
import { getServerApiUrl, isApiUrlConfigurationError } from "../../../../lib/server-api-url";

const TOKEN_COOKIE = "rashpod_jwt";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email: string; password: string };
    const apiUrl = getServerApiUrl();

    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      const body = await loginRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.message || "Login failed" },
        { status: loginRes.status }
      );
    }

    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    const meRes = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = meRes.ok ? await meRes.json() : null;

    const res = NextResponse.json({ user, role: user?.role || "CUSTOMER" });
    res.cookies.set(TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });

    return res;
  } catch (error) {
    if (isApiUrlConfigurationError(error)) {
      console.error("Dashboard login API is not configured");
      return NextResponse.json({ error: "Login service is not configured" }, { status: 503 });
    }

    console.error("Dashboard login request failed", {
      message: error instanceof Error ? error.message : "Unknown login error",
    });
    return NextResponse.json({ error: "Login service unavailable" }, { status: 502 });
  }
}
