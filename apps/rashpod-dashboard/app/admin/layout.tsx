import { redirect } from "next/navigation";

/** Legacy /admin routes redirect to the modern dashboard admin shell. */
export default function LegacyAdminLayout() {
  redirect("/dashboard/admin");
}
