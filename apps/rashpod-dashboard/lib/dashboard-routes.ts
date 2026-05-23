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
      return "/dashboard/production";
    case "MODERATOR":
      return "/dashboard/moderator";
    case "FINANCE":
      return "/dashboard/finance";
    case "SUPPORT":
      return "/dashboard/support";
    case "CORPORATE_CLIENT":
      return "/dashboard/corporate";
    default:
      return "/dashboard/customer";
  }
}
