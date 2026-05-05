export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function renderTemplate(templateKey: string, variables?: Record<string, unknown>): RenderedTemplate | null {
  if (templateKey !== "worker_queue_alert") return null;

  const v = asRecord(variables);
  const breaches = asRecord(v.breaches);
  const metrics = asRecord(v.metrics);
  const totals = asRecord(metrics.totals);
  const rates = asRecord(metrics.rates);
  const lag = asRecord(metrics.lag);
  const thresholds = asRecord(v.thresholds);

  const lagBreached = Boolean(breaches.lagBreached);
  const failedRateBreached = Boolean(breaches.failedRateBreached);
  const failedRate = Number(rates.failedRatePercent ?? 0);
  const pending = Number(totals.pending ?? 0);
  const processing = Number(totals.processing ?? 0);
  const failed = Number(totals.failed ?? 0);
  const lagSeconds = Number(lag.oldestPendingAgeSeconds ?? 0);
  const lagThreshold = Number(thresholds.oldestPendingAgeSeconds ?? 0);
  const failedThreshold = Number(thresholds.failedRatePercent ?? 0);

  const breachSummary = [
    lagBreached ? "lag breach" : null,
    failedRateBreached ? "failed-rate breach" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const subject = `RashPOD Queue Alert${breachSummary ? `: ${breachSummary}` : ""}`;
  const text =
    `Queue health threshold breached.\n` +
    `Pending: ${pending}, Processing: ${processing}, Failed: ${failed}\n` +
    `Failed rate: ${failedRate}% (threshold ${failedThreshold}%)\n` +
    `Oldest pending age: ${lagSeconds}s (threshold ${lagThreshold}s)\n`;
  const html = `
    <h3>RashPOD Queue Alert</h3>
    <p>Queue health threshold breached.</p>
    <ul>
      <li>Pending: <b>${pending}</b></li>
      <li>Processing: <b>${processing}</b></li>
      <li>Failed: <b>${failed}</b></li>
      <li>Failed rate: <b>${failedRate}%</b> (threshold ${failedThreshold}%)</li>
      <li>Oldest pending age: <b>${lagSeconds}s</b> (threshold ${lagThreshold}s)</li>
    </ul>
  `.trim();

  return { subject, html, text };
}
