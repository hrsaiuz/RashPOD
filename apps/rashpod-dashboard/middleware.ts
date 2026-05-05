import { NextRequest, NextResponse } from "next/server";

const DASHBOARD_PREFIX = "/dashboard";
const LOGIN_PATH = "/auth/login";
const TOKEN_COOKIE = "rashpod_jwt";

const VALID_ROLES = new Set([
  "customer",
  "designer",
  "corporate",
  "moderator",
  "production",
  "finance",
  "support",
  "admin",
  "super-admin",
]);

const ROLE_MAP: Record<string, string> = {
  CUSTOMER: "customer",
  DESIGNER: "designer",
  CORPORATE_CLIENT: "corporate",
  MODERATOR: "moderator",
  PRODUCTION_STAFF: "production",
  FINANCE_STAFF: "finance",
  SUPPORT_STAFF: "support",
  ADMIN: "admin",
  OPERATIONS_MANAGER: "admin",
  SUPER_ADMIN: "super-admin",
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64").toString("utf8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith(DASHBOARD_PREFIX) || pathname.startsWith("/dashboard/_next")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value || "";

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const pathSegments = pathname.split("/").filter(Boolean);
  if (pathSegments.length < 2) {
    return NextResponse.next();
  }

  const roleSegment = pathSegments[1];

  if (!VALID_ROLES.has(roleSegment)) {
    const rawRole = (payload.role as string) || "CUSTOMER";
    const userRole = ROLE_MAP[rawRole] || "customer";
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${userRole}`;
    return NextResponse.redirect(url);
  }

  const rawRole = (payload.role as string) || "CUSTOMER";
  const userRole = ROLE_MAP[rawRole] || "customer";

  if (userRole === "super-admin") {
    return NextResponse.next();
  }

  if (roleSegment !== userRole) {
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${userRole}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
