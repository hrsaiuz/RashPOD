import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const COOKIE = "rashpod_jwt";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, await ctx.params, "GET");
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, await ctx.params, "POST");
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, await ctx.params, "PUT");
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, await ctx.params, "PATCH");
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, await ctx.params, "DELETE");
}

async function handle(req: NextRequest, params: { path: string[] }, method: string) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const apiPath = params.path.join("/");
  const url = new URL(req.url);
  const target = `${API_URL}/${apiPath}${url.search}`;
  const headers: HeadersInit = { "Content-Type": req.headers.get("Content-Type") || "application/json" };
  if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;

  let body: BodyInit | null = null;
  if (method !== "GET" && method !== "DELETE") body = await req.text();

  try {
    const res = await fetch(target, { method, headers, body });
    const ct = res.headers.get("Content-Type") || "";
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": ct || "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Proxy failed" }, { status: 500 });
  }
}
