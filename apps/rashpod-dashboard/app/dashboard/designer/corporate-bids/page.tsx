"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DataTable,
  DataTableColumn,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Modal,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@rashpod/ui";
import { Briefcase, Send } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type CorporateRequest } from "../../../../lib/api";

type Tab = "open" | "mine" | "closed";

type DesignerBidRow = {
  id: string;
  corporateRequestId: string;
  proposal: string;
  designFee: string | number;
  timelineDays: number;
  status: "SUBMITTED" | "SHORTLISTED" | "SELECTED" | "REJECTED" | string;
  createdAt: string;
  corporateRequest?: CorporateRequest;
};

export default function CorporateBidsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<CorporateRequest[]>([]);
  const [myBids, setMyBids] = useState<DesignerBidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("open");
  const [bidTarget, setBidTarget] = useState<CorporateRequest | null>(null);
  const [proposal, setProposal] = useState("");
  const [designFee, setDesignFee] = useState("");
  const [timelineDays, setTimelineDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/corporate-bids");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [all, bids] = await Promise.all([
        api.get<CorporateRequest[]>("/corporate/requests"),
        api.get<DesignerBidRow[]>("/designer/bids").catch(() => [] as DesignerBidRow[]),
      ]);
      setRequests(all);
      setMyBids(bids);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  // Poll my bids every 30s while on the page to surface SHORTLISTED / SELECTED transitions.
  useEffect(() => {
    if (!user) return;
    const i = setInterval(() => {
      api.get<DesignerBidRow[]>("/designer/bids").then(setMyBids).catch(() => {});
    }, 30000);
    return () => clearInterval(i);
  }, [user]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (tab === "open") return r.status === "BIDDING" || r.status === "OPEN";
      if (tab === "closed") return r.status === "CLOSED" || r.status === "AWARDED" || r.status === "CANCELLED";
      return true;
    });
  }, [requests, tab]);

  async function submitBid() {
    if (!bidTarget) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post(`/corporate/requests/${bidTarget.id}/bids`, {
        proposal,
        designFee: Number(designFee),
        timelineDays: Number(timelineDays),
      });
      setBidTarget(null);
      setProposal("");
      setDesignFee("");
      setTimelineDays("");
      await load();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: DataTableColumn<CorporateRequest>[] = [
    {
      key: "title",
      header: "Request",
      render: (_v, r) => (
        <div>
          <div className="font-medium text-brand-ink">{r.title}</div>
          {r.details && <div className="text-xs text-brand-muted line-clamp-1">{r.details}</div>}
        </div>
      ),
    },
    { key: "qty", header: "Qty", render: (_v, r) => <span className="text-sm">{r.quantity ?? "—"}</span> },
    { key: "budget", header: "Budget", render: (_v, r) => <span className="text-sm">{r.budget ? `${r.budget} UZS` : "—"}</span> },
    {
      key: "deadline",
      header: "Deadline",
      render: (_v, r) => (
        <span className="text-xs text-brand-muted">
          {r.deadline ? new Date(r.deadline).toLocaleDateString() : "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (_v, r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <div className="flex justify-end">
          <Button
            variant="primaryBlue"
            size="sm"
            disabled={r.status !== "BIDDING" && r.status !== "OPEN"}
            onClick={() => setBidTarget(r)}
          >
            <Send size={14} /> Bid
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Corporate Bids</h1>
          <p className="text-brand-muted mt-1">B2B requests for custom design work.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["open", "mine", "closed"] as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={
                "px-4 h-9 rounded-pill text-sm font-semibold " +
                (tab === k ? "bg-brand-blue text-white" : "bg-surface-card text-brand-ink hover:bg-surface-borderSoft")
              }
            >
              {k === "open" ? "Open requests" : k === "mine" ? "My bids" : "Closed"}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : error ? (
          <ErrorState title="Could not load" description={error} retry={<Button onClick={load}>Retry</Button>} />
        ) : tab === "mine" ? (
          myBids.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="text-brand-muted" size={32} />}
              title="No bids yet"
              description="Submit a bid on an open request to get started."
            />
          ) : (
            <Card>
              <DataTable
                rows={myBids}
                mobileMode="cards"
                columns={[
                  {
                    key: "title",
                    header: "Request",
                    render: (_v, b) => (
                      <div>
                        <div className="font-medium text-brand-ink">{b.corporateRequest?.title ?? "—"}</div>
                        <div className="text-xs text-brand-muted line-clamp-2">{b.proposal}</div>
                      </div>
                    ),
                  },
                  { key: "fee", header: "Fee", render: (_v, b) => <span className="text-sm">{Number(b.designFee).toLocaleString()} UZS</span> },
                  { key: "tl", header: "Timeline", render: (_v, b) => <span className="text-sm">{b.timelineDays}d</span> },
                  {
                    key: "status",
                    header: "Status",
                    render: (_v, b) => <StatusBadge status={b.status} />,
                  },
                  {
                    key: "date",
                    header: "Submitted",
                    render: (_v, b) => <span className="text-xs text-brand-muted">{new Date(b.createdAt).toLocaleDateString()}</span>,
                  },
                ]}
              />
            </Card>
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="text-brand-muted" size={32} />}
            title={tab === "open" ? "No open requests" : "No closed requests"}
            description={
              tab === "open"
                ? "Check back soon — corporate clients post requests regularly."
                : "No closed requests to show."
            }
          />
        ) : (
          <Card>
            <DataTable rows={filtered} columns={columns} mobileMode="cards" />
          </Card>
        )}

        <Modal
          open={!!bidTarget}
          onClose={() => setBidTarget(null)}
          title={bidTarget ? `Submit bid: ${bidTarget.title}` : "Submit bid"}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBidTarget(null)}>Cancel</Button>
              <Button
                variant="primaryBlue"
                loading={submitting}
                disabled={!proposal || !designFee || !timelineDays}
                onClick={submitBid}
              >
                Submit bid
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <FormField label="Proposal" helperText="Describe your approach, design ideas, and what you'll deliver.">
              <Textarea rows={5} value={proposal} onChange={(e) => setProposal(e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Design fee (UZS)">
                <Input type="number" min={0} value={designFee} onChange={(e) => setDesignFee(e.target.value)} />
              </FormField>
              <FormField label="Timeline (days)">
                <Input type="number" min={1} value={timelineDays} onChange={(e) => setTimelineDays(e.target.value)} />
              </FormField>
            </div>
            {submitError && <p className="text-sm text-semantic-danger">{submitError}</p>}
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
