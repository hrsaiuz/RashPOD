"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  DataTableColumn,
  EmptyState,
  FormField,
  Input,
  KpiTile,
  PageHeader,
  Select,
  StatusBadge,
} from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type WorkerJob = {
  id: string;
  type: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapWorkerStatus(status: string) {
  const key = status.toLowerCase();
  if (key === "processing") return "in_progress";
  if (key === "completed") return "resolved";
  return key;
}

export default function AdminWorkerJobsPage() {
  const router = useRouter();
  const { user, isLoading, clearSession } = useAuth();
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const load = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      const res = await fetch(`/api/proxy/admin/worker-jobs?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        clearSession();
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
      setJobs((await res.json()) as WorkerJob[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const retry = async (id: string) => {
    if (!user) {
      setError("Session expired.");
      return;
    }
    const res = await fetch(`/api/proxy/admin/worker-jobs/${id}/retry`, {
      method: "POST",
    });
    if (res.status === 401 || res.status === 403) {
      clearSession();
      router.push("/auth/login");
      return;
    }
    if (!res.ok) {
      setError(`Retry failed (${res.status})`);
      return;
    }
    await load();
  };

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [user, isLoading, router]);

  const statusCounts = useMemo(
    () =>
      jobs.reduce(
        (acc, job) => {
          acc[job.status] = (acc[job.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [jobs],
  );

  const columns: DataTableColumn<WorkerJob>[] = useMemo(
    () => [
      {
        key: "type",
        header: "Type",
        render: (_value, row) => <span className="font-mono text-xs">{row.type}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (_value, row) => <StatusBadge status={mapWorkerStatus(row.status)} label={row.status} />,
      },
      {
        key: "attempts",
        header: "Attempts",
        render: (_value, row) => `${row.attempts}/${row.maxAttempts}`,
      },
      {
        key: "createdAt",
        header: "Created",
        render: (value) => <span className="text-brand-muted">{new Date(String(value)).toLocaleString()}</span>,
      },
      {
        key: "errorMessage",
        header: "Error",
        render: (value) => (
          <span className="block max-w-[240px] truncate text-brand-muted" title={String(value ?? "")}>
            {value ? String(value) : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Action",
        render: (_value, row) => (
          <Button
            size="sm"
            variant={row.status === "FAILED" ? "primaryPeach" : "secondary"}
            disabled={row.status !== "FAILED"}
            onClick={() => void retry(row.id)}
            aria-label={`Retry job ${row.id}`}
          >
            Retry
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Worker Jobs"
        description={`Operations queue monitor and manual retry.${user ? ` Signed in as ${user.email}.` : ""}`}
        actions={
          <Button variant="secondary" onClick={() => void load()} loading={loading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <form onSubmit={load} className="flex flex-wrap items-end gap-3" role="search" aria-label="Filter worker jobs">
          <FormField label="Status filter">
            <Select id="wj-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
            </Select>
          </FormField>
          <FormField label="Job type filter">
            <Input id="wj-type" placeholder="Job type" value={type} onChange={(e) => setType(e.target.value)} />
          </FormField>
          <Button type="submit" loading={loading}>
            {loading ? "Loading…" : "Apply filters"}
          </Button>
        </form>
      </Card>

      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-semantic-dangerBg bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Pending" value={statusCounts.PENDING ?? 0} />
        <KpiTile label="Processing" value={statusCounts.PROCESSING ?? 0} />
        <KpiTile label="Completed" value={statusCounts.COMPLETED ?? 0} />
        <KpiTile label="Failed" value={statusCounts.FAILED ?? 0} className={(statusCounts.FAILED ?? 0) > 0 ? "text-semantic-dangerText" : undefined} />
      </div>

      <DataTable
        columns={columns}
        rows={jobs}
        loading={loading}
        caption="Worker jobs list"
        emptyState={<EmptyState title="No jobs found" description="No worker jobs match the current filters." />}
      />
    </DashboardLayout>
  );
}
