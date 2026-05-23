"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorState, FormField, Input } from "@rashpod/ui";
import { api } from "../../../../lib/api";

type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  city: string;
  zone: string;
  isDefault: boolean;
};

const EMPTY_FORM = {
  label: "Home",
  recipientName: "",
  phone: "",
  line1: "",
  city: "Tashkent",
  zone: "UZ",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setAddresses(await api.get<CustomerAddress[]>("/customer/addresses"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load addresses");
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress() {
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<CustomerAddress>("/customer/addresses", { ...form, isDefault: addresses.length === 0 });
      setAddresses((current) => [created, ...current]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id: string) {
    await api.delete(`/customer/addresses/${id}`);
    setAddresses((current) => current.filter((row) => row.id !== id));
  }

  async function makeDefault(id: string) {
    const updated = await api.post<CustomerAddress>(`/customer/addresses/${id}/set-default`);
    setAddresses((current) => current.map((row) => ({ ...row, isDefault: row.id === updated.id })));
  }

  if (loading) return <p className="text-brand-muted">Loading addresses...</p>;
  if (error && addresses.length === 0) {
    return <ErrorState title="Addresses unavailable" description={error} retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">Addresses</h1>
      <Card className="p-6">
        <h2 className="text-lg font-bold text-brand-ink">Add address</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Label"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></FormField>
          <FormField label="Full name"><Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></FormField>
          <FormField label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></FormField>
          <FormField label="Address" className="sm:col-span-2"><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></FormField>
        </div>
        {error ? <p className="mt-3 text-sm text-semantic-dangerText">{error}</p> : null}
        <Button className="mt-4" variant="primaryBlue" loading={saving} onClick={saveAddress}>Save address</Button>
      </Card>
      {addresses.length === 0 ? (
        <Card><EmptyState title="No addresses saved" description="Add your first delivery address above." /></Card>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-bold text-brand-ink">{address.label} {address.isDefault ? <span className="ml-2 text-xs text-brand-blue">Default</span> : null}</p>
                  <p className="mt-2 text-brand-muted">{address.recipientName} · {address.phone}</p>
                  <p className="mt-1 text-brand-muted">{address.line1}, {address.city}</p>
                </div>
                <div className="flex gap-3">
                  {!address.isDefault ? (
                    <Button variant="secondary" size="sm" onClick={() => void makeDefault(address.id)}>Make default</Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => void removeAddress(address.id)}>Remove</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
