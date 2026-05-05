import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const DASHBOARD_PREFIX = "/dashboard";
const LOGIN_PATH = "/auth/login";
const TOKEN_COOKIE = "rashpod_dashboard_token";

const ROLE_PATHS: Record<string, string[]> = {
  SUPER_ADMIN:        ["/dashboard"],
  ADMIN:              ["/dashboard/admin", "/dashboard/moderator", "/dashboard/production", "/dashboard/finance", "/dashboard/support"],
  OPERATIONS_MANAGER: ["/dashboard/admin", "/dashboard/production"],
  MODERATOR:          ["/dashboard/moderator"],
  PRODUCTION_STAFF:   ["/dashboard/production"],
  FINANCE_STAFF:      ["/dashboard/finance"],
  SUPPORT_STAFF:      ["/dashboard/support"],
  DESIGNER:           ["/dashboard/designer"],
  CUSTOMER:           ["/dashboard/customer"],
  CORPORATE_CLIENT:   ["/dashboard/corporate"],
};

async function verifyToken(token: string): Promise<string | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function isAllowed(role: string, pathname: string): boolean {
  if (role === "SUPER_ADMIN") return true;
  const allowed = ROLE_PATHS[role] ?? [];
  return allowed.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith(DASHBOARD_PREFIX)) return NextResponse.next();

  const token = req.cookies.get(TOKEN_COOKIE)?.value || "";

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = await verifyToken(token);
  if (!role || !isAllowed(role, pathname)) {
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
