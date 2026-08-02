import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { BRANDING_CACHE_TAG } from "../../../../lib/cache";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.REVALIDATE_SECRET;
  const hasServiceSecret = Boolean(secret && authHeader === `Bearer ${secret}`);
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let hasAdminSession = false;

  if (!hasServiceSecret && token) {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null);
      if (response?.ok) {
        const user = (await response.json()) as { role?: string };
        hasAdminSession = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
      }
    }
  }

  if (!hasServiceSecret && !hasAdminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(BRANDING_CACHE_TAG);
  return NextResponse.json({ revalidated: true, tag: BRANDING_CACHE_TAG });
}
