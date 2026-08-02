import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl, isApiUrlConfigurationError } from "../../../../lib/server-api-url";

const TOKEN_COOKIE = "rashpod_jwt";
const ALLOWED_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function POST() {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const meResponse = await fetch(`${getServerApiUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!meResponse.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = (await meResponse.json()) as { role?: string };
    if (!user.role || !ALLOWED_ROLES.has(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL;
    if (!webUrl) {
      return NextResponse.json({ error: "Storefront revalidation is not configured" }, { status: 503 });
    }

    const response = await fetch(`${webUrl.replace(/\/$/, "")}/api/revalidate/branding`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Storefront revalidation failed" }, { status: response.status });
    }

    return NextResponse.json({ revalidated: true });
  } catch (error) {
    if (isApiUrlConfigurationError(error)) {
      return NextResponse.json({ error: "API proxy is not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Storefront revalidation unavailable" }, { status: 502 });
  }
}
