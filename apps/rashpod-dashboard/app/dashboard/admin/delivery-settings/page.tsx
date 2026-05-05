"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

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
    const res = await fetch(`/api/proxy/admin/delivery-settings`);
    if (!res.ok) {
      setMessage(`Failed to load settings (${res.status})`);
      return;
    }
    setItems(await res.json());
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
    <main style={{ padding: 24 }}>
      <h1>Admin Delivery Settings</h1>
      {message ? <p>{message}</p> : null}

      <form onSubmit={addSetting} style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(160px,1fr))", gap: 10, marginBottom: 16 }}>
        <input value={form.providerType} onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value }))} placeholder="providerType" />
        <input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="displayName" />
        <input value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="zone" />
        <input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="price" />
        <input value={form.freeDeliveryThreshold} onChange={(e) => setForm((f) => ({ ...f, freeDeliveryThreshold: e.target.value }))} placeholder="free threshold" />
        <input value={form.etaText} onChange={(e) => setForm((f) => ({ ...f, etaText: e.target.value }))} placeholder="eta text" />
        <button type="submit" style={{ gridColumn: "1 / span 1" }}>Add provider setting</button>
      </form>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Provider</th>
            <th style={{ textAlign: "left" }}>Zone</th>
            <th style={{ textAlign: "left" }}>Price</th>
            <th style={{ textAlign: "left" }}>Free Threshold</th>
            <th style={{ textAlign: "left" }}>ETA</th>
            <th style={{ textAlign: "left" }}>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {editingId === item.id ? (
                  <>
                    <input value={editForm.displayName} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} />
                    <input value={editForm.providerType} onChange={(e) => setEditForm((f) => ({ ...f, providerType: e.target.value }))} />
                  </>
                ) : (
                  <>{item.displayName} ({item.providerType})</>
                )}
              </td>
              <td>{editingId === item.id ? <input value={editForm.zone} onChange={(e) => setEditForm((f) => ({ ...f, zone: e.target.value }))} /> : item.zone}</td>
              <td>{editingId === item.id ? <input value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} /> : item.price || "0"}</td>
              <td>{editingId === item.id ? <input value={editForm.freeDeliveryThreshold} onChange={(e) => setEditForm((f) => ({ ...f, freeDeliveryThreshold: e.target.value }))} /> : item.freeDeliveryThreshold || "-"}</td>
              <td>{editingId === item.id ? <input value={editForm.etaText} onChange={(e) => setEditForm((f) => ({ ...f, etaText: e.target.value }))} /> : item.etaText || "-"}</td>
              <td>
                {editingId === item.id ? (
                  <select value={editForm.isActive ? "1" : "0"} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === "1" }))}>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                ) : item.isActive ? "Yes" : "No"}
              </td>
              <td>
                {editingId === item.id ? (
                  <>
                    <button onClick={saveEdit}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ marginLeft: 8 }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(item)}>Edit</button>
                    <button onClick={() => toggleActive(item.id, item.isActive)} style={{ marginLeft: 8 }}>
                      {item.isActive ? "Disable" : "Enable"}
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
