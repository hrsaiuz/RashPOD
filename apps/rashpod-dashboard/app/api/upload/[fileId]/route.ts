import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServerApiUrl, isApiUrlConfigurationError } from "../../../../lib/server-api-url";

const COOKIE = "rashpod_jwt";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.arrayBuffer();
    const targetUrl = `${getServerApiUrl()}/files/local-upload/${fileId}`;
    const apiRes = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": req.headers.get("Content-Type") || "application/octet-stream",
      },
      body,
    });

    const responseBody = await apiRes.text();
    return new NextResponse(responseBody, {
      status: apiRes.status,
      headers: {
        "Content-Type": apiRes.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    if (isApiUrlConfigurationError(error)) {
      return NextResponse.json({ error: "API proxy is not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Upload proxy unavailable" }, { status: 502 });
  }
}
