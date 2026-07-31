"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Check, MapPin, Pencil, Trash2, X } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, FormField, Input } from "@rashpod/ui";
import { api } from "../../../../lib/api";

type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  stateCode?: string | null;
  countryCode: string;
  postalCode?: string | null;
  zone: string;
  isDefault: boolean;
};

type AddressForm = Omit<CustomerAddress, "id" | "isDefault">;

const EMPTY_FORM: AddressForm = {
  label: "Home",
  recipientName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "Tashkent",
  stateCode: "",
  countryCode: "UZ",
  postalCode: "",
  zone: "UZ",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try { setAddresses(await api.get<CustomerAddress[]>("/customer/addresses")); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load addresses"); }
    finally { setLoading(false); }
  }

  function startEdit(address: CustomerAddress) {
    setEditingId(address.id);
    setForm({
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      stateCode: address.stateCode ?? "",
      countryCode: address.countryCode || "UZ",
      postalCode: address.postalCode ?? "",
      zone: address.zone || "UZ",
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        const updated = await api.patch<CustomerAddress>(`/customer/addresses/${editingId}`, form);
        setAddresses((current) => current.map((row) => row.id === updated.id ? updated : row));
        setSuccess("Address updated.");
      } else {
        const created = await api.post<CustomerAddress>("/customer/addresses", { ...form, isDefault: addresses.length === 0 });
        setAddresses((current) => [created, ...current]);
        setSuccess("Address saved.");
      }
      resetForm();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save address"); }
    finally { setSaving(false); }
  }

  async function removeAddress(address: CustomerAddress) {
    if (!window.confirm(`Remove ${address.label}?`)) return;
    setBusyId(address.id);
    setError(null);
    try {
      await api.delete(`/customer/addresses/${address.id}`);
      setAddresses((current) => {
        const remaining = current.filter((row) => row.id !== address.id);
        if (address.isDefault && remaining[0]) remaining[0] = { ...remaining[0], isDefault: true };
        return remaining;
      });
      if (editingId === address.id) resetForm();
      setSuccess("Address removed.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not remove address"); }
    finally { setBusyId(null); }
  }

  async function makeDefault(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await api.post<CustomerAddress>(`/customer/addresses/${id}/set-default`);
      setAddresses((current) => current.map((row) => ({ ...row, isDefault: row.id === updated.id })));
      setSuccess("Default address updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update default address"); }
    finally { setBusyId(null); }
  }

  if (loading) return <p className="text-brand-muted">Loading addresses…</p>;
  if (error && addresses.length === 0) return <ErrorState title="Addresses unavailable" description={error} retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>} />;

  const set = (key: keyof AddressForm) => (event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-ink">Delivery addresses</h1>
        <p className="mt-1 text-brand-muted">Save addresses for faster checkout and choose which one is used by default.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-brand-ink">{editingId ? "Edit address" : "Add an address"}</h2>
          {editingId ? <Button type="button" variant="ghost" size="sm" onClick={resetForm}><X size={16} /> Cancel</Button> : null}
        </div>
        <form onSubmit={saveAddress} className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Label"><Input required maxLength={60} value={form.label} onChange={set("label")} /></FormField>
          <FormField label="Full name"><Input required autoComplete="name" value={form.recipientName} onChange={set("recipientName")} /></FormField>
          <FormField label="Phone"><Input required type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></FormField>
          <FormField label="City"><Input required autoComplete="address-level2" value={form.city} onChange={set("city")} /></FormField>
          <FormField label="Address line 1" className="sm:col-span-2"><Input required autoComplete="address-line1" value={form.line1} onChange={set("line1")} /></FormField>
          <FormField label="Apartment, suite, or building (optional)" className="sm:col-span-2"><Input autoComplete="address-line2" value={form.line2 ?? ""} onChange={set("line2")} /></FormField>
          <FormField label="Region (optional)"><Input autoComplete="address-level1" value={form.stateCode ?? ""} onChange={set("stateCode")} /></FormField>
          <FormField label="Postal code (optional)"><Input autoComplete="postal-code" value={form.postalCode ?? ""} onChange={set("postalCode")} /></FormField>
          {error ? <p role="alert" className="text-sm text-semantic-dangerText sm:col-span-2">{error}</p> : null}
          {success ? <p role="status" className="text-sm text-semantic-successText sm:col-span-2">{success}</p> : null}
          <div className="sm:col-span-2"><Button type="submit" variant="primaryBlue" loading={saving}>{editingId ? "Update address" : "Save address"}</Button></div>
        </form>
      </Card>

      {addresses.length === 0 ? (
        <Card><EmptyState icon={<MapPin size={30} />} title="No addresses saved" description="Add your first delivery address above." /></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id} className={`p-5 ${address.isDefault ? "ring-2 ring-brand-blue" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-brand-ink">{address.label}</p>
                    {address.isDefault ? <span className="inline-flex items-center gap-1 rounded-pill bg-brand-blueLight px-2 py-1 text-xs font-semibold text-brand-blue"><Check size={12} /> Default</span> : null}
                  </div>
                  <p className="mt-3 text-brand-text">{address.recipientName} · {address.phone}</p>
                  <p className="mt-1 text-brand-muted">{[address.line1, address.line2, address.city, address.stateCode, address.postalCode].filter(Boolean).join(", ")}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => startEdit(address)} aria-label={`Edit ${address.label}`}><Pencil size={16} /> Edit</Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 border-t border-brand-line pt-4">
                {!address.isDefault ? <Button variant="secondary" size="sm" disabled={busyId !== null} loading={busyId === address.id} onClick={() => void makeDefault(address.id)}>Make default</Button> : null}
                <Button variant="ghost" size="sm" disabled={busyId !== null} onClick={() => void removeAddress(address)} className="text-semantic-dangerText"><Trash2 size={15} /> Remove</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
