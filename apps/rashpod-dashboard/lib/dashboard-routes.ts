export function getDashboardHomePath(role: string | null | undefined): string {
  const normalized = (role || "").toUpperCase().replace(/-/g, "_");

  switch (normalized) {
    case "SUPER_ADMIN":
      return "/dashboard/super-admin";
    case "ADMIN":
    case "OPERATIONS_MANAGER":
      return "/dashboard/admin";
    case "DESIGNER":
      return "/dashboard/designer";
    case "CUSTOMER":
      return "/dashboard/customer";
    case "PRODUCTION":
    case "PRODUCTION_STAFF":
      return "/dashboard/production";
    case "MODERATOR":
      return "/dashboard/moderator";
    case "FINANCE":
    case "FINANCE_STAFF":
      return "/dashboard/finance";
    case "SUPPORT":
    case "SUPPORT_STAFF":
      return "/dashboard/support";
    case "CORPORATE_CLIENT":
      return "/dashboard/corporate";
    default:
      return "/dashboard/customer";
  }
}

const STOREFRONT_LOGIN_REDIRECTS: Record<string, string> = {
  CUSTOMER: "/account",
  CORPORATE_CLIENT: "/business",
};

export function getLoginRedirectPath(
  role: string | null | undefined,
  nextParam?: string | null,
  webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz",
): string {
  const normalized = (role || "").toUpperCase().replace(/-/g, "_");
  const storefrontPath = STOREFRONT_LOGIN_REDIRECTS[normalized];
  if (storefrontPath) {
    return `${webUrl.replace(/\/+$/, "")}${storefrontPath}`;
  }

  const home = getDashboardHomePath(normalized);
  if (
    nextParam &&
    nextParam.startsWith("/dashboard") &&
    nextParam.startsWith(home)
  ) {
    return nextParam;
  }

  return home;
}
