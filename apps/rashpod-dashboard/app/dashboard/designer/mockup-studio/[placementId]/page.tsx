"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, EmptyState } from "@rashpod/ui";
import { ArrowLeft, Layers, Wrench } from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";

export default function MockupEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const id = String(params.placementId);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push(`/auth/login?next=/dashboard/designer/mockup-studio/${id}`);
  }, [user, authLoading, id, router]);

  const [tab, setTab] = useState<"preview" | "placement">("preview");

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <Link
          href="/dashboard/designer/mockup-studio"
          className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink"
        >
          <ArrowLeft size={16} /> Back to studio
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Mockup Editor</h1>
            <p className="text-brand-muted mt-1">Design ID: <code className="text-xs">{id}</code></p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("preview")}
              className={
                "px-4 h-9 rounded-pill text-sm font-semibold " +
                (tab === "preview" ? "bg-brand-blue text-white" : "bg-surface-card text-brand-ink hover:bg-surface-borderSoft")
              }
            >
              Preview
            </button>
            <button
              onClick={() => setTab("placement")}
              className={
                "px-4 h-9 rounded-pill text-sm font-semibold " +
                (tab === "placement" ? "bg-brand-blue text-white" : "bg-surface-card text-brand-ink hover:bg-surface-borderSoft")
              }
            >
              Placement
            </button>
          </div>
        </div>

        <Card>
          <div className="aspect-[4/3] rounded-2xl bg-surface-card flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-8 border-2 border-dashed border-brand-muted/40 rounded-xl flex items-center justify-center">
              <span className="text-xs text-brand-muted">Print safe zone</span>
            </div>
            <Layers className="text-brand-blue" size={48} />
          </div>
        </Card>

        <EmptyState
          icon={<Wrench className="text-brand-muted" size={32} />}
          title="Full Konva editor in progress"
          description="Drag-scale-rotate canvas with safe-zone enforcement ships in the next release. For now, designs flow straight to the listing builder after moderation approval."
          action={
            <Link href="/dashboard/designer/listings">
              <Button variant="primaryBlue">Create a listing instead</Button>
            </Link>
          }
        />
      </div>
    </DashboardLayout>
  );
}
