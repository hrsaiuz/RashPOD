"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorState, FormField, Input, Skeleton, StatusBadge } from "@rashpod/ui";
import { DollarSign } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isPrimary: boolean;
  exchangeRateToUzs: string | number;
  updatedAt: string;
}

export default function AdminCurrenciesPage() {
  const [rows, setRows] = useState<CurrencyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    decimalPlaces: "2",
    exchangeRateToUzs: "12500",
    isActive: true,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await api.get<CurrencyConfig[]>("/admin/currencies"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load currencies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const code = form.code.trim().toUpperCase();
      await api.put(`/admin/currencies/${code}`, {
        code,
        name: form.name,
        symbol: form.symbol,
        decimalPlaces: Number(form.decimalPlaces),
        exchangeRateToUzs: Number(form.exchangeRateToUzs),
        isActive: form.isActive,
        isPrimary: code === "UZS",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save currency");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Currencies</h1>
            <p className="text-brand-muted mt-1">
              Manage active currencies and exchange rates. RashPOD accounting remains normalized to UZS.
            </p>
          </div>
          <Button variant="secondary" onClick={load}>Refresh</Button>
        </div>

        {error ? <ErrorState title="Currency settings issue" description={error} retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>} /> : null}

        <Card>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <FormField label="Code" required>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={3} />
            </FormField>
            <FormField label="Name" required className="md:col-span-2">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Symbol" required>
              <Input value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} />
            </FormField>
            <FormField label="Rate to UZS" required>
              <Input value={form.exchangeRateToUzs} onChange={(e) => setForm((f) => ({ ...f, exchangeRateToUzs: e.target.value }))} />
            </FormField>
            <Button type="submit" variant="primaryBlue" loading={saving}>Save</Button>
          </form>
          <label className="mt-4 flex items-center gap-2 text-sm text-brand-muted">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active for pricing and reporting
          </label>
        </Card>

        {loading ? (
          <Skeleton className="h-64" />
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState icon={<DollarSign className="text-brand-peach" size={32} />} title="No currencies configured" description="Seed UZS first, then add display currencies as needed." />
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle text-brand-muted">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Currency</th>
                    <th className="px-5 py-3 text-left font-semibold">Symbol</th>
                    <th className="px-5 py-3 text-left font-semibold">Rate to UZS</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Primary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-borderSoft">
                  {rows.map((row) => (
                    <tr key={row.code}>
                      <td className="px-5 py-4"><p className="font-semibold text-brand-ink">{row.code}</p><p className="text-xs text-brand-muted">{row.name}</p></td>
                      <td className="px-5 py-4 text-brand-ink">{row.symbol}</td>
                      <td className="px-5 py-4 font-semibold text-brand-ink">{Number(row.exchangeRateToUzs).toLocaleString()} UZS</td>
                      <td className="px-5 py-4"><StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                      <td className="px-5 py-4"><StatusBadge status={row.isPrimary ? "PRIMARY" : "DISPLAY"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}