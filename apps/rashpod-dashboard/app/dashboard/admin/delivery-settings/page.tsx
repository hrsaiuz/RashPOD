"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";
import { Button, Card, EmptyState, ErrorState, Input, Skeleton, StatusBadge } from "@rashpod/ui";
import { Package } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

type DeliverySetting = {
  id: string;
  providerType: string;
  displayName: string;
  zone: string;
  isActive: boolean;
  price?: string | null;
  freeDeliveryThreshold?: string | null;
  etaText?: string | null;
};

export default function AdminDeliverySettingsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<DeliverySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    providerType: "",
    displayName: "",
    zone: "",
    price: "",
    freeDeliveryThreshold: "",
    etaText: "",
    isActive: true,
  });
  const [form, setForm] = useState({
    providerType: "YANDEX",
    displayName: "Yandex Delivery",
    zone: "TASHKENT",
    price: "25000",
    freeDeliveryThreshold: "200000",
    etaText: "1-2 days",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const res = await fetch(`/api/proxy/admin/delivery-settings`);
    if (!res.ok) {
      setMessage(`Failed to load settings (${res.status})`);
      setLoading(false);
      return;
    }
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const addSetting = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const res = await fetch(`/api/proxy/admin/delivery-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerType: form.providerType,
        displayName: form.displayName,
        zone: form.zone,
        price: Number(form.price),
        freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
        etaText: form.etaText,
        isActive: true,
      }),
    });
    if (!res.ok) {
      setMessage(`Create failed (${res.status})`);
      return;
    }
    setMessage("Delivery setting added");
    await load();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    if (!user) return;
    const res = await fetch(`/api/proxy/delivery/admin/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (!res.ok) {
      setMessage(`Toggle failed (${res.status})`);
      return;
    }
    await load();
  };

  const startEdit = (item: DeliverySetting) => {
    setEditingId(item.id);
    setEditForm({
      providerType: item.providerType,
      displayName: item.displayName,
      zone: item.zone,
      price: String(item.price ?? ""),
      freeDeliveryThreshold: String(item.freeDeliveryThreshold ?? ""),
      etaText: item.etaText || "",
      isActive: item.isActive,
    });
  };

  const saveEdit = async () => {
    if (!user || !editingId) return;
    const res = await fetch(`/api/proxy/admin/delivery-settings/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerType: editForm.providerType,
        displayName: editForm.displayName,
        zone: editForm.zone,
        price: editForm.price === "" ? null : Number(editForm.price),
        freeDeliveryThreshold: editForm.freeDeliveryThreshold === "" ? null : Number(editForm.freeDeliveryThreshold),
        etaText: editForm.etaText,
        isActive: editForm.isActive,
      }),
    });
    if (!res.ok) {
      setMessage(`Update failed (${res.status})`);
      return;
    }
    setMessage("Delivery setting updated");
    setEditingId(null);
    await load();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Delivery Settings</h1>
          <p className="text-brand-muted mt-1">Configure provider zones, UZS prices, free-delivery thresholds, and ETA text.</p>
        </div>

        {message ? (
          message.toLowerCase().includes("failed") ? <ErrorState title="Delivery settings issue" description={message} /> : <p className="text-sm text-brand-blue font-medium">{message}</p>
        ) : null}

        <Card>
          <form onSubmit={addSetting} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={form.providerType} onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value }))} placeholder="Provider type" />
            <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Display name" />
            <Input value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="Zone" />
            <Input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="Price in UZS" />
            <Input value={form.freeDeliveryThreshold} onChange={(e) => setForm((f) => ({ ...f, freeDeliveryThreshold: e.target.value }))} placeholder="Free threshold in UZS" />
            <Input value={form.etaText} onChange={(e) => setForm((f) => ({ ...f, etaText: e.target.value }))} placeholder="ETA text" />
            <Button type="submit" variant="primaryBlue" className="md:col-span-1">Add provider setting</Button>
          </form>
        </Card>

        {loading ? (
          <Skeleton className="h-32" />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState icon={<Package className="text-brand-peach" size={32} />} title="No delivery settings" description="Add the first provider zone so checkout can quote delivery in UZS." />
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle text-brand-muted">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Provider</th>
                    <th className="px-5 py-3 text-left font-semibold">Zone</th>
                    <th className="px-5 py-3 text-left font-semibold">Price</th>
                    <th className="px-5 py-3 text-left font-semibold">Free Threshold</th>
                    <th className="px-5 py-3 text-left font-semibold">ETA</th>
                    <th className="px-5 py-3 text-left font-semibold">Active</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-borderSoft">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 min-w-56">
                        {editingId === item.id ? (
                          <div className="space-y-2"><Input value={editForm.displayName} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} /><Input value={editForm.providerType} onChange={(e) => setEditForm((f) => ({ ...f, providerType: e.target.value }))} /></div>
                        ) : (
                          <div><p className="font-semibold text-brand-ink">{item.displayName}</p><p className="text-xs text-brand-muted">{item.providerType}</p></div>
                        )}
                      </td>
                      <td className="px-5 py-4">{editingId === item.id ? <Input value={editForm.zone} onChange={(e) => setEditForm((f) => ({ ...f, zone: e.target.value }))} /> : item.zone}</td>
                      <td className="px-5 py-4">{editingId === item.id ? <Input value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} /> : `${Number(item.price ?? 0).toLocaleString()} UZS`}</td>
                      <td className="px-5 py-4">{editingId === item.id ? <Input value={editForm.freeDeliveryThreshold} onChange={(e) => setEditForm((f) => ({ ...f, freeDeliveryThreshold: e.target.value }))} /> : item.freeDeliveryThreshold ? `${Number(item.freeDeliveryThreshold).toLocaleString()} UZS` : "-"}</td>
                      <td className="px-5 py-4">{editingId === item.id ? <Input value={editForm.etaText} onChange={(e) => setEditForm((f) => ({ ...f, etaText: e.target.value }))} /> : item.etaText || "-"}</td>
                      <td className="px-5 py-4"><StatusBadge status={editingId === item.id ? (editForm.isActive ? "ACTIVE" : "INACTIVE") : item.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {editingId === item.id ? (
                            <><Button size="sm" variant="primaryBlue" onClick={saveEdit}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button></>
                          ) : (
                            <><Button size="sm" variant="secondary" onClick={() => startEdit(item)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => toggleActive(item.id, item.isActive)}>{item.isActive ? "Disable" : "Enable"}</Button></>
                          )}
                        </div>
                      </td>
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
