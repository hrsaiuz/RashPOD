import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as jose from "jose";

const COOKIE = "rashpod_dashboard_token";
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export async function GET() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return NextResponse.json({
      token,
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
        displayName: payload.displayName as string | undefined,
      },
    });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}
