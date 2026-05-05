import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as jose from "jose";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const COOKIE = "rashpod_jwt";
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export async function GET() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const user = await meRes.json();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}
