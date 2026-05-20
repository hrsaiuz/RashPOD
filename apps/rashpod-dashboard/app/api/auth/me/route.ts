import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl, isApiUrlConfigurationError } from "../../../../lib/server-api-url";

const COOKIE = "rashpod_jwt";

export async function GET() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const meRes = await fetch(`${getServerApiUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const user = await meRes.json();
    return NextResponse.json({ user });
  } catch (error) {
    if (isApiUrlConfigurationError(error)) {
      console.error("Dashboard session API is not configured");
      return NextResponse.json({ error: "Session service is not configured" }, { status: 503 });
    }

    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}
