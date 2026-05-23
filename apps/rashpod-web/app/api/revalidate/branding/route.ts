import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { BRANDING_CACHE_TAG } from "../../../../lib/cache";

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Revalidation is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(BRANDING_CACHE_TAG);
  return NextResponse.json({ revalidated: true, tag: BRANDING_CACHE_TAG });
}
