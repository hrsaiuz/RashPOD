import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

export interface TimelineStep {
  key: string;
  label: string;
  status: "completed" | "current" | "pending" | "failed" | string;
  timestamp?: string | null;
  description?: string | null;
}

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  if (!steps.length) return <p className="text-sm text-brand-muted">No timeline events yet.</p>;
  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const icon = step.status === "completed" ? <CheckCircle2 size={18} /> : step.status === "failed" ? <AlertCircle size={18} /> : step.status === "current" ? <Clock size={18} /> : <Circle size={18} />;
        const tone = step.status === "completed" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : step.status === "failed" ? "text-red-700 bg-red-50 border-red-200" : step.status === "current" ? "text-brand-blue bg-blue-50 border-blue-200" : "text-brand-muted bg-white border-brand-line";
        return (
          <li key={step.key} className="flex gap-3">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${tone}`}>{icon}</div>
            <div className="min-w-0 flex-1 rounded-xl border border-brand-line bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-brand-ink">{step.label}</p>
                {step.timestamp ? <time className="text-xs text-brand-muted">{new Date(step.timestamp).toLocaleString()}</time> : null}
              </div>
              {step.description ? <p className="mt-1 text-sm text-brand-muted">{step.description}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
