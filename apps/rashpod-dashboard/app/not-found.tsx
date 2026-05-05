import { EmptyState, Button } from "@rashpod/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <EmptyState
        title="Page Not Found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Link href="/dashboard">
            <Button variant="primaryBlue">Go to Dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}
