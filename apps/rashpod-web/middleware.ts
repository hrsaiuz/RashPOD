import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const INTERNAL_PORTS = new Set(["8080", "3000", "3001"]);

function sanitizeProxyHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  const xfPort = headers.get("x-forwarded-port");
  const xfHost = headers.get("x-forwarded-host") ?? headers.get("host");

  if (xfPort && INTERNAL_PORTS.has(xfPort) && xfHost && !xfHost.includes(":")) {
    headers.delete("x-forwarded-port");
  }

  return new NextRequest(request.url, { headers });
}

export default function middleware(request: NextRequest) {
  return handleI18nRouting(sanitizeProxyHeaders(request));
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
