import type { Metadata } from "next";
import { fetchDesigners } from "../../../lib/catalog";
import DesignersPageClient from "./DesignersPageClient";

export const metadata: Metadata = {
  title: "Designers",
  description:
    "Discover talented RashPOD creators from across Uzbekistan. Browse designer profiles and shop their unique designs.",
};

export default async function DesignersPage() {
  const designers = await fetchDesigners(50);

  return <DesignersPageClient initialDesigners={designers} />;
}
