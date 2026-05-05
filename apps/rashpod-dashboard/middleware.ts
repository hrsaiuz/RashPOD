import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_PREFIX = "/dashboard/admin";
const DASHBOARD_PREFIX = "/dashboard";
const LOGIN_PATH = "/auth/login";
const TOKEN_COOKIE = "rashpod_dashboard_token";
const ALLOWED_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "OPERATIONS_MANAGER"]);

function hasToken(req: NextRequest) {
  const fromCookie = req.cookies.get(TOKEN_COOKIE)?.value;
  return Boolean(fromCookie);
}

async function isAllowedAdminToken(token: string) {
  const secret = process.env.JWT_SECRET || "rashpod-dev-secret";
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = typeof payload.role === "string" ? payload.role : "";
    return ALLOWED_ADMIN_ROLES.has(role);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith(DASHBOARD_PREFIX)) return NextResponse.next();

  const token = req.cookies.get(TOKEN_COOKIE)?.value || "";
  if (!hasToken(req)) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!pathname.startsWith(ADMIN_PREFIX)) return NextResponse.next();

  const allowed = await isAllowedAdminToken(token);
  if (!allowed) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
