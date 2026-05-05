import Link from "next/link";
import { Button, EmptyState } from "@rashpod/ui";

export default function NotFound() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-20">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Link href="/">
            <Button variant="primaryBlue" size="md">
              Go home
            </Button>
          </Link>
        }
      />
    </div>
  );
}
