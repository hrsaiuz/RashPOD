import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServerApiUrl, isApiUrlConfigurationError } from "../../../../lib/server-api-url";

const COOKIE = "rashpod_jwt";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, await params, "GET");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, await params, "POST");
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, await params, "PUT");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, await params, "PATCH");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, await params, "DELETE");
}

async function handleRequest(req: NextRequest, params: { path: string[] }, method: string) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiPath = params.path.join("/");
  const url = new URL(req.url);
  const search = url.search;

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": req.headers.get("Content-Type") || "application/json",
  };

  let body: BodyInit | null = null;
  if (method !== "GET" && method !== "DELETE") {
    body = await req.text();
  }

  try {
    const targetUrl = `${getServerApiUrl()}/${apiPath}${search}`;
    const apiRes = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const contentType = apiRes.headers.get("Content-Type") || "";
    let responseBody;

    if (contentType.includes("application/json")) {
      responseBody = await apiRes.text();
    } else {
      responseBody = await apiRes.text();
    }

    return new NextResponse(responseBody, {
      status: apiRes.status,
      headers: {
        "Content-Type": contentType || "application/json",
      },
    });
  } catch (error) {
    if (isApiUrlConfigurationError(error)) {
      console.error("Dashboard API proxy is not configured", { method, path: `/${apiPath}` });
      return NextResponse.json({ error: "API proxy is not configured" }, { status: 503 });
    }

    console.error("Dashboard API proxy request failed", {
      method,
      path: `/${apiPath}`,
      message: error instanceof Error ? error.message : "Unknown proxy error",
    });
    return NextResponse.json({ error: "API proxy unavailable" }, { status: 502 });
  }
}
