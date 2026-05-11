"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Layers, Plus } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type Design } from "../../../../lib/api";

export default function MockupStudioPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/mockup-studio");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const all = await api.get<Design[]>("/designs");
      setDesigns(all.filter((d) => d.status === "APPROVED" || d.status === "READY_FOR_MOCKUP" || d.status === "READY_TO_PUBLISH"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Mockup Studio</h1>
            <p className="text-brand-muted mt-1">Place your approved designs onto product mockups.</p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-40" />
        ) : error ? (
          <ErrorState title="Could not load" description={error} retry={<Button onClick={load}>Retry</Button>} />
        ) : designs.length === 0 ? (
          <EmptyState
            title="No approved designs yet"
            description="Once a design is approved by moderation, it appears here for mockup placement."
            action={
              <Link href="/dashboard/designer/designs">
                <Button variant="primaryBlue"><Plus size={16} /> Manage designs</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((d) => (
              <Card key={d.id} className="flex flex-col gap-3">
                <div className="aspect-video rounded-xl bg-surface-card flex items-center justify-center">
                  <Layers className="text-brand-muted" size={32} />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-brand-ink">{d.title}</h3>
                  <StatusBadge status={d.status} />
                </div>
                <p className="text-xs text-brand-muted line-clamp-2">{d.description || "No description"}</p>
                <Link href={`/dashboard/designer/mockup-studio/${d.id}`} className="mt-auto">
                  <Button variant="secondary" className="w-full">Open in editor</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <div className="flex items-start gap-3">
            <Layers className="text-brand-blue mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">How it works</h2>
              <ol className="list-decimal list-inside text-sm text-brand-muted space-y-1 mt-2">
                <li>Pick an approved design.</li>
                <li>Choose product types and position your art within each safe zone.</li>
                <li>Save the placement to generate the 3-image listing set + production file.</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
