"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DesignerProductsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/designer/listings");
  }, [router]);
  return null;
}
