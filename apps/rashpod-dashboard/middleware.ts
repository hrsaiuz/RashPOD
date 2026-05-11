import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz";
const DASHBOARD_PREFIX = "/dashboard";
const LOGIN_PATH = "/auth/login";
const TOKEN_COOKIE = "rashpod_jwt";
const JWT_SECRET = process.env.JWT_SECRET || process.env.API_JWT_SECRET || "";
const SECRET_BYTES = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

const VALID_ROLES = new Set([
  "designer",
  "moderator",
  "production",
  "finance",
  "support",
  "admin",
  "super-admin",
]);

const ROLE_MAP: Record<string, string> = {
  DESIGNER: "designer",
  MODERATOR: "moderator",
  PRODUCTION_STAFF: "production",
  FINANCE_STAFF: "finance",
  SUPPORT_STAFF: "support",
  ADMIN: "admin",
  OPERATIONS_MANAGER: "admin",
  SUPER_ADMIN: "super-admin",
};

const WEB_REDIRECT_ROLES: Record<string, string> = {
  CUSTOMER: "/account",
  CORPORATE_CLIENT: "/business",
};

function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64").toString("utf8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function verifyOrDecode(token: string): Promise<Record<string, unknown> | null> {
  if (SECRET_BYTES) {
    try {
      const { payload } = await jwtVerify(token, SECRET_BYTES);
      return payload as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return decodeJwtPayloadUnsafe(token);
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

  const payload = await verifyOrDecode(token);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const rawRoleEarly = (payload.role as string) || "CUSTOMER";
  const webRedirect = WEB_REDIRECT_ROLES[rawRoleEarly];
  if (webRedirect) {
    return NextResponse.redirect(`${WEB_URL}${webRedirect}`);
  }

  const pathSegments = pathname.split("/").filter(Boolean);
  if (pathSegments.length < 2) {
    return NextResponse.next();
  }

  const roleSegment = pathSegments[1];

  if (!VALID_ROLES.has(roleSegment)) {
    const rawRole = (payload.role as string) || "DESIGNER";
    const userRole = ROLE_MAP[rawRole] || "designer";
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${userRole}`;
    return NextResponse.redirect(url);
  }

  const rawRole = (payload.role as string) || "DESIGNER";
  const userRole = ROLE_MAP[rawRole] || "designer";

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
